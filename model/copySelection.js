import cloneDeep from '../util/cloneDeep'
import forEach from '../util/forEach'
import {
  copyNode, deleteTextRange, deleteListRange, TEXT_SNIPPET_ID, getContainerRoot, append
} from './documentHelpers'
import {
  isFirst, isLast, getNodeIdsCoveredByContainerSelection
} from './selectionHelpers'

/**
  Creates a new document instance containing only the selected content

  @param {Object} args object with `selection`
  @return {Object} with a `doc` property that has a fresh doc with the copied content
*/

export default function copySelection (doc, selection) {
  if (!selection) throw new Error("'selection' is mandatory.")
  let copy = null
  if (!selection.isNull() && !selection.isCollapsed()) {
    // return a simplified version if only a piece of text is selected
    if (selection.isPropertySelection()) {
      copy = _copyPropertySelection(doc, selection)
    } else if (selection.isContainerSelection()) {
      copy = _copyContainerSelection(doc, selection)
    } else if (selection.isNodeSelection()) {
      copy = _copyNodeSelection(doc, selection)
    } else {
      console.error('Copy is not yet supported for selection type.')
    }
  }
  return copy
}

function _copyPropertySelection (doc, selection) {
  let path = selection.start.path
  let offset = selection.start.offset
  let endOffset = selection.end.offset
  let text = doc.get(path)
  let snippet = doc.createSnippet()
  let containerNode = snippet.getContainer()
  snippet.create({
    type: doc.schema.getDefaultTextType(),
    id: TEXT_SNIPPET_ID,
    content: text.substring(offset, endOffset)
  })
  containerNode.append(TEXT_SNIPPET_ID)
  let annotations = doc.getIndex('annotations').get(path, offset, endOffset)
  forEach(annotations, function (anno) {
    let data = cloneDeep(anno.toJSON())
    let path = [TEXT_SNIPPET_ID, 'content']
    data.start = {
      path: path,
      offset: Math.max(offset, anno.start.offset) - offset
    }
    data.end = {
      path: path,
      offset: Math.min(endOffset, anno.end.offset) - offset
    }
    snippet.create(data)
  })
  return snippet
}

function _copyContainerSelection (tx, sel) {
  let containerPath = sel.containerPath

  let snippet = tx.createSnippet()
  let targetContainer = snippet.getContainer()
  let targetContainerPath = targetContainer.getContentPath()

  let nodeIds = getNodeIdsCoveredByContainerSelection(tx, sel)
  let L = nodeIds.length
  if (L === 0) return snippet

  let start = sel.start
  let end = sel.end

  let skippedFirst = false
  let skippedLast = false

  // First copy the whole covered nodes
  let created = {}
  for (let i = 0; i < L; i++) {
    let id = nodeIds[i]
    let node = tx.get(id)
    // skip NIL selections, such as cursor at the end of first node or cursor at the start of last node.
    if (i === 0 && isLast(tx, containerPath, start)) {
      skippedFirst = true
      continue
    }
    if (i === L - 1 && isFirst(tx, containerPath, end)) {
      skippedLast = true
      continue
    }
    if (!created[id]) {
      copyNode(node).forEach((nodeData) => {
        let copy = snippet.create(nodeData)
        created[copy.id] = true
      })
      append(snippet, targetContainerPath, id)
    }
  }
  if (!skippedFirst) {
    // ATTENTION: we need the root node here, e.g. the list, not the list items
    let startNode = getContainerRoot(snippet, targetContainerPath, start.getNodeId())
    if (startNode.isText()) {
      deleteTextRange(snippet, null, start)
    } else if (startNode.isList()) {
      deleteListRange(snippet, startNode, null, start, { deleteEmptyFirstItem: true })
    }
  }
  if (!skippedLast) {
    // ATTENTION: we need the root node here, e.g. the list, not the list items
    let endNode = getContainerRoot(snippet, targetContainerPath, end.getNodeId())
    if (endNode.isText()) {
      deleteTextRange(snippet, end, null)
    } else if (endNode.isList()) {
      deleteListRange(snippet, endNode, end, null)
    }
  }
  return snippet
}

function _copyNodeSelection (doc, selection) {
  let snippet = doc.createSnippet()
  let targetNode = snippet.getContainer()
  let targetPath = targetNode.getContentPath()
  let nodeId = selection.getNodeId()
  let node = doc.get(nodeId)
  copyNode(node).forEach((nodeData) => {
    snippet.create(nodeData)
  })
  append(snippet, targetPath, node.id)
  return snippet
}
