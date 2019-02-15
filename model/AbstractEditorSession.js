import EventEmitter from '../util/EventEmitter'
import isPlainObject from '../util/isPlainObject'
import ChangeHistoryView from './ChangeHistoryView'
import { transformSelection } from './operationHelpers'
import Selection from './Selection'
import Transaction from './Transaction'

export default class AbstractEditorSession extends EventEmitter {
  constructor (id, documentSession, history) {
    super()

    const doc = documentSession.getDocument()

    this._id = id
    this._document = doc
    this._documentSession = documentSession
    this._history = history || new ChangeHistoryView(documentSession)
    this._transaction = new Transaction(doc)

    this._initialize()
  }

  _initialize () {
    // initialze hooks etc
  }

  dispose () {
    // dispose hooks etc
  }

  canUndo () {
    return this._history.canUndo()
  }

  canRedo () {
    return this._history.canRedo()
  }

  getDocument () {
    return this._document
  }

  getFocusedSurface () {
    // implement this using a SurfaceManager
    // TODO: as the SurfaceManager is a vital part of the system
    // it should be part of the core implementation
  }

  getSurface (surfaceId) {
    // implement this using a SurfaceManager
  }

  getSelection () {
    return this._getSelection()
  }

  setSelection (sel) {
    // console.log('EditorSession.setSelection()', sel)
    if (!sel) sel = Selection.nullSelection
    if (sel && isPlainObject(sel)) {
      sel = this.getDocument().createSelection(sel)
    }
    if (sel && !sel.isNull()) {
      if (!sel.surfaceId) {
        let fs = this.getFocusedSurface()
        if (fs) {
          sel.surfaceId = fs.id
        }
      }
    }
    // augmenting the selection with surfaceId and containerPath
    // for sake of convenience
    // TODO: rethink if this is really a good idea
    // this could also be implemented by the sub-class, with more knowledge
    // about specific data model and app structure
    if (!sel.isCustomSelection()) {
      if (!sel.surfaceId) {
        _addSurfaceId(sel, this)
      }
      if (!sel.containerPath) {
        _addContainerPath(sel, this)
      }
    }
    this._setSelection(this._normalizeSelection(sel))
    return sel
  }

  transaction (fn, info) {
    let tx = this._transaction.tx
    // HACK: setting the state of 'tx' here
    // TODO: find out a way to pass a tx state for the transaction
    // then we could derive this state from the editorState
    let selBefore = this._getSelection()
    tx.selection = selBefore
    let change = this._recordChange(fn, info)
    if (change) {
      let selAfter = tx.selection
      this._setSelection(this._normalizeSelection(selAfter))
      change.before = { selection: selBefore }
      change.after = { selection: selAfter }
      // console.log('EditorSession.transaction()', change)
      this._commit(change, info)
    }
    return change
  }

  undo () {
    let change = this._history.undo()
    // TODO: why is this necessary?
    if (change) this._setSelection(this._normalizeSelection(change.after.selection))
  }

  updateNodeStates (tuples, options = {}) {
    this._documentSession.updateNodeStates(tuples, options)
  }

  redo () {
    let change = this._history.redo()
    // TODO: why is this necessary?
    if (change) this._setSelection(this._normalizeSelection(change.after.selection))
  }

  /*
    There are cases when we want to explicitly reset the change history of
    an editor session
  */
  resetHistory () {
    this._history.reset()
  }

  _commit (change, info) {
    this._history.commit(change, info)
  }

  _recordChange (transformation, info) {
    const t = this._transaction
    info = info || {}
    t._sync()
    return t._recordChange(transformation, info)
  }

  _normalizeSelection (sel) {
    const doc = this.getDocument()
    if (!sel) {
      sel = Selection.nullSelection
    } else {
      sel.attach(doc)
    }
    return sel
  }

  _getSelection () {
    // get the current selection
  }

  _setSelection (sel) {
    // store the selection somewhere
  }

  _transformSelection (change) {
    var oldSelection = this.getSelection()
    var newSelection = transformSelection(oldSelection, change)
    return newSelection
  }
}

function _addSurfaceId (sel, editorSession) {
  if (sel && !sel.isNull() && !sel.surfaceId) {
    // TODO: We could check if the selection is valid within the given surface
    let surface = editorSession.getFocusedSurface()
    if (surface) {
      sel.surfaceId = surface.id
    }
  }
}

function _addContainerPath (sel, editorSession) {
  if (sel && !sel.isNull() && sel.surfaceId && !sel.containerPath) {
    let surface = editorSession.getSurface(sel.surfaceId)
    if (surface) {
      let containerPath = surface.getContainerPath()
      if (containerPath) {
        // console.log('Adding containerPath', containerPath)
        sel.containerPath = containerPath
      }
    }
  }
}