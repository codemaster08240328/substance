'use strict';

var tape = require('tape');
var inBrowser = require('../util/inBrowser');
var platform = require('../util/platform');
var DefaultDOMElement = require('../ui/DefaultDOMElement');

var nextTick = process.nextTick;
var harness = tape.createHarness();
var results = harness._results;

harness.runAllTests = function() {
  var i = 0;
  function next() {
    while (i < results.tests.length) {
      var t = results.tests[i++];
      t.run();
      if (!t.ended) return t.once('end', function(){ nextTick(next); });
    }
  }
  nextTick(next);
};

harness.module = function(moduleName) {
  var tapeish = function() {
    var t = harness.apply(harness, arguments);
    t.moduleName = moduleName;
    return t;
  };
  return _withExtensions(tapeish);
};

_withExtensions(harness);

// copied from tape/lib/test.js
var getTestArgs = function () {
  var name = '(anonymous)';
  var opts = {};
  var cb;
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    var t = typeof arg;
    if (t === 'string') {
      name = arg;
    }
    else if (t === 'object') {
      opts = arg || opts;
    }
    else if (t === 'function') {
      cb = arg;
    }
  }
  return { name: name, opts: opts, cb: cb };
};

/*
  Helpers
*/

function _withExtensions(tapeish) {

  function _withBeforeAndAfter(args) {
    return tapeish(args.name, args.opts, function (t) {
      if(args.opts.before) args.opts.before(t);
      args.cb(t);
      if(args.opts.after) args.opts.after(t);
    });
  }

  tapeish.UI = function() {
    return function() {
      var args = getTestArgs.apply(null, arguments);
      if (!inBrowser) {
        args.opts.skip = true;
      } else {
        args.opts.before = function(t) {
          _setupUI(t);
          if (args.opts.before) args.opts.before(t);
        };
        args.opts.after = function(t) {
          if(args.opts.after) args.opts.after(t);
          _teardownUI(t);
        };
        return _withBeforeAndAfter(args);
      }
    };
  };

  tapeish.FF = function() {
    return function() {
      var args = getTestArgs.apply(null, arguments);
      if (!inBrowser || !platform.isFF) {
        args.opts.skip = true;
      }
      return _withBeforeAndAfter(args);
    };
  };

  tapeish.WK = function() {
    return function() {
      var args = getTestArgs.apply(null, arguments);
      if (!inBrowser || !platform.isWebKit) {
        args.opts.skip = true;
      }
      return _withBeforeAndAfter(args);
    };
  };

  return tapeish;
}

function _setupUI(t) {
  var fixtureElement = window.document.querySelector('#qunit-fixture');
  if (!fixtureElement) {
    fixtureElement = window.document.createElement('div');
    fixtureElement.id = "qunit-fixture";
    window.document.querySelector('body').appendChild(fixtureElement);
  }
  var sandboxEl = window.document.createElement('div');
  sandboxEl.id = 'sandbox-'+t.test.id;
  fixtureElement.appendChild(sandboxEl);
  t.sandbox = DefaultDOMElement.wrapNativeElement(sandboxEl);
}

function _teardownUI(t) {
  var sandbox = t.sandbox;
  if (sandbox) {
    sandbox.remove();
  }
}

module.exports = harness;
