(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":5}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":4,"_process":3,"inherits":2}],6:[function(require,module,exports){
var assert = require('assert');
var dagre = require('dagre');
var dot = require('graphlib-dot');

var graph ="digraph {\n"+
"    S [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    A [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    B [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    C [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    D [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    E [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    S -> A;\n"+
"    A -> B;\n"+
"    A -> S;\n"+
"    B -> C;\n"+
"    C -> D;\n"+
"    C -> S;\n"+
"    D -> E;\n"+
"    E -> S;\n"+
"}";

console.log(graph);

function main() {

    // Parse the graphviz format graph
    var digraph = dot.parse(graph);

    // Use Dagre to generate a layout
    var layout = dagre.layout().run(digraph);

    // Debug: print out the node and edge information
    layout.eachNode(function(u, value) {
        console.log("Node " + u + ": " + JSON.stringify(value));
    });
    layout.eachEdge(function(e, u, v, value) {
        console.log("Edge " + u + " -> " + v + ": " + JSON.stringify(value));
    });
    
    // Prepare to draw to canvas
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext('2d');

    // Draw a circle for each node at the x, y given by the Dagre layout
    layout.eachNode(function(u, node) {
        var rad = parseInt(node.width);
        var cx = node.x;
        var cy = node.y;

        context.beginPath();
        context.arc(cx, cy, rad, 0, 2 * Math.PI, false);
        context.stroke();
        context.font = "bold 8px Arial";
        context.fillText(u, cx, cy);
    });
    
    // Not really working: Draw lines starting from Node U, to each point in value, finally to node V
    layout.eachEdge(function(e, u, v, value) {
        var points = [layout.node(u)];
        points.push.apply(points, value.points);        
        points.push(layout.node(v));
        
        // Debug: Draw a circle at each point
        context.beginPath();
        context.arc(points[0].x, points[0].y, 3, 0, 2 * Math.PI, false);
        context.stroke();
        
        for(var i = 1; i < points.length; i++) {
            var p0 = points[i-1];
            var p1 = points[i];
            context.beginPath();
            context.moveTo(p0.x, p0.y);
            context.lineTo(p1.x, p1.y);
            context.stroke();
            
            context.beginPath();
            context.arc(p1.x, p1.y, 3, 0, 2 * Math.PI, false);
            context.stroke();
        }
    });

}

document.addEventListener("DOMContentLoaded", main);
},{"assert":1,"dagre":7,"graphlib-dot":53}],7:[function(require,module,exports){
/*
Copyright (c) 2012-2013 Chris Pettitt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
exports.Digraph = require("graphlib").Digraph;
exports.Graph = require("graphlib").Graph;
exports.layout = require("./lib/layout");
exports.version = require("./lib/version");
exports.debug = require("./lib/debug");

},{"./lib/debug":8,"./lib/layout":9,"./lib/version":24,"graphlib":30}],8:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * Renders a graph in a stringified DOT format that indicates the ordering of
 * nodes by layer. Circles represent normal nodes. Diamons represent dummy
 * nodes. While we try to put nodes in clusters, it appears that graphviz
 * does not respect this because we're later using subgraphs for ordering nodes
 * in each layer.
 */
exports.dotOrdering = function(g) {
  var ordering = util.ordering(g.filterNodes(util.filterNonSubgraphs(g)));
  var result = 'digraph {';

  function dfs(u) {
    var children = g.children(u);
    if (children.length) {
      result += 'subgraph cluster_' + u + ' {';
      result += 'label="' + u + '";';
      children.forEach(function(v) {
        dfs(v);
      });
      result += '}';
    } else {
      result += u;
      if (g.node(u).dummy) {
        result += ' [shape=diamond]';
      }
      result += ';';
    }
  }

  g.children(null).forEach(dfs);

  ordering.forEach(function(layer) {
    result += 'subgraph { rank=same; edge [style="invis"];';
    result += layer.join('->');
    result += '}';
  });

  g.eachEdge(function(e, u, v) {
    result += u + '->' + v + ';';
  });

  result += '}';

  return result;
};

},{"./util":23}],9:[function(require,module,exports){
'use strict';

var util = require('./util'),
    rank = require('./rank'),
    order = require('./order'),
    CGraph = require('graphlib').CGraph,
    CDigraph = require('graphlib').CDigraph;

module.exports = function() {
  // External configuration
  var config = {
    // How much debug information to include?
    debugLevel: 0,
    // Max number of sweeps to perform in order phase
    orderMaxSweeps: order.DEFAULT_MAX_SWEEPS,
    // Use network simplex algorithm in ranking
    rankSimplex: false,
    // Rank direction. Valid values are (TB, LR)
    rankDir: 'TB'
  };

  // Phase functions
  var position = require('./position')();

  // This layout object
  var self = {};

  self.orderIters = util.propertyAccessor(self, config, 'orderMaxSweeps');

  self.rankSimplex = util.propertyAccessor(self, config, 'rankSimplex');

  self.nodeSep = delegateProperty(position.nodeSep);
  self.edgeSep = delegateProperty(position.edgeSep);
  self.universalSep = delegateProperty(position.universalSep);
  self.rankSep = delegateProperty(position.rankSep);
  self.rankDir = util.propertyAccessor(self, config, 'rankDir');
  self.debugAlignment = delegateProperty(position.debugAlignment);

  self.debugLevel = util.propertyAccessor(self, config, 'debugLevel', function(x) {
    util.log.level = x;
    position.debugLevel(x);
  });

  self.run = util.time('Total layout', run);

  self._normalize = normalize;

  return self;

  /*
   * Constructs an adjacency graph using the nodes and edges specified through
   * config. For each node and edge we add a property `dagre` that contains an
   * object that will hold intermediate and final layout information. Some of
   * the contents include:
   *
   *  1) A generated ID that uniquely identifies the object.
   *  2) Dimension information for nodes (copied from the source node).
   *  3) Optional dimension information for edges.
   *
   * After the adjacency graph is constructed the code no longer needs to use
   * the original nodes and edges passed in via config.
   */
  function initLayoutGraph(inputGraph) {
    var g = new CDigraph();

    inputGraph.eachNode(function(u, value) {
      if (value === undefined) value = {};
      g.addNode(u, {
        width: value.width,
        height: value.height
      });
      if (value.hasOwnProperty('rank')) {
        g.node(u).prefRank = value.rank;
      }
    });

    // Set up subgraphs
    if (inputGraph.parent) {
      inputGraph.nodes().forEach(function(u) {
        g.parent(u, inputGraph.parent(u));
      });
    }

    inputGraph.eachEdge(function(e, u, v, value) {
      if (value === undefined) value = {};
      var newValue = {
        e: e,
        minLen: value.minLen || 1,
        width: value.width || 0,
        height: value.height || 0,
        points: []
      };

      g.addEdge(null, u, v, newValue);
    });

    // Initial graph attributes
    var graphValue = inputGraph.graph() || {};
    g.graph({
      rankDir: graphValue.rankDir || config.rankDir,
      orderRestarts: graphValue.orderRestarts
    });

    return g;
  }

  function run(inputGraph) {
    var rankSep = self.rankSep();
    var g;
    try {
      // Build internal graph
      g = util.time('initLayoutGraph', initLayoutGraph)(inputGraph);

      if (g.order() === 0) {
        return g;
      }

      // Make space for edge labels
      g.eachEdge(function(e, s, t, a) {
        a.minLen *= 2;
      });
      self.rankSep(rankSep / 2);

      // Determine the rank for each node. Nodes with a lower rank will appear
      // above nodes of higher rank.
      util.time('rank.run', rank.run)(g, config.rankSimplex);

      // Normalize the graph by ensuring that every edge is proper (each edge has
      // a length of 1). We achieve this by adding dummy nodes to long edges,
      // thus shortening them.
      util.time('normalize', normalize)(g);

      // Order the nodes so that edge crossings are minimized.
      util.time('order', order)(g, config.orderMaxSweeps);

      // Find the x and y coordinates for every node in the graph.
      util.time('position', position.run)(g);

      // De-normalize the graph by removing dummy nodes and augmenting the
      // original long edges with coordinate information.
      util.time('undoNormalize', undoNormalize)(g);

      // Reverses points for edges that are in a reversed state.
      util.time('fixupEdgePoints', fixupEdgePoints)(g);

      // Restore delete edges and reverse edges that were reversed in the rank
      // phase.
      util.time('rank.restoreEdges', rank.restoreEdges)(g);

      // Construct final result graph and return it
      return util.time('createFinalGraph', createFinalGraph)(g, inputGraph.isDirected());
    } finally {
      self.rankSep(rankSep);
    }
  }

  /*
   * This function is responsible for 'normalizing' the graph. The process of
   * normalization ensures that no edge in the graph has spans more than one
   * rank. To do this it inserts dummy nodes as needed and links them by adding
   * dummy edges. This function keeps enough information in the dummy nodes and
   * edges to ensure that the original graph can be reconstructed later.
   *
   * This method assumes that the input graph is cycle free.
   */
  function normalize(g) {
    var dummyCount = 0;
    g.eachEdge(function(e, s, t, a) {
      var sourceRank = g.node(s).rank;
      var targetRank = g.node(t).rank;
      if (sourceRank + 1 < targetRank) {
        for (var u = s, rank = sourceRank + 1, i = 0; rank < targetRank; ++rank, ++i) {
          var v = '_D' + (++dummyCount);
          var node = {
            width: a.width,
            height: a.height,
            edge: { id: e, source: s, target: t, attrs: a },
            rank: rank,
            dummy: true
          };

          // If this node represents a bend then we will use it as a control
          // point. For edges with 2 segments this will be the center dummy
          // node. For edges with more than two segments, this will be the
          // first and last dummy node.
          if (i === 0) node.index = 0;
          else if (rank + 1 === targetRank) node.index = 1;

          g.addNode(v, node);
          g.addEdge(null, u, v, {});
          u = v;
        }
        g.addEdge(null, u, t, {});
        g.delEdge(e);
      }
    });
  }

  /*
   * Reconstructs the graph as it was before normalization. The positions of
   * dummy nodes are used to build an array of points for the original 'long'
   * edge. Dummy nodes and edges are removed.
   */
  function undoNormalize(g) {
    g.eachNode(function(u, a) {
      if (a.dummy) {
        if ('index' in a) {
          var edge = a.edge;
          if (!g.hasEdge(edge.id)) {
            g.addEdge(edge.id, edge.source, edge.target, edge.attrs);
          }
          var points = g.edge(edge.id).points;
          points[a.index] = { x: a.x, y: a.y, ul: a.ul, ur: a.ur, dl: a.dl, dr: a.dr };
        }
        g.delNode(u);
      }
    });
  }

  /*
   * For each edge that was reversed during the `acyclic` step, reverse its
   * array of points.
   */
  function fixupEdgePoints(g) {
    g.eachEdge(function(e, s, t, a) { if (a.reversed) a.points.reverse(); });
  }

  function createFinalGraph(g, isDirected) {
    var out = isDirected ? new CDigraph() : new CGraph();
    out.graph(g.graph());
    g.eachNode(function(u, value) { out.addNode(u, value); });
    g.eachNode(function(u) { out.parent(u, g.parent(u)); });
    g.eachEdge(function(e, u, v, value) {
      out.addEdge(value.e, u, v, value);
    });

    // Attach bounding box information
    var maxX = 0, maxY = 0;
    g.eachNode(function(u, value) {
      if (!g.children(u).length) {
        maxX = Math.max(maxX, value.x + value.width / 2);
        maxY = Math.max(maxY, value.y + value.height / 2);
      }
    });
    g.eachEdge(function(e, u, v, value) {
      var maxXPoints = Math.max.apply(Math, value.points.map(function(p) { return p.x; }));
      var maxYPoints = Math.max.apply(Math, value.points.map(function(p) { return p.y; }));
      maxX = Math.max(maxX, maxXPoints + value.width / 2);
      maxY = Math.max(maxY, maxYPoints + value.height / 2);
    });
    out.graph().width = maxX;
    out.graph().height = maxY;

    return out;
  }

  /*
   * Given a function, a new function is returned that invokes the given
   * function. The return value from the function is always the `self` object.
   */
  function delegateProperty(f) {
    return function() {
      if (!arguments.length) return f();
      f.apply(null, arguments);
      return self;
    };
  }
};


},{"./order":10,"./position":15,"./rank":16,"./util":23,"graphlib":30}],10:[function(require,module,exports){
'use strict';

var util = require('./util'),
    crossCount = require('./order/crossCount'),
    initLayerGraphs = require('./order/initLayerGraphs'),
    initOrder = require('./order/initOrder'),
    sortLayer = require('./order/sortLayer');

module.exports = order;

// The maximum number of sweeps to perform before finishing the order phase.
var DEFAULT_MAX_SWEEPS = 24;
order.DEFAULT_MAX_SWEEPS = DEFAULT_MAX_SWEEPS;

/*
 * Runs the order phase with the specified `graph, `maxSweeps`, and
 * `debugLevel`. If `maxSweeps` is not specified we use `DEFAULT_MAX_SWEEPS`.
 * If `debugLevel` is not set we assume 0.
 */
function order(g, maxSweeps) {
  if (arguments.length < 2) {
    maxSweeps = DEFAULT_MAX_SWEEPS;
  }

  var restarts = g.graph().orderRestarts || 0;

  var layerGraphs = initLayerGraphs(g);
  // TODO: remove this when we add back support for ordering clusters
  layerGraphs.forEach(function(lg) {
    lg = lg.filterNodes(function(u) { return !g.children(u).length; });
  });

  var iters = 0,
      currentBestCC,
      allTimeBestCC = Number.MAX_VALUE,
      allTimeBest = {};

  function saveAllTimeBest() {
    g.eachNode(function(u, value) { allTimeBest[u] = value.order; });
  }

  for (var j = 0; j < Number(restarts) + 1 && allTimeBestCC !== 0; ++j) {
    currentBestCC = Number.MAX_VALUE;
    initOrder(g, restarts > 0);

    util.log(2, 'Order phase start cross count: ' + g.graph().orderInitCC);

    var i, lastBest, cc;
    for (i = 0, lastBest = 0; lastBest < 4 && i < maxSweeps && currentBestCC > 0; ++i, ++lastBest, ++iters) {
      sweep(g, layerGraphs, i);
      cc = crossCount(g);
      if (cc < currentBestCC) {
        lastBest = 0;
        currentBestCC = cc;
        if (cc < allTimeBestCC) {
          saveAllTimeBest();
          allTimeBestCC = cc;
        }
      }
      util.log(3, 'Order phase start ' + j + ' iter ' + i + ' cross count: ' + cc);
    }
  }

  Object.keys(allTimeBest).forEach(function(u) {
    if (!g.children || !g.children(u).length) {
      g.node(u).order = allTimeBest[u];
    }
  });
  g.graph().orderCC = allTimeBestCC;

  util.log(2, 'Order iterations: ' + iters);
  util.log(2, 'Order phase best cross count: ' + g.graph().orderCC);
}

function predecessorWeights(g, nodes) {
  var weights = {};
  nodes.forEach(function(u) {
    weights[u] = g.inEdges(u).map(function(e) {
      return g.node(g.source(e)).order;
    });
  });
  return weights;
}

function successorWeights(g, nodes) {
  var weights = {};
  nodes.forEach(function(u) {
    weights[u] = g.outEdges(u).map(function(e) {
      return g.node(g.target(e)).order;
    });
  });
  return weights;
}

function sweep(g, layerGraphs, iter) {
  if (iter % 2 === 0) {
    sweepDown(g, layerGraphs, iter);
  } else {
    sweepUp(g, layerGraphs, iter);
  }
}

function sweepDown(g, layerGraphs) {
  var cg;
  for (var i = 1; i < layerGraphs.length; ++i) {
    cg = sortLayer(layerGraphs[i], cg, predecessorWeights(g, layerGraphs[i].nodes()));
  }
}

function sweepUp(g, layerGraphs) {
  var cg;
  for (var i = layerGraphs.length - 2; i >= 0; --i) {
    sortLayer(layerGraphs[i], cg, successorWeights(g, layerGraphs[i].nodes()));
  }
}

},{"./order/crossCount":11,"./order/initLayerGraphs":12,"./order/initOrder":13,"./order/sortLayer":14,"./util":23}],11:[function(require,module,exports){
'use strict';

var util = require('../util');

module.exports = crossCount;

/*
 * Returns the cross count for the given graph.
 */
function crossCount(g) {
  var cc = 0;
  var ordering = util.ordering(g);
  for (var i = 1; i < ordering.length; ++i) {
    cc += twoLayerCrossCount(g, ordering[i-1], ordering[i]);
  }
  return cc;
}

/*
 * This function searches through a ranked and ordered graph and counts the
 * number of edges that cross. This algorithm is derived from:
 *
 *    W. Barth et al., Bilayer Cross Counting, JGAA, 8(2) 179–194 (2004)
 */
function twoLayerCrossCount(g, layer1, layer2) {
  var indices = [];
  layer1.forEach(function(u) {
    var nodeIndices = [];
    g.outEdges(u).forEach(function(e) { nodeIndices.push(g.node(g.target(e)).order); });
    nodeIndices.sort(function(x, y) { return x - y; });
    indices = indices.concat(nodeIndices);
  });

  var firstIndex = 1;
  while (firstIndex < layer2.length) firstIndex <<= 1;

  var treeSize = 2 * firstIndex - 1;
  firstIndex -= 1;

  var tree = [];
  for (var i = 0; i < treeSize; ++i) { tree[i] = 0; }

  var cc = 0;
  indices.forEach(function(i) {
    var treeIndex = i + firstIndex;
    ++tree[treeIndex];
    while (treeIndex > 0) {
      if (treeIndex % 2) {
        cc += tree[treeIndex + 1];
      }
      treeIndex = (treeIndex - 1) >> 1;
      ++tree[treeIndex];
    }
  });

  return cc;
}

},{"../util":23}],12:[function(require,module,exports){
'use strict';

var nodesFromList = require('graphlib').filter.nodesFromList,
    /* jshint -W079 */
    Set = require('cp-data').Set;

module.exports = initLayerGraphs;

/*
 * This function takes a compound layered graph, g, and produces an array of
 * layer graphs. Each entry in the array represents a subgraph of nodes
 * relevant for performing crossing reduction on that layer.
 */
function initLayerGraphs(g) {
  var ranks = [];

  function dfs(u) {
    if (u === null) {
      g.children(u).forEach(function(v) { dfs(v); });
      return;
    }

    var value = g.node(u);
    value.minRank = ('rank' in value) ? value.rank : Number.MAX_VALUE;
    value.maxRank = ('rank' in value) ? value.rank : Number.MIN_VALUE;
    var uRanks = new Set();
    g.children(u).forEach(function(v) {
      var rs = dfs(v);
      uRanks = Set.union([uRanks, rs]);
      value.minRank = Math.min(value.minRank, g.node(v).minRank);
      value.maxRank = Math.max(value.maxRank, g.node(v).maxRank);
    });

    if ('rank' in value) uRanks.add(value.rank);

    uRanks.keys().forEach(function(r) {
      if (!(r in ranks)) ranks[r] = [];
      ranks[r].push(u);
    });

    return uRanks;
  }
  dfs(null);

  var layerGraphs = [];
  ranks.forEach(function(us, rank) {
    layerGraphs[rank] = g.filterNodes(nodesFromList(us));
  });

  return layerGraphs;
}

},{"cp-data":25,"graphlib":30}],13:[function(require,module,exports){
'use strict';

var crossCount = require('./crossCount'),
    util = require('../util');

module.exports = initOrder;

/*
 * Given a graph with a set of layered nodes (i.e. nodes that have a `rank`
 * attribute) this function attaches an `order` attribute that uniquely
 * arranges each node of each rank. If no constraint graph is provided the
 * order of the nodes in each rank is entirely arbitrary.
 */
function initOrder(g, random) {
  var layers = [];

  g.eachNode(function(u, value) {
    var layer = layers[value.rank];
    if (g.children && g.children(u).length > 0) return;
    if (!layer) {
      layer = layers[value.rank] = [];
    }
    layer.push(u);
  });

  layers.forEach(function(layer) {
    if (random) {
      util.shuffle(layer);
    }
    layer.forEach(function(u, i) {
      g.node(u).order = i;
    });
  });

  var cc = crossCount(g);
  g.graph().orderInitCC = cc;
  g.graph().orderCC = Number.MAX_VALUE;
}

},{"../util":23,"./crossCount":11}],14:[function(require,module,exports){
'use strict';

var util = require('../util'),
    Digraph = require('graphlib').Digraph,
    topsort = require('graphlib').alg.topsort,
    nodesFromList = require('graphlib').filter.nodesFromList;

module.exports = sortLayer;

function sortLayer(g, cg, weights) {
  weights = adjustWeights(g, weights);
  var result = sortLayerSubgraph(g, null, cg, weights);

  result.list.forEach(function(u, i) {
    g.node(u).order = i;
  });
  return result.constraintGraph;
}

function sortLayerSubgraph(g, sg, cg, weights) {
  cg = cg ? cg.filterNodes(nodesFromList(g.children(sg))) : new Digraph();

  var nodeData = {};
  g.children(sg).forEach(function(u) {
    if (g.children(u).length) {
      nodeData[u] = sortLayerSubgraph(g, u, cg, weights);
      nodeData[u].firstSG = u;
      nodeData[u].lastSG = u;
    } else {
      var ws = weights[u];
      nodeData[u] = {
        degree: ws.length,
        barycenter: util.sum(ws) / ws.length,
        order: g.node(u).order,
        orderCount: 1,
        list: [u]
      };
    }
  });

  resolveViolatedConstraints(g, cg, nodeData);

  var keys = Object.keys(nodeData);
  keys.sort(function(x, y) {
    return nodeData[x].barycenter - nodeData[y].barycenter ||
           nodeData[x].order - nodeData[y].order;
  });

  var result =  keys.map(function(u) { return nodeData[u]; })
                    .reduce(function(lhs, rhs) { return mergeNodeData(g, lhs, rhs); });
  return result;
}

function mergeNodeData(g, lhs, rhs) {
  var cg = mergeDigraphs(lhs.constraintGraph, rhs.constraintGraph);

  if (lhs.lastSG !== undefined && rhs.firstSG !== undefined) {
    if (cg === undefined) {
      cg = new Digraph();
    }
    if (!cg.hasNode(lhs.lastSG)) { cg.addNode(lhs.lastSG); }
    cg.addNode(rhs.firstSG);
    cg.addEdge(null, lhs.lastSG, rhs.firstSG);
  }

  return {
    degree: lhs.degree + rhs.degree,
    barycenter: (lhs.barycenter * lhs.degree + rhs.barycenter * rhs.degree) /
                (lhs.degree + rhs.degree),
    order: (lhs.order * lhs.orderCount + rhs.order * rhs.orderCount) /
           (lhs.orderCount + rhs.orderCount),
    orderCount: lhs.orderCount + rhs.orderCount,
    list: lhs.list.concat(rhs.list),
    firstSG: lhs.firstSG !== undefined ? lhs.firstSG : rhs.firstSG,
    lastSG: rhs.lastSG !== undefined ? rhs.lastSG : lhs.lastSG,
    constraintGraph: cg
  };
}

function mergeDigraphs(lhs, rhs) {
  if (lhs === undefined) return rhs;
  if (rhs === undefined) return lhs;

  lhs = lhs.copy();
  rhs.nodes().forEach(function(u) { lhs.addNode(u); });
  rhs.edges().forEach(function(e, u, v) { lhs.addEdge(null, u, v); });
  return lhs;
}

function resolveViolatedConstraints(g, cg, nodeData) {
  // Removes nodes `u` and `v` from `cg` and makes any edges incident on them
  // incident on `w` instead.
  function collapseNodes(u, v, w) {
    // TODO original paper removes self loops, but it is not obvious when this would happen
    cg.inEdges(u).forEach(function(e) {
      cg.delEdge(e);
      cg.addEdge(null, cg.source(e), w);
    });

    cg.outEdges(v).forEach(function(e) {
      cg.delEdge(e);
      cg.addEdge(null, w, cg.target(e));
    });

    cg.delNode(u);
    cg.delNode(v);
  }

  var violated;
  while ((violated = findViolatedConstraint(cg, nodeData)) !== undefined) {
    var source = cg.source(violated),
        target = cg.target(violated);

    var v;
    while ((v = cg.addNode(null)) && g.hasNode(v)) {
      cg.delNode(v);
    }

    // Collapse barycenter and list
    nodeData[v] = mergeNodeData(g, nodeData[source], nodeData[target]);
    delete nodeData[source];
    delete nodeData[target];

    collapseNodes(source, target, v);
    if (cg.incidentEdges(v).length === 0) { cg.delNode(v); }
  }
}

function findViolatedConstraint(cg, nodeData) {
  var us = topsort(cg);
  for (var i = 0; i < us.length; ++i) {
    var u = us[i];
    var inEdges = cg.inEdges(u);
    for (var j = 0; j < inEdges.length; ++j) {
      var e = inEdges[j];
      if (nodeData[cg.source(e)].barycenter >= nodeData[u].barycenter) {
        return e;
      }
    }
  }
}

// Adjust weights so that they fall in the range of 0..|N|-1. If a node has no
// weight assigned then set its adjusted weight to its current position. This
// allows us to better retain the origiinal position of nodes without neighbors.
function adjustWeights(g, weights) {
  var minW = Number.MAX_VALUE,
      maxW = 0,
      adjusted = {};
  g.eachNode(function(u) {
    if (g.children(u).length) return;

    var ws = weights[u];
    if (ws.length) {
      minW = Math.min(minW, util.min(ws));
      maxW = Math.max(maxW, util.max(ws));
    }
  });

  var rangeW = (maxW - minW);
  g.eachNode(function(u) {
    if (g.children(u).length) return;

    var ws = weights[u];
    if (!ws.length) {
      adjusted[u] = [g.node(u).order];
    } else {
      adjusted[u] = ws.map(function(w) {
        if (rangeW) {
          return (w - minW) * (g.order() - 1) / rangeW;
        } else {
          return g.order() - 1 / 2;
        }
      });
    }
  });

  return adjusted;
}

},{"../util":23,"graphlib":30}],15:[function(require,module,exports){
'use strict';

var util = require('./util');

/*
 * The algorithms here are based on Brandes and Köpf, "Fast and Simple
 * Horizontal Coordinate Assignment".
 */
module.exports = function() {
  // External configuration
  var config = {
    nodeSep: 50,
    edgeSep: 10,
    universalSep: null,
    rankSep: 30
  };

  var self = {};

  self.nodeSep = util.propertyAccessor(self, config, 'nodeSep');
  self.edgeSep = util.propertyAccessor(self, config, 'edgeSep');
  // If not null this separation value is used for all nodes and edges
  // regardless of their widths. `nodeSep` and `edgeSep` are ignored with this
  // option.
  self.universalSep = util.propertyAccessor(self, config, 'universalSep');
  self.rankSep = util.propertyAccessor(self, config, 'rankSep');
  self.debugLevel = util.propertyAccessor(self, config, 'debugLevel');

  self.run = run;

  return self;

  function run(g) {
    g = g.filterNodes(util.filterNonSubgraphs(g));

    var layering = util.ordering(g);

    var conflicts = findConflicts(g, layering);

    var xss = {};
    ['u', 'd'].forEach(function(vertDir) {
      if (vertDir === 'd') layering.reverse();

      ['l', 'r'].forEach(function(horizDir) {
        if (horizDir === 'r') reverseInnerOrder(layering);

        var dir = vertDir + horizDir;
        var align = verticalAlignment(g, layering, conflicts, vertDir === 'u' ? 'predecessors' : 'successors');
        xss[dir]= horizontalCompaction(g, layering, align.pos, align.root, align.align);

        if (config.debugLevel >= 3)
          debugPositioning(vertDir + horizDir, g, layering, xss[dir]);

        if (horizDir === 'r') flipHorizontally(xss[dir]);

        if (horizDir === 'r') reverseInnerOrder(layering);
      });

      if (vertDir === 'd') layering.reverse();
    });

    balance(g, layering, xss);

    g.eachNode(function(v) {
      var xs = [];
      for (var alignment in xss) {
        var alignmentX = xss[alignment][v];
        posXDebug(alignment, g, v, alignmentX);
        xs.push(alignmentX);
      }
      xs.sort(function(x, y) { return x - y; });
      posX(g, v, (xs[1] + xs[2]) / 2);
    });

    // Align y coordinates with ranks
    var y = 0, reverseY = g.graph().rankDir === 'BT' || g.graph().rankDir === 'RL';
    layering.forEach(function(layer) {
      var maxHeight = util.max(layer.map(function(u) { return height(g, u); }));
      y += maxHeight / 2;
      layer.forEach(function(u) {
        posY(g, u, reverseY ? -y : y);
      });
      y += maxHeight / 2 + config.rankSep;
    });

    // Translate layout so that top left corner of bounding rectangle has
    // coordinate (0, 0).
    var minX = util.min(g.nodes().map(function(u) { return posX(g, u) - width(g, u) / 2; }));
    var minY = util.min(g.nodes().map(function(u) { return posY(g, u) - height(g, u) / 2; }));
    g.eachNode(function(u) {
      posX(g, u, posX(g, u) - minX);
      posY(g, u, posY(g, u) - minY);
    });
  }

  /*
   * Generate an ID that can be used to represent any undirected edge that is
   * incident on `u` and `v`.
   */
  function undirEdgeId(u, v) {
    return u < v
      ? u.toString().length + ':' + u + '-' + v
      : v.toString().length + ':' + v + '-' + u;
  }

  function findConflicts(g, layering) {
    var conflicts = {}, // Set of conflicting edge ids
        pos = {},       // Position of node in its layer
        prevLayer,
        currLayer,
        k0,     // Position of the last inner segment in the previous layer
        l,      // Current position in the current layer (for iteration up to `l1`)
        k1;     // Position of the next inner segment in the previous layer or
                // the position of the last element in the previous layer

    if (layering.length <= 2) return conflicts;

    function updateConflicts(v) {
      var k = pos[v];
      if (k < k0 || k > k1) {
        conflicts[undirEdgeId(currLayer[l], v)] = true;
      }
    }

    layering[1].forEach(function(u, i) { pos[u] = i; });
    for (var i = 1; i < layering.length - 1; ++i) {
      prevLayer = layering[i];
      currLayer = layering[i+1];
      k0 = 0;
      l = 0;

      // Scan current layer for next node that is incident to an inner segement
      // between layering[i+1] and layering[i].
      for (var l1 = 0; l1 < currLayer.length; ++l1) {
        var u = currLayer[l1]; // Next inner segment in the current layer or
                               // last node in the current layer
        pos[u] = l1;
        k1 = undefined;

        if (g.node(u).dummy) {
          var uPred = g.predecessors(u)[0];
          // Note: In the case of self loops and sideways edges it is possible
          // for a dummy not to have a predecessor.
          if (uPred !== undefined && g.node(uPred).dummy)
            k1 = pos[uPred];
        }
        if (k1 === undefined && l1 === currLayer.length - 1)
          k1 = prevLayer.length - 1;

        if (k1 !== undefined) {
          for (; l <= l1; ++l) {
            g.predecessors(currLayer[l]).forEach(updateConflicts);
          }
          k0 = k1;
        }
      }
    }

    return conflicts;
  }

  function verticalAlignment(g, layering, conflicts, relationship) {
    var pos = {},   // Position for a node in its layer
        root = {},  // Root of the block that the node participates in
        align = {}; // Points to the next node in the block or, if the last
                    // element in the block, points to the first block's root

    layering.forEach(function(layer) {
      layer.forEach(function(u, i) {
        root[u] = u;
        align[u] = u;
        pos[u] = i;
      });
    });

    layering.forEach(function(layer) {
      var prevIdx = -1;
      layer.forEach(function(v) {
        var related = g[relationship](v), // Adjacent nodes from the previous layer
            mid;                          // The mid point in the related array

        if (related.length > 0) {
          related.sort(function(x, y) { return pos[x] - pos[y]; });
          mid = (related.length - 1) / 2;
          related.slice(Math.floor(mid), Math.ceil(mid) + 1).forEach(function(u) {
            if (align[v] === v) {
              if (!conflicts[undirEdgeId(u, v)] && prevIdx < pos[u]) {
                align[u] = v;
                align[v] = root[v] = root[u];
                prevIdx = pos[u];
              }
            }
          });
        }
      });
    });

    return { pos: pos, root: root, align: align };
  }

  // This function deviates from the standard BK algorithm in two ways. First
  // it takes into account the size of the nodes. Second it includes a fix to
  // the original algorithm that is described in Carstens, "Node and Label
  // Placement in a Layered Layout Algorithm".
  function horizontalCompaction(g, layering, pos, root, align) {
    var sink = {},       // Mapping of node id -> sink node id for class
        maybeShift = {}, // Mapping of sink node id -> { class node id, min shift }
        shift = {},      // Mapping of sink node id -> shift
        pred = {},       // Mapping of node id -> predecessor node (or null)
        xs = {};         // Calculated X positions

    layering.forEach(function(layer) {
      layer.forEach(function(u, i) {
        sink[u] = u;
        maybeShift[u] = {};
        if (i > 0)
          pred[u] = layer[i - 1];
      });
    });

    function updateShift(toShift, neighbor, delta) {
      if (!(neighbor in maybeShift[toShift])) {
        maybeShift[toShift][neighbor] = delta;
      } else {
        maybeShift[toShift][neighbor] = Math.min(maybeShift[toShift][neighbor], delta);
      }
    }

    function placeBlock(v) {
      if (!(v in xs)) {
        xs[v] = 0;
        var w = v;
        do {
          if (pos[w] > 0) {
            var u = root[pred[w]];
            placeBlock(u);
            if (sink[v] === v) {
              sink[v] = sink[u];
            }
            var delta = sep(g, pred[w]) + sep(g, w);
            if (sink[v] !== sink[u]) {
              updateShift(sink[u], sink[v], xs[v] - xs[u] - delta);
            } else {
              xs[v] = Math.max(xs[v], xs[u] + delta);
            }
          }
          w = align[w];
        } while (w !== v);
      }
    }

    // Root coordinates relative to sink
    util.values(root).forEach(function(v) {
      placeBlock(v);
    });

    // Absolute coordinates
    // There is an assumption here that we've resolved shifts for any classes
    // that begin at an earlier layer. We guarantee this by visiting layers in
    // order.
    layering.forEach(function(layer) {
      layer.forEach(function(v) {
        xs[v] = xs[root[v]];
        if (v === root[v] && v === sink[v]) {
          var minShift = 0;
          if (v in maybeShift && Object.keys(maybeShift[v]).length > 0) {
            minShift = util.min(Object.keys(maybeShift[v])
                                 .map(function(u) {
                                      return maybeShift[v][u] + (u in shift ? shift[u] : 0);
                                      }
                                 ));
          }
          shift[v] = minShift;
        }
      });
    });

    layering.forEach(function(layer) {
      layer.forEach(function(v) {
        xs[v] += shift[sink[root[v]]] || 0;
      });
    });

    return xs;
  }

  function findMinCoord(g, layering, xs) {
    return util.min(layering.map(function(layer) {
      var u = layer[0];
      return xs[u];
    }));
  }

  function findMaxCoord(g, layering, xs) {
    return util.max(layering.map(function(layer) {
      var u = layer[layer.length - 1];
      return xs[u];
    }));
  }

  function balance(g, layering, xss) {
    var min = {},                            // Min coordinate for the alignment
        max = {},                            // Max coordinate for the alginment
        smallestAlignment,
        shift = {};                          // Amount to shift a given alignment

    function updateAlignment(v) {
      xss[alignment][v] += shift[alignment];
    }

    var smallest = Number.POSITIVE_INFINITY;
    for (var alignment in xss) {
      var xs = xss[alignment];
      min[alignment] = findMinCoord(g, layering, xs);
      max[alignment] = findMaxCoord(g, layering, xs);
      var w = max[alignment] - min[alignment];
      if (w < smallest) {
        smallest = w;
        smallestAlignment = alignment;
      }
    }

    // Determine how much to adjust positioning for each alignment
    ['u', 'd'].forEach(function(vertDir) {
      ['l', 'r'].forEach(function(horizDir) {
        var alignment = vertDir + horizDir;
        shift[alignment] = horizDir === 'l'
            ? min[smallestAlignment] - min[alignment]
            : max[smallestAlignment] - max[alignment];
      });
    });

    // Find average of medians for xss array
    for (alignment in xss) {
      g.eachNode(updateAlignment);
    }
  }

  function flipHorizontally(xs) {
    for (var u in xs) {
      xs[u] = -xs[u];
    }
  }

  function reverseInnerOrder(layering) {
    layering.forEach(function(layer) {
      layer.reverse();
    });
  }

  function width(g, u) {
    switch (g.graph().rankDir) {
      case 'LR': return g.node(u).height;
      case 'RL': return g.node(u).height;
      default:   return g.node(u).width;
    }
  }

  function height(g, u) {
    switch(g.graph().rankDir) {
      case 'LR': return g.node(u).width;
      case 'RL': return g.node(u).width;
      default:   return g.node(u).height;
    }
  }

  function sep(g, u) {
    if (config.universalSep !== null) {
      return config.universalSep;
    }
    var w = width(g, u);
    var s = g.node(u).dummy ? config.edgeSep : config.nodeSep;
    return (w + s) / 2;
  }

  function posX(g, u, x) {
    if (g.graph().rankDir === 'LR' || g.graph().rankDir === 'RL') {
      if (arguments.length < 3) {
        return g.node(u).y;
      } else {
        g.node(u).y = x;
      }
    } else {
      if (arguments.length < 3) {
        return g.node(u).x;
      } else {
        g.node(u).x = x;
      }
    }
  }

  function posXDebug(name, g, u, x) {
    if (g.graph().rankDir === 'LR' || g.graph().rankDir === 'RL') {
      if (arguments.length < 3) {
        return g.node(u)[name];
      } else {
        g.node(u)[name] = x;
      }
    } else {
      if (arguments.length < 3) {
        return g.node(u)[name];
      } else {
        g.node(u)[name] = x;
      }
    }
  }

  function posY(g, u, y) {
    if (g.graph().rankDir === 'LR' || g.graph().rankDir === 'RL') {
      if (arguments.length < 3) {
        return g.node(u).x;
      } else {
        g.node(u).x = y;
      }
    } else {
      if (arguments.length < 3) {
        return g.node(u).y;
      } else {
        g.node(u).y = y;
      }
    }
  }

  function debugPositioning(align, g, layering, xs) {
    layering.forEach(function(l, li) {
      var u, xU;
      l.forEach(function(v) {
        var xV = xs[v];
        if (u) {
          var s = sep(g, u) + sep(g, v);
          if (xV - xU < s)
            console.log('Position phase: sep violation. Align: ' + align + '. Layer: ' + li + '. ' +
              'U: ' + u + ' V: ' + v + '. Actual sep: ' + (xV - xU) + ' Expected sep: ' + s);
        }
        u = v;
        xU = xV;
      });
    });
  }
};

},{"./util":23}],16:[function(require,module,exports){
'use strict';

var util = require('./util'),
    acyclic = require('./rank/acyclic'),
    initRank = require('./rank/initRank'),
    feasibleTree = require('./rank/feasibleTree'),
    constraints = require('./rank/constraints'),
    simplex = require('./rank/simplex'),
    components = require('graphlib').alg.components,
    filter = require('graphlib').filter;

exports.run = run;
exports.restoreEdges = restoreEdges;

/*
 * Heuristic function that assigns a rank to each node of the input graph with
 * the intent of minimizing edge lengths, while respecting the `minLen`
 * attribute of incident edges.
 *
 * Prerequisites:
 *
 *  * Each edge in the input graph must have an assigned 'minLen' attribute
 */
function run(g, useSimplex) {
  expandSelfLoops(g);

  // If there are rank constraints on nodes, then build a new graph that
  // encodes the constraints.
  util.time('constraints.apply', constraints.apply)(g);

  expandSidewaysEdges(g);

  // Reverse edges to get an acyclic graph, we keep the graph in an acyclic
  // state until the very end.
  util.time('acyclic', acyclic)(g);

  // Convert the graph into a flat graph for ranking
  var flatGraph = g.filterNodes(util.filterNonSubgraphs(g));

  // Assign an initial ranking using DFS.
  initRank(flatGraph);

  // For each component improve the assigned ranks.
  components(flatGraph).forEach(function(cmpt) {
    var subgraph = flatGraph.filterNodes(filter.nodesFromList(cmpt));
    rankComponent(subgraph, useSimplex);
  });

  // Relax original constraints
  util.time('constraints.relax', constraints.relax(g));

  // When handling nodes with constrained ranks it is possible to end up with
  // edges that point to previous ranks. Most of the subsequent algorithms assume
  // that edges are pointing to successive ranks only. Here we reverse any "back
  // edges" and mark them as such. The acyclic algorithm will reverse them as a
  // post processing step.
  util.time('reorientEdges', reorientEdges)(g);
}

function restoreEdges(g) {
  acyclic.undo(g);
}

/*
 * Expand self loops into three dummy nodes. One will sit above the incident
 * node, one will be at the same level, and one below. The result looks like:
 *
 *         /--<--x--->--\
 *     node              y
 *         \--<--z--->--/
 *
 * Dummy nodes x, y, z give us the shape of a loop and node y is where we place
 * the label.
 *
 * TODO: consolidate knowledge of dummy node construction.
 * TODO: support minLen = 2
 */
function expandSelfLoops(g) {
  g.eachEdge(function(e, u, v, a) {
    if (u === v) {
      var x = addDummyNode(g, e, u, v, a, 0, false),
          y = addDummyNode(g, e, u, v, a, 1, true),
          z = addDummyNode(g, e, u, v, a, 2, false);
      g.addEdge(null, x, u, {minLen: 1, selfLoop: true});
      g.addEdge(null, x, y, {minLen: 1, selfLoop: true});
      g.addEdge(null, u, z, {minLen: 1, selfLoop: true});
      g.addEdge(null, y, z, {minLen: 1, selfLoop: true});
      g.delEdge(e);
    }
  });
}

function expandSidewaysEdges(g) {
  g.eachEdge(function(e, u, v, a) {
    if (u === v) {
      var origEdge = a.originalEdge,
          dummy = addDummyNode(g, origEdge.e, origEdge.u, origEdge.v, origEdge.value, 0, true);
      g.addEdge(null, u, dummy, {minLen: 1});
      g.addEdge(null, dummy, v, {minLen: 1});
      g.delEdge(e);
    }
  });
}

function addDummyNode(g, e, u, v, a, index, isLabel) {
  return g.addNode(null, {
    width: isLabel ? a.width : 0,
    height: isLabel ? a.height : 0,
    edge: { id: e, source: u, target: v, attrs: a },
    dummy: true,
    index: index
  });
}

function reorientEdges(g) {
  g.eachEdge(function(e, u, v, value) {
    if (g.node(u).rank > g.node(v).rank) {
      g.delEdge(e);
      value.reversed = true;
      g.addEdge(e, v, u, value);
    }
  });
}

function rankComponent(subgraph, useSimplex) {
  var spanningTree = feasibleTree(subgraph);

  if (useSimplex) {
    util.log(1, 'Using network simplex for ranking');
    simplex(subgraph, spanningTree);
  }
  normalize(subgraph);
}

function normalize(g) {
  var m = util.min(g.nodes().map(function(u) { return g.node(u).rank; }));
  g.eachNode(function(u, node) { node.rank -= m; });
}

},{"./rank/acyclic":17,"./rank/constraints":18,"./rank/feasibleTree":19,"./rank/initRank":20,"./rank/simplex":22,"./util":23,"graphlib":30}],17:[function(require,module,exports){
'use strict';

var util = require('../util');

module.exports = acyclic;
module.exports.undo = undo;

/*
 * This function takes a directed graph that may have cycles and reverses edges
 * as appropriate to break these cycles. Each reversed edge is assigned a
 * `reversed` attribute with the value `true`.
 *
 * There should be no self loops in the graph.
 */
function acyclic(g) {
  var onStack = {},
      visited = {},
      reverseCount = 0;
  
  function dfs(u) {
    if (u in visited) return;
    visited[u] = onStack[u] = true;
    g.outEdges(u).forEach(function(e) {
      var t = g.target(e),
          value;

      if (u === t) {
        console.error('Warning: found self loop "' + e + '" for node "' + u + '"');
      } else if (t in onStack) {
        value = g.edge(e);
        g.delEdge(e);
        value.reversed = true;
        ++reverseCount;
        g.addEdge(e, t, u, value);
      } else {
        dfs(t);
      }
    });

    delete onStack[u];
  }

  g.eachNode(function(u) { dfs(u); });

  util.log(2, 'Acyclic Phase: reversed ' + reverseCount + ' edge(s)');

  return reverseCount;
}

/*
 * Given a graph that has had the acyclic operation applied, this function
 * undoes that operation. More specifically, any edge with the `reversed`
 * attribute is again reversed to restore the original direction of the edge.
 */
function undo(g) {
  g.eachEdge(function(e, s, t, a) {
    if (a.reversed) {
      delete a.reversed;
      g.delEdge(e);
      g.addEdge(e, t, s, a);
    }
  });
}

},{"../util":23}],18:[function(require,module,exports){
'use strict';

exports.apply = function(g) {
  function dfs(sg) {
    var rankSets = {};
    g.children(sg).forEach(function(u) {
      if (g.children(u).length) {
        dfs(u);
        return;
      }

      var value = g.node(u),
          prefRank = value.prefRank;
      if (prefRank !== undefined) {
        if (!checkSupportedPrefRank(prefRank)) { return; }

        if (!(prefRank in rankSets)) {
          rankSets.prefRank = [u];
        } else {
          rankSets.prefRank.push(u);
        }

        var newU = rankSets[prefRank];
        if (newU === undefined) {
          newU = rankSets[prefRank] = g.addNode(null, { originalNodes: [] });
          g.parent(newU, sg);
        }

        redirectInEdges(g, u, newU, prefRank === 'min');
        redirectOutEdges(g, u, newU, prefRank === 'max');

        // Save original node and remove it from reduced graph
        g.node(newU).originalNodes.push({ u: u, value: value, parent: sg });
        g.delNode(u);
      }
    });

    addLightEdgesFromMinNode(g, sg, rankSets.min);
    addLightEdgesToMaxNode(g, sg, rankSets.max);
  }

  dfs(null);
};

function checkSupportedPrefRank(prefRank) {
  if (prefRank !== 'min' && prefRank !== 'max' && prefRank.indexOf('same_') !== 0) {
    console.error('Unsupported rank type: ' + prefRank);
    return false;
  }
  return true;
}

function redirectInEdges(g, u, newU, reverse) {
  g.inEdges(u).forEach(function(e) {
    var origValue = g.edge(e),
        value;
    if (origValue.originalEdge) {
      value = origValue;
    } else {
      value =  {
        originalEdge: { e: e, u: g.source(e), v: g.target(e), value: origValue },
        minLen: g.edge(e).minLen
      };
    }

    // Do not reverse edges for self-loops.
    if (origValue.selfLoop) {
      reverse = false;
    }

    if (reverse) {
      // Ensure that all edges to min are reversed
      g.addEdge(null, newU, g.source(e), value);
      value.reversed = true;
    } else {
      g.addEdge(null, g.source(e), newU, value);
    }
  });
}

function redirectOutEdges(g, u, newU, reverse) {
  g.outEdges(u).forEach(function(e) {
    var origValue = g.edge(e),
        value;
    if (origValue.originalEdge) {
      value = origValue;
    } else {
      value =  {
        originalEdge: { e: e, u: g.source(e), v: g.target(e), value: origValue },
        minLen: g.edge(e).minLen
      };
    }

    // Do not reverse edges for self-loops.
    if (origValue.selfLoop) {
      reverse = false;
    }

    if (reverse) {
      // Ensure that all edges from max are reversed
      g.addEdge(null, g.target(e), newU, value);
      value.reversed = true;
    } else {
      g.addEdge(null, newU, g.target(e), value);
    }
  });
}

function addLightEdgesFromMinNode(g, sg, minNode) {
  if (minNode !== undefined) {
    g.children(sg).forEach(function(u) {
      // The dummy check ensures we don't add an edge if the node is involved
      // in a self loop or sideways edge.
      if (u !== minNode && !g.outEdges(minNode, u).length && !g.node(u).dummy) {
        g.addEdge(null, minNode, u, { minLen: 0 });
      }
    });
  }
}

function addLightEdgesToMaxNode(g, sg, maxNode) {
  if (maxNode !== undefined) {
    g.children(sg).forEach(function(u) {
      // The dummy check ensures we don't add an edge if the node is involved
      // in a self loop or sideways edge.
      if (u !== maxNode && !g.outEdges(u, maxNode).length && !g.node(u).dummy) {
        g.addEdge(null, u, maxNode, { minLen: 0 });
      }
    });
  }
}

/*
 * This function "relaxes" the constraints applied previously by the "apply"
 * function. It expands any nodes that were collapsed and assigns the rank of
 * the collapsed node to each of the expanded nodes. It also restores the
 * original edges and removes any dummy edges pointing at the collapsed nodes.
 *
 * Note that the process of removing collapsed nodes also removes dummy edges
 * automatically.
 */
exports.relax = function(g) {
  // Save original edges
  var originalEdges = [];
  g.eachEdge(function(e, u, v, value) {
    var originalEdge = value.originalEdge;
    if (originalEdge) {
      originalEdges.push(originalEdge);
    }
  });

  // Expand collapsed nodes
  g.eachNode(function(u, value) {
    var originalNodes = value.originalNodes;
    if (originalNodes) {
      originalNodes.forEach(function(originalNode) {
        originalNode.value.rank = value.rank;
        g.addNode(originalNode.u, originalNode.value);
        g.parent(originalNode.u, originalNode.parent);
      });
      g.delNode(u);
    }
  });

  // Restore original edges
  originalEdges.forEach(function(edge) {
    g.addEdge(edge.e, edge.u, edge.v, edge.value);
  });
};

},{}],19:[function(require,module,exports){
'use strict';

/* jshint -W079 */
var Set = require('cp-data').Set,
/* jshint +W079 */
    Digraph = require('graphlib').Digraph,
    util = require('../util');

module.exports = feasibleTree;

/*
 * Given an acyclic graph with each node assigned a `rank` attribute, this
 * function constructs and returns a spanning tree. This function may reduce
 * the length of some edges from the initial rank assignment while maintaining
 * the `minLen` specified by each edge.
 *
 * Prerequisites:
 *
 * * The input graph is acyclic
 * * Each node in the input graph has an assigned `rank` attribute
 * * Each edge in the input graph has an assigned `minLen` attribute
 *
 * Outputs:
 *
 * A feasible spanning tree for the input graph (i.e. a spanning tree that
 * respects each graph edge's `minLen` attribute) represented as a Digraph with
 * a `root` attribute on graph.
 *
 * Nodes have the same id and value as that in the input graph.
 *
 * Edges in the tree have arbitrarily assigned ids. The attributes for edges
 * include `reversed`. `reversed` indicates that the edge is a
 * back edge in the input graph.
 */
function feasibleTree(g) {
  var remaining = new Set(g.nodes()),
      tree = new Digraph();

  if (remaining.size() === 1) {
    var root = g.nodes()[0];
    tree.addNode(root, {});
    tree.graph({ root: root });
    return tree;
  }

  function addTightEdges(v) {
    var continueToScan = true;
    g.predecessors(v).forEach(function(u) {
      if (remaining.has(u) && !slack(g, u, v)) {
        if (remaining.has(v)) {
          tree.addNode(v, {});
          remaining.remove(v);
          tree.graph({ root: v });
        }

        tree.addNode(u, {});
        tree.addEdge(null, u, v, { reversed: true });
        remaining.remove(u);
        addTightEdges(u);
        continueToScan = false;
      }
    });

    g.successors(v).forEach(function(w)  {
      if (remaining.has(w) && !slack(g, v, w)) {
        if (remaining.has(v)) {
          tree.addNode(v, {});
          remaining.remove(v);
          tree.graph({ root: v });
        }

        tree.addNode(w, {});
        tree.addEdge(null, v, w, {});
        remaining.remove(w);
        addTightEdges(w);
        continueToScan = false;
      }
    });
    return continueToScan;
  }

  function createTightEdge() {
    var minSlack = Number.MAX_VALUE;
    remaining.keys().forEach(function(v) {
      g.predecessors(v).forEach(function(u) {
        if (!remaining.has(u)) {
          var edgeSlack = slack(g, u, v);
          if (Math.abs(edgeSlack) < Math.abs(minSlack)) {
            minSlack = -edgeSlack;
          }
        }
      });

      g.successors(v).forEach(function(w) {
        if (!remaining.has(w)) {
          var edgeSlack = slack(g, v, w);
          if (Math.abs(edgeSlack) < Math.abs(minSlack)) {
            minSlack = edgeSlack;
          }
        }
      });
    });

    tree.eachNode(function(u) { g.node(u).rank -= minSlack; });
  }

  while (remaining.size()) {
    var nodesToSearch = !tree.order() ? remaining.keys() : tree.nodes();
    for (var i = 0, il = nodesToSearch.length;
         i < il && addTightEdges(nodesToSearch[i]);
         ++i);
    if (remaining.size()) {
      createTightEdge();
    }
  }

  return tree;
}

function slack(g, u, v) {
  var rankDiff = g.node(v).rank - g.node(u).rank;
  var maxMinLen = util.max(g.outEdges(u, v)
                            .map(function(e) { return g.edge(e).minLen; }));
  return rankDiff - maxMinLen;
}

},{"../util":23,"cp-data":25,"graphlib":30}],20:[function(require,module,exports){
'use strict';

var util = require('../util'),
    topsort = require('graphlib').alg.topsort;

module.exports = initRank;

/*
 * Assigns a `rank` attribute to each node in the input graph and ensures that
 * this rank respects the `minLen` attribute of incident edges.
 *
 * Prerequisites:
 *
 *  * The input graph must be acyclic
 *  * Each edge in the input graph must have an assigned 'minLen' attribute
 */
function initRank(g) {
  var sorted = topsort(g);

  sorted.forEach(function(u) {
    var inEdges = g.inEdges(u);
    if (inEdges.length === 0) {
      g.node(u).rank = 0;
      return;
    }

    var minLens = inEdges.map(function(e) {
      return g.node(g.source(e)).rank + g.edge(e).minLen;
    });
    g.node(u).rank = util.max(minLens);
  });
}

},{"../util":23,"graphlib":30}],21:[function(require,module,exports){
'use strict';

module.exports = {
  slack: slack
};

/*
 * A helper to calculate the slack between two nodes (`u` and `v`) given a
 * `minLen` constraint. The slack represents how much the distance between `u`
 * and `v` could shrink while maintaining the `minLen` constraint. If the value
 * is negative then the constraint is currently violated.
 *
  This function requires that `u` and `v` are in `graph` and they both have a
  `rank` attribute.
 */
function slack(graph, u, v, minLen) {
  return Math.abs(graph.node(u).rank - graph.node(v).rank) - minLen;
}

},{}],22:[function(require,module,exports){
'use strict';

var util = require('../util'),
    rankUtil = require('./rankUtil');

module.exports = simplex;

function simplex(graph, spanningTree) {
  // The network simplex algorithm repeatedly replaces edges of
  // the spanning tree with negative cut values until no such
  // edge exists.
  initCutValues(graph, spanningTree);
  while (true) {
    var e = leaveEdge(spanningTree);
    if (e === null) break;
    var f = enterEdge(graph, spanningTree, e);
    exchange(graph, spanningTree, e, f);
  }
}

/*
 * Set the cut values of edges in the spanning tree by a depth-first
 * postorder traversal.  The cut value corresponds to the cost, in
 * terms of a ranking's edge length sum, of lengthening an edge.
 * Negative cut values typically indicate edges that would yield a
 * smaller edge length sum if they were lengthened.
 */
function initCutValues(graph, spanningTree) {
  computeLowLim(spanningTree);

  spanningTree.eachEdge(function(id, u, v, treeValue) {
    treeValue.cutValue = 0;
  });

  // Propagate cut values up the tree.
  function dfs(n) {
    var children = spanningTree.successors(n);
    for (var c in children) {
      var child = children[c];
      dfs(child);
    }
    if (n !== spanningTree.graph().root) {
      setCutValue(graph, spanningTree, n);
    }
  }
  dfs(spanningTree.graph().root);
}

/*
 * Perform a DFS postorder traversal, labeling each node v with
 * its traversal order 'lim(v)' and the minimum traversal number
 * of any of its descendants 'low(v)'.  This provides an efficient
 * way to test whether u is an ancestor of v since
 * low(u) <= lim(v) <= lim(u) if and only if u is an ancestor.
 */
function computeLowLim(tree) {
  var postOrderNum = 0;
  
  function dfs(n) {
    var children = tree.successors(n);
    var low = postOrderNum;
    for (var c in children) {
      var child = children[c];
      dfs(child);
      low = Math.min(low, tree.node(child).low);
    }
    tree.node(n).low = low;
    tree.node(n).lim = postOrderNum++;
  }

  dfs(tree.graph().root);
}

/*
 * To compute the cut value of the edge parent -> child, we consider
 * it and any other graph edges to or from the child.
 *          parent
 *             |
 *           child
 *          /      \
 *         u        v
 */
function setCutValue(graph, tree, child) {
  var parentEdge = tree.inEdges(child)[0];

  // List of child's children in the spanning tree.
  var grandchildren = [];
  var grandchildEdges = tree.outEdges(child);
  for (var gce in grandchildEdges) {
    grandchildren.push(tree.target(grandchildEdges[gce]));
  }

  var cutValue = 0;

  // TODO: Replace unit increment/decrement with edge weights.
  var E = 0;    // Edges from child to grandchild's subtree.
  var F = 0;    // Edges to child from grandchild's subtree.
  var G = 0;    // Edges from child to nodes outside of child's subtree.
  var H = 0;    // Edges from nodes outside of child's subtree to child.

  // Consider all graph edges from child.
  var outEdges = graph.outEdges(child);
  var gc;
  for (var oe in outEdges) {
    var succ = graph.target(outEdges[oe]);
    for (gc in grandchildren) {
      if (inSubtree(tree, succ, grandchildren[gc])) {
        E++;
      }
    }
    if (!inSubtree(tree, succ, child)) {
      G++;
    }
  }

  // Consider all graph edges to child.
  var inEdges = graph.inEdges(child);
  for (var ie in inEdges) {
    var pred = graph.source(inEdges[ie]);
    for (gc in grandchildren) {
      if (inSubtree(tree, pred, grandchildren[gc])) {
        F++;
      }
    }
    if (!inSubtree(tree, pred, child)) {
      H++;
    }
  }

  // Contributions depend on the alignment of the parent -> child edge
  // and the child -> u or v edges.
  var grandchildCutSum = 0;
  for (gc in grandchildren) {
    var cv = tree.edge(grandchildEdges[gc]).cutValue;
    if (!tree.edge(grandchildEdges[gc]).reversed) {
      grandchildCutSum += cv;
    } else {
      grandchildCutSum -= cv;
    }
  }

  if (!tree.edge(parentEdge).reversed) {
    cutValue += grandchildCutSum - E + F - G + H;
  } else {
    cutValue -= grandchildCutSum - E + F - G + H;
  }

  tree.edge(parentEdge).cutValue = cutValue;
}

/*
 * Return whether n is a node in the subtree with the given
 * root.
 */
function inSubtree(tree, n, root) {
  return (tree.node(root).low <= tree.node(n).lim &&
          tree.node(n).lim <= tree.node(root).lim);
}

/*
 * Return an edge from the tree with a negative cut value, or null if there
 * is none.
 */
function leaveEdge(tree) {
  var edges = tree.edges();
  for (var n in edges) {
    var e = edges[n];
    var treeValue = tree.edge(e);
    if (treeValue.cutValue < 0) {
      return e;
    }
  }
  return null;
}

/*
 * The edge e should be an edge in the tree, with an underlying edge
 * in the graph, with a negative cut value.  Of the two nodes incident
 * on the edge, take the lower one.  enterEdge returns an edge with
 * minimum slack going from outside of that node's subtree to inside
 * of that node's subtree.
 */
function enterEdge(graph, tree, e) {
  var source = tree.source(e);
  var target = tree.target(e);
  var lower = tree.node(target).lim < tree.node(source).lim ? target : source;

  // Is the tree edge aligned with the graph edge?
  var aligned = !tree.edge(e).reversed;

  var minSlack = Number.POSITIVE_INFINITY;
  var minSlackEdge;
  if (aligned) {
    graph.eachEdge(function(id, u, v, value) {
      if (id !== e && inSubtree(tree, u, lower) && !inSubtree(tree, v, lower)) {
        var slack = rankUtil.slack(graph, u, v, value.minLen);
        if (slack < minSlack) {
          minSlack = slack;
          minSlackEdge = id;
        }
      }
    });
  } else {
    graph.eachEdge(function(id, u, v, value) {
      if (id !== e && !inSubtree(tree, u, lower) && inSubtree(tree, v, lower)) {
        var slack = rankUtil.slack(graph, u, v, value.minLen);
        if (slack < minSlack) {
          minSlack = slack;
          minSlackEdge = id;
        }
      }
    });
  }

  if (minSlackEdge === undefined) {
    var outside = [];
    var inside = [];
    graph.eachNode(function(id) {
      if (!inSubtree(tree, id, lower)) {
        outside.push(id);
      } else {
        inside.push(id);
      }
    });
    throw new Error('No edge found from outside of tree to inside');
  }

  return minSlackEdge;
}

/*
 * Replace edge e with edge f in the tree, recalculating the tree root,
 * the nodes' low and lim properties and the edges' cut values.
 */
function exchange(graph, tree, e, f) {
  tree.delEdge(e);
  var source = graph.source(f);
  var target = graph.target(f);

  // Redirect edges so that target is the root of its subtree.
  function redirect(v) {
    var edges = tree.inEdges(v);
    for (var i in edges) {
      var e = edges[i];
      var u = tree.source(e);
      var value = tree.edge(e);
      redirect(u);
      tree.delEdge(e);
      value.reversed = !value.reversed;
      tree.addEdge(e, v, u, value);
    }
  }

  redirect(target);

  var root = source;
  var edges = tree.inEdges(root);
  while (edges.length > 0) {
    root = tree.source(edges[0]);
    edges = tree.inEdges(root);
  }

  tree.graph().root = root;

  tree.addEdge(null, source, target, {cutValue: 0});

  initCutValues(graph, tree);

  adjustRanks(graph, tree);
}

/*
 * Reset the ranks of all nodes based on the current spanning tree.
 * The rank of the tree's root remains unchanged, while all other
 * nodes are set to the sum of minimum length constraints along
 * the path from the root.
 */
function adjustRanks(graph, tree) {
  function dfs(p) {
    var children = tree.successors(p);
    children.forEach(function(c) {
      var minLen = minimumLength(graph, p, c);
      graph.node(c).rank = graph.node(p).rank + minLen;
      dfs(c);
    });
  }

  dfs(tree.graph().root);
}

/*
 * If u and v are connected by some edges in the graph, return the
 * minimum length of those edges, as a positive number if v succeeds
 * u and as a negative number if v precedes u.
 */
function minimumLength(graph, u, v) {
  var outEdges = graph.outEdges(u, v);
  if (outEdges.length > 0) {
    return util.max(outEdges.map(function(e) {
      return graph.edge(e).minLen;
    }));
  }

  var inEdges = graph.inEdges(u, v);
  if (inEdges.length > 0) {
    return -util.max(inEdges.map(function(e) {
      return graph.edge(e).minLen;
    }));
  }
}

},{"../util":23,"./rankUtil":21}],23:[function(require,module,exports){
'use strict';

/*
 * Returns the smallest value in the array.
 */
exports.min = function(values) {
  return Math.min.apply(Math, values);
};

/*
 * Returns the largest value in the array.
 */
exports.max = function(values) {
  return Math.max.apply(Math, values);
};

/*
 * Returns `true` only if `f(x)` is `true` for all `x` in `xs`. Otherwise
 * returns `false`. This function will return immediately if it finds a
 * case where `f(x)` does not hold.
 */
exports.all = function(xs, f) {
  for (var i = 0; i < xs.length; ++i) {
    if (!f(xs[i])) {
      return false;
    }
  }
  return true;
};

/*
 * Accumulates the sum of elements in the given array using the `+` operator.
 */
exports.sum = function(values) {
  return values.reduce(function(acc, x) { return acc + x; }, 0);
};

/*
 * Returns an array of all values in the given object.
 */
exports.values = function(obj) {
  return Object.keys(obj).map(function(k) { return obj[k]; });
};

exports.shuffle = function(array) {
  for (var i = array.length - 1; i > 0; --i) {
    var j = Math.floor(Math.random() * (i + 1));
    var aj = array[j];
    array[j] = array[i];
    array[i] = aj;
  }
};

exports.propertyAccessor = function(self, config, field, setHook) {
  return function(x) {
    if (!arguments.length) return config[field];
    config[field] = x;
    if (setHook) setHook(x);
    return self;
  };
};

/*
 * Given a layered, directed graph with `rank` and `order` node attributes,
 * this function returns an array of ordered ranks. Each rank contains an array
 * of the ids of the nodes in that rank in the order specified by the `order`
 * attribute.
 */
exports.ordering = function(g) {
  var ordering = [];
  g.eachNode(function(u, value) {
    var rank = ordering[value.rank] || (ordering[value.rank] = []);
    rank[value.order] = u;
  });
  return ordering;
};

/*
 * A filter that can be used with `filterNodes` to get a graph that only
 * includes nodes that do not contain others nodes.
 */
exports.filterNonSubgraphs = function(g) {
  return function(u) {
    return g.children(u).length === 0;
  };
};

/*
 * Returns a new function that wraps `func` with a timer. The wrapper logs the
 * time it takes to execute the function.
 *
 * The timer will be enabled provided `log.level >= 1`.
 */
function time(name, func) {
  return function() {
    var start = new Date().getTime();
    try {
      return func.apply(null, arguments);
    } finally {
      log(1, name + ' time: ' + (new Date().getTime() - start) + 'ms');
    }
  };
}
time.enabled = false;

exports.time = time;

/*
 * A global logger with the specification `log(level, message, ...)` that
 * will log a message to the console if `log.level >= level`.
 */
function log(level) {
  if (log.level >= level) {
    console.log.apply(console, Array.prototype.slice.call(arguments, 1));
  }
}
log.level = 0;

exports.log = log;

},{}],24:[function(require,module,exports){
module.exports = '0.4.6';

},{}],25:[function(require,module,exports){
exports.Set = require('./lib/Set');
exports.PriorityQueue = require('./lib/PriorityQueue');
exports.version = require('./lib/version');

},{"./lib/PriorityQueue":26,"./lib/Set":27,"./lib/version":29}],26:[function(require,module,exports){
module.exports = PriorityQueue;

/**
 * A min-priority queue data structure. This algorithm is derived from Cormen,
 * et al., "Introduction to Algorithms". The basic idea of a min-priority
 * queue is that you can efficiently (in O(1) time) get the smallest key in
 * the queue. Adding and removing elements takes O(log n) time. A key can
 * have its priority decreased in O(log n) time.
 */
function PriorityQueue() {
  this._arr = [];
  this._keyIndices = {};
}

/**
 * Returns the number of elements in the queue. Takes `O(1)` time.
 */
PriorityQueue.prototype.size = function() {
  return this._arr.length;
};

/**
 * Returns the keys that are in the queue. Takes `O(n)` time.
 */
PriorityQueue.prototype.keys = function() {
  return this._arr.map(function(x) { return x.key; });
};

/**
 * Returns `true` if **key** is in the queue and `false` if not.
 */
PriorityQueue.prototype.has = function(key) {
  return key in this._keyIndices;
};

/**
 * Returns the priority for **key**. If **key** is not present in the queue
 * then this function returns `undefined`. Takes `O(1)` time.
 *
 * @param {Object} key
 */
PriorityQueue.prototype.priority = function(key) {
  var index = this._keyIndices[key];
  if (index !== undefined) {
    return this._arr[index].priority;
  }
};

/**
 * Returns the key for the minimum element in this queue. If the queue is
 * empty this function throws an Error. Takes `O(1)` time.
 */
PriorityQueue.prototype.min = function() {
  if (this.size() === 0) {
    throw new Error("Queue underflow");
  }
  return this._arr[0].key;
};

/**
 * Inserts a new key into the priority queue. If the key already exists in
 * the queue this function returns `false`; otherwise it will return `true`.
 * Takes `O(n)` time.
 *
 * @param {Object} key the key to add
 * @param {Number} priority the initial priority for the key
 */
PriorityQueue.prototype.add = function(key, priority) {
  var keyIndices = this._keyIndices;
  if (!(key in keyIndices)) {
    var arr = this._arr;
    var index = arr.length;
    keyIndices[key] = index;
    arr.push({key: key, priority: priority});
    this._decrease(index);
    return true;
  }
  return false;
};

/**
 * Removes and returns the smallest key in the queue. Takes `O(log n)` time.
 */
PriorityQueue.prototype.removeMin = function() {
  this._swap(0, this._arr.length - 1);
  var min = this._arr.pop();
  delete this._keyIndices[min.key];
  this._heapify(0);
  return min.key;
};

/**
 * Decreases the priority for **key** to **priority**. If the new priority is
 * greater than the previous priority, this function will throw an Error.
 *
 * @param {Object} key the key for which to raise priority
 * @param {Number} priority the new priority for the key
 */
PriorityQueue.prototype.decrease = function(key, priority) {
  var index = this._keyIndices[key];
  if (priority > this._arr[index].priority) {
    throw new Error("New priority is greater than current priority. " +
        "Key: " + key + " Old: " + this._arr[index].priority + " New: " + priority);
  }
  this._arr[index].priority = priority;
  this._decrease(index);
};

PriorityQueue.prototype._heapify = function(i) {
  var arr = this._arr;
  var l = 2 * i,
      r = l + 1,
      largest = i;
  if (l < arr.length) {
    largest = arr[l].priority < arr[largest].priority ? l : largest;
    if (r < arr.length) {
      largest = arr[r].priority < arr[largest].priority ? r : largest;
    }
    if (largest !== i) {
      this._swap(i, largest);
      this._heapify(largest);
    }
  }
};

PriorityQueue.prototype._decrease = function(index) {
  var arr = this._arr;
  var priority = arr[index].priority;
  var parent;
  while (index !== 0) {
    parent = index >> 1;
    if (arr[parent].priority < priority) {
      break;
    }
    this._swap(index, parent);
    index = parent;
  }
};

PriorityQueue.prototype._swap = function(i, j) {
  var arr = this._arr;
  var keyIndices = this._keyIndices;
  var origArrI = arr[i];
  var origArrJ = arr[j];
  arr[i] = origArrJ;
  arr[j] = origArrI;
  keyIndices[origArrJ.key] = i;
  keyIndices[origArrI.key] = j;
};

},{}],27:[function(require,module,exports){
var util = require('./util');

module.exports = Set;

/**
 * Constructs a new Set with an optional set of `initialKeys`.
 *
 * It is important to note that keys are coerced to String for most purposes
 * with this object, similar to the behavior of JavaScript's Object. For
 * example, the following will add only one key:
 *
 *     var s = new Set();
 *     s.add(1);
 *     s.add("1");
 *
 * However, the type of the key is preserved internally so that `keys` returns
 * the original key set uncoerced. For the above example, `keys` would return
 * `[1]`.
 */
function Set(initialKeys) {
  this._size = 0;
  this._keys = {};

  if (initialKeys) {
    for (var i = 0, il = initialKeys.length; i < il; ++i) {
      this.add(initialKeys[i]);
    }
  }
}

/**
 * Returns a new Set that represents the set intersection of the array of given
 * sets.
 */
Set.intersect = function(sets) {
  if (sets.length === 0) {
    return new Set();
  }

  var result = new Set(!util.isArray(sets[0]) ? sets[0].keys() : sets[0]);
  for (var i = 1, il = sets.length; i < il; ++i) {
    var resultKeys = result.keys(),
        other = !util.isArray(sets[i]) ? sets[i] : new Set(sets[i]);
    for (var j = 0, jl = resultKeys.length; j < jl; ++j) {
      var key = resultKeys[j];
      if (!other.has(key)) {
        result.remove(key);
      }
    }
  }

  return result;
};

/**
 * Returns a new Set that represents the set union of the array of given sets.
 */
Set.union = function(sets) {
  var totalElems = util.reduce(sets, function(lhs, rhs) {
    return lhs + (rhs.size ? rhs.size() : rhs.length);
  }, 0);
  var arr = new Array(totalElems);

  var k = 0;
  for (var i = 0, il = sets.length; i < il; ++i) {
    var cur = sets[i],
        keys = !util.isArray(cur) ? cur.keys() : cur;
    for (var j = 0, jl = keys.length; j < jl; ++j) {
      arr[k++] = keys[j];
    }
  }

  return new Set(arr);
};

/**
 * Returns the size of this set in `O(1)` time.
 */
Set.prototype.size = function() {
  return this._size;
};

/**
 * Returns the keys in this set. Takes `O(n)` time.
 */
Set.prototype.keys = function() {
  return values(this._keys);
};

/**
 * Tests if a key is present in this Set. Returns `true` if it is and `false`
 * if not. Takes `O(1)` time.
 */
Set.prototype.has = function(key) {
  return key in this._keys;
};

/**
 * Adds a new key to this Set if it is not already present. Returns `true` if
 * the key was added and `false` if it was already present. Takes `O(1)` time.
 */
Set.prototype.add = function(key) {
  if (!(key in this._keys)) {
    this._keys[key] = key;
    ++this._size;
    return true;
  }
  return false;
};

/**
 * Removes a key from this Set. If the key was removed this function returns
 * `true`. If not, it returns `false`. Takes `O(1)` time.
 */
Set.prototype.remove = function(key) {
  if (key in this._keys) {
    delete this._keys[key];
    --this._size;
    return true;
  }
  return false;
};

/*
 * Returns an array of all values for properties of **o**.
 */
function values(o) {
  var ks = Object.keys(o),
      len = ks.length,
      result = new Array(len),
      i;
  for (i = 0; i < len; ++i) {
    result[i] = o[ks[i]];
  }
  return result;
}

},{"./util":28}],28:[function(require,module,exports){
/*
 * This polyfill comes from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
 */
if(!Array.isArray) {
  exports.isArray = function (vArg) {
    return Object.prototype.toString.call(vArg) === '[object Array]';
  };
} else {
  exports.isArray = Array.isArray;
}

/*
 * Slightly adapted polyfill from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
 */
if ('function' !== typeof Array.prototype.reduce) {
  exports.reduce = function(array, callback, opt_initialValue) {
    'use strict';
    if (null === array || 'undefined' === typeof array) {
      // At the moment all modern browsers, that support strict mode, have
      // native implementation of Array.prototype.reduce. For instance, IE8
      // does not support strict mode, so this check is actually useless.
      throw new TypeError(
          'Array.prototype.reduce called on null or undefined');
    }
    if ('function' !== typeof callback) {
      throw new TypeError(callback + ' is not a function');
    }
    var index, value,
        length = array.length >>> 0,
        isValueSet = false;
    if (1 < arguments.length) {
      value = opt_initialValue;
      isValueSet = true;
    }
    for (index = 0; length > index; ++index) {
      if (array.hasOwnProperty(index)) {
        if (isValueSet) {
          value = callback(value, array[index], index, array);
        }
        else {
          value = array[index];
          isValueSet = true;
        }
      }
    }
    if (!isValueSet) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    return value;
  };
} else {
  exports.reduce = function(array, callback, opt_initialValue) {
    return array.reduce(callback, opt_initialValue);
  };
}

},{}],29:[function(require,module,exports){
module.exports = '1.1.3';

},{}],30:[function(require,module,exports){
exports.Graph = require("./lib/Graph");
exports.Digraph = require("./lib/Digraph");
exports.CGraph = require("./lib/CGraph");
exports.CDigraph = require("./lib/CDigraph");
require("./lib/graph-converters");

exports.alg = {
  isAcyclic: require("./lib/alg/isAcyclic"),
  components: require("./lib/alg/components"),
  dijkstra: require("./lib/alg/dijkstra"),
  dijkstraAll: require("./lib/alg/dijkstraAll"),
  findCycles: require("./lib/alg/findCycles"),
  floydWarshall: require("./lib/alg/floydWarshall"),
  postorder: require("./lib/alg/postorder"),
  preorder: require("./lib/alg/preorder"),
  prim: require("./lib/alg/prim"),
  tarjan: require("./lib/alg/tarjan"),
  topsort: require("./lib/alg/topsort")
};

exports.converter = {
  json: require("./lib/converter/json.js")
};

var filter = require("./lib/filter");
exports.filter = {
  all: filter.all,
  nodesFromList: filter.nodesFromList
};

exports.version = require("./lib/version");

},{"./lib/CDigraph":32,"./lib/CGraph":33,"./lib/Digraph":34,"./lib/Graph":35,"./lib/alg/components":36,"./lib/alg/dijkstra":37,"./lib/alg/dijkstraAll":38,"./lib/alg/findCycles":39,"./lib/alg/floydWarshall":40,"./lib/alg/isAcyclic":41,"./lib/alg/postorder":42,"./lib/alg/preorder":43,"./lib/alg/prim":44,"./lib/alg/tarjan":45,"./lib/alg/topsort":46,"./lib/converter/json.js":48,"./lib/filter":49,"./lib/graph-converters":50,"./lib/version":52}],31:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = BaseGraph;

function BaseGraph() {
  // The value assigned to the graph itself.
  this._value = undefined;

  // Map of node id -> { id, value }
  this._nodes = {};

  // Map of edge id -> { id, u, v, value }
  this._edges = {};

  // Used to generate a unique id in the graph
  this._nextId = 0;
}

// Number of nodes
BaseGraph.prototype.order = function() {
  return Object.keys(this._nodes).length;
};

// Number of edges
BaseGraph.prototype.size = function() {
  return Object.keys(this._edges).length;
};

// Accessor for graph level value
BaseGraph.prototype.graph = function(value) {
  if (arguments.length === 0) {
    return this._value;
  }
  this._value = value;
};

BaseGraph.prototype.hasNode = function(u) {
  return u in this._nodes;
};

BaseGraph.prototype.node = function(u, value) {
  var node = this._strictGetNode(u);
  if (arguments.length === 1) {
    return node.value;
  }
  node.value = value;
};

BaseGraph.prototype.nodes = function() {
  var nodes = [];
  this.eachNode(function(id) { nodes.push(id); });
  return nodes;
};

BaseGraph.prototype.eachNode = function(func) {
  for (var k in this._nodes) {
    var node = this._nodes[k];
    func(node.id, node.value);
  }
};

BaseGraph.prototype.hasEdge = function(e) {
  return e in this._edges;
};

BaseGraph.prototype.edge = function(e, value) {
  var edge = this._strictGetEdge(e);
  if (arguments.length === 1) {
    return edge.value;
  }
  edge.value = value;
};

BaseGraph.prototype.edges = function() {
  var es = [];
  this.eachEdge(function(id) { es.push(id); });
  return es;
};

BaseGraph.prototype.eachEdge = function(func) {
  for (var k in this._edges) {
    var edge = this._edges[k];
    func(edge.id, edge.u, edge.v, edge.value);
  }
};

BaseGraph.prototype.incidentNodes = function(e) {
  var edge = this._strictGetEdge(e);
  return [edge.u, edge.v];
};

BaseGraph.prototype.addNode = function(u, value) {
  if (u === undefined || u === null) {
    do {
      u = "_" + (++this._nextId);
    } while (this.hasNode(u));
  } else if (this.hasNode(u)) {
    throw new Error("Graph already has node '" + u + "'");
  }
  this._nodes[u] = { id: u, value: value };
  return u;
};

BaseGraph.prototype.delNode = function(u) {
  this._strictGetNode(u);
  this.incidentEdges(u).forEach(function(e) { this.delEdge(e); }, this);
  delete this._nodes[u];
};

// inMap and outMap are opposite sides of an incidence map. For example, for
// Graph these would both come from the _incidentEdges map, while for Digraph
// they would come from _inEdges and _outEdges.
BaseGraph.prototype._addEdge = function(e, u, v, value, inMap, outMap) {
  this._strictGetNode(u);
  this._strictGetNode(v);

  if (e === undefined || e === null) {
    do {
      e = "_" + (++this._nextId);
    } while (this.hasEdge(e));
  }
  else if (this.hasEdge(e)) {
    throw new Error("Graph already has edge '" + e + "'");
  }

  this._edges[e] = { id: e, u: u, v: v, value: value };
  addEdgeToMap(inMap[v], u, e);
  addEdgeToMap(outMap[u], v, e);

  return e;
};

// See note for _addEdge regarding inMap and outMap.
BaseGraph.prototype._delEdge = function(e, inMap, outMap) {
  var edge = this._strictGetEdge(e);
  delEdgeFromMap(inMap[edge.v], edge.u, e);
  delEdgeFromMap(outMap[edge.u], edge.v, e);
  delete this._edges[e];
};

BaseGraph.prototype.copy = function() {
  var copy = new this.constructor();
  copy.graph(this.graph());
  this.eachNode(function(u, value) { copy.addNode(u, value); });
  this.eachEdge(function(e, u, v, value) { copy.addEdge(e, u, v, value); });
  copy._nextId = this._nextId;
  return copy;
};

BaseGraph.prototype.filterNodes = function(filter) {
  var copy = new this.constructor();
  copy.graph(this.graph());
  this.eachNode(function(u, value) {
    if (filter(u)) {
      copy.addNode(u, value);
    }
  });
  this.eachEdge(function(e, u, v, value) {
    if (copy.hasNode(u) && copy.hasNode(v)) {
      copy.addEdge(e, u, v, value);
    }
  });
  return copy;
};

BaseGraph.prototype._strictGetNode = function(u) {
  var node = this._nodes[u];
  if (node === undefined) {
    throw new Error("Node '" + u + "' is not in graph");
  }
  return node;
};

BaseGraph.prototype._strictGetEdge = function(e) {
  var edge = this._edges[e];
  if (edge === undefined) {
    throw new Error("Edge '" + e + "' is not in graph");
  }
  return edge;
};

function addEdgeToMap(map, v, e) {
  (map[v] || (map[v] = new Set())).add(e);
}

function delEdgeFromMap(map, v, e) {
  var vEntry = map[v];
  vEntry.remove(e);
  if (vEntry.size() === 0) {
    delete map[v];
  }
}


},{"cp-data":25}],32:[function(require,module,exports){
var Digraph = require("./Digraph"),
    compoundify = require("./compoundify");

var CDigraph = compoundify(Digraph);

module.exports = CDigraph;

CDigraph.fromDigraph = function(src) {
  var g = new CDigraph(),
      graphValue = src.graph();

  if (graphValue !== undefined) {
    g.graph(graphValue);
  }

  src.eachNode(function(u, value) {
    if (value === undefined) {
      g.addNode(u);
    } else {
      g.addNode(u, value);
    }
  });
  src.eachEdge(function(e, u, v, value) {
    if (value === undefined) {
      g.addEdge(null, u, v);
    } else {
      g.addEdge(null, u, v, value);
    }
  });
  return g;
};

CDigraph.prototype.toString = function() {
  return "CDigraph " + JSON.stringify(this, null, 2);
};

},{"./Digraph":34,"./compoundify":47}],33:[function(require,module,exports){
var Graph = require("./Graph"),
    compoundify = require("./compoundify");

var CGraph = compoundify(Graph);

module.exports = CGraph;

CGraph.fromGraph = function(src) {
  var g = new CGraph(),
      graphValue = src.graph();

  if (graphValue !== undefined) {
    g.graph(graphValue);
  }

  src.eachNode(function(u, value) {
    if (value === undefined) {
      g.addNode(u);
    } else {
      g.addNode(u, value);
    }
  });
  src.eachEdge(function(e, u, v, value) {
    if (value === undefined) {
      g.addEdge(null, u, v);
    } else {
      g.addEdge(null, u, v, value);
    }
  });
  return g;
};

CGraph.prototype.toString = function() {
  return "CGraph " + JSON.stringify(this, null, 2);
};

},{"./Graph":35,"./compoundify":47}],34:[function(require,module,exports){
/*
 * This file is organized with in the following order:
 *
 * Exports
 * Graph constructors
 * Graph queries (e.g. nodes(), edges()
 * Graph mutators
 * Helper functions
 */

var util = require("./util"),
    BaseGraph = require("./BaseGraph"),
/* jshint -W079 */
    Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = Digraph;

/*
 * Constructor to create a new directed multi-graph.
 */
function Digraph() {
  BaseGraph.call(this);

  /*! Map of sourceId -> {targetId -> Set of edge ids} */
  this._inEdges = {};

  /*! Map of targetId -> {sourceId -> Set of edge ids} */
  this._outEdges = {};
}

Digraph.prototype = new BaseGraph();
Digraph.prototype.constructor = Digraph;

/*
 * Always returns `true`.
 */
Digraph.prototype.isDirected = function() {
  return true;
};

/*
 * Returns all successors of the node with the id `u`. That is, all nodes
 * that have the node `u` as their source are returned.
 * 
 * If no node `u` exists in the graph this function throws an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.successors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._outEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns all predecessors of the node with the id `u`. That is, all nodes
 * that have the node `u` as their target are returned.
 * 
 * If no node `u` exists in the graph this function throws an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.predecessors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._inEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns all nodes that are adjacent to the node with the id `u`. In other
 * words, this function returns the set of all successors and predecessors of
 * node `u`.
 *
 * @param {String} u a node id
 */
Digraph.prototype.neighbors = function(u) {
  return Set.union([this.successors(u), this.predecessors(u)]).keys();
};

/*
 * Returns all nodes in the graph that have no in-edges.
 */
Digraph.prototype.sources = function() {
  var self = this;
  return this._filterNodes(function(u) {
    // This could have better space characteristics if we had an inDegree function.
    return self.inEdges(u).length === 0;
  });
};

/*
 * Returns all nodes in the graph that have no out-edges.
 */
Digraph.prototype.sinks = function() {
  var self = this;
  return this._filterNodes(function(u) {
    // This could have better space characteristics if we have an outDegree function.
    return self.outEdges(u).length === 0;
  });
};

/*
 * Returns the source node incident on the edge identified by the id `e`. If no
 * such edge exists in the graph this function throws an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.source = function(e) {
  return this._strictGetEdge(e).u;
};

/*
 * Returns the target node incident on the edge identified by the id `e`. If no
 * such edge exists in the graph this function throws an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.target = function(e) {
  return this._strictGetEdge(e).v;
};

/*
 * Returns an array of ids for all edges in the graph that have the node
 * `target` as their target. If the node `target` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `source` node can also be specified. This causes the results
 * to be filtered such that only edges from `source` to `target` are included.
 * If the node `source` is specified but is not in the graph then this function
 * raises an Error.
 *
 * @param {String} target the target node id
 * @param {String} [source] an optional source node id
 */
Digraph.prototype.inEdges = function(target, source) {
  this._strictGetNode(target);
  var results = Set.union(util.values(this._inEdges[target])).keys();
  if (arguments.length > 1) {
    this._strictGetNode(source);
    results = results.filter(function(e) { return this.source(e) === source; }, this);
  }
  return results;
};

/*
 * Returns an array of ids for all edges in the graph that have the node
 * `source` as their source. If the node `source` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `target` node may also be specified. This causes the results
 * to be filtered such that only edges from `source` to `target` are included.
 * If the node `target` is specified but is not in the graph then this function
 * raises an Error.
 *
 * @param {String} source the source node id
 * @param {String} [target] an optional target node id
 */
Digraph.prototype.outEdges = function(source, target) {
  this._strictGetNode(source);
  var results = Set.union(util.values(this._outEdges[source])).keys();
  if (arguments.length > 1) {
    this._strictGetNode(target);
    results = results.filter(function(e) { return this.target(e) === target; }, this);
  }
  return results;
};

/*
 * Returns an array of ids for all edges in the graph that have the `u` as
 * their source or their target. If the node `u` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `v` node may also be specified. This causes the results to be
 * filtered such that only edges between `u` and `v` - in either direction -
 * are included. IF the node `v` is specified but not in the graph then this
 * function raises an Error.
 *
 * @param {String} u the node for which to find incident edges
 * @param {String} [v] option node that must be adjacent to `u`
 */
Digraph.prototype.incidentEdges = function(u, v) {
  if (arguments.length > 1) {
    return Set.union([this.outEdges(u, v), this.outEdges(v, u)]).keys();
  } else {
    return Set.union([this.inEdges(u), this.outEdges(u)]).keys();
  }
};

/*
 * Returns a string representation of this graph.
 */
Digraph.prototype.toString = function() {
  return "Digraph " + JSON.stringify(this, null, 2);
};

/*
 * Adds a new node with the id `u` to the graph and assigns it the value
 * `value`. If a node with the id is already a part of the graph this function
 * throws an Error.
 *
 * @param {String} u a node id
 * @param {Object} [value] an optional value to attach to the node
 */
Digraph.prototype.addNode = function(u, value) {
  u = BaseGraph.prototype.addNode.call(this, u, value);
  this._inEdges[u] = {};
  this._outEdges[u] = {};
  return u;
};

/*
 * Removes a node from the graph that has the id `u`. Any edges incident on the
 * node are also removed. If the graph does not contain a node with the id this
 * function will throw an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.delNode = function(u) {
  BaseGraph.prototype.delNode.call(this, u);
  delete this._inEdges[u];
  delete this._outEdges[u];
};

/*
 * Adds a new edge to the graph with the id `e` from a node with the id `source`
 * to a node with an id `target` and assigns it the value `value`. This graph
 * allows more than one edge from `source` to `target` as long as the id `e`
 * is unique in the set of edges. If `e` is `null` the graph will assign a
 * unique identifier to the edge.
 *
 * If `source` or `target` are not present in the graph this function will
 * throw an Error.
 *
 * @param {String} [e] an edge id
 * @param {String} source the source node id
 * @param {String} target the target node id
 * @param {Object} [value] an optional value to attach to the edge
 */
Digraph.prototype.addEdge = function(e, source, target, value) {
  return BaseGraph.prototype._addEdge.call(this, e, source, target, value,
                                           this._inEdges, this._outEdges);
};

/*
 * Removes an edge in the graph with the id `e`. If no edge in the graph has
 * the id `e` this function will throw an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.delEdge = function(e) {
  BaseGraph.prototype._delEdge.call(this, e, this._inEdges, this._outEdges);
};

// Unlike BaseGraph.filterNodes, this helper just returns nodes that
// satisfy a predicate.
Digraph.prototype._filterNodes = function(pred) {
  var filtered = [];
  this.eachNode(function(u) {
    if (pred(u)) {
      filtered.push(u);
    }
  });
  return filtered;
};


},{"./BaseGraph":31,"./util":51,"cp-data":25}],35:[function(require,module,exports){
/*
 * This file is organized with in the following order:
 *
 * Exports
 * Graph constructors
 * Graph queries (e.g. nodes(), edges()
 * Graph mutators
 * Helper functions
 */

var util = require("./util"),
    BaseGraph = require("./BaseGraph"),
/* jshint -W079 */
    Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = Graph;

/*
 * Constructor to create a new undirected multi-graph.
 */
function Graph() {
  BaseGraph.call(this);

  /*! Map of nodeId -> { otherNodeId -> Set of edge ids } */
  this._incidentEdges = {};
}

Graph.prototype = new BaseGraph();
Graph.prototype.constructor = Graph;

/*
 * Always returns `false`.
 */
Graph.prototype.isDirected = function() {
  return false;
};

/*
 * Returns all nodes that are adjacent to the node with the id `u`.
 *
 * @param {String} u a node id
 */
Graph.prototype.neighbors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._incidentEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns an array of ids for all edges in the graph that are incident on `u`.
 * If the node `u` is not in the graph this function raises an Error.
 *
 * Optionally a `v` node may also be specified. This causes the results to be
 * filtered such that only edges between `u` and `v` are included. If the node
 * `v` is specified but not in the graph then this function raises an Error.
 *
 * @param {String} u the node for which to find incident edges
 * @param {String} [v] option node that must be adjacent to `u`
 */
Graph.prototype.incidentEdges = function(u, v) {
  this._strictGetNode(u);
  if (arguments.length > 1) {
    this._strictGetNode(v);
    return v in this._incidentEdges[u] ? this._incidentEdges[u][v].keys() : [];
  } else {
    return Set.union(util.values(this._incidentEdges[u])).keys();
  }
};

/*
 * Returns a string representation of this graph.
 */
Graph.prototype.toString = function() {
  return "Graph " + JSON.stringify(this, null, 2);
};

/*
 * Adds a new node with the id `u` to the graph and assigns it the value
 * `value`. If a node with the id is already a part of the graph this function
 * throws an Error.
 *
 * @param {String} u a node id
 * @param {Object} [value] an optional value to attach to the node
 */
Graph.prototype.addNode = function(u, value) {
  u = BaseGraph.prototype.addNode.call(this, u, value);
  this._incidentEdges[u] = {};
  return u;
};

/*
 * Removes a node from the graph that has the id `u`. Any edges incident on the
 * node are also removed. If the graph does not contain a node with the id this
 * function will throw an Error.
 *
 * @param {String} u a node id
 */
Graph.prototype.delNode = function(u) {
  BaseGraph.prototype.delNode.call(this, u);
  delete this._incidentEdges[u];
};

/*
 * Adds a new edge to the graph with the id `e` between a node with the id `u`
 * and a node with an id `v` and assigns it the value `value`. This graph
 * allows more than one edge between `u` and `v` as long as the id `e`
 * is unique in the set of edges. If `e` is `null` the graph will assign a
 * unique identifier to the edge.
 *
 * If `u` or `v` are not present in the graph this function will throw an
 * Error.
 *
 * @param {String} [e] an edge id
 * @param {String} u the node id of one of the adjacent nodes
 * @param {String} v the node id of the other adjacent node
 * @param {Object} [value] an optional value to attach to the edge
 */
Graph.prototype.addEdge = function(e, u, v, value) {
  return BaseGraph.prototype._addEdge.call(this, e, u, v, value,
                                           this._incidentEdges, this._incidentEdges);
};

/*
 * Removes an edge in the graph with the id `e`. If no edge in the graph has
 * the id `e` this function will throw an Error.
 *
 * @param {String} e an edge id
 */
Graph.prototype.delEdge = function(e) {
  BaseGraph.prototype._delEdge.call(this, e, this._incidentEdges, this._incidentEdges);
};


},{"./BaseGraph":31,"./util":51,"cp-data":25}],36:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = components;

/**
 * Finds all [connected components][] in a graph and returns an array of these
 * components. Each component is itself an array that contains the ids of nodes
 * in the component.
 *
 * This function only works with undirected Graphs.
 *
 * [connected components]: http://en.wikipedia.org/wiki/Connected_component_(graph_theory)
 *
 * @param {Graph} g the graph to search for components
 */
function components(g) {
  var results = [];
  var visited = new Set();

  function dfs(v, component) {
    if (!visited.has(v)) {
      visited.add(v);
      component.push(v);
      g.neighbors(v).forEach(function(w) {
        dfs(w, component);
      });
    }
  }

  g.nodes().forEach(function(v) {
    var component = [];
    dfs(v, component);
    if (component.length > 0) {
      results.push(component);
    }
  });

  return results;
}

},{"cp-data":25}],37:[function(require,module,exports){
var PriorityQueue = require("cp-data").PriorityQueue;

module.exports = dijkstra;

/**
 * This function is an implementation of [Dijkstra's algorithm][] which finds
 * the shortest path from **source** to all other nodes in **g**. This
 * function returns a map of `u -> { distance, predecessor }`. The distance
 * property holds the sum of the weights from **source** to `u` along the
 * shortest path or `Number.POSITIVE_INFINITY` if there is no path from
 * **source**. The predecessor property can be used to walk the individual
 * elements of the path from **source** to **u** in reverse order.
 *
 * This function takes an optional `weightFunc(e)` which returns the
 * weight of the edge `e`. If no weightFunc is supplied then each edge is
 * assumed to have a weight of 1. This function throws an Error if any of
 * the traversed edges have a negative edge weight.
 *
 * This function takes an optional `incidentFunc(u)` which returns the ids of
 * all edges incident to the node `u` for the purposes of shortest path
 * traversal. By default this function uses the `g.outEdges` for Digraphs and
 * `g.incidentEdges` for Graphs.
 *
 * This function takes `O((|E| + |V|) * log |V|)` time.
 *
 * [Dijkstra's algorithm]: http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
 *
 * @param {Graph} g the graph to search for shortest paths from **source**
 * @param {Object} source the source from which to start the search
 * @param {Function} [weightFunc] optional weight function
 * @param {Function} [incidentFunc] optional incident function
 */
function dijkstra(g, source, weightFunc, incidentFunc) {
  var results = {},
      pq = new PriorityQueue();

  function updateNeighbors(e) {
    var incidentNodes = g.incidentNodes(e),
        v = incidentNodes[0] !== u ? incidentNodes[0] : incidentNodes[1],
        vEntry = results[v],
        weight = weightFunc(e),
        distance = uEntry.distance + weight;

    if (weight < 0) {
      throw new Error("dijkstra does not allow negative edge weights. Bad edge: " + e + " Weight: " + weight);
    }

    if (distance < vEntry.distance) {
      vEntry.distance = distance;
      vEntry.predecessor = u;
      pq.decrease(v, distance);
    }
  }

  weightFunc = weightFunc || function() { return 1; };
  incidentFunc = incidentFunc || (g.isDirected()
      ? function(u) { return g.outEdges(u); }
      : function(u) { return g.incidentEdges(u); });

  g.eachNode(function(u) {
    var distance = u === source ? 0 : Number.POSITIVE_INFINITY;
    results[u] = { distance: distance };
    pq.add(u, distance);
  });

  var u, uEntry;
  while (pq.size() > 0) {
    u = pq.removeMin();
    uEntry = results[u];
    if (uEntry.distance === Number.POSITIVE_INFINITY) {
      break;
    }

    incidentFunc(u).forEach(updateNeighbors);
  }

  return results;
}

},{"cp-data":25}],38:[function(require,module,exports){
var dijkstra = require("./dijkstra");

module.exports = dijkstraAll;

/**
 * This function finds the shortest path from each node to every other
 * reachable node in the graph. It is similar to [alg.dijkstra][], but
 * instead of returning a single-source array, it returns a mapping of
 * of `source -> alg.dijksta(g, source, weightFunc, incidentFunc)`.
 *
 * This function takes an optional `weightFunc(e)` which returns the
 * weight of the edge `e`. If no weightFunc is supplied then each edge is
 * assumed to have a weight of 1. This function throws an Error if any of
 * the traversed edges have a negative edge weight.
 *
 * This function takes an optional `incidentFunc(u)` which returns the ids of
 * all edges incident to the node `u` for the purposes of shortest path
 * traversal. By default this function uses the `outEdges` function on the
 * supplied graph.
 *
 * This function takes `O(|V| * (|E| + |V|) * log |V|)` time.
 *
 * [alg.dijkstra]: dijkstra.js.html#dijkstra
 *
 * @param {Graph} g the graph to search for shortest paths from **source**
 * @param {Function} [weightFunc] optional weight function
 * @param {Function} [incidentFunc] optional incident function
 */
function dijkstraAll(g, weightFunc, incidentFunc) {
  var results = {};
  g.eachNode(function(u) {
    results[u] = dijkstra(g, u, weightFunc, incidentFunc);
  });
  return results;
}

},{"./dijkstra":37}],39:[function(require,module,exports){
var tarjan = require("./tarjan");

module.exports = findCycles;

/*
 * Given a Digraph **g** this function returns all nodes that are part of a
 * cycle. Since there may be more than one cycle in a graph this function
 * returns an array of these cycles, where each cycle is itself represented
 * by an array of ids for each node involved in that cycle.
 *
 * [alg.isAcyclic][] is more efficient if you only need to determine whether
 * a graph has a cycle or not.
 *
 * [alg.isAcyclic]: isAcyclic.js.html#isAcyclic
 *
 * @param {Digraph} g the graph to search for cycles.
 */
function findCycles(g) {
  return tarjan(g).filter(function(cmpt) { return cmpt.length > 1; });
}

},{"./tarjan":45}],40:[function(require,module,exports){
module.exports = floydWarshall;

/**
 * This function is an implementation of the [Floyd-Warshall algorithm][],
 * which finds the shortest path from each node to every other reachable node
 * in the graph. It is similar to [alg.dijkstraAll][], but it handles negative
 * edge weights and is more efficient for some types of graphs. This function
 * returns a map of `source -> { target -> { distance, predecessor }`. The
 * distance property holds the sum of the weights from `source` to `target`
 * along the shortest path of `Number.POSITIVE_INFINITY` if there is no path
 * from `source`. The predecessor property can be used to walk the individual
 * elements of the path from `source` to `target` in reverse order.
 *
 * This function takes an optional `weightFunc(e)` which returns the
 * weight of the edge `e`. If no weightFunc is supplied then each edge is
 * assumed to have a weight of 1.
 *
 * This function takes an optional `incidentFunc(u)` which returns the ids of
 * all edges incident to the node `u` for the purposes of shortest path
 * traversal. By default this function uses the `outEdges` function on the
 * supplied graph.
 *
 * This algorithm takes O(|V|^3) time.
 *
 * [Floyd-Warshall algorithm]: https://en.wikipedia.org/wiki/Floyd-Warshall_algorithm
 * [alg.dijkstraAll]: dijkstraAll.js.html#dijkstraAll
 *
 * @param {Graph} g the graph to search for shortest paths from **source**
 * @param {Function} [weightFunc] optional weight function
 * @param {Function} [incidentFunc] optional incident function
 */
function floydWarshall(g, weightFunc, incidentFunc) {
  var results = {},
      nodes = g.nodes();

  weightFunc = weightFunc || function() { return 1; };
  incidentFunc = incidentFunc || (g.isDirected()
      ? function(u) { return g.outEdges(u); }
      : function(u) { return g.incidentEdges(u); });

  nodes.forEach(function(u) {
    results[u] = {};
    results[u][u] = { distance: 0 };
    nodes.forEach(function(v) {
      if (u !== v) {
        results[u][v] = { distance: Number.POSITIVE_INFINITY };
      }
    });
    incidentFunc(u).forEach(function(e) {
      var incidentNodes = g.incidentNodes(e),
          v = incidentNodes[0] !== u ? incidentNodes[0] : incidentNodes[1],
          d = weightFunc(e);
      if (d < results[u][v].distance) {
        results[u][v] = { distance: d, predecessor: u };
      }
    });
  });

  nodes.forEach(function(k) {
    var rowK = results[k];
    nodes.forEach(function(i) {
      var rowI = results[i];
      nodes.forEach(function(j) {
        var ik = rowI[k];
        var kj = rowK[j];
        var ij = rowI[j];
        var altDistance = ik.distance + kj.distance;
        if (altDistance < ij.distance) {
          ij.distance = altDistance;
          ij.predecessor = kj.predecessor;
        }
      });
    });
  });

  return results;
}

},{}],41:[function(require,module,exports){
var topsort = require("./topsort");

module.exports = isAcyclic;

/*
 * Given a Digraph **g** this function returns `true` if the graph has no
 * cycles and returns `false` if it does. This algorithm returns as soon as it
 * detects the first cycle.
 *
 * Use [alg.findCycles][] if you need the actual list of cycles in a graph.
 *
 * [alg.findCycles]: findCycles.js.html#findCycles
 *
 * @param {Digraph} g the graph to test for cycles
 */
function isAcyclic(g) {
  try {
    topsort(g);
  } catch (e) {
    if (e instanceof topsort.CycleException) return false;
    throw e;
  }
  return true;
}

},{"./topsort":46}],42:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = postorder;

// Postorder traversal of g, calling f for each visited node. Assumes the graph
// is a tree.
function postorder(g, root, f) {
  var visited = new Set();
  if (g.isDirected()) {
    throw new Error("This function only works for undirected graphs");
  }
  function dfs(u, prev) {
    if (visited.has(u)) {
      throw new Error("The input graph is not a tree: " + g);
    }
    visited.add(u);
    g.neighbors(u).forEach(function(v) {
      if (v !== prev) dfs(v, u);
    });
    f(u);
  }
  dfs(root);
}

},{"cp-data":25}],43:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = preorder;

// Preorder traversal of g, calling f for each visited node. Assumes the graph
// is a tree.
function preorder(g, root, f) {
  var visited = new Set();
  if (g.isDirected()) {
    throw new Error("This function only works for undirected graphs");
  }
  function dfs(u, prev) {
    if (visited.has(u)) {
      throw new Error("The input graph is not a tree: " + g);
    }
    visited.add(u);
    f(u);
    g.neighbors(u).forEach(function(v) {
      if (v !== prev) dfs(v, u);
    });
  }
  dfs(root);
}

},{"cp-data":25}],44:[function(require,module,exports){
var Graph = require("../Graph"),
    PriorityQueue = require("cp-data").PriorityQueue;

module.exports = prim;

/**
 * [Prim's algorithm][] takes a connected undirected graph and generates a
 * [minimum spanning tree][]. This function returns the minimum spanning
 * tree as an undirected graph. This algorithm is derived from the description
 * in "Introduction to Algorithms", Third Edition, Cormen, et al., Pg 634.
 *
 * This function takes a `weightFunc(e)` which returns the weight of the edge
 * `e`. It throws an Error if the graph is not connected.
 *
 * This function takes `O(|E| log |V|)` time.
 *
 * [Prim's algorithm]: https://en.wikipedia.org/wiki/Prim's_algorithm
 * [minimum spanning tree]: https://en.wikipedia.org/wiki/Minimum_spanning_tree
 *
 * @param {Graph} g the graph used to generate the minimum spanning tree
 * @param {Function} weightFunc the weight function to use
 */
function prim(g, weightFunc) {
  var result = new Graph(),
      parents = {},
      pq = new PriorityQueue(),
      u;

  function updateNeighbors(e) {
    var incidentNodes = g.incidentNodes(e),
        v = incidentNodes[0] !== u ? incidentNodes[0] : incidentNodes[1],
        pri = pq.priority(v);
    if (pri !== undefined) {
      var edgeWeight = weightFunc(e);
      if (edgeWeight < pri) {
        parents[v] = u;
        pq.decrease(v, edgeWeight);
      }
    }
  }

  if (g.order() === 0) {
    return result;
  }

  g.eachNode(function(u) {
    pq.add(u, Number.POSITIVE_INFINITY);
    result.addNode(u);
  });

  // Start from an arbitrary node
  pq.decrease(g.nodes()[0], 0);

  var init = false;
  while (pq.size() > 0) {
    u = pq.removeMin();
    if (u in parents) {
      result.addEdge(null, u, parents[u]);
    } else if (init) {
      throw new Error("Input graph is not connected: " + g);
    } else {
      init = true;
    }

    g.incidentEdges(u).forEach(updateNeighbors);
  }

  return result;
}

},{"../Graph":35,"cp-data":25}],45:[function(require,module,exports){
module.exports = tarjan;

/**
 * This function is an implementation of [Tarjan's algorithm][] which finds
 * all [strongly connected components][] in the directed graph **g**. Each
 * strongly connected component is composed of nodes that can reach all other
 * nodes in the component via directed edges. A strongly connected component
 * can consist of a single node if that node cannot both reach and be reached
 * by any other specific node in the graph. Components of more than one node
 * are guaranteed to have at least one cycle.
 *
 * This function returns an array of components. Each component is itself an
 * array that contains the ids of all nodes in the component.
 *
 * [Tarjan's algorithm]: http://en.wikipedia.org/wiki/Tarjan's_strongly_connected_components_algorithm
 * [strongly connected components]: http://en.wikipedia.org/wiki/Strongly_connected_component
 *
 * @param {Digraph} g the graph to search for strongly connected components
 */
function tarjan(g) {
  if (!g.isDirected()) {
    throw new Error("tarjan can only be applied to a directed graph. Bad input: " + g);
  }

  var index = 0,
      stack = [],
      visited = {}, // node id -> { onStack, lowlink, index }
      results = [];

  function dfs(u) {
    var entry = visited[u] = {
      onStack: true,
      lowlink: index,
      index: index++
    };
    stack.push(u);

    g.successors(u).forEach(function(v) {
      if (!(v in visited)) {
        dfs(v);
        entry.lowlink = Math.min(entry.lowlink, visited[v].lowlink);
      } else if (visited[v].onStack) {
        entry.lowlink = Math.min(entry.lowlink, visited[v].index);
      }
    });

    if (entry.lowlink === entry.index) {
      var cmpt = [],
          v;
      do {
        v = stack.pop();
        visited[v].onStack = false;
        cmpt.push(v);
      } while (u !== v);
      results.push(cmpt);
    }
  }

  g.nodes().forEach(function(u) {
    if (!(u in visited)) {
      dfs(u);
    }
  });

  return results;
}

},{}],46:[function(require,module,exports){
module.exports = topsort;
topsort.CycleException = CycleException;

/*
 * Given a graph **g**, this function returns an ordered list of nodes such
 * that for each edge `u -> v`, `u` appears before `v` in the list. If the
 * graph has a cycle it is impossible to generate such a list and
 * **CycleException** is thrown.
 *
 * See [topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)
 * for more details about how this algorithm works.
 *
 * @param {Digraph} g the graph to sort
 */
function topsort(g) {
  if (!g.isDirected()) {
    throw new Error("topsort can only be applied to a directed graph. Bad input: " + g);
  }

  var visited = {};
  var stack = {};
  var results = [];

  function visit(node) {
    if (node in stack) {
      throw new CycleException();
    }

    if (!(node in visited)) {
      stack[node] = true;
      visited[node] = true;
      g.predecessors(node).forEach(function(pred) {
        visit(pred);
      });
      delete stack[node];
      results.push(node);
    }
  }

  var sinks = g.sinks();
  if (g.order() !== 0 && sinks.length === 0) {
    throw new CycleException();
  }

  g.sinks().forEach(function(sink) {
    visit(sink);
  });

  return results;
}

function CycleException() {}

CycleException.prototype.toString = function() {
  return "Graph has at least one cycle";
};

},{}],47:[function(require,module,exports){
// This file provides a helper function that mixes-in Dot behavior to an
// existing graph prototype.

/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = compoundify;

// Extends the given SuperConstructor with the ability for nodes to contain
// other nodes. A special node id `null` is used to indicate the root graph.
function compoundify(SuperConstructor) {
  function Constructor() {
    SuperConstructor.call(this);

    // Map of object id -> parent id (or null for root graph)
    this._parents = {};

    // Map of id (or null) -> children set
    this._children = {};
    this._children[null] = new Set();
  }

  Constructor.prototype = new SuperConstructor();
  Constructor.prototype.constructor = Constructor;

  Constructor.prototype.parent = function(u, parent) {
    this._strictGetNode(u);

    if (arguments.length < 2) {
      return this._parents[u];
    }

    if (u === parent) {
      throw new Error("Cannot make " + u + " a parent of itself");
    }
    if (parent !== null) {
      this._strictGetNode(parent);
    }

    this._children[this._parents[u]].remove(u);
    this._parents[u] = parent;
    this._children[parent].add(u);
  };

  Constructor.prototype.children = function(u) {
    if (u !== null) {
      this._strictGetNode(u);
    }
    return this._children[u].keys();
  };

  Constructor.prototype.addNode = function(u, value) {
    u = SuperConstructor.prototype.addNode.call(this, u, value);
    this._parents[u] = null;
    this._children[u] = new Set();
    this._children[null].add(u);
    return u;
  };

  Constructor.prototype.delNode = function(u) {
    // Promote all children to the parent of the subgraph
    var parent = this.parent(u);
    this._children[u].keys().forEach(function(child) {
      this.parent(child, parent);
    }, this);

    this._children[parent].remove(u);
    delete this._parents[u];
    delete this._children[u];

    return SuperConstructor.prototype.delNode.call(this, u);
  };

  Constructor.prototype.copy = function() {
    var copy = SuperConstructor.prototype.copy.call(this);
    this.nodes().forEach(function(u) {
      copy.parent(u, this.parent(u));
    }, this);
    return copy;
  };

  Constructor.prototype.filterNodes = function(filter) {
    var self = this,
        copy = SuperConstructor.prototype.filterNodes.call(this, filter);

    var parents = {};
    function findParent(u) {
      var parent = self.parent(u);
      if (parent === null || copy.hasNode(parent)) {
        parents[u] = parent;
        return parent;
      } else if (parent in parents) {
        return parents[parent];
      } else {
        return findParent(parent);
      }
    }

    copy.eachNode(function(u) { copy.parent(u, findParent(u)); });

    return copy;
  };

  return Constructor;
}

},{"cp-data":25}],48:[function(require,module,exports){
var Graph = require("../Graph"),
    Digraph = require("../Digraph"),
    CGraph = require("../CGraph"),
    CDigraph = require("../CDigraph");

exports.decode = function(nodes, edges, Ctor) {
  Ctor = Ctor || Digraph;

  if (typeOf(nodes) !== "Array") {
    throw new Error("nodes is not an Array");
  }

  if (typeOf(edges) !== "Array") {
    throw new Error("edges is not an Array");
  }

  if (typeof Ctor === "string") {
    switch(Ctor) {
      case "graph": Ctor = Graph; break;
      case "digraph": Ctor = Digraph; break;
      case "cgraph": Ctor = CGraph; break;
      case "cdigraph": Ctor = CDigraph; break;
      default: throw new Error("Unrecognized graph type: " + Ctor);
    }
  }

  var graph = new Ctor();

  nodes.forEach(function(u) {
    graph.addNode(u.id, u.value);
  });

  // If the graph is compound, set up children...
  if (graph.parent) {
    nodes.forEach(function(u) {
      if (u.children) {
        u.children.forEach(function(v) {
          graph.parent(v, u.id);
        });
      }
    });
  }

  edges.forEach(function(e) {
    graph.addEdge(e.id, e.u, e.v, e.value);
  });

  return graph;
};

exports.encode = function(graph) {
  var nodes = [];
  var edges = [];

  graph.eachNode(function(u, value) {
    var node = {id: u, value: value};
    if (graph.children) {
      var children = graph.children(u);
      if (children.length) {
        node.children = children;
      }
    }
    nodes.push(node);
  });

  graph.eachEdge(function(e, u, v, value) {
    edges.push({id: e, u: u, v: v, value: value});
  });

  var type;
  if (graph instanceof CDigraph) {
    type = "cdigraph";
  } else if (graph instanceof CGraph) {
    type = "cgraph";
  } else if (graph instanceof Digraph) {
    type = "digraph";
  } else if (graph instanceof Graph) {
    type = "graph";
  } else {
    throw new Error("Couldn't determine type of graph: " + graph);
  }

  return { nodes: nodes, edges: edges, type: type };
};

function typeOf(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

},{"../CDigraph":32,"../CGraph":33,"../Digraph":34,"../Graph":35}],49:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

exports.all = function() {
  return function() { return true; };
};

exports.nodesFromList = function(nodes) {
  var set = new Set(nodes);
  return function(u) {
    return set.has(u);
  };
};

},{"cp-data":25}],50:[function(require,module,exports){
var Graph = require("./Graph"),
    Digraph = require("./Digraph");

// Side-effect based changes are lousy, but node doesn't seem to resolve the
// requires cycle.

/**
 * Returns a new directed graph using the nodes and edges from this graph. The
 * new graph will have the same nodes, but will have twice the number of edges:
 * each edge is split into two edges with opposite directions. Edge ids,
 * consequently, are not preserved by this transformation.
 */
Graph.prototype.toDigraph =
Graph.prototype.asDirected = function() {
  var g = new Digraph();
  this.eachNode(function(u, value) { g.addNode(u, value); });
  this.eachEdge(function(e, u, v, value) {
    g.addEdge(null, u, v, value);
    g.addEdge(null, v, u, value);
  });
  return g;
};

/**
 * Returns a new undirected graph using the nodes and edges from this graph.
 * The new graph will have the same nodes, but the edges will be made
 * undirected. Edge ids are preserved in this transformation.
 */
Digraph.prototype.toGraph =
Digraph.prototype.asUndirected = function() {
  var g = new Graph();
  this.eachNode(function(u, value) { g.addNode(u, value); });
  this.eachEdge(function(e, u, v, value) {
    g.addEdge(e, u, v, value);
  });
  return g;
};

},{"./Digraph":34,"./Graph":35}],51:[function(require,module,exports){
// Returns an array of all values for properties of **o**.
exports.values = function(o) {
  var ks = Object.keys(o),
      len = ks.length,
      result = new Array(len),
      i;
  for (i = 0; i < len; ++i) {
    result[i] = o[ks[i]];
  }
  return result;
};

},{}],52:[function(require,module,exports){
module.exports = '0.7.4';

},{}],53:[function(require,module,exports){
var parse = require("./lib/parse"),
    write = require("./lib/write"),
    version = require("./lib/version");

module.exports = {
  // DOT graphs
  DotGraph: require("./lib/DotGraph"),
  DotDigraph: require("./lib/DotDigraph"),

  // Parsing
  parse: parse,
  decode: parse,
  parseMany: parse.parseMany,

  // Writing
  write: write,
  encode: write,

  // Version
  version: version,

  // For levelup encoding
  type: "dot",
  buffer: false
};

},{"./lib/DotDigraph":54,"./lib/DotGraph":55,"./lib/parse":59,"./lib/version":60,"./lib/write":61}],54:[function(require,module,exports){
var CDigraph = require("graphlib").CDigraph,
    dotify = require("./dotify");

var DotDigraph = dotify(CDigraph);

module.exports = DotDigraph;

DotDigraph.fromDigraph = function(src) {
  var g = new DotDigraph(),
      graphValue = src.graph();

  if (graphValue !== undefined) {
    g.graph(graphValue);
  }

  src.eachNode(function(u, value) {
    if (value === undefined) {
      g.addNode(u);
    } else {
      g.addNode(u, value);
    }
  });
  src.eachEdge(function(e, u, v, value) {
    if (value === undefined) {
      g.addEdge(null, u, v);
    } else {
      g.addEdge(null, u, v, value);
    }
  });
  return g;
};

},{"./dotify":58,"graphlib":62}],55:[function(require,module,exports){
var CGraph = require("graphlib").CGraph,
    dotify = require("./dotify");

var DotGraph = dotify(CGraph);

module.exports = DotGraph;

DotGraph.fromGraph = function(src) {
  var g = new DotGraph(),
      graphValue = src.graph();

  if (graphValue !== undefined) {
    g.graph(graphValue);
  }

  src.eachNode(function(u, value) {
    if (value === undefined) {
      g.addNode(u);
    } else {
      g.addNode(u, value);
    }
  });
  src.eachEdge(function(e, u, v, value) {
    if (value === undefined) {
      g.addEdge(null, u, v);
    } else {
      g.addEdge(null, u, v, value);
    }
  });
  return g;
};

},{"./dotify":58,"graphlib":62}],56:[function(require,module,exports){
// A simple class for pretty printing strings with indentation

module.exports = Writer;

var INDENT = "    ";

function Writer() {
  this._indent = "";
  this._content = "";
  this._shouldIndent = true;
}

Writer.prototype.indent = function() {
  this._indent += INDENT;
};

Writer.prototype.unindent = function() {
  this._indent = this._indent.slice(INDENT.length);
};

Writer.prototype.writeLine = function(line) {
  this.write((line || "") + "\n");
  this._shouldIndent = true;
};

Writer.prototype.write = function(str) {
  if (this._shouldIndent) {
    this._shouldIndent = false;
    this._content += this._indent;
  }
  this._content += str;
};

Writer.prototype.toString = function() {
  return this._content;
};

},{}],57:[function(require,module,exports){
module.exports = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "start": parse_start,
        "graphStmt": parse_graphStmt,
        "stmtList": parse_stmtList,
        "stmt": parse_stmt,
        "attrStmt": parse_attrStmt,
        "inlineAttrStmt": parse_inlineAttrStmt,
        "nodeStmt": parse_nodeStmt,
        "edgeStmt": parse_edgeStmt,
        "subgraphStmt": parse_subgraphStmt,
        "attrList": parse_attrList,
        "attrListBlock": parse_attrListBlock,
        "aList": parse_aList,
        "edgeRHS": parse_edgeRHS,
        "idDef": parse_idDef,
        "nodeIdOrSubgraph": parse_nodeIdOrSubgraph,
        "nodeId": parse_nodeId,
        "port": parse_port,
        "compassPt": parse_compassPt,
        "id": parse_id,
        "node": parse_node,
        "edge": parse_edge,
        "graph": parse_graph,
        "digraph": parse_digraph,
        "subgraph": parse_subgraph,
        "strict": parse_strict,
        "graphType": parse_graphType,
        "whitespace": parse_whitespace,
        "comment": parse_comment,
        "_": parse__
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "start";
      }
      
      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }
        
        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_start() {
        var result0, result1;
        
        result1 = parse_graphStmt();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_graphStmt();
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_graphStmt() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11, result12;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse__();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse__();
        }
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse_strict();
          if (result1 !== null) {
            result2 = parse__();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_graphType();
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                result4 = parse_id();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result5 = [];
                  result6 = parse__();
                  while (result6 !== null) {
                    result5.push(result6);
                    result6 = parse__();
                  }
                  if (result5 !== null) {
                    if (input.charCodeAt(pos) === 123) {
                      result6 = "{";
                      pos++;
                    } else {
                      result6 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"{\"");
                      }
                    }
                    if (result6 !== null) {
                      result7 = [];
                      result8 = parse__();
                      while (result8 !== null) {
                        result7.push(result8);
                        result8 = parse__();
                      }
                      if (result7 !== null) {
                        result8 = parse_stmtList();
                        result8 = result8 !== null ? result8 : "";
                        if (result8 !== null) {
                          result9 = [];
                          result10 = parse__();
                          while (result10 !== null) {
                            result9.push(result10);
                            result10 = parse__();
                          }
                          if (result9 !== null) {
                            if (input.charCodeAt(pos) === 125) {
                              result10 = "}";
                              pos++;
                            } else {
                              result10 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"}\"");
                              }
                            }
                            if (result10 !== null) {
                              result11 = [];
                              result12 = parse__();
                              while (result12 !== null) {
                                result11.push(result12);
                                result12 = parse__();
                              }
                              if (result11 !== null) {
                                result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11];
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, type, id, stmts) {
                return {type: type, id: id, stmts: stmts};
              })(pos0, result0[2], result0[4], result0[8]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_stmtList() {
        var result0, result1, result2, result3, result4, result5, result6, result7;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_stmt();
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 59) {
              result2 = ";";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\";\"");
              }
            }
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = [];
              pos2 = pos;
              result4 = [];
              result5 = parse__();
              while (result5 !== null) {
                result4.push(result5);
                result5 = parse__();
              }
              if (result4 !== null) {
                result5 = parse_stmt();
                if (result5 !== null) {
                  result6 = [];
                  result7 = parse__();
                  while (result7 !== null) {
                    result6.push(result7);
                    result7 = parse__();
                  }
                  if (result6 !== null) {
                    if (input.charCodeAt(pos) === 59) {
                      result7 = ";";
                      pos++;
                    } else {
                      result7 = null;
                      if (reportFailures === 0) {
                        matchFailed("\";\"");
                      }
                    }
                    result7 = result7 !== null ? result7 : "";
                    if (result7 !== null) {
                      result4 = [result4, result5, result6, result7];
                    } else {
                      result4 = null;
                      pos = pos2;
                    }
                  } else {
                    result4 = null;
                    pos = pos2;
                  }
                } else {
                  result4 = null;
                  pos = pos2;
                }
              } else {
                result4 = null;
                pos = pos2;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos2 = pos;
                result4 = [];
                result5 = parse__();
                while (result5 !== null) {
                  result4.push(result5);
                  result5 = parse__();
                }
                if (result4 !== null) {
                  result5 = parse_stmt();
                  if (result5 !== null) {
                    result6 = [];
                    result7 = parse__();
                    while (result7 !== null) {
                      result6.push(result7);
                      result7 = parse__();
                    }
                    if (result6 !== null) {
                      if (input.charCodeAt(pos) === 59) {
                        result7 = ";";
                        pos++;
                      } else {
                        result7 = null;
                        if (reportFailures === 0) {
                          matchFailed("\";\"");
                        }
                      }
                      result7 = result7 !== null ? result7 : "";
                      if (result7 !== null) {
                        result4 = [result4, result5, result6, result7];
                      } else {
                        result4 = null;
                        pos = pos2;
                      }
                    } else {
                      result4 = null;
                      pos = pos2;
                    }
                  } else {
                    result4 = null;
                    pos = pos2;
                  }
                } else {
                  result4 = null;
                  pos = pos2;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, first, rest) {
                var result = [first];
                for (var i = 0; i < rest.length; ++i) {
                    result.push(rest[i][1]);
                }
                return result;
              })(pos0, result0[0], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_stmt() {
        var result0;
        
        result0 = parse_attrStmt();
        if (result0 === null) {
          result0 = parse_edgeStmt();
          if (result0 === null) {
            result0 = parse_subgraphStmt();
            if (result0 === null) {
              result0 = parse_inlineAttrStmt();
              if (result0 === null) {
                result0 = parse_nodeStmt();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_attrStmt() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_graph();
        if (result0 === null) {
          result0 = parse_node();
          if (result0 === null) {
            result0 = parse_edge();
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            result2 = parse_attrList();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, type, attrs) {
                return { type: "attr", attrType: type, attrs: attrs || {}};
              })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_inlineAttrStmt() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_id();
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 61) {
              result2 = "=";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"=\"");
              }
            }
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                result4 = parse_id();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, k, v) {
                var attrs = {};
                attrs[k] = v;
                return { type: "inlineAttr", attrs: attrs };
              })(pos0, result0[0], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_nodeStmt() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_nodeId();
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            result2 = parse_attrList();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, id, attrs) { return {type: "node", id: id, attrs: attrs || {}}; })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_edgeStmt() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_nodeIdOrSubgraph();
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            result2 = parse_edgeRHS();
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                result4 = parse_attrList();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, lhs, rhs, attrs) {
                var elems = [lhs];
                for (var i = 0; i < rhs.length; ++i) {
                    elems.push(rhs[i]);
                }
                return { type: "edge", elems: elems, attrs: attrs || {} };
              })(pos0, result0[0], result0[2], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_subgraphStmt() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2, pos3;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        result0 = parse_subgraph();
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            pos3 = pos;
            result2 = parse_id();
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos3;
              }
            } else {
              result2 = null;
              pos = pos3;
            }
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos2;
            }
          } else {
            result0 = null;
            pos = pos2;
          }
        } else {
          result0 = null;
          pos = pos2;
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 123) {
            result1 = "{";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"{\"");
            }
          }
          if (result1 !== null) {
            result2 = [];
            result3 = parse__();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse__();
            }
            if (result2 !== null) {
              result3 = parse_stmtList();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = [];
                result5 = parse__();
                while (result5 !== null) {
                  result4.push(result5);
                  result5 = parse__();
                }
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 125) {
                    result5 = "}";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"}\"");
                    }
                  }
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, id, stmts) {
                id = id[2] || [];
                return { type: "subgraph", id: id[0], stmts: stmts };
              })(pos0, result0[0], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_attrList() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_attrListBlock();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = [];
          result3 = parse__();
          while (result3 !== null) {
            result2.push(result3);
            result3 = parse__();
          }
          if (result2 !== null) {
            result3 = parse_attrListBlock();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = [];
            result3 = parse__();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse__();
            }
            if (result2 !== null) {
              result3 = parse_attrListBlock();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, first, rest) {
                var result = first;
                for (var i = 0; i < rest.length; ++i) {
                    result = rightBiasedMerge(result, rest[i][1]);
                }
                return result;
              })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_attrListBlock() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            result2 = parse_aList();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                if (input.charCodeAt(pos) === 93) {
                  result4 = "]";
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"]\"");
                  }
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, aList) { return aList; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_aList() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_idDef();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = [];
          result3 = parse__();
          while (result3 !== null) {
            result2.push(result3);
            result3 = parse__();
          }
          if (result2 !== null) {
            if (input.charCodeAt(pos) === 44) {
              result3 = ",";
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\",\"");
              }
            }
            result3 = result3 !== null ? result3 : "";
            if (result3 !== null) {
              result4 = [];
              result5 = parse__();
              while (result5 !== null) {
                result4.push(result5);
                result5 = parse__();
              }
              if (result4 !== null) {
                result5 = parse_idDef();
                if (result5 !== null) {
                  result2 = [result2, result3, result4, result5];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = [];
            result3 = parse__();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse__();
            }
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 44) {
                result3 = ",";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\",\"");
                }
              }
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = [];
                result5 = parse__();
                while (result5 !== null) {
                  result4.push(result5);
                  result5 = parse__();
                }
                if (result4 !== null) {
                  result5 = parse_idDef();
                  if (result5 !== null) {
                    result2 = [result2, result3, result4, result5];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, first, rest) {
                var result = first;
                for (var i = 0; i < rest.length; ++i) {
                    result = rightBiasedMerge(result, rest[i][3]);
                }
                return result;
              })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_edgeRHS() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        if (input.substr(pos, 2) === "--") {
          result0 = "--";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"--\"");
          }
        }
        if (result0 !== null) {
          result1 = (function(offset) { return directed; })(pos) ? null : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos2;
          }
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 === null) {
          pos2 = pos;
          if (input.substr(pos, 2) === "->") {
            result0 = "->";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"->\"");
            }
          }
          if (result0 !== null) {
            result1 = (function(offset) { return directed; })(pos) ? "" : null;
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos2;
            }
          } else {
            result0 = null;
            pos = pos2;
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            result2 = parse_nodeIdOrSubgraph();
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                result4 = parse_edgeRHS();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, rhs, rest) {
                var result = [rhs];
                for (var i = 0; i < rest.length; ++i) {
                    result.push(rest[i]);
                }
                return result;
              })(pos0, result0[2], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_idDef() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_id();
        if (result0 !== null) {
          pos2 = pos;
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 61) {
              result2 = "=";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"=\"");
              }
            }
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                result4 = parse_id();
                if (result4 !== null) {
                  result1 = [result1, result2, result3, result4];
                } else {
                  result1 = null;
                  pos = pos2;
                }
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, k, v) {
                var result = {};
                result[k] = v[3];
                return result;
              })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_nodeIdOrSubgraph() {
        var result0;
        var pos0;
        
        result0 = parse_subgraphStmt();
        if (result0 === null) {
          pos0 = pos;
          result0 = parse_nodeId();
          if (result0 !== null) {
            result0 = (function(offset, id) { return { type: "node", id: id, attrs: {} }; })(pos0, result0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_nodeId() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_id();
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            result2 = parse_port();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, id) { return id; })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_port() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 58) {
          result0 = ":";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\":\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse__();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse__();
          }
          if (result1 !== null) {
            result2 = parse_id();
            if (result2 !== null) {
              result3 = [];
              result4 = parse__();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse__();
              }
              if (result3 !== null) {
                pos1 = pos;
                if (input.charCodeAt(pos) === 58) {
                  result4 = ":";
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result4 !== null) {
                  result5 = [];
                  result6 = parse__();
                  while (result6 !== null) {
                    result5.push(result6);
                    result6 = parse__();
                  }
                  if (result5 !== null) {
                    result6 = parse_compassPt();
                    if (result6 !== null) {
                      result4 = [result4, result5, result6];
                    } else {
                      result4 = null;
                      pos = pos1;
                    }
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_compassPt() {
        var result0;
        
        if (input.substr(pos, 2) === "ne") {
          result0 = "ne";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ne\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 2) === "se") {
            result0 = "se";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"se\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 2) === "sw") {
              result0 = "sw";
              pos += 2;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"sw\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 2) === "nw") {
                result0 = "nw";
                pos += 2;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"nw\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 110) {
                  result0 = "n";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"n\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 101) {
                    result0 = "e";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"e\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 115) {
                      result0 = "s";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"s\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 119) {
                        result0 = "w";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"w\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 99) {
                          result0 = "c";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"c\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.charCodeAt(pos) === 95) {
                            result0 = "_";
                            pos++;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"_\"");
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_id() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2, pos3;
        
        reportFailures++;
        pos0 = pos;
        pos1 = pos;
        if (/^[a-zA-Z\u0200-\u0377_]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z\\u0200-\\u0377_]");
          }
        }
        if (result0 !== null) {
          result1 = [];
          if (/^[a-zA-Z\u0200-\u0377_0-9]/.test(input.charAt(pos))) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[a-zA-Z\\u0200-\\u0377_0-9]");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (/^[a-zA-Z\u0200-\u0377_0-9]/.test(input.charAt(pos))) {
              result2 = input.charAt(pos);
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[a-zA-Z\\u0200-\\u0377_0-9]");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, fst, rest) { return fst + rest.join(""); })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 45) {
            result0 = "-";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          result0 = result0 !== null ? result0 : "";
          if (result0 !== null) {
            if (input.charCodeAt(pos) === 46) {
              result1 = ".";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result1 !== null) {
              if (/^[0-9]/.test(input.charAt(pos))) {
                result3 = input.charAt(pos);
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9]");
                }
              }
              if (result3 !== null) {
                result2 = [];
                while (result3 !== null) {
                  result2.push(result3);
                  if (/^[0-9]/.test(input.charAt(pos))) {
                    result3 = input.charAt(pos);
                    pos++;
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("[0-9]");
                    }
                  }
                }
              } else {
                result2 = null;
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, sign, dot, after) { return sign + dot + after.join(""); })(pos0, result0[0], result0[1], result0[2]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            pos1 = pos;
            if (input.charCodeAt(pos) === 45) {
              result0 = "-";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"-\"");
              }
            }
            result0 = result0 !== null ? result0 : "";
            if (result0 !== null) {
              if (/^[0-9]/.test(input.charAt(pos))) {
                result2 = input.charAt(pos);
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9]");
                }
              }
              if (result2 !== null) {
                result1 = [];
                while (result2 !== null) {
                  result1.push(result2);
                  if (/^[0-9]/.test(input.charAt(pos))) {
                    result2 = input.charAt(pos);
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("[0-9]");
                    }
                  }
                }
              } else {
                result1 = null;
              }
              if (result1 !== null) {
                pos2 = pos;
                if (input.charCodeAt(pos) === 46) {
                  result2 = ".";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\".\"");
                  }
                }
                if (result2 !== null) {
                  result3 = [];
                  if (/^[0-9]/.test(input.charAt(pos))) {
                    result4 = input.charAt(pos);
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("[0-9]");
                    }
                  }
                  while (result4 !== null) {
                    result3.push(result4);
                    if (/^[0-9]/.test(input.charAt(pos))) {
                      result4 = input.charAt(pos);
                      pos++;
                    } else {
                      result4 = null;
                      if (reportFailures === 0) {
                        matchFailed("[0-9]");
                      }
                    }
                  }
                  if (result3 !== null) {
                    result2 = [result2, result3];
                  } else {
                    result2 = null;
                    pos = pos2;
                  }
                } else {
                  result2 = null;
                  pos = pos2;
                }
                result2 = result2 !== null ? result2 : "";
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
            if (result0 !== null) {
              result0 = (function(offset, sign, before, after) { return sign + before.join("") + (after[0] || "") + (after[1] || []).join(""); })(pos0, result0[0], result0[1], result0[2]);
            }
            if (result0 === null) {
              pos = pos0;
            }
            if (result0 === null) {
              pos0 = pos;
              pos1 = pos;
              if (input.charCodeAt(pos) === 34) {
                result0 = "\"";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\\"\"");
                }
              }
              if (result0 !== null) {
                result1 = [];
                pos2 = pos;
                if (input.substr(pos, 2) === "\\\"") {
                  result2 = "\\\"";
                  pos += 2;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"\\\\\\\"\"");
                  }
                }
                if (result2 !== null) {
                  result2 = (function(offset) { return '"'; })(pos2);
                }
                if (result2 === null) {
                  pos = pos2;
                }
                if (result2 === null) {
                  pos2 = pos;
                  pos3 = pos;
                  if (input.charCodeAt(pos) === 92) {
                    result2 = "\\";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"\\\\\"");
                    }
                  }
                  if (result2 !== null) {
                    if (/^[^"]/.test(input.charAt(pos))) {
                      result3 = input.charAt(pos);
                      pos++;
                    } else {
                      result3 = null;
                      if (reportFailures === 0) {
                        matchFailed("[^\"]");
                      }
                    }
                    if (result3 !== null) {
                      result2 = [result2, result3];
                    } else {
                      result2 = null;
                      pos = pos3;
                    }
                  } else {
                    result2 = null;
                    pos = pos3;
                  }
                  if (result2 !== null) {
                    result2 = (function(offset, ch) { return "\\" + ch; })(pos2, result2[1]);
                  }
                  if (result2 === null) {
                    pos = pos2;
                  }
                  if (result2 === null) {
                    if (/^[^"]/.test(input.charAt(pos))) {
                      result2 = input.charAt(pos);
                      pos++;
                    } else {
                      result2 = null;
                      if (reportFailures === 0) {
                        matchFailed("[^\"]");
                      }
                    }
                  }
                }
                while (result2 !== null) {
                  result1.push(result2);
                  pos2 = pos;
                  if (input.substr(pos, 2) === "\\\"") {
                    result2 = "\\\"";
                    pos += 2;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"\\\\\\\"\"");
                    }
                  }
                  if (result2 !== null) {
                    result2 = (function(offset) { return '"'; })(pos2);
                  }
                  if (result2 === null) {
                    pos = pos2;
                  }
                  if (result2 === null) {
                    pos2 = pos;
                    pos3 = pos;
                    if (input.charCodeAt(pos) === 92) {
                      result2 = "\\";
                      pos++;
                    } else {
                      result2 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"\\\\\"");
                      }
                    }
                    if (result2 !== null) {
                      if (/^[^"]/.test(input.charAt(pos))) {
                        result3 = input.charAt(pos);
                        pos++;
                      } else {
                        result3 = null;
                        if (reportFailures === 0) {
                          matchFailed("[^\"]");
                        }
                      }
                      if (result3 !== null) {
                        result2 = [result2, result3];
                      } else {
                        result2 = null;
                        pos = pos3;
                      }
                    } else {
                      result2 = null;
                      pos = pos3;
                    }
                    if (result2 !== null) {
                      result2 = (function(offset, ch) { return "\\" + ch; })(pos2, result2[1]);
                    }
                    if (result2 === null) {
                      pos = pos2;
                    }
                    if (result2 === null) {
                      if (/^[^"]/.test(input.charAt(pos))) {
                        result2 = input.charAt(pos);
                        pos++;
                      } else {
                        result2 = null;
                        if (reportFailures === 0) {
                          matchFailed("[^\"]");
                        }
                      }
                    }
                  }
                }
                if (result1 !== null) {
                  if (input.charCodeAt(pos) === 34) {
                    result2 = "\"";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"\\\"\"");
                    }
                  }
                  if (result2 !== null) {
                    result0 = [result0, result1, result2];
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
              if (result0 !== null) {
                result0 = (function(offset, id) { return id.join(""); })(pos0, result0[1]);
              }
              if (result0 === null) {
                pos = pos0;
              }
            }
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("identifier");
        }
        return result0;
      }
      
      function parse_node() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 4).toLowerCase() === "node") {
          result0 = input.substr(pos, 4);
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"node\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, k) { return k.toLowerCase(); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_edge() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 4).toLowerCase() === "edge") {
          result0 = input.substr(pos, 4);
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"edge\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, k) { return k.toLowerCase(); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_graph() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "graph") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"graph\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, k) { return k.toLowerCase(); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_digraph() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 7).toLowerCase() === "digraph") {
          result0 = input.substr(pos, 7);
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"digraph\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, k) { return k.toLowerCase(); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_subgraph() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 8).toLowerCase() === "subgraph") {
          result0 = input.substr(pos, 8);
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"subgraph\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, k) { return k.toLowerCase(); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_strict() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 6).toLowerCase() === "strict") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"strict\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, k) { return k.toLowerCase(); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_graphType() {
        var result0;
        var pos0;
        
        result0 = parse_graph();
        if (result0 === null) {
          pos0 = pos;
          result0 = parse_digraph();
          if (result0 !== null) {
            result0 = (function(offset, graph) {
                  directed = graph === "digraph";
                  return graph;
                })(pos0, result0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_whitespace() {
        var result0, result1;
        
        reportFailures++;
        if (/^[ \t\r\n]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[ \\t\\r\\n]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[ \t\r\n]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[ \\t\\r\\n]");
              }
            }
          }
        } else {
          result0 = null;
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("whitespace");
        }
        return result0;
      }
      
      function parse_comment() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        reportFailures++;
        pos0 = pos;
        if (input.substr(pos, 2) === "//") {
          result0 = "//";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"//\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          if (/^[^\n]/.test(input.charAt(pos))) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[^\\n]");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (/^[^\n]/.test(input.charAt(pos))) {
              result2 = input.charAt(pos);
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[^\\n]");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          if (input.substr(pos, 2) === "/*") {
            result0 = "/*";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"/*\"");
            }
          }
          if (result0 !== null) {
            result1 = [];
            pos1 = pos;
            pos2 = pos;
            reportFailures++;
            if (input.substr(pos, 2) === "*/") {
              result2 = "*/";
              pos += 2;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"*/\"");
              }
            }
            reportFailures--;
            if (result2 === null) {
              result2 = "";
            } else {
              result2 = null;
              pos = pos2;
            }
            if (result2 !== null) {
              if (input.length > pos) {
                result3 = input.charAt(pos);
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("any character");
                }
              }
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
            while (result2 !== null) {
              result1.push(result2);
              pos1 = pos;
              pos2 = pos;
              reportFailures++;
              if (input.substr(pos, 2) === "*/") {
                result2 = "*/";
                pos += 2;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"*/\"");
                }
              }
              reportFailures--;
              if (result2 === null) {
                result2 = "";
              } else {
                result2 = null;
                pos = pos2;
              }
              if (result2 !== null) {
                if (input.length > pos) {
                  result3 = input.charAt(pos);
                  pos++;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("any character");
                  }
                }
                if (result3 !== null) {
                  result2 = [result2, result3];
                } else {
                  result2 = null;
                  pos = pos1;
                }
              } else {
                result2 = null;
                pos = pos1;
              }
            }
            if (result1 !== null) {
              if (input.substr(pos, 2) === "*/") {
                result2 = "*/";
                pos += 2;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"*/\"");
                }
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("comment");
        }
        return result0;
      }
      
      function parse__() {
        var result0;
        
        result0 = parse_whitespace();
        if (result0 === null) {
          result0 = parse_comment();
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */
        
        var line = 1;
        var column = 1;
        var seenCR = false;
        
        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }
        
        return { line: line, column: column };
      }
      
      
          var directed;
      
          function rightBiasedMerge(lhs, rhs) {
              var result = {};
              for (var k in lhs) {
                  result[k] = lhs[k];
              }
              for (var k in rhs) {
                  result[k] = rhs[k];
              }
              return result;     
          }
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();
        
        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }
      
      return result;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();

},{}],58:[function(require,module,exports){
// This file provides a helper function that mixes-in Dot behavior to an
// existing graph prototype.

module.exports = dotify;

// Extends the given SuperConstructor with DOT behavior and returns the new
// constructor.
function dotify(SuperConstructor) {
  function Constructor() {
    SuperConstructor.call(this);
    this.graph({});
  }

  Constructor.prototype = new SuperConstructor();
  Constructor.prototype.constructor = Constructor;

  Constructor.prototype.graph = function(value) {
    if (arguments.length < 1) {
      return SuperConstructor.prototype.graph.call(this);
    }
    this._checkValueType(value);
    return SuperConstructor.prototype.graph.call(this, value);
  };

  Constructor.prototype.node = function(u, value) {
    if (arguments.length < 2) {
      return SuperConstructor.prototype.node.call(this, u);
    }
    this._checkValueType(value);
    return SuperConstructor.prototype.node.call(this, u, value);
  };

  Constructor.prototype.addNode = function(u, value) {
    if (arguments.length < 2) {
      value = {};
    }
    this._checkValueType(value);
    return SuperConstructor.prototype.addNode.call(this, u, value);
  };

  Constructor.prototype.edge = function(e, value) {
    if (arguments.length < 2) {
      return SuperConstructor.prototype.edge.call(this, e);
    }
    this._checkValueType(value);
    return SuperConstructor.prototype.edge.call(this, e, value);
  };

  Constructor.prototype.addEdge = function(e, u, v, value) {
    if (arguments.length < 4) {
      value = {};
    }
    this._checkValueType(value);
    return SuperConstructor.prototype.addEdge.call(this, e, u, v, value);
  };

  Constructor.prototype._checkValueType = function(value) {
    if (value === null || typeof value !== "object") {
      throw new Error("Value must be non-null and of type 'object'");
    }
  };

  return Constructor;
}

},{}],59:[function(require,module,exports){
var DotDigraph = require("./DotDigraph"),
    DotGraph = require("./DotGraph");

var dot_parser = require("./dot-grammar");

module.exports = parse;
module.exports.parseMany = parseMany;

/*
 * Parses a single DOT graph from the given string and returns it as one of:
 *
 * * `Digraph` if the input graph is a `digraph`.
 * * `Graph` if the input graph is a `graph`.
 *
 * Note: this is exported as the module export.
 *
 * @param {String} str the DOT string representation of one or more graphs
 */
function parse(str) {
  var parseTree = dot_parser.parse(str, "graphStmt");
  return buildGraph(parseTree);
}

/*
 * Parses one or more DOT graphs in the given string and returns them using
 * the same rules as described in [parse][] for individual graphs.
 *
 * [parse]: parse.js.html#parse
 *
 * @param {String} str the DOT string representation of one or more graphs
 */
function parseMany(str) {
  var parseTree = dot_parser.parse(str);

  return parseTree.map(function(subtree) {
    return buildGraph(subtree);
  });
}

function buildGraph(parseTree) {
  var g = parseTree.type === "graph" ? new DotGraph() : new DotDigraph();

  function createNode(id, attrs, sg) {
    if (!(g.hasNode(id))) {
      // We only apply default attributes to a node when it is first defined.
      // If the node is subsequently used in edges, we skip apply default
      // attributes.
      g.addNode(id, defaultAttrs.get("node", {}));

      // The "label" attribute is given special treatment: if it is not
      // defined we set it to the id of the node.
      if (g.node(id).label === undefined) {
        g.node(id).label = id;
      }

      if (sg !== null) {
        g.parent(id, sg);
      }
    }
    if (attrs) {
      mergeAttributes(attrs, g.node(id));
    }
  }

  function createEdge(source, target, attrs) {
    var edge = {};
    mergeAttributes(defaultAttrs.get("edge", attrs), edge);
    var id = attrs.id ? attrs.id : null;
    g.addEdge(id, source, target, edge);
  }

  function collectNodeIds(stmt) {
    var ids = {},
        stack = [],
        curr;
    function pushStack(e) { stack.push(e); }

    pushStack(stmt);
    while (stack.length !== 0) {
      curr = stack.pop();
      switch (curr.type) {
        case "node": ids[curr.id] = true; break;
        case "edge":
          curr.elems.forEach(pushStack);
          break;
        case "subgraph":
          curr.stmts.forEach(pushStack);
          break;
      }
    }
    return Object.keys(ids);
  }

  /*
   * We use a chain of prototypes to maintain properties as we descend into
   * subgraphs. This allows us to simply get the value for a property and have
   * the VM do appropriate resolution. When we leave a subgraph we simply set
   * the current context to the prototype of the current defaults object.
   * Alternatively, this could have been written using a stack.
   */
  var defaultAttrs = {
    _default: {},

    get: function get(type, attrs) {
      if (typeof this._default[type] !== "undefined") {
        var mergedAttrs = {};
        // clone default attributes so they won't get overwritten in the next step
        mergeAttributes(this._default[type], mergedAttrs);
        // merge statement attributes with default attributes, precedence give to stmt attributes
        mergeAttributes(attrs, mergedAttrs);
        return mergedAttrs;
      } else {
        return attrs;
      }
    },

    set: function set(type, attrs) {
      this._default[type] = this.get(type, attrs);
    },

    enterSubDigraph: function() {
      function SubDigraph() {}
      SubDigraph.prototype = this._default;
      var subgraph = new SubDigraph();
      this._default = subgraph;
    },

    exitSubDigraph: function() {
      this._default = Object.getPrototypeOf(this._default);
    }
  };

  function handleStmt(stmt, sg) {
    var attrs = stmt.attrs;
    switch (stmt.type) {
      case "node":
        createNode(stmt.id, attrs, sg);
        break;
      case "edge":
        var prev,
            curr;
        stmt.elems.forEach(function(elem) {
          handleStmt(elem, sg);

          switch(elem.type) {
            case "node": curr = [elem.id]; break;
            case "subgraph": curr = collectNodeIds(elem); break;
            default:
              // We don't currently support subgraphs incident on an edge
              throw new Error("Unsupported type incident on edge: " + elem.type);
          }

          if (prev) {
            prev.forEach(function(p) {
              curr.forEach(function(c) {
                createEdge(p, c, attrs);
              });
            });
          }
          prev = curr;
        });
        break;
      case "subgraph":
        defaultAttrs.enterSubDigraph();
        stmt.id = g.addNode(stmt.id);
        if (sg !== null) { g.parent(stmt.id, sg); }
        if (stmt.stmts) {
          stmt.stmts.forEach(function(s) { handleStmt(s, stmt.id); });
        }
        // If no children we remove the subgraph
        if (g.children(stmt.id).length === 0) {
          g.delNode(stmt.id);
        }
        defaultAttrs.exitSubDigraph();
        break;
      case "attr":
        defaultAttrs.set(stmt.attrType, attrs);
        break;
      case "inlineAttr":
        if (stmt.attrs) {
          mergeAttributes(attrs, sg === null ? g.graph() : g.node(sg));
        }
        break;
      default:
        throw new Error("Unsupported statement type: " + stmt.type);
    }
  }

  if (parseTree.stmts) {
    parseTree.stmts.forEach(function(stmt) {
      handleStmt(stmt, null);
    });
  }

  return g;
}

// Copies all key-value pairs from `src` to `dst`. This copy is destructive: if
// a key appears in both `src` and `dst` the value from `src` will overwrite
// the value in `dst`.
function mergeAttributes(src, dst) {
  Object.keys(src).forEach(function(k) { dst[k] = src[k]; });
}

},{"./DotDigraph":54,"./DotGraph":55,"./dot-grammar":57}],60:[function(require,module,exports){
module.exports = '0.4.10';

},{}],61:[function(require,module,exports){
var Writer = require('./Writer');

module.exports = write;

var UNESCAPED_ID_PATTERN = /^[a-zA-Z\200-\377_][a-zA-Z\200-\377_0-9]*$/;

/*
 * Writes a string representation of the given graph in the DOT language.
 *
 * Note: this is exported as the module export
 *
 * @param {Graph|Digraph} g the graph to serialize
 */
function write(g) {
  var ec = g.isDirected() ? '->' : '--';
  var writer = new Writer();

  writer.writeLine((g.isDirected() ? 'digraph' : 'graph') + ' {');
  writer.indent();

  var graphAttrs = g.graph();

  if(graphAttrs) {
    Object.keys(graphAttrs).map(function(k) {
      writer.writeLine(id(k) + '=' + id(graphAttrs[k]) + ';');
    });
  }

  writeSubgraph(g, null, writer);

  g.edges().forEach(function(e) {
    writeEdge(g, e, ec, writer);
  });

  writer.unindent();
  writer.writeLine('}');

  return writer.toString();
}

function writeSubgraph(g, u, writer) {
  var children = g.children ? g.children(u) : (u === null ? g.nodes() : []);
  children.forEach(function(v) {
    if (!g.children || g.children(v).length === 0) {
      writeNode(g, v, writer);
    } else {
      writer.writeLine('subgraph ' + id(v) + ' {');
      writer.indent();

      var attrs = g.node(v);
      Object.keys(attrs).map(function(k) {
        writer.writeLine(id(k) + '=' + id(attrs[k]) + ';');
      });

      writeSubgraph(g, v, writer);
      writer.unindent();
      writer.writeLine('}');
    }
  });
}

function id(obj) {
  if (typeof obj === 'number' || obj.toString().match(UNESCAPED_ID_PATTERN)) {
    return obj;
  }

  return '"' + obj.toString().replace(/"/g, '\\"') + '"';
}

function writeNode(g, u, writer) {
  var attrs = g.node(u);
  writer.write(id(u));

  if (attrs) {
    var attrStrs = Object.keys(attrs).map(function(k) {
      return id(k) + '=' + id(attrs[k]);
    });

    if (attrStrs.length) {
      writer.write(' [' + attrStrs.join(',') + ']');
    }
  }

  writer.writeLine();
}

function writeEdge(g, e, ec, writer) {
  var attrs = g.edge(e),
      incident = g.incidentNodes(e),
      u = incident[0],
      v = incident[1];

  writer.write(id(u) + ' ' + ec + ' ' + id(v));
  if (attrs) {
    var attrStrs = Object.keys(attrs).map(function(k) {
      return id(k) + '=' + id(attrs[k]);
    });

    if (attrStrs.length) {
      writer.write(' [' + attrStrs.join(',') + ']');
    }
  }

  writer.writeLine();
}


},{"./Writer":56}],62:[function(require,module,exports){
module.exports=require(30)
},{"./lib/CDigraph":64,"./lib/CGraph":65,"./lib/Digraph":66,"./lib/Graph":67,"./lib/alg/components":68,"./lib/alg/dijkstra":69,"./lib/alg/dijkstraAll":70,"./lib/alg/findCycles":71,"./lib/alg/floydWarshall":72,"./lib/alg/isAcyclic":73,"./lib/alg/postorder":74,"./lib/alg/preorder":75,"./lib/alg/prim":76,"./lib/alg/tarjan":77,"./lib/alg/topsort":78,"./lib/converter/json.js":80,"./lib/filter":81,"./lib/graph-converters":82,"./lib/version":84,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\index.js":30}],63:[function(require,module,exports){
module.exports=require(31)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\BaseGraph.js":31,"cp-data":85}],64:[function(require,module,exports){
module.exports=require(32)
},{"./Digraph":66,"./compoundify":79,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\CDigraph.js":32}],65:[function(require,module,exports){
module.exports=require(33)
},{"./Graph":67,"./compoundify":79,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\CGraph.js":33}],66:[function(require,module,exports){
module.exports=require(34)
},{"./BaseGraph":63,"./util":83,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\Digraph.js":34,"cp-data":85}],67:[function(require,module,exports){
module.exports=require(35)
},{"./BaseGraph":63,"./util":83,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\Graph.js":35,"cp-data":85}],68:[function(require,module,exports){
module.exports=require(36)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\components.js":36,"cp-data":85}],69:[function(require,module,exports){
module.exports=require(37)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\dijkstra.js":37,"cp-data":85}],70:[function(require,module,exports){
module.exports=require(38)
},{"./dijkstra":69,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\dijkstraAll.js":38}],71:[function(require,module,exports){
module.exports=require(39)
},{"./tarjan":77,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\findCycles.js":39}],72:[function(require,module,exports){
module.exports=require(40)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\floydWarshall.js":40}],73:[function(require,module,exports){
module.exports=require(41)
},{"./topsort":78,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\isAcyclic.js":41}],74:[function(require,module,exports){
module.exports=require(42)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\postorder.js":42,"cp-data":85}],75:[function(require,module,exports){
module.exports=require(43)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\preorder.js":43,"cp-data":85}],76:[function(require,module,exports){
module.exports=require(44)
},{"../Graph":67,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\prim.js":44,"cp-data":85}],77:[function(require,module,exports){
module.exports=require(45)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\tarjan.js":45}],78:[function(require,module,exports){
module.exports=require(46)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\alg\\topsort.js":46}],79:[function(require,module,exports){
module.exports=require(47)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\compoundify.js":47,"cp-data":85}],80:[function(require,module,exports){
module.exports=require(48)
},{"../CDigraph":64,"../CGraph":65,"../Digraph":66,"../Graph":67,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\converter\\json.js":48}],81:[function(require,module,exports){
module.exports=require(49)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\filter.js":49,"cp-data":85}],82:[function(require,module,exports){
module.exports=require(50)
},{"./Digraph":66,"./Graph":67,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\graph-converters.js":50}],83:[function(require,module,exports){
module.exports=require(51)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\util.js":51}],84:[function(require,module,exports){
module.exports=require(52)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\graphlib\\lib\\version.js":52}],85:[function(require,module,exports){
module.exports=require(25)
},{"./lib/PriorityQueue":86,"./lib/Set":87,"./lib/version":89,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\cp-data\\index.js":25}],86:[function(require,module,exports){
module.exports=require(26)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\cp-data\\lib\\PriorityQueue.js":26}],87:[function(require,module,exports){
module.exports=require(27)
},{"./util":88,"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\cp-data\\lib\\Set.js":27}],88:[function(require,module,exports){
module.exports=require(28)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\cp-data\\lib\\util.js":28}],89:[function(require,module,exports){
module.exports=require(29)
},{"c:\\Users\\e570467\\Scripts\\boardgame\\node_modules\\dagre\\node_modules\\cp-data\\lib\\version.js":29}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImM6XFxVc2Vyc1xcZTU3MDQ2N1xcQXBwRGF0YVxcUm9hbWluZ1xcbnBtXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsImM6L1VzZXJzL2U1NzA0NjcvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYXNzZXJ0L2Fzc2VydC5qcyIsImM6L1VzZXJzL2U1NzA0NjcvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsImM6L1VzZXJzL2U1NzA0NjcvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL2luZGV4LmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvaW5kZXguanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvZGVidWcuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvbGF5b3V0LmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbGliL29yZGVyLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbGliL29yZGVyL2Nyb3NzQ291bnQuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvb3JkZXIvaW5pdExheWVyR3JhcGhzLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbGliL29yZGVyL2luaXRPcmRlci5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci9zb3J0TGF5ZXIuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcG9zaXRpb24uanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcmFuay5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2FjeWNsaWMuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcmFuay9jb25zdHJhaW50cy5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2ZlYXNpYmxlVHJlZS5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2luaXRSYW5rLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbGliL3JhbmsvcmFua1V0aWwuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcmFuay9zaW1wbGV4LmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbGliL3V0aWwuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvdmVyc2lvbi5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9jcC1kYXRhL2luZGV4LmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2NwLWRhdGEvbGliL1ByaW9yaXR5UXVldWUuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvY3AtZGF0YS9saWIvU2V0LmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2NwLWRhdGEvbGliL3V0aWwuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvY3AtZGF0YS9saWIvdmVyc2lvbi5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9pbmRleC5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvQmFzZUdyYXBoLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9DRGlncmFwaC5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvQ0dyYXBoLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9EaWdyYXBoLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9HcmFwaC5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL2NvbXBvbmVudHMuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9kaWprc3RyYS5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL2RpamtzdHJhQWxsLmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvZmluZEN5Y2xlcy5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL2Zsb3lkV2Fyc2hhbGwuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9pc0FjeWNsaWMuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9wb3N0b3JkZXIuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9wcmVvcmRlci5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL3ByaW0uanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy90YXJqYW4uanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy90b3Bzb3J0LmpzIiwiYzovVXNlcnMvZTU3MDQ2Ny9TY3JpcHRzL2JvYXJkZ2FtZS9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9jb21wb3VuZGlmeS5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvY29udmVydGVyL2pzb24uanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2ZpbHRlci5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvZ3JhcGgtY29udmVydGVycy5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvdXRpbC5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvdmVyc2lvbi5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2dyYXBobGliLWRvdC9pbmRleC5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2dyYXBobGliLWRvdC9saWIvRG90RGlncmFwaC5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2dyYXBobGliLWRvdC9saWIvRG90R3JhcGguanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9ncmFwaGxpYi1kb3QvbGliL1dyaXRlci5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2dyYXBobGliLWRvdC9saWIvZG90LWdyYW1tYXIuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9ncmFwaGxpYi1kb3QvbGliL2RvdGlmeS5qcyIsImM6L1VzZXJzL2U1NzA0NjcvU2NyaXB0cy9ib2FyZGdhbWUvbm9kZV9tb2R1bGVzL2dyYXBobGliLWRvdC9saWIvcGFyc2UuanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9ncmFwaGxpYi1kb3QvbGliL3ZlcnNpb24uanMiLCJjOi9Vc2Vycy9lNTcwNDY3L1NjcmlwdHMvYm9hcmRnYW1lL25vZGVfbW9kdWxlcy9ncmFwaGxpYi1kb3QvbGliL3dyaXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1a0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeDZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM01BO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBodHRwOi8vd2lraS5jb21tb25qcy5vcmcvd2lraS9Vbml0X1Rlc3RpbmcvMS4wXG4vL1xuLy8gVEhJUyBJUyBOT1QgVEVTVEVEIE5PUiBMSUtFTFkgVE8gV09SSyBPVVRTSURFIFY4IVxuLy9cbi8vIE9yaWdpbmFsbHkgZnJvbSBuYXJ3aGFsLmpzIChodHRwOi8vbmFyd2hhbGpzLm9yZylcbi8vIENvcHlyaWdodCAoYykgMjAwOSBUaG9tYXMgUm9iaW5zb24gPDI4MG5vcnRoLmNvbT5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSAnU29mdHdhcmUnKSwgdG9cbi8vIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG4vLyByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Jcbi8vIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgJ0FTIElTJywgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4vLyBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OXG4vLyBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gd2hlbiB1c2VkIGluIG5vZGUsIHRoaXMgd2lsbCBhY3R1YWxseSBsb2FkIHRoZSB1dGlsIG1vZHVsZSB3ZSBkZXBlbmQgb25cbi8vIHZlcnN1cyBsb2FkaW5nIHRoZSBidWlsdGluIHV0aWwgbW9kdWxlIGFzIGhhcHBlbnMgb3RoZXJ3aXNlXG4vLyB0aGlzIGlzIGEgYnVnIGluIG5vZGUgbW9kdWxlIGxvYWRpbmcgYXMgZmFyIGFzIEkgYW0gY29uY2VybmVkXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwvJyk7XG5cbnZhciBwU2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gMS4gVGhlIGFzc2VydCBtb2R1bGUgcHJvdmlkZXMgZnVuY3Rpb25zIHRoYXQgdGhyb3dcbi8vIEFzc2VydGlvbkVycm9yJ3Mgd2hlbiBwYXJ0aWN1bGFyIGNvbmRpdGlvbnMgYXJlIG5vdCBtZXQuIFRoZVxuLy8gYXNzZXJ0IG1vZHVsZSBtdXN0IGNvbmZvcm0gdG8gdGhlIGZvbGxvd2luZyBpbnRlcmZhY2UuXG5cbnZhciBhc3NlcnQgPSBtb2R1bGUuZXhwb3J0cyA9IG9rO1xuXG4vLyAyLiBUaGUgQXNzZXJ0aW9uRXJyb3IgaXMgZGVmaW5lZCBpbiBhc3NlcnQuXG4vLyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHsgbWVzc2FnZTogbWVzc2FnZSxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbCxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogZXhwZWN0ZWQgfSlcblxuYXNzZXJ0LkFzc2VydGlvbkVycm9yID0gZnVuY3Rpb24gQXNzZXJ0aW9uRXJyb3Iob3B0aW9ucykge1xuICB0aGlzLm5hbWUgPSAnQXNzZXJ0aW9uRXJyb3InO1xuICB0aGlzLmFjdHVhbCA9IG9wdGlvbnMuYWN0dWFsO1xuICB0aGlzLmV4cGVjdGVkID0gb3B0aW9ucy5leHBlY3RlZDtcbiAgdGhpcy5vcGVyYXRvciA9IG9wdGlvbnMub3BlcmF0b3I7XG4gIGlmIChvcHRpb25zLm1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBvcHRpb25zLm1lc3NhZ2U7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZ2V0TWVzc2FnZSh0aGlzKTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSB0cnVlO1xuICB9XG4gIHZhciBzdGFja1N0YXJ0RnVuY3Rpb24gPSBvcHRpb25zLnN0YWNrU3RhcnRGdW5jdGlvbiB8fCBmYWlsO1xuXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHN0YWNrU3RhcnRGdW5jdGlvbik7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gbm9uIHY4IGJyb3dzZXJzIHNvIHdlIGNhbiBoYXZlIGEgc3RhY2t0cmFjZVxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcbiAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICB2YXIgb3V0ID0gZXJyLnN0YWNrO1xuXG4gICAgICAvLyB0cnkgdG8gc3RyaXAgdXNlbGVzcyBmcmFtZXNcbiAgICAgIHZhciBmbl9uYW1lID0gc3RhY2tTdGFydEZ1bmN0aW9uLm5hbWU7XG4gICAgICB2YXIgaWR4ID0gb3V0LmluZGV4T2YoJ1xcbicgKyBmbl9uYW1lKTtcbiAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAvLyBvbmNlIHdlIGhhdmUgbG9jYXRlZCB0aGUgZnVuY3Rpb24gZnJhbWVcbiAgICAgICAgLy8gd2UgbmVlZCB0byBzdHJpcCBvdXQgZXZlcnl0aGluZyBiZWZvcmUgaXQgKGFuZCBpdHMgbGluZSlcbiAgICAgICAgdmFyIG5leHRfbGluZSA9IG91dC5pbmRleE9mKCdcXG4nLCBpZHggKyAxKTtcbiAgICAgICAgb3V0ID0gb3V0LnN1YnN0cmluZyhuZXh0X2xpbmUgKyAxKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdGFjayA9IG91dDtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGFzc2VydC5Bc3NlcnRpb25FcnJvciBpbnN0YW5jZW9mIEVycm9yXG51dGlsLmluaGVyaXRzKGFzc2VydC5Bc3NlcnRpb25FcnJvciwgRXJyb3IpO1xuXG5mdW5jdGlvbiByZXBsYWNlcihrZXksIHZhbHVlKSB7XG4gIGlmICh1dGlsLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgIHJldHVybiAnJyArIHZhbHVlO1xuICB9XG4gIGlmICh1dGlsLmlzTnVtYmVyKHZhbHVlKSAmJiAoaXNOYU4odmFsdWUpIHx8ICFpc0Zpbml0ZSh2YWx1ZSkpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgaWYgKHV0aWwuaXNGdW5jdGlvbih2YWx1ZSkgfHwgdXRpbC5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHRydW5jYXRlKHMsIG4pIHtcbiAgaWYgKHV0aWwuaXNTdHJpbmcocykpIHtcbiAgICByZXR1cm4gcy5sZW5ndGggPCBuID8gcyA6IHMuc2xpY2UoMCwgbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHM7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZShzZWxmKSB7XG4gIHJldHVybiB0cnVuY2F0ZShKU09OLnN0cmluZ2lmeShzZWxmLmFjdHVhbCwgcmVwbGFjZXIpLCAxMjgpICsgJyAnICtcbiAgICAgICAgIHNlbGYub3BlcmF0b3IgKyAnICcgK1xuICAgICAgICAgdHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoc2VsZi5leHBlY3RlZCwgcmVwbGFjZXIpLCAxMjgpO1xufVxuXG4vLyBBdCBwcmVzZW50IG9ubHkgdGhlIHRocmVlIGtleXMgbWVudGlvbmVkIGFib3ZlIGFyZSB1c2VkIGFuZFxuLy8gdW5kZXJzdG9vZCBieSB0aGUgc3BlYy4gSW1wbGVtZW50YXRpb25zIG9yIHN1YiBtb2R1bGVzIGNhbiBwYXNzXG4vLyBvdGhlciBrZXlzIHRvIHRoZSBBc3NlcnRpb25FcnJvcidzIGNvbnN0cnVjdG9yIC0gdGhleSB3aWxsIGJlXG4vLyBpZ25vcmVkLlxuXG4vLyAzLiBBbGwgb2YgdGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgbXVzdCB0aHJvdyBhbiBBc3NlcnRpb25FcnJvclxuLy8gd2hlbiBhIGNvcnJlc3BvbmRpbmcgY29uZGl0aW9uIGlzIG5vdCBtZXQsIHdpdGggYSBtZXNzYWdlIHRoYXRcbi8vIG1heSBiZSB1bmRlZmluZWQgaWYgbm90IHByb3ZpZGVkLiAgQWxsIGFzc2VydGlvbiBtZXRob2RzIHByb3ZpZGVcbi8vIGJvdGggdGhlIGFjdHVhbCBhbmQgZXhwZWN0ZWQgdmFsdWVzIHRvIHRoZSBhc3NlcnRpb24gZXJyb3IgZm9yXG4vLyBkaXNwbGF5IHB1cnBvc2VzLlxuXG5mdW5jdGlvbiBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG9wZXJhdG9yLCBzdGFja1N0YXJ0RnVuY3Rpb24pIHtcbiAgdGhyb3cgbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7XG4gICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICBhY3R1YWw6IGFjdHVhbCxcbiAgICBleHBlY3RlZDogZXhwZWN0ZWQsXG4gICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxuICAgIHN0YWNrU3RhcnRGdW5jdGlvbjogc3RhY2tTdGFydEZ1bmN0aW9uXG4gIH0pO1xufVxuXG4vLyBFWFRFTlNJT04hIGFsbG93cyBmb3Igd2VsbCBiZWhhdmVkIGVycm9ycyBkZWZpbmVkIGVsc2V3aGVyZS5cbmFzc2VydC5mYWlsID0gZmFpbDtcblxuLy8gNC4gUHVyZSBhc3NlcnRpb24gdGVzdHMgd2hldGhlciBhIHZhbHVlIGlzIHRydXRoeSwgYXMgZGV0ZXJtaW5lZFxuLy8gYnkgISFndWFyZC5cbi8vIGFzc2VydC5vayhndWFyZCwgbWVzc2FnZV9vcHQpO1xuLy8gVGhpcyBzdGF0ZW1lbnQgaXMgZXF1aXZhbGVudCB0byBhc3NlcnQuZXF1YWwodHJ1ZSwgISFndWFyZCxcbi8vIG1lc3NhZ2Vfb3B0KTsuIFRvIHRlc3Qgc3RyaWN0bHkgZm9yIHRoZSB2YWx1ZSB0cnVlLCB1c2Vcbi8vIGFzc2VydC5zdHJpY3RFcXVhbCh0cnVlLCBndWFyZCwgbWVzc2FnZV9vcHQpOy5cblxuZnVuY3Rpb24gb2sodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKCF2YWx1ZSkgZmFpbCh2YWx1ZSwgdHJ1ZSwgbWVzc2FnZSwgJz09JywgYXNzZXJ0Lm9rKTtcbn1cbmFzc2VydC5vayA9IG9rO1xuXG4vLyA1LiBUaGUgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHNoYWxsb3csIGNvZXJjaXZlIGVxdWFsaXR5IHdpdGhcbi8vID09LlxuLy8gYXNzZXJ0LmVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmVxdWFsID0gZnVuY3Rpb24gZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9IGV4cGVjdGVkKSBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5lcXVhbCk7XG59O1xuXG4vLyA2LiBUaGUgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igd2hldGhlciB0d28gb2JqZWN0cyBhcmUgbm90IGVxdWFsXG4vLyB3aXRoICE9IGFzc2VydC5ub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RFcXVhbCA9IGZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9JywgYXNzZXJ0Lm5vdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gNy4gVGhlIGVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBhIGRlZXAgZXF1YWxpdHkgcmVsYXRpb24uXG4vLyBhc3NlcnQuZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmICghX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ2RlZXBFcXVhbCcsIGFzc2VydC5kZWVwRXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgLy8gNy4xLiBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmICh1dGlsLmlzQnVmZmVyKGFjdHVhbCkgJiYgdXRpbC5pc0J1ZmZlcihleHBlY3RlZCkpIHtcbiAgICBpZiAoYWN0dWFsLmxlbmd0aCAhPSBleHBlY3RlZC5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0dWFsLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYWN0dWFsW2ldICE9PSBleHBlY3RlZFtpXSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuXG4gIC8vIDcuMi4gSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgRGF0ZSBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgRGF0ZSBvYmplY3QgdGhhdCByZWZlcnMgdG8gdGhlIHNhbWUgdGltZS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzRGF0ZShhY3R1YWwpICYmIHV0aWwuaXNEYXRlKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuZ2V0VGltZSgpID09PSBleHBlY3RlZC5nZXRUaW1lKCk7XG5cbiAgLy8gNy4zIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIFJlZ0V4cCBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgUmVnRXhwIG9iamVjdCB3aXRoIHRoZSBzYW1lIHNvdXJjZSBhbmRcbiAgLy8gcHJvcGVydGllcyAoYGdsb2JhbGAsIGBtdWx0aWxpbmVgLCBgbGFzdEluZGV4YCwgYGlnbm9yZUNhc2VgKS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzUmVnRXhwKGFjdHVhbCkgJiYgdXRpbC5pc1JlZ0V4cChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLnNvdXJjZSA9PT0gZXhwZWN0ZWQuc291cmNlICYmXG4gICAgICAgICAgIGFjdHVhbC5nbG9iYWwgPT09IGV4cGVjdGVkLmdsb2JhbCAmJlxuICAgICAgICAgICBhY3R1YWwubXVsdGlsaW5lID09PSBleHBlY3RlZC5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgYWN0dWFsLmxhc3RJbmRleCA9PT0gZXhwZWN0ZWQubGFzdEluZGV4ICYmXG4gICAgICAgICAgIGFjdHVhbC5pZ25vcmVDYXNlID09PSBleHBlY3RlZC5pZ25vcmVDYXNlO1xuXG4gIC8vIDcuNC4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICghdXRpbC5pc09iamVjdChhY3R1YWwpICYmICF1dGlsLmlzT2JqZWN0KGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gNy41IEZvciBhbGwgb3RoZXIgT2JqZWN0IHBhaXJzLCBpbmNsdWRpbmcgQXJyYXkgb2JqZWN0cywgZXF1aXZhbGVuY2UgaXNcbiAgLy8gZGV0ZXJtaW5lZCBieSBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGFzIHZlcmlmaWVkXG4gIC8vIHdpdGggT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKSwgdGhlIHNhbWUgc2V0IG9mIGtleXNcbiAgLy8gKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksIGVxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeVxuICAvLyBjb3JyZXNwb25kaW5nIGtleSwgYW5kIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS4gTm90ZTogdGhpc1xuICAvLyBhY2NvdW50cyBmb3IgYm90aCBuYW1lZCBhbmQgaW5kZXhlZCBwcm9wZXJ0aWVzIG9uIEFycmF5cy5cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb2JqRXF1aXYoYWN0dWFsLCBleHBlY3RlZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBcmd1bWVudHMob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn1cblxuZnVuY3Rpb24gb2JqRXF1aXYoYSwgYikge1xuICBpZiAodXRpbC5pc051bGxPclVuZGVmaW5lZChhKSB8fCB1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LlxuICBpZiAoYS5wcm90b3R5cGUgIT09IGIucHJvdG90eXBlKSByZXR1cm4gZmFsc2U7XG4gIC8vfn5+SSd2ZSBtYW5hZ2VkIHRvIGJyZWFrIE9iamVjdC5rZXlzIHRocm91Z2ggc2NyZXd5IGFyZ3VtZW50cyBwYXNzaW5nLlxuICAvLyAgIENvbnZlcnRpbmcgdG8gYXJyYXkgc29sdmVzIHRoZSBwcm9ibGVtLlxuICBpZiAoaXNBcmd1bWVudHMoYSkpIHtcbiAgICBpZiAoIWlzQXJndW1lbnRzKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIF9kZWVwRXF1YWwoYSwgYik7XG4gIH1cbiAgdHJ5IHtcbiAgICB2YXIga2EgPSBvYmplY3RLZXlzKGEpLFxuICAgICAgICBrYiA9IG9iamVjdEtleXMoYiksXG4gICAgICAgIGtleSwgaTtcbiAgfSBjYXRjaCAoZSkgey8vaGFwcGVucyB3aGVuIG9uZSBpcyBhIHN0cmluZyBsaXRlcmFsIGFuZCB0aGUgb3RoZXIgaXNuJ3RcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChrZXlzIGluY29ycG9yYXRlc1xuICAvLyBoYXNPd25Qcm9wZXJ0eSlcbiAgaWYgKGthLmxlbmd0aCAhPSBrYi5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvL3RoZSBzYW1lIHNldCBvZiBrZXlzIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLFxuICBrYS5zb3J0KCk7XG4gIGtiLnNvcnQoKTtcbiAgLy9+fn5jaGVhcCBrZXkgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChrYVtpXSAhPSBrYltpXSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvL2VxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeSBjb3JyZXNwb25kaW5nIGtleSwgYW5kXG4gIC8vfn5+cG9zc2libHkgZXhwZW5zaXZlIGRlZXAgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGtleSA9IGthW2ldO1xuICAgIGlmICghX2RlZXBFcXVhbChhW2tleV0sIGJba2V5XSkpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gOC4gVGhlIG5vbi1lcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgZm9yIGFueSBkZWVwIGluZXF1YWxpdHkuXG4vLyBhc3NlcnQubm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdERlZXBFcXVhbCA9IGZ1bmN0aW9uIG5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnbm90RGVlcEVxdWFsJywgYXNzZXJ0Lm5vdERlZXBFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDkuIFRoZSBzdHJpY3QgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHN0cmljdCBlcXVhbGl0eSwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuc3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBzdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT09JywgYXNzZXJ0LnN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gMTAuIFRoZSBzdHJpY3Qgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igc3RyaWN0IGluZXF1YWxpdHksIGFzXG4vLyBkZXRlcm1pbmVkIGJ5ICE9PS4gIGFzc2VydC5ub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RTdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPT0nLCBhc3NlcnQubm90U3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgcmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKTtcbiAgfSBlbHNlIGlmIChhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGV4cGVjdGVkLmNhbGwoe30sIGFjdHVhbCkgPT09IHRydWUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX3Rocm93cyhzaG91bGRUaHJvdywgYmxvY2ssIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIHZhciBhY3R1YWw7XG5cbiAgaWYgKHV0aWwuaXNTdHJpbmcoZXhwZWN0ZWQpKSB7XG4gICAgbWVzc2FnZSA9IGV4cGVjdGVkO1xuICAgIGV4cGVjdGVkID0gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYmxvY2soKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGFjdHVhbCA9IGU7XG4gIH1cblxuICBtZXNzYWdlID0gKGV4cGVjdGVkICYmIGV4cGVjdGVkLm5hbWUgPyAnICgnICsgZXhwZWN0ZWQubmFtZSArICcpLicgOiAnLicpICtcbiAgICAgICAgICAgIChtZXNzYWdlID8gJyAnICsgbWVzc2FnZSA6ICcuJyk7XG5cbiAgaWYgKHNob3VsZFRocm93ICYmICFhY3R1YWwpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdNaXNzaW5nIGV4cGVjdGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICghc2hvdWxkVGhyb3cgJiYgZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdHb3QgdW53YW50ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKChzaG91bGRUaHJvdyAmJiBhY3R1YWwgJiYgZXhwZWN0ZWQgJiZcbiAgICAgICFleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkgfHwgKCFzaG91bGRUaHJvdyAmJiBhY3R1YWwpKSB7XG4gICAgdGhyb3cgYWN0dWFsO1xuICB9XG59XG5cbi8vIDExLiBFeHBlY3RlZCB0byB0aHJvdyBhbiBlcnJvcjpcbi8vIGFzc2VydC50aHJvd3MoYmxvY2ssIEVycm9yX29wdCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQudGhyb3dzID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL2Vycm9yLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MuYXBwbHkodGhpcywgW3RydWVdLmNvbmNhdChwU2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG4vLyBFWFRFTlNJT04hIFRoaXMgaXMgYW5ub3lpbmcgdG8gd3JpdGUgb3V0c2lkZSB0aGlzIG1vZHVsZS5cbmFzc2VydC5kb2VzTm90VGhyb3cgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzLmFwcGx5KHRoaXMsIFtmYWxzZV0uY29uY2F0KHBTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbmFzc2VydC5pZkVycm9yID0gZnVuY3Rpb24oZXJyKSB7IGlmIChlcnIpIHt0aHJvdyBlcnI7fX07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKGhhc093bi5jYWxsKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIGtleXM7XG59O1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJyksdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0Jyk7XHJcbnZhciBkYWdyZSA9IHJlcXVpcmUoJ2RhZ3JlJyk7XHJcbnZhciBkb3QgPSByZXF1aXJlKCdncmFwaGxpYi1kb3QnKTtcclxuXHJcbnZhciBncmFwaCA9XCJkaWdyYXBoIHtcXG5cIitcclxuXCIgICAgUyBbc2hhcGU9Y2lyY2xlLCB3aWR0aD0xNiwgaGVpZ2h0PTE2LCBmaXhlZHNpemU9dHJ1ZV07XFxuXCIrXHJcblwiICAgIEEgW3NoYXBlPWNpcmNsZSwgd2lkdGg9MTYsIGhlaWdodD0xNiwgZml4ZWRzaXplPXRydWVdO1xcblwiK1xyXG5cIiAgICBCIFtzaGFwZT1jaXJjbGUsIHdpZHRoPTE2LCBoZWlnaHQ9MTYsIGZpeGVkc2l6ZT10cnVlXTtcXG5cIitcclxuXCIgICAgQyBbc2hhcGU9Y2lyY2xlLCB3aWR0aD0xNiwgaGVpZ2h0PTE2LCBmaXhlZHNpemU9dHJ1ZV07XFxuXCIrXHJcblwiICAgIEQgW3NoYXBlPWNpcmNsZSwgd2lkdGg9MTYsIGhlaWdodD0xNiwgZml4ZWRzaXplPXRydWVdO1xcblwiK1xyXG5cIiAgICBFIFtzaGFwZT1jaXJjbGUsIHdpZHRoPTE2LCBoZWlnaHQ9MTYsIGZpeGVkc2l6ZT10cnVlXTtcXG5cIitcclxuXCIgICAgUyAtPiBBO1xcblwiK1xyXG5cIiAgICBBIC0+IEI7XFxuXCIrXHJcblwiICAgIEEgLT4gUztcXG5cIitcclxuXCIgICAgQiAtPiBDO1xcblwiK1xyXG5cIiAgICBDIC0+IEQ7XFxuXCIrXHJcblwiICAgIEMgLT4gUztcXG5cIitcclxuXCIgICAgRCAtPiBFO1xcblwiK1xyXG5cIiAgICBFIC0+IFM7XFxuXCIrXHJcblwifVwiO1xyXG5cclxuY29uc29sZS5sb2coZ3JhcGgpO1xyXG5cclxuZnVuY3Rpb24gbWFpbigpIHtcclxuXHJcbiAgICAvLyBQYXJzZSB0aGUgZ3JhcGh2aXogZm9ybWF0IGdyYXBoXHJcbiAgICB2YXIgZGlncmFwaCA9IGRvdC5wYXJzZShncmFwaCk7XHJcblxyXG4gICAgLy8gVXNlIERhZ3JlIHRvIGdlbmVyYXRlIGEgbGF5b3V0XHJcbiAgICB2YXIgbGF5b3V0ID0gZGFncmUubGF5b3V0KCkucnVuKGRpZ3JhcGgpO1xyXG5cclxuICAgIC8vIERlYnVnOiBwcmludCBvdXQgdGhlIG5vZGUgYW5kIGVkZ2UgaW5mb3JtYXRpb25cclxuICAgIGxheW91dC5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm9kZSBcIiArIHUgKyBcIjogXCIgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xyXG4gICAgfSk7XHJcbiAgICBsYXlvdXQuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkVkZ2UgXCIgKyB1ICsgXCIgLT4gXCIgKyB2ICsgXCI6IFwiICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBQcmVwYXJlIHRvIGRyYXcgdG8gY2FudmFzXHJcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYW52YXNcIik7XHJcbiAgICB2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgIC8vIERyYXcgYSBjaXJjbGUgZm9yIGVhY2ggbm9kZSBhdCB0aGUgeCwgeSBnaXZlbiBieSB0aGUgRGFncmUgbGF5b3V0XHJcbiAgICBsYXlvdXQuZWFjaE5vZGUoZnVuY3Rpb24odSwgbm9kZSkge1xyXG4gICAgICAgIHZhciByYWQgPSBwYXJzZUludChub2RlLndpZHRoKTtcclxuICAgICAgICB2YXIgY3ggPSBub2RlLng7XHJcbiAgICAgICAgdmFyIGN5ID0gbm9kZS55O1xyXG5cclxuICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGNvbnRleHQuYXJjKGN4LCBjeSwgcmFkLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgICAgICAgY29udGV4dC5mb250ID0gXCJib2xkIDhweCBBcmlhbFwiO1xyXG4gICAgICAgIGNvbnRleHQuZmlsbFRleHQodSwgY3gsIGN5KTtcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBOb3QgcmVhbGx5IHdvcmtpbmc6IERyYXcgbGluZXMgc3RhcnRpbmcgZnJvbSBOb2RlIFUsIHRvIGVhY2ggcG9pbnQgaW4gdmFsdWUsIGZpbmFsbHkgdG8gbm9kZSBWXHJcbiAgICBsYXlvdXQuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcclxuICAgICAgICB2YXIgcG9pbnRzID0gW2xheW91dC5ub2RlKHUpXTtcclxuICAgICAgICBwb2ludHMucHVzaC5hcHBseShwb2ludHMsIHZhbHVlLnBvaW50cyk7ICAgICAgICBcclxuICAgICAgICBwb2ludHMucHVzaChsYXlvdXQubm9kZSh2KSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRGVidWc6IERyYXcgYSBjaXJjbGUgYXQgZWFjaCBwb2ludFxyXG4gICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY29udGV4dC5hcmMocG9pbnRzWzBdLngsIHBvaW50c1swXS55LCAzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yKHZhciBpID0gMTsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgcDAgPSBwb2ludHNbaS0xXTtcclxuICAgICAgICAgICAgdmFyIHAxID0gcG9pbnRzW2ldO1xyXG4gICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjb250ZXh0Lm1vdmVUbyhwMC54LCBwMC55KTtcclxuICAgICAgICAgICAgY29udGV4dC5saW5lVG8ocDEueCwgcDEueSk7XHJcbiAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjb250ZXh0LmFyYyhwMS54LCBwMS55LCAzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgICAgICBjb250ZXh0LnN0cm9rZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxufVxyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgbWFpbik7IiwiLypcbkNvcHlyaWdodCAoYykgMjAxMi0yMDEzIENocmlzIFBldHRpdHRcblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuVEhFIFNPRlRXQVJFLlxuKi9cbmV4cG9ydHMuRGlncmFwaCA9IHJlcXVpcmUoXCJncmFwaGxpYlwiKS5EaWdyYXBoO1xuZXhwb3J0cy5HcmFwaCA9IHJlcXVpcmUoXCJncmFwaGxpYlwiKS5HcmFwaDtcbmV4cG9ydHMubGF5b3V0ID0gcmVxdWlyZShcIi4vbGliL2xheW91dFwiKTtcbmV4cG9ydHMudmVyc2lvbiA9IHJlcXVpcmUoXCIuL2xpYi92ZXJzaW9uXCIpO1xuZXhwb3J0cy5kZWJ1ZyA9IHJlcXVpcmUoXCIuL2xpYi9kZWJ1Z1wiKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLyoqXG4gKiBSZW5kZXJzIGEgZ3JhcGggaW4gYSBzdHJpbmdpZmllZCBET1QgZm9ybWF0IHRoYXQgaW5kaWNhdGVzIHRoZSBvcmRlcmluZyBvZlxuICogbm9kZXMgYnkgbGF5ZXIuIENpcmNsZXMgcmVwcmVzZW50IG5vcm1hbCBub2Rlcy4gRGlhbW9ucyByZXByZXNlbnQgZHVtbXlcbiAqIG5vZGVzLiBXaGlsZSB3ZSB0cnkgdG8gcHV0IG5vZGVzIGluIGNsdXN0ZXJzLCBpdCBhcHBlYXJzIHRoYXQgZ3JhcGh2aXpcbiAqIGRvZXMgbm90IHJlc3BlY3QgdGhpcyBiZWNhdXNlIHdlJ3JlIGxhdGVyIHVzaW5nIHN1YmdyYXBocyBmb3Igb3JkZXJpbmcgbm9kZXNcbiAqIGluIGVhY2ggbGF5ZXIuXG4gKi9cbmV4cG9ydHMuZG90T3JkZXJpbmcgPSBmdW5jdGlvbihnKSB7XG4gIHZhciBvcmRlcmluZyA9IHV0aWwub3JkZXJpbmcoZy5maWx0ZXJOb2Rlcyh1dGlsLmZpbHRlck5vblN1YmdyYXBocyhnKSkpO1xuICB2YXIgcmVzdWx0ID0gJ2RpZ3JhcGggeyc7XG5cbiAgZnVuY3Rpb24gZGZzKHUpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBnLmNoaWxkcmVuKHUpO1xuICAgIGlmIChjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdCArPSAnc3ViZ3JhcGggY2x1c3Rlcl8nICsgdSArICcgeyc7XG4gICAgICByZXN1bHQgKz0gJ2xhYmVsPVwiJyArIHUgKyAnXCI7JztcbiAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICBkZnModik7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdCArPSAnfSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCArPSB1O1xuICAgICAgaWYgKGcubm9kZSh1KS5kdW1teSkge1xuICAgICAgICByZXN1bHQgKz0gJyBbc2hhcGU9ZGlhbW9uZF0nO1xuICAgICAgfVxuICAgICAgcmVzdWx0ICs9ICc7JztcbiAgICB9XG4gIH1cblxuICBnLmNoaWxkcmVuKG51bGwpLmZvckVhY2goZGZzKTtcblxuICBvcmRlcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgcmVzdWx0ICs9ICdzdWJncmFwaCB7IHJhbms9c2FtZTsgZWRnZSBbc3R5bGU9XCJpbnZpc1wiXTsnO1xuICAgIHJlc3VsdCArPSBsYXllci5qb2luKCctPicpO1xuICAgIHJlc3VsdCArPSAnfSc7XG4gIH0pO1xuXG4gIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdikge1xuICAgIHJlc3VsdCArPSB1ICsgJy0+JyArIHYgKyAnOyc7XG4gIH0pO1xuXG4gIHJlc3VsdCArPSAnfSc7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyksXG4gICAgcmFuayA9IHJlcXVpcmUoJy4vcmFuaycpLFxuICAgIG9yZGVyID0gcmVxdWlyZSgnLi9vcmRlcicpLFxuICAgIENHcmFwaCA9IHJlcXVpcmUoJ2dyYXBobGliJykuQ0dyYXBoLFxuICAgIENEaWdyYXBoID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5DRGlncmFwaDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgLy8gRXh0ZXJuYWwgY29uZmlndXJhdGlvblxuICB2YXIgY29uZmlnID0ge1xuICAgIC8vIEhvdyBtdWNoIGRlYnVnIGluZm9ybWF0aW9uIHRvIGluY2x1ZGU/XG4gICAgZGVidWdMZXZlbDogMCxcbiAgICAvLyBNYXggbnVtYmVyIG9mIHN3ZWVwcyB0byBwZXJmb3JtIGluIG9yZGVyIHBoYXNlXG4gICAgb3JkZXJNYXhTd2VlcHM6IG9yZGVyLkRFRkFVTFRfTUFYX1NXRUVQUyxcbiAgICAvLyBVc2UgbmV0d29yayBzaW1wbGV4IGFsZ29yaXRobSBpbiByYW5raW5nXG4gICAgcmFua1NpbXBsZXg6IGZhbHNlLFxuICAgIC8vIFJhbmsgZGlyZWN0aW9uLiBWYWxpZCB2YWx1ZXMgYXJlIChUQiwgTFIpXG4gICAgcmFua0RpcjogJ1RCJ1xuICB9O1xuXG4gIC8vIFBoYXNlIGZ1bmN0aW9uc1xuICB2YXIgcG9zaXRpb24gPSByZXF1aXJlKCcuL3Bvc2l0aW9uJykoKTtcblxuICAvLyBUaGlzIGxheW91dCBvYmplY3RcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLm9yZGVySXRlcnMgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAnb3JkZXJNYXhTd2VlcHMnKTtcblxuICBzZWxmLnJhbmtTaW1wbGV4ID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ3JhbmtTaW1wbGV4Jyk7XG5cbiAgc2VsZi5ub2RlU2VwID0gZGVsZWdhdGVQcm9wZXJ0eShwb3NpdGlvbi5ub2RlU2VwKTtcbiAgc2VsZi5lZGdlU2VwID0gZGVsZWdhdGVQcm9wZXJ0eShwb3NpdGlvbi5lZGdlU2VwKTtcbiAgc2VsZi51bml2ZXJzYWxTZXAgPSBkZWxlZ2F0ZVByb3BlcnR5KHBvc2l0aW9uLnVuaXZlcnNhbFNlcCk7XG4gIHNlbGYucmFua1NlcCA9IGRlbGVnYXRlUHJvcGVydHkocG9zaXRpb24ucmFua1NlcCk7XG4gIHNlbGYucmFua0RpciA9IHV0aWwucHJvcGVydHlBY2Nlc3NvcihzZWxmLCBjb25maWcsICdyYW5rRGlyJyk7XG4gIHNlbGYuZGVidWdBbGlnbm1lbnQgPSBkZWxlZ2F0ZVByb3BlcnR5KHBvc2l0aW9uLmRlYnVnQWxpZ25tZW50KTtcblxuICBzZWxmLmRlYnVnTGV2ZWwgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAnZGVidWdMZXZlbCcsIGZ1bmN0aW9uKHgpIHtcbiAgICB1dGlsLmxvZy5sZXZlbCA9IHg7XG4gICAgcG9zaXRpb24uZGVidWdMZXZlbCh4KTtcbiAgfSk7XG5cbiAgc2VsZi5ydW4gPSB1dGlsLnRpbWUoJ1RvdGFsIGxheW91dCcsIHJ1bik7XG5cbiAgc2VsZi5fbm9ybWFsaXplID0gbm9ybWFsaXplO1xuXG4gIHJldHVybiBzZWxmO1xuXG4gIC8qXG4gICAqIENvbnN0cnVjdHMgYW4gYWRqYWNlbmN5IGdyYXBoIHVzaW5nIHRoZSBub2RlcyBhbmQgZWRnZXMgc3BlY2lmaWVkIHRocm91Z2hcbiAgICogY29uZmlnLiBGb3IgZWFjaCBub2RlIGFuZCBlZGdlIHdlIGFkZCBhIHByb3BlcnR5IGBkYWdyZWAgdGhhdCBjb250YWlucyBhblxuICAgKiBvYmplY3QgdGhhdCB3aWxsIGhvbGQgaW50ZXJtZWRpYXRlIGFuZCBmaW5hbCBsYXlvdXQgaW5mb3JtYXRpb24uIFNvbWUgb2ZcbiAgICogdGhlIGNvbnRlbnRzIGluY2x1ZGU6XG4gICAqXG4gICAqICAxKSBBIGdlbmVyYXRlZCBJRCB0aGF0IHVuaXF1ZWx5IGlkZW50aWZpZXMgdGhlIG9iamVjdC5cbiAgICogIDIpIERpbWVuc2lvbiBpbmZvcm1hdGlvbiBmb3Igbm9kZXMgKGNvcGllZCBmcm9tIHRoZSBzb3VyY2Ugbm9kZSkuXG4gICAqICAzKSBPcHRpb25hbCBkaW1lbnNpb24gaW5mb3JtYXRpb24gZm9yIGVkZ2VzLlxuICAgKlxuICAgKiBBZnRlciB0aGUgYWRqYWNlbmN5IGdyYXBoIGlzIGNvbnN0cnVjdGVkIHRoZSBjb2RlIG5vIGxvbmdlciBuZWVkcyB0byB1c2VcbiAgICogdGhlIG9yaWdpbmFsIG5vZGVzIGFuZCBlZGdlcyBwYXNzZWQgaW4gdmlhIGNvbmZpZy5cbiAgICovXG4gIGZ1bmN0aW9uIGluaXRMYXlvdXRHcmFwaChpbnB1dEdyYXBoKSB7XG4gICAgdmFyIGcgPSBuZXcgQ0RpZ3JhcGgoKTtcblxuICAgIGlucHV0R3JhcGguZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB2YWx1ZSA9IHt9O1xuICAgICAgZy5hZGROb2RlKHUsIHtcbiAgICAgICAgd2lkdGg6IHZhbHVlLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHZhbHVlLmhlaWdodFxuICAgICAgfSk7XG4gICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoJ3JhbmsnKSkge1xuICAgICAgICBnLm5vZGUodSkucHJlZlJhbmsgPSB2YWx1ZS5yYW5rO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2V0IHVwIHN1YmdyYXBoc1xuICAgIGlmIChpbnB1dEdyYXBoLnBhcmVudCkge1xuICAgICAgaW5wdXRHcmFwaC5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgICBnLnBhcmVudCh1LCBpbnB1dEdyYXBoLnBhcmVudCh1KSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpbnB1dEdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSB7fTtcbiAgICAgIHZhciBuZXdWYWx1ZSA9IHtcbiAgICAgICAgZTogZSxcbiAgICAgICAgbWluTGVuOiB2YWx1ZS5taW5MZW4gfHwgMSxcbiAgICAgICAgd2lkdGg6IHZhbHVlLndpZHRoIHx8IDAsXG4gICAgICAgIGhlaWdodDogdmFsdWUuaGVpZ2h0IHx8IDAsXG4gICAgICAgIHBvaW50czogW11cbiAgICAgIH07XG5cbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2LCBuZXdWYWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvLyBJbml0aWFsIGdyYXBoIGF0dHJpYnV0ZXNcbiAgICB2YXIgZ3JhcGhWYWx1ZSA9IGlucHV0R3JhcGguZ3JhcGgoKSB8fCB7fTtcbiAgICBnLmdyYXBoKHtcbiAgICAgIHJhbmtEaXI6IGdyYXBoVmFsdWUucmFua0RpciB8fCBjb25maWcucmFua0RpcixcbiAgICAgIG9yZGVyUmVzdGFydHM6IGdyYXBoVmFsdWUub3JkZXJSZXN0YXJ0c1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGc7XG4gIH1cblxuICBmdW5jdGlvbiBydW4oaW5wdXRHcmFwaCkge1xuICAgIHZhciByYW5rU2VwID0gc2VsZi5yYW5rU2VwKCk7XG4gICAgdmFyIGc7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEJ1aWxkIGludGVybmFsIGdyYXBoXG4gICAgICBnID0gdXRpbC50aW1lKCdpbml0TGF5b3V0R3JhcGgnLCBpbml0TGF5b3V0R3JhcGgpKGlucHV0R3JhcGgpO1xuXG4gICAgICBpZiAoZy5vcmRlcigpID09PSAwKSB7XG4gICAgICAgIHJldHVybiBnO1xuICAgICAgfVxuXG4gICAgICAvLyBNYWtlIHNwYWNlIGZvciBlZGdlIGxhYmVsc1xuICAgICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCBzLCB0LCBhKSB7XG4gICAgICAgIGEubWluTGVuICo9IDI7XG4gICAgICB9KTtcbiAgICAgIHNlbGYucmFua1NlcChyYW5rU2VwIC8gMik7XG5cbiAgICAgIC8vIERldGVybWluZSB0aGUgcmFuayBmb3IgZWFjaCBub2RlLiBOb2RlcyB3aXRoIGEgbG93ZXIgcmFuayB3aWxsIGFwcGVhclxuICAgICAgLy8gYWJvdmUgbm9kZXMgb2YgaGlnaGVyIHJhbmsuXG4gICAgICB1dGlsLnRpbWUoJ3JhbmsucnVuJywgcmFuay5ydW4pKGcsIGNvbmZpZy5yYW5rU2ltcGxleCk7XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgZ3JhcGggYnkgZW5zdXJpbmcgdGhhdCBldmVyeSBlZGdlIGlzIHByb3BlciAoZWFjaCBlZGdlIGhhc1xuICAgICAgLy8gYSBsZW5ndGggb2YgMSkuIFdlIGFjaGlldmUgdGhpcyBieSBhZGRpbmcgZHVtbXkgbm9kZXMgdG8gbG9uZyBlZGdlcyxcbiAgICAgIC8vIHRodXMgc2hvcnRlbmluZyB0aGVtLlxuICAgICAgdXRpbC50aW1lKCdub3JtYWxpemUnLCBub3JtYWxpemUpKGcpO1xuXG4gICAgICAvLyBPcmRlciB0aGUgbm9kZXMgc28gdGhhdCBlZGdlIGNyb3NzaW5ncyBhcmUgbWluaW1pemVkLlxuICAgICAgdXRpbC50aW1lKCdvcmRlcicsIG9yZGVyKShnLCBjb25maWcub3JkZXJNYXhTd2VlcHMpO1xuXG4gICAgICAvLyBGaW5kIHRoZSB4IGFuZCB5IGNvb3JkaW5hdGVzIGZvciBldmVyeSBub2RlIGluIHRoZSBncmFwaC5cbiAgICAgIHV0aWwudGltZSgncG9zaXRpb24nLCBwb3NpdGlvbi5ydW4pKGcpO1xuXG4gICAgICAvLyBEZS1ub3JtYWxpemUgdGhlIGdyYXBoIGJ5IHJlbW92aW5nIGR1bW15IG5vZGVzIGFuZCBhdWdtZW50aW5nIHRoZVxuICAgICAgLy8gb3JpZ2luYWwgbG9uZyBlZGdlcyB3aXRoIGNvb3JkaW5hdGUgaW5mb3JtYXRpb24uXG4gICAgICB1dGlsLnRpbWUoJ3VuZG9Ob3JtYWxpemUnLCB1bmRvTm9ybWFsaXplKShnKTtcblxuICAgICAgLy8gUmV2ZXJzZXMgcG9pbnRzIGZvciBlZGdlcyB0aGF0IGFyZSBpbiBhIHJldmVyc2VkIHN0YXRlLlxuICAgICAgdXRpbC50aW1lKCdmaXh1cEVkZ2VQb2ludHMnLCBmaXh1cEVkZ2VQb2ludHMpKGcpO1xuXG4gICAgICAvLyBSZXN0b3JlIGRlbGV0ZSBlZGdlcyBhbmQgcmV2ZXJzZSBlZGdlcyB0aGF0IHdlcmUgcmV2ZXJzZWQgaW4gdGhlIHJhbmtcbiAgICAgIC8vIHBoYXNlLlxuICAgICAgdXRpbC50aW1lKCdyYW5rLnJlc3RvcmVFZGdlcycsIHJhbmsucmVzdG9yZUVkZ2VzKShnKTtcblxuICAgICAgLy8gQ29uc3RydWN0IGZpbmFsIHJlc3VsdCBncmFwaCBhbmQgcmV0dXJuIGl0XG4gICAgICByZXR1cm4gdXRpbC50aW1lKCdjcmVhdGVGaW5hbEdyYXBoJywgY3JlYXRlRmluYWxHcmFwaCkoZywgaW5wdXRHcmFwaC5pc0RpcmVjdGVkKCkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZWxmLnJhbmtTZXAocmFua1NlcCk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogVGhpcyBmdW5jdGlvbiBpcyByZXNwb25zaWJsZSBmb3IgJ25vcm1hbGl6aW5nJyB0aGUgZ3JhcGguIFRoZSBwcm9jZXNzIG9mXG4gICAqIG5vcm1hbGl6YXRpb24gZW5zdXJlcyB0aGF0IG5vIGVkZ2UgaW4gdGhlIGdyYXBoIGhhcyBzcGFucyBtb3JlIHRoYW4gb25lXG4gICAqIHJhbmsuIFRvIGRvIHRoaXMgaXQgaW5zZXJ0cyBkdW1teSBub2RlcyBhcyBuZWVkZWQgYW5kIGxpbmtzIHRoZW0gYnkgYWRkaW5nXG4gICAqIGR1bW15IGVkZ2VzLiBUaGlzIGZ1bmN0aW9uIGtlZXBzIGVub3VnaCBpbmZvcm1hdGlvbiBpbiB0aGUgZHVtbXkgbm9kZXMgYW5kXG4gICAqIGVkZ2VzIHRvIGVuc3VyZSB0aGF0IHRoZSBvcmlnaW5hbCBncmFwaCBjYW4gYmUgcmVjb25zdHJ1Y3RlZCBsYXRlci5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXNzdW1lcyB0aGF0IHRoZSBpbnB1dCBncmFwaCBpcyBjeWNsZSBmcmVlLlxuICAgKi9cbiAgZnVuY3Rpb24gbm9ybWFsaXplKGcpIHtcbiAgICB2YXIgZHVtbXlDb3VudCA9IDA7XG4gICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCBzLCB0LCBhKSB7XG4gICAgICB2YXIgc291cmNlUmFuayA9IGcubm9kZShzKS5yYW5rO1xuICAgICAgdmFyIHRhcmdldFJhbmsgPSBnLm5vZGUodCkucmFuaztcbiAgICAgIGlmIChzb3VyY2VSYW5rICsgMSA8IHRhcmdldFJhbmspIHtcbiAgICAgICAgZm9yICh2YXIgdSA9IHMsIHJhbmsgPSBzb3VyY2VSYW5rICsgMSwgaSA9IDA7IHJhbmsgPCB0YXJnZXRSYW5rOyArK3JhbmssICsraSkge1xuICAgICAgICAgIHZhciB2ID0gJ19EJyArICgrK2R1bW15Q291bnQpO1xuICAgICAgICAgIHZhciBub2RlID0ge1xuICAgICAgICAgICAgd2lkdGg6IGEud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGEuaGVpZ2h0LFxuICAgICAgICAgICAgZWRnZTogeyBpZDogZSwgc291cmNlOiBzLCB0YXJnZXQ6IHQsIGF0dHJzOiBhIH0sXG4gICAgICAgICAgICByYW5rOiByYW5rLFxuICAgICAgICAgICAgZHVtbXk6IHRydWVcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gSWYgdGhpcyBub2RlIHJlcHJlc2VudHMgYSBiZW5kIHRoZW4gd2Ugd2lsbCB1c2UgaXQgYXMgYSBjb250cm9sXG4gICAgICAgICAgLy8gcG9pbnQuIEZvciBlZGdlcyB3aXRoIDIgc2VnbWVudHMgdGhpcyB3aWxsIGJlIHRoZSBjZW50ZXIgZHVtbXlcbiAgICAgICAgICAvLyBub2RlLiBGb3IgZWRnZXMgd2l0aCBtb3JlIHRoYW4gdHdvIHNlZ21lbnRzLCB0aGlzIHdpbGwgYmUgdGhlXG4gICAgICAgICAgLy8gZmlyc3QgYW5kIGxhc3QgZHVtbXkgbm9kZS5cbiAgICAgICAgICBpZiAoaSA9PT0gMCkgbm9kZS5pbmRleCA9IDA7XG4gICAgICAgICAgZWxzZSBpZiAocmFuayArIDEgPT09IHRhcmdldFJhbmspIG5vZGUuaW5kZXggPSAxO1xuXG4gICAgICAgICAgZy5hZGROb2RlKHYsIG5vZGUpO1xuICAgICAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2LCB7fSk7XG4gICAgICAgICAgdSA9IHY7XG4gICAgICAgIH1cbiAgICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHQsIHt9KTtcbiAgICAgICAgZy5kZWxFZGdlKGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogUmVjb25zdHJ1Y3RzIHRoZSBncmFwaCBhcyBpdCB3YXMgYmVmb3JlIG5vcm1hbGl6YXRpb24uIFRoZSBwb3NpdGlvbnMgb2ZcbiAgICogZHVtbXkgbm9kZXMgYXJlIHVzZWQgdG8gYnVpbGQgYW4gYXJyYXkgb2YgcG9pbnRzIGZvciB0aGUgb3JpZ2luYWwgJ2xvbmcnXG4gICAqIGVkZ2UuIER1bW15IG5vZGVzIGFuZCBlZGdlcyBhcmUgcmVtb3ZlZC5cbiAgICovXG4gIGZ1bmN0aW9uIHVuZG9Ob3JtYWxpemUoZykge1xuICAgIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgYSkge1xuICAgICAgaWYgKGEuZHVtbXkpIHtcbiAgICAgICAgaWYgKCdpbmRleCcgaW4gYSkge1xuICAgICAgICAgIHZhciBlZGdlID0gYS5lZGdlO1xuICAgICAgICAgIGlmICghZy5oYXNFZGdlKGVkZ2UuaWQpKSB7XG4gICAgICAgICAgICBnLmFkZEVkZ2UoZWRnZS5pZCwgZWRnZS5zb3VyY2UsIGVkZ2UudGFyZ2V0LCBlZGdlLmF0dHJzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHBvaW50cyA9IGcuZWRnZShlZGdlLmlkKS5wb2ludHM7XG4gICAgICAgICAgcG9pbnRzW2EuaW5kZXhdID0geyB4OiBhLngsIHk6IGEueSwgdWw6IGEudWwsIHVyOiBhLnVyLCBkbDogYS5kbCwgZHI6IGEuZHIgfTtcbiAgICAgICAgfVxuICAgICAgICBnLmRlbE5vZGUodSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKlxuICAgKiBGb3IgZWFjaCBlZGdlIHRoYXQgd2FzIHJldmVyc2VkIGR1cmluZyB0aGUgYGFjeWNsaWNgIHN0ZXAsIHJldmVyc2UgaXRzXG4gICAqIGFycmF5IG9mIHBvaW50cy5cbiAgICovXG4gIGZ1bmN0aW9uIGZpeHVwRWRnZVBvaW50cyhnKSB7XG4gICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCBzLCB0LCBhKSB7IGlmIChhLnJldmVyc2VkKSBhLnBvaW50cy5yZXZlcnNlKCk7IH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRmluYWxHcmFwaChnLCBpc0RpcmVjdGVkKSB7XG4gICAgdmFyIG91dCA9IGlzRGlyZWN0ZWQgPyBuZXcgQ0RpZ3JhcGgoKSA6IG5ldyBDR3JhcGgoKTtcbiAgICBvdXQuZ3JhcGgoZy5ncmFwaCgpKTtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7IG91dC5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gICAgZy5lYWNoTm9kZShmdW5jdGlvbih1KSB7IG91dC5wYXJlbnQodSwgZy5wYXJlbnQodSkpOyB9KTtcbiAgICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgICBvdXQuYWRkRWRnZSh2YWx1ZS5lLCB1LCB2LCB2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvLyBBdHRhY2ggYm91bmRpbmcgYm94IGluZm9ybWF0aW9uXG4gICAgdmFyIG1heFggPSAwLCBtYXhZID0gMDtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgICBpZiAoIWcuY2hpbGRyZW4odSkubGVuZ3RoKSB7XG4gICAgICAgIG1heFggPSBNYXRoLm1heChtYXhYLCB2YWx1ZS54ICsgdmFsdWUud2lkdGggLyAyKTtcbiAgICAgICAgbWF4WSA9IE1hdGgubWF4KG1heFksIHZhbHVlLnkgKyB2YWx1ZS5oZWlnaHQgLyAyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgICB2YXIgbWF4WFBvaW50cyA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlLnBvaW50cy5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC54OyB9KSk7XG4gICAgICB2YXIgbWF4WVBvaW50cyA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlLnBvaW50cy5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC55OyB9KSk7XG4gICAgICBtYXhYID0gTWF0aC5tYXgobWF4WCwgbWF4WFBvaW50cyArIHZhbHVlLndpZHRoIC8gMik7XG4gICAgICBtYXhZID0gTWF0aC5tYXgobWF4WSwgbWF4WVBvaW50cyArIHZhbHVlLmhlaWdodCAvIDIpO1xuICAgIH0pO1xuICAgIG91dC5ncmFwaCgpLndpZHRoID0gbWF4WDtcbiAgICBvdXQuZ3JhcGgoKS5oZWlnaHQgPSBtYXhZO1xuXG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIC8qXG4gICAqIEdpdmVuIGEgZnVuY3Rpb24sIGEgbmV3IGZ1bmN0aW9uIGlzIHJldHVybmVkIHRoYXQgaW52b2tlcyB0aGUgZ2l2ZW5cbiAgICogZnVuY3Rpb24uIFRoZSByZXR1cm4gdmFsdWUgZnJvbSB0aGUgZnVuY3Rpb24gaXMgYWx3YXlzIHRoZSBgc2VsZmAgb2JqZWN0LlxuICAgKi9cbiAgZnVuY3Rpb24gZGVsZWdhdGVQcm9wZXJ0eShmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZigpO1xuICAgICAgZi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfVxufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgIGNyb3NzQ291bnQgPSByZXF1aXJlKCcuL29yZGVyL2Nyb3NzQ291bnQnKSxcbiAgICBpbml0TGF5ZXJHcmFwaHMgPSByZXF1aXJlKCcuL29yZGVyL2luaXRMYXllckdyYXBocycpLFxuICAgIGluaXRPcmRlciA9IHJlcXVpcmUoJy4vb3JkZXIvaW5pdE9yZGVyJyksXG4gICAgc29ydExheWVyID0gcmVxdWlyZSgnLi9vcmRlci9zb3J0TGF5ZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBvcmRlcjtcblxuLy8gVGhlIG1heGltdW0gbnVtYmVyIG9mIHN3ZWVwcyB0byBwZXJmb3JtIGJlZm9yZSBmaW5pc2hpbmcgdGhlIG9yZGVyIHBoYXNlLlxudmFyIERFRkFVTFRfTUFYX1NXRUVQUyA9IDI0O1xub3JkZXIuREVGQVVMVF9NQVhfU1dFRVBTID0gREVGQVVMVF9NQVhfU1dFRVBTO1xuXG4vKlxuICogUnVucyB0aGUgb3JkZXIgcGhhc2Ugd2l0aCB0aGUgc3BlY2lmaWVkIGBncmFwaCwgYG1heFN3ZWVwc2AsIGFuZFxuICogYGRlYnVnTGV2ZWxgLiBJZiBgbWF4U3dlZXBzYCBpcyBub3Qgc3BlY2lmaWVkIHdlIHVzZSBgREVGQVVMVF9NQVhfU1dFRVBTYC5cbiAqIElmIGBkZWJ1Z0xldmVsYCBpcyBub3Qgc2V0IHdlIGFzc3VtZSAwLlxuICovXG5mdW5jdGlvbiBvcmRlcihnLCBtYXhTd2VlcHMpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgbWF4U3dlZXBzID0gREVGQVVMVF9NQVhfU1dFRVBTO1xuICB9XG5cbiAgdmFyIHJlc3RhcnRzID0gZy5ncmFwaCgpLm9yZGVyUmVzdGFydHMgfHwgMDtcblxuICB2YXIgbGF5ZXJHcmFwaHMgPSBpbml0TGF5ZXJHcmFwaHMoZyk7XG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIHdoZW4gd2UgYWRkIGJhY2sgc3VwcG9ydCBmb3Igb3JkZXJpbmcgY2x1c3RlcnNcbiAgbGF5ZXJHcmFwaHMuZm9yRWFjaChmdW5jdGlvbihsZykge1xuICAgIGxnID0gbGcuZmlsdGVyTm9kZXMoZnVuY3Rpb24odSkgeyByZXR1cm4gIWcuY2hpbGRyZW4odSkubGVuZ3RoOyB9KTtcbiAgfSk7XG5cbiAgdmFyIGl0ZXJzID0gMCxcbiAgICAgIGN1cnJlbnRCZXN0Q0MsXG4gICAgICBhbGxUaW1lQmVzdENDID0gTnVtYmVyLk1BWF9WQUxVRSxcbiAgICAgIGFsbFRpbWVCZXN0ID0ge307XG5cbiAgZnVuY3Rpb24gc2F2ZUFsbFRpbWVCZXN0KCkge1xuICAgIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgYWxsVGltZUJlc3RbdV0gPSB2YWx1ZS5vcmRlcjsgfSk7XG4gIH1cblxuICBmb3IgKHZhciBqID0gMDsgaiA8IE51bWJlcihyZXN0YXJ0cykgKyAxICYmIGFsbFRpbWVCZXN0Q0MgIT09IDA7ICsraikge1xuICAgIGN1cnJlbnRCZXN0Q0MgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIGluaXRPcmRlcihnLCByZXN0YXJ0cyA+IDApO1xuXG4gICAgdXRpbC5sb2coMiwgJ09yZGVyIHBoYXNlIHN0YXJ0IGNyb3NzIGNvdW50OiAnICsgZy5ncmFwaCgpLm9yZGVySW5pdENDKTtcblxuICAgIHZhciBpLCBsYXN0QmVzdCwgY2M7XG4gICAgZm9yIChpID0gMCwgbGFzdEJlc3QgPSAwOyBsYXN0QmVzdCA8IDQgJiYgaSA8IG1heFN3ZWVwcyAmJiBjdXJyZW50QmVzdENDID4gMDsgKytpLCArK2xhc3RCZXN0LCArK2l0ZXJzKSB7XG4gICAgICBzd2VlcChnLCBsYXllckdyYXBocywgaSk7XG4gICAgICBjYyA9IGNyb3NzQ291bnQoZyk7XG4gICAgICBpZiAoY2MgPCBjdXJyZW50QmVzdENDKSB7XG4gICAgICAgIGxhc3RCZXN0ID0gMDtcbiAgICAgICAgY3VycmVudEJlc3RDQyA9IGNjO1xuICAgICAgICBpZiAoY2MgPCBhbGxUaW1lQmVzdENDKSB7XG4gICAgICAgICAgc2F2ZUFsbFRpbWVCZXN0KCk7XG4gICAgICAgICAgYWxsVGltZUJlc3RDQyA9IGNjO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB1dGlsLmxvZygzLCAnT3JkZXIgcGhhc2Ugc3RhcnQgJyArIGogKyAnIGl0ZXIgJyArIGkgKyAnIGNyb3NzIGNvdW50OiAnICsgY2MpO1xuICAgIH1cbiAgfVxuXG4gIE9iamVjdC5rZXlzKGFsbFRpbWVCZXN0KS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICBpZiAoIWcuY2hpbGRyZW4gfHwgIWcuY2hpbGRyZW4odSkubGVuZ3RoKSB7XG4gICAgICBnLm5vZGUodSkub3JkZXIgPSBhbGxUaW1lQmVzdFt1XTtcbiAgICB9XG4gIH0pO1xuICBnLmdyYXBoKCkub3JkZXJDQyA9IGFsbFRpbWVCZXN0Q0M7XG5cbiAgdXRpbC5sb2coMiwgJ09yZGVyIGl0ZXJhdGlvbnM6ICcgKyBpdGVycyk7XG4gIHV0aWwubG9nKDIsICdPcmRlciBwaGFzZSBiZXN0IGNyb3NzIGNvdW50OiAnICsgZy5ncmFwaCgpLm9yZGVyQ0MpO1xufVxuXG5mdW5jdGlvbiBwcmVkZWNlc3NvcldlaWdodHMoZywgbm9kZXMpIHtcbiAgdmFyIHdlaWdodHMgPSB7fTtcbiAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgd2VpZ2h0c1t1XSA9IGcuaW5FZGdlcyh1KS5tYXAoZnVuY3Rpb24oZSkge1xuICAgICAgcmV0dXJuIGcubm9kZShnLnNvdXJjZShlKSkub3JkZXI7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gd2VpZ2h0cztcbn1cblxuZnVuY3Rpb24gc3VjY2Vzc29yV2VpZ2h0cyhnLCBub2Rlcykge1xuICB2YXIgd2VpZ2h0cyA9IHt9O1xuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICB3ZWlnaHRzW3VdID0gZy5vdXRFZGdlcyh1KS5tYXAoZnVuY3Rpb24oZSkge1xuICAgICAgcmV0dXJuIGcubm9kZShnLnRhcmdldChlKSkub3JkZXI7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gd2VpZ2h0cztcbn1cblxuZnVuY3Rpb24gc3dlZXAoZywgbGF5ZXJHcmFwaHMsIGl0ZXIpIHtcbiAgaWYgKGl0ZXIgJSAyID09PSAwKSB7XG4gICAgc3dlZXBEb3duKGcsIGxheWVyR3JhcGhzLCBpdGVyKTtcbiAgfSBlbHNlIHtcbiAgICBzd2VlcFVwKGcsIGxheWVyR3JhcGhzLCBpdGVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzd2VlcERvd24oZywgbGF5ZXJHcmFwaHMpIHtcbiAgdmFyIGNnO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGxheWVyR3JhcGhzLmxlbmd0aDsgKytpKSB7XG4gICAgY2cgPSBzb3J0TGF5ZXIobGF5ZXJHcmFwaHNbaV0sIGNnLCBwcmVkZWNlc3NvcldlaWdodHMoZywgbGF5ZXJHcmFwaHNbaV0ubm9kZXMoKSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN3ZWVwVXAoZywgbGF5ZXJHcmFwaHMpIHtcbiAgdmFyIGNnO1xuICBmb3IgKHZhciBpID0gbGF5ZXJHcmFwaHMubGVuZ3RoIC0gMjsgaSA+PSAwOyAtLWkpIHtcbiAgICBzb3J0TGF5ZXIobGF5ZXJHcmFwaHNbaV0sIGNnLCBzdWNjZXNzb3JXZWlnaHRzKGcsIGxheWVyR3JhcGhzW2ldLm5vZGVzKCkpKTtcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBjcm9zc0NvdW50O1xuXG4vKlxuICogUmV0dXJucyB0aGUgY3Jvc3MgY291bnQgZm9yIHRoZSBnaXZlbiBncmFwaC5cbiAqL1xuZnVuY3Rpb24gY3Jvc3NDb3VudChnKSB7XG4gIHZhciBjYyA9IDA7XG4gIHZhciBvcmRlcmluZyA9IHV0aWwub3JkZXJpbmcoZyk7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgb3JkZXJpbmcubGVuZ3RoOyArK2kpIHtcbiAgICBjYyArPSB0d29MYXllckNyb3NzQ291bnQoZywgb3JkZXJpbmdbaS0xXSwgb3JkZXJpbmdbaV0pO1xuICB9XG4gIHJldHVybiBjYztcbn1cblxuLypcbiAqIFRoaXMgZnVuY3Rpb24gc2VhcmNoZXMgdGhyb3VnaCBhIHJhbmtlZCBhbmQgb3JkZXJlZCBncmFwaCBhbmQgY291bnRzIHRoZVxuICogbnVtYmVyIG9mIGVkZ2VzIHRoYXQgY3Jvc3MuIFRoaXMgYWxnb3JpdGhtIGlzIGRlcml2ZWQgZnJvbTpcbiAqXG4gKiAgICBXLiBCYXJ0aCBldCBhbC4sIEJpbGF5ZXIgQ3Jvc3MgQ291bnRpbmcsIEpHQUEsIDgoMikgMTc54oCTMTk0ICgyMDA0KVxuICovXG5mdW5jdGlvbiB0d29MYXllckNyb3NzQ291bnQoZywgbGF5ZXIxLCBsYXllcjIpIHtcbiAgdmFyIGluZGljZXMgPSBbXTtcbiAgbGF5ZXIxLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgIHZhciBub2RlSW5kaWNlcyA9IFtdO1xuICAgIGcub3V0RWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7IG5vZGVJbmRpY2VzLnB1c2goZy5ub2RlKGcudGFyZ2V0KGUpKS5vcmRlcik7IH0pO1xuICAgIG5vZGVJbmRpY2VzLnNvcnQoZnVuY3Rpb24oeCwgeSkgeyByZXR1cm4geCAtIHk7IH0pO1xuICAgIGluZGljZXMgPSBpbmRpY2VzLmNvbmNhdChub2RlSW5kaWNlcyk7XG4gIH0pO1xuXG4gIHZhciBmaXJzdEluZGV4ID0gMTtcbiAgd2hpbGUgKGZpcnN0SW5kZXggPCBsYXllcjIubGVuZ3RoKSBmaXJzdEluZGV4IDw8PSAxO1xuXG4gIHZhciB0cmVlU2l6ZSA9IDIgKiBmaXJzdEluZGV4IC0gMTtcbiAgZmlyc3RJbmRleCAtPSAxO1xuXG4gIHZhciB0cmVlID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZVNpemU7ICsraSkgeyB0cmVlW2ldID0gMDsgfVxuXG4gIHZhciBjYyA9IDA7XG4gIGluZGljZXMuZm9yRWFjaChmdW5jdGlvbihpKSB7XG4gICAgdmFyIHRyZWVJbmRleCA9IGkgKyBmaXJzdEluZGV4O1xuICAgICsrdHJlZVt0cmVlSW5kZXhdO1xuICAgIHdoaWxlICh0cmVlSW5kZXggPiAwKSB7XG4gICAgICBpZiAodHJlZUluZGV4ICUgMikge1xuICAgICAgICBjYyArPSB0cmVlW3RyZWVJbmRleCArIDFdO1xuICAgICAgfVxuICAgICAgdHJlZUluZGV4ID0gKHRyZWVJbmRleCAtIDEpID4+IDE7XG4gICAgICArK3RyZWVbdHJlZUluZGV4XTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjYztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vZGVzRnJvbUxpc3QgPSByZXF1aXJlKCdncmFwaGxpYicpLmZpbHRlci5ub2Rlc0Zyb21MaXN0LFxuICAgIC8qIGpzaGludCAtVzA3OSAqL1xuICAgIFNldCA9IHJlcXVpcmUoJ2NwLWRhdGEnKS5TZXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5pdExheWVyR3JhcGhzO1xuXG4vKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhIGNvbXBvdW5kIGxheWVyZWQgZ3JhcGgsIGcsIGFuZCBwcm9kdWNlcyBhbiBhcnJheSBvZlxuICogbGF5ZXIgZ3JhcGhzLiBFYWNoIGVudHJ5IGluIHRoZSBhcnJheSByZXByZXNlbnRzIGEgc3ViZ3JhcGggb2Ygbm9kZXNcbiAqIHJlbGV2YW50IGZvciBwZXJmb3JtaW5nIGNyb3NzaW5nIHJlZHVjdGlvbiBvbiB0aGF0IGxheWVyLlxuICovXG5mdW5jdGlvbiBpbml0TGF5ZXJHcmFwaHMoZykge1xuICB2YXIgcmFua3MgPSBbXTtcblxuICBmdW5jdGlvbiBkZnModSkge1xuICAgIGlmICh1ID09PSBudWxsKSB7XG4gICAgICBnLmNoaWxkcmVuKHUpLmZvckVhY2goZnVuY3Rpb24odikgeyBkZnModik7IH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGcubm9kZSh1KTtcbiAgICB2YWx1ZS5taW5SYW5rID0gKCdyYW5rJyBpbiB2YWx1ZSkgPyB2YWx1ZS5yYW5rIDogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YWx1ZS5tYXhSYW5rID0gKCdyYW5rJyBpbiB2YWx1ZSkgPyB2YWx1ZS5yYW5rIDogTnVtYmVyLk1JTl9WQUxVRTtcbiAgICB2YXIgdVJhbmtzID0gbmV3IFNldCgpO1xuICAgIGcuY2hpbGRyZW4odSkuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgcnMgPSBkZnModik7XG4gICAgICB1UmFua3MgPSBTZXQudW5pb24oW3VSYW5rcywgcnNdKTtcbiAgICAgIHZhbHVlLm1pblJhbmsgPSBNYXRoLm1pbih2YWx1ZS5taW5SYW5rLCBnLm5vZGUodikubWluUmFuayk7XG4gICAgICB2YWx1ZS5tYXhSYW5rID0gTWF0aC5tYXgodmFsdWUubWF4UmFuaywgZy5ub2RlKHYpLm1heFJhbmspO1xuICAgIH0pO1xuXG4gICAgaWYgKCdyYW5rJyBpbiB2YWx1ZSkgdVJhbmtzLmFkZCh2YWx1ZS5yYW5rKTtcblxuICAgIHVSYW5rcy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbihyKSB7XG4gICAgICBpZiAoIShyIGluIHJhbmtzKSkgcmFua3Nbcl0gPSBbXTtcbiAgICAgIHJhbmtzW3JdLnB1c2godSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdVJhbmtzO1xuICB9XG4gIGRmcyhudWxsKTtcblxuICB2YXIgbGF5ZXJHcmFwaHMgPSBbXTtcbiAgcmFua3MuZm9yRWFjaChmdW5jdGlvbih1cywgcmFuaykge1xuICAgIGxheWVyR3JhcGhzW3JhbmtdID0gZy5maWx0ZXJOb2Rlcyhub2Rlc0Zyb21MaXN0KHVzKSk7XG4gIH0pO1xuXG4gIHJldHVybiBsYXllckdyYXBocztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyb3NzQ291bnQgPSByZXF1aXJlKCcuL2Nyb3NzQ291bnQnKSxcbiAgICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGluaXRPcmRlcjtcblxuLypcbiAqIEdpdmVuIGEgZ3JhcGggd2l0aCBhIHNldCBvZiBsYXllcmVkIG5vZGVzIChpLmUuIG5vZGVzIHRoYXQgaGF2ZSBhIGByYW5rYFxuICogYXR0cmlidXRlKSB0aGlzIGZ1bmN0aW9uIGF0dGFjaGVzIGFuIGBvcmRlcmAgYXR0cmlidXRlIHRoYXQgdW5pcXVlbHlcbiAqIGFycmFuZ2VzIGVhY2ggbm9kZSBvZiBlYWNoIHJhbmsuIElmIG5vIGNvbnN0cmFpbnQgZ3JhcGggaXMgcHJvdmlkZWQgdGhlXG4gKiBvcmRlciBvZiB0aGUgbm9kZXMgaW4gZWFjaCByYW5rIGlzIGVudGlyZWx5IGFyYml0cmFyeS5cbiAqL1xuZnVuY3Rpb24gaW5pdE9yZGVyKGcsIHJhbmRvbSkge1xuICB2YXIgbGF5ZXJzID0gW107XG5cbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIHZhciBsYXllciA9IGxheWVyc1t2YWx1ZS5yYW5rXTtcbiAgICBpZiAoZy5jaGlsZHJlbiAmJiBnLmNoaWxkcmVuKHUpLmxlbmd0aCA+IDApIHJldHVybjtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGxheWVyc1t2YWx1ZS5yYW5rXSA9IFtdO1xuICAgIH1cbiAgICBsYXllci5wdXNoKHUpO1xuICB9KTtcblxuICBsYXllcnMuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgIGlmIChyYW5kb20pIHtcbiAgICAgIHV0aWwuc2h1ZmZsZShsYXllcik7XG4gICAgfVxuICAgIGxheWVyLmZvckVhY2goZnVuY3Rpb24odSwgaSkge1xuICAgICAgZy5ub2RlKHUpLm9yZGVyID0gaTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgdmFyIGNjID0gY3Jvc3NDb3VudChnKTtcbiAgZy5ncmFwaCgpLm9yZGVySW5pdENDID0gY2M7XG4gIGcuZ3JhcGgoKS5vcmRlckNDID0gTnVtYmVyLk1BWF9WQUxVRTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gICAgRGlncmFwaCA9IHJlcXVpcmUoJ2dyYXBobGliJykuRGlncmFwaCxcbiAgICB0b3Bzb3J0ID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5hbGcudG9wc29ydCxcbiAgICBub2Rlc0Zyb21MaXN0ID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5maWx0ZXIubm9kZXNGcm9tTGlzdDtcblxubW9kdWxlLmV4cG9ydHMgPSBzb3J0TGF5ZXI7XG5cbmZ1bmN0aW9uIHNvcnRMYXllcihnLCBjZywgd2VpZ2h0cykge1xuICB3ZWlnaHRzID0gYWRqdXN0V2VpZ2h0cyhnLCB3ZWlnaHRzKTtcbiAgdmFyIHJlc3VsdCA9IHNvcnRMYXllclN1YmdyYXBoKGcsIG51bGwsIGNnLCB3ZWlnaHRzKTtcblxuICByZXN1bHQubGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHUsIGkpIHtcbiAgICBnLm5vZGUodSkub3JkZXIgPSBpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdC5jb25zdHJhaW50R3JhcGg7XG59XG5cbmZ1bmN0aW9uIHNvcnRMYXllclN1YmdyYXBoKGcsIHNnLCBjZywgd2VpZ2h0cykge1xuICBjZyA9IGNnID8gY2cuZmlsdGVyTm9kZXMobm9kZXNGcm9tTGlzdChnLmNoaWxkcmVuKHNnKSkpIDogbmV3IERpZ3JhcGgoKTtcblxuICB2YXIgbm9kZURhdGEgPSB7fTtcbiAgZy5jaGlsZHJlbihzZykuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgaWYgKGcuY2hpbGRyZW4odSkubGVuZ3RoKSB7XG4gICAgICBub2RlRGF0YVt1XSA9IHNvcnRMYXllclN1YmdyYXBoKGcsIHUsIGNnLCB3ZWlnaHRzKTtcbiAgICAgIG5vZGVEYXRhW3VdLmZpcnN0U0cgPSB1O1xuICAgICAgbm9kZURhdGFbdV0ubGFzdFNHID0gdTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHdzID0gd2VpZ2h0c1t1XTtcbiAgICAgIG5vZGVEYXRhW3VdID0ge1xuICAgICAgICBkZWdyZWU6IHdzLmxlbmd0aCxcbiAgICAgICAgYmFyeWNlbnRlcjogdXRpbC5zdW0od3MpIC8gd3MubGVuZ3RoLFxuICAgICAgICBvcmRlcjogZy5ub2RlKHUpLm9yZGVyLFxuICAgICAgICBvcmRlckNvdW50OiAxLFxuICAgICAgICBsaXN0OiBbdV1cbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICByZXNvbHZlVmlvbGF0ZWRDb25zdHJhaW50cyhnLCBjZywgbm9kZURhdGEpO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMobm9kZURhdGEpO1xuICBrZXlzLnNvcnQoZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiBub2RlRGF0YVt4XS5iYXJ5Y2VudGVyIC0gbm9kZURhdGFbeV0uYmFyeWNlbnRlciB8fFxuICAgICAgICAgICBub2RlRGF0YVt4XS5vcmRlciAtIG5vZGVEYXRhW3ldLm9yZGVyO1xuICB9KTtcblxuICB2YXIgcmVzdWx0ID0gIGtleXMubWFwKGZ1bmN0aW9uKHUpIHsgcmV0dXJuIG5vZGVEYXRhW3VdOyB9KVxuICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGxocywgcmhzKSB7IHJldHVybiBtZXJnZU5vZGVEYXRhKGcsIGxocywgcmhzKTsgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1lcmdlTm9kZURhdGEoZywgbGhzLCByaHMpIHtcbiAgdmFyIGNnID0gbWVyZ2VEaWdyYXBocyhsaHMuY29uc3RyYWludEdyYXBoLCByaHMuY29uc3RyYWludEdyYXBoKTtcblxuICBpZiAobGhzLmxhc3RTRyAhPT0gdW5kZWZpbmVkICYmIHJocy5maXJzdFNHICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoY2cgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2cgPSBuZXcgRGlncmFwaCgpO1xuICAgIH1cbiAgICBpZiAoIWNnLmhhc05vZGUobGhzLmxhc3RTRykpIHsgY2cuYWRkTm9kZShsaHMubGFzdFNHKTsgfVxuICAgIGNnLmFkZE5vZGUocmhzLmZpcnN0U0cpO1xuICAgIGNnLmFkZEVkZ2UobnVsbCwgbGhzLmxhc3RTRywgcmhzLmZpcnN0U0cpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkZWdyZWU6IGxocy5kZWdyZWUgKyByaHMuZGVncmVlLFxuICAgIGJhcnljZW50ZXI6IChsaHMuYmFyeWNlbnRlciAqIGxocy5kZWdyZWUgKyByaHMuYmFyeWNlbnRlciAqIHJocy5kZWdyZWUpIC9cbiAgICAgICAgICAgICAgICAobGhzLmRlZ3JlZSArIHJocy5kZWdyZWUpLFxuICAgIG9yZGVyOiAobGhzLm9yZGVyICogbGhzLm9yZGVyQ291bnQgKyByaHMub3JkZXIgKiByaHMub3JkZXJDb3VudCkgL1xuICAgICAgICAgICAobGhzLm9yZGVyQ291bnQgKyByaHMub3JkZXJDb3VudCksXG4gICAgb3JkZXJDb3VudDogbGhzLm9yZGVyQ291bnQgKyByaHMub3JkZXJDb3VudCxcbiAgICBsaXN0OiBsaHMubGlzdC5jb25jYXQocmhzLmxpc3QpLFxuICAgIGZpcnN0U0c6IGxocy5maXJzdFNHICE9PSB1bmRlZmluZWQgPyBsaHMuZmlyc3RTRyA6IHJocy5maXJzdFNHLFxuICAgIGxhc3RTRzogcmhzLmxhc3RTRyAhPT0gdW5kZWZpbmVkID8gcmhzLmxhc3RTRyA6IGxocy5sYXN0U0csXG4gICAgY29uc3RyYWludEdyYXBoOiBjZ1xuICB9O1xufVxuXG5mdW5jdGlvbiBtZXJnZURpZ3JhcGhzKGxocywgcmhzKSB7XG4gIGlmIChsaHMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHJocztcbiAgaWYgKHJocyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbGhzO1xuXG4gIGxocyA9IGxocy5jb3B5KCk7XG4gIHJocy5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24odSkgeyBsaHMuYWRkTm9kZSh1KTsgfSk7XG4gIHJocy5lZGdlcygpLmZvckVhY2goZnVuY3Rpb24oZSwgdSwgdikgeyBsaHMuYWRkRWRnZShudWxsLCB1LCB2KTsgfSk7XG4gIHJldHVybiBsaHM7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVWaW9sYXRlZENvbnN0cmFpbnRzKGcsIGNnLCBub2RlRGF0YSkge1xuICAvLyBSZW1vdmVzIG5vZGVzIGB1YCBhbmQgYHZgIGZyb20gYGNnYCBhbmQgbWFrZXMgYW55IGVkZ2VzIGluY2lkZW50IG9uIHRoZW1cbiAgLy8gaW5jaWRlbnQgb24gYHdgIGluc3RlYWQuXG4gIGZ1bmN0aW9uIGNvbGxhcHNlTm9kZXModSwgdiwgdykge1xuICAgIC8vIFRPRE8gb3JpZ2luYWwgcGFwZXIgcmVtb3ZlcyBzZWxmIGxvb3BzLCBidXQgaXQgaXMgbm90IG9idmlvdXMgd2hlbiB0aGlzIHdvdWxkIGhhcHBlblxuICAgIGNnLmluRWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICBjZy5kZWxFZGdlKGUpO1xuICAgICAgY2cuYWRkRWRnZShudWxsLCBjZy5zb3VyY2UoZSksIHcpO1xuICAgIH0pO1xuXG4gICAgY2cub3V0RWRnZXModikuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICBjZy5kZWxFZGdlKGUpO1xuICAgICAgY2cuYWRkRWRnZShudWxsLCB3LCBjZy50YXJnZXQoZSkpO1xuICAgIH0pO1xuXG4gICAgY2cuZGVsTm9kZSh1KTtcbiAgICBjZy5kZWxOb2RlKHYpO1xuICB9XG5cbiAgdmFyIHZpb2xhdGVkO1xuICB3aGlsZSAoKHZpb2xhdGVkID0gZmluZFZpb2xhdGVkQ29uc3RyYWludChjZywgbm9kZURhdGEpKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIHNvdXJjZSA9IGNnLnNvdXJjZSh2aW9sYXRlZCksXG4gICAgICAgIHRhcmdldCA9IGNnLnRhcmdldCh2aW9sYXRlZCk7XG5cbiAgICB2YXIgdjtcbiAgICB3aGlsZSAoKHYgPSBjZy5hZGROb2RlKG51bGwpKSAmJiBnLmhhc05vZGUodikpIHtcbiAgICAgIGNnLmRlbE5vZGUodik7XG4gICAgfVxuXG4gICAgLy8gQ29sbGFwc2UgYmFyeWNlbnRlciBhbmQgbGlzdFxuICAgIG5vZGVEYXRhW3ZdID0gbWVyZ2VOb2RlRGF0YShnLCBub2RlRGF0YVtzb3VyY2VdLCBub2RlRGF0YVt0YXJnZXRdKTtcbiAgICBkZWxldGUgbm9kZURhdGFbc291cmNlXTtcbiAgICBkZWxldGUgbm9kZURhdGFbdGFyZ2V0XTtcblxuICAgIGNvbGxhcHNlTm9kZXMoc291cmNlLCB0YXJnZXQsIHYpO1xuICAgIGlmIChjZy5pbmNpZGVudEVkZ2VzKHYpLmxlbmd0aCA9PT0gMCkgeyBjZy5kZWxOb2RlKHYpOyB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFZpb2xhdGVkQ29uc3RyYWludChjZywgbm9kZURhdGEpIHtcbiAgdmFyIHVzID0gdG9wc29ydChjZyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgdSA9IHVzW2ldO1xuICAgIHZhciBpbkVkZ2VzID0gY2cuaW5FZGdlcyh1KTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGluRWRnZXMubGVuZ3RoOyArK2opIHtcbiAgICAgIHZhciBlID0gaW5FZGdlc1tqXTtcbiAgICAgIGlmIChub2RlRGF0YVtjZy5zb3VyY2UoZSldLmJhcnljZW50ZXIgPj0gbm9kZURhdGFbdV0uYmFyeWNlbnRlcikge1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gQWRqdXN0IHdlaWdodHMgc28gdGhhdCB0aGV5IGZhbGwgaW4gdGhlIHJhbmdlIG9mIDAuLnxOfC0xLiBJZiBhIG5vZGUgaGFzIG5vXG4vLyB3ZWlnaHQgYXNzaWduZWQgdGhlbiBzZXQgaXRzIGFkanVzdGVkIHdlaWdodCB0byBpdHMgY3VycmVudCBwb3NpdGlvbi4gVGhpc1xuLy8gYWxsb3dzIHVzIHRvIGJldHRlciByZXRhaW4gdGhlIG9yaWdpaW5hbCBwb3NpdGlvbiBvZiBub2RlcyB3aXRob3V0IG5laWdoYm9ycy5cbmZ1bmN0aW9uIGFkanVzdFdlaWdodHMoZywgd2VpZ2h0cykge1xuICB2YXIgbWluVyA9IE51bWJlci5NQVhfVkFMVUUsXG4gICAgICBtYXhXID0gMCxcbiAgICAgIGFkanVzdGVkID0ge307XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIGlmIChnLmNoaWxkcmVuKHUpLmxlbmd0aCkgcmV0dXJuO1xuXG4gICAgdmFyIHdzID0gd2VpZ2h0c1t1XTtcbiAgICBpZiAod3MubGVuZ3RoKSB7XG4gICAgICBtaW5XID0gTWF0aC5taW4obWluVywgdXRpbC5taW4od3MpKTtcbiAgICAgIG1heFcgPSBNYXRoLm1heChtYXhXLCB1dGlsLm1heCh3cykpO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHJhbmdlVyA9IChtYXhXIC0gbWluVyk7XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIGlmIChnLmNoaWxkcmVuKHUpLmxlbmd0aCkgcmV0dXJuO1xuXG4gICAgdmFyIHdzID0gd2VpZ2h0c1t1XTtcbiAgICBpZiAoIXdzLmxlbmd0aCkge1xuICAgICAgYWRqdXN0ZWRbdV0gPSBbZy5ub2RlKHUpLm9yZGVyXTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWRqdXN0ZWRbdV0gPSB3cy5tYXAoZnVuY3Rpb24odykge1xuICAgICAgICBpZiAocmFuZ2VXKSB7XG4gICAgICAgICAgcmV0dXJuICh3IC0gbWluVykgKiAoZy5vcmRlcigpIC0gMSkgLyByYW5nZVc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGcub3JkZXIoKSAtIDEgLyAyO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBhZGp1c3RlZDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLypcbiAqIFRoZSBhbGdvcml0aG1zIGhlcmUgYXJlIGJhc2VkIG9uIEJyYW5kZXMgYW5kIEvDtnBmLCBcIkZhc3QgYW5kIFNpbXBsZVxuICogSG9yaXpvbnRhbCBDb29yZGluYXRlIEFzc2lnbm1lbnRcIi5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgLy8gRXh0ZXJuYWwgY29uZmlndXJhdGlvblxuICB2YXIgY29uZmlnID0ge1xuICAgIG5vZGVTZXA6IDUwLFxuICAgIGVkZ2VTZXA6IDEwLFxuICAgIHVuaXZlcnNhbFNlcDogbnVsbCxcbiAgICByYW5rU2VwOiAzMFxuICB9O1xuXG4gIHZhciBzZWxmID0ge307XG5cbiAgc2VsZi5ub2RlU2VwID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ25vZGVTZXAnKTtcbiAgc2VsZi5lZGdlU2VwID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ2VkZ2VTZXAnKTtcbiAgLy8gSWYgbm90IG51bGwgdGhpcyBzZXBhcmF0aW9uIHZhbHVlIGlzIHVzZWQgZm9yIGFsbCBub2RlcyBhbmQgZWRnZXNcbiAgLy8gcmVnYXJkbGVzcyBvZiB0aGVpciB3aWR0aHMuIGBub2RlU2VwYCBhbmQgYGVkZ2VTZXBgIGFyZSBpZ25vcmVkIHdpdGggdGhpc1xuICAvLyBvcHRpb24uXG4gIHNlbGYudW5pdmVyc2FsU2VwID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ3VuaXZlcnNhbFNlcCcpO1xuICBzZWxmLnJhbmtTZXAgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAncmFua1NlcCcpO1xuICBzZWxmLmRlYnVnTGV2ZWwgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAnZGVidWdMZXZlbCcpO1xuXG4gIHNlbGYucnVuID0gcnVuO1xuXG4gIHJldHVybiBzZWxmO1xuXG4gIGZ1bmN0aW9uIHJ1bihnKSB7XG4gICAgZyA9IGcuZmlsdGVyTm9kZXModXRpbC5maWx0ZXJOb25TdWJncmFwaHMoZykpO1xuXG4gICAgdmFyIGxheWVyaW5nID0gdXRpbC5vcmRlcmluZyhnKTtcblxuICAgIHZhciBjb25mbGljdHMgPSBmaW5kQ29uZmxpY3RzKGcsIGxheWVyaW5nKTtcblxuICAgIHZhciB4c3MgPSB7fTtcbiAgICBbJ3UnLCAnZCddLmZvckVhY2goZnVuY3Rpb24odmVydERpcikge1xuICAgICAgaWYgKHZlcnREaXIgPT09ICdkJykgbGF5ZXJpbmcucmV2ZXJzZSgpO1xuXG4gICAgICBbJ2wnLCAnciddLmZvckVhY2goZnVuY3Rpb24oaG9yaXpEaXIpIHtcbiAgICAgICAgaWYgKGhvcml6RGlyID09PSAncicpIHJldmVyc2VJbm5lck9yZGVyKGxheWVyaW5nKTtcblxuICAgICAgICB2YXIgZGlyID0gdmVydERpciArIGhvcml6RGlyO1xuICAgICAgICB2YXIgYWxpZ24gPSB2ZXJ0aWNhbEFsaWdubWVudChnLCBsYXllcmluZywgY29uZmxpY3RzLCB2ZXJ0RGlyID09PSAndScgPyAncHJlZGVjZXNzb3JzJyA6ICdzdWNjZXNzb3JzJyk7XG4gICAgICAgIHhzc1tkaXJdPSBob3Jpem9udGFsQ29tcGFjdGlvbihnLCBsYXllcmluZywgYWxpZ24ucG9zLCBhbGlnbi5yb290LCBhbGlnbi5hbGlnbik7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5kZWJ1Z0xldmVsID49IDMpXG4gICAgICAgICAgZGVidWdQb3NpdGlvbmluZyh2ZXJ0RGlyICsgaG9yaXpEaXIsIGcsIGxheWVyaW5nLCB4c3NbZGlyXSk7XG5cbiAgICAgICAgaWYgKGhvcml6RGlyID09PSAncicpIGZsaXBIb3Jpem9udGFsbHkoeHNzW2Rpcl0pO1xuXG4gICAgICAgIGlmIChob3JpekRpciA9PT0gJ3InKSByZXZlcnNlSW5uZXJPcmRlcihsYXllcmluZyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHZlcnREaXIgPT09ICdkJykgbGF5ZXJpbmcucmV2ZXJzZSgpO1xuICAgIH0pO1xuXG4gICAgYmFsYW5jZShnLCBsYXllcmluZywgeHNzKTtcblxuICAgIGcuZWFjaE5vZGUoZnVuY3Rpb24odikge1xuICAgICAgdmFyIHhzID0gW107XG4gICAgICBmb3IgKHZhciBhbGlnbm1lbnQgaW4geHNzKSB7XG4gICAgICAgIHZhciBhbGlnbm1lbnRYID0geHNzW2FsaWdubWVudF1bdl07XG4gICAgICAgIHBvc1hEZWJ1ZyhhbGlnbm1lbnQsIGcsIHYsIGFsaWdubWVudFgpO1xuICAgICAgICB4cy5wdXNoKGFsaWdubWVudFgpO1xuICAgICAgfVxuICAgICAgeHMuc29ydChmdW5jdGlvbih4LCB5KSB7IHJldHVybiB4IC0geTsgfSk7XG4gICAgICBwb3NYKGcsIHYsICh4c1sxXSArIHhzWzJdKSAvIDIpO1xuICAgIH0pO1xuXG4gICAgLy8gQWxpZ24geSBjb29yZGluYXRlcyB3aXRoIHJhbmtzXG4gICAgdmFyIHkgPSAwLCByZXZlcnNlWSA9IGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnQlQnIHx8IGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnUkwnO1xuICAgIGxheWVyaW5nLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIHZhciBtYXhIZWlnaHQgPSB1dGlsLm1heChsYXllci5tYXAoZnVuY3Rpb24odSkgeyByZXR1cm4gaGVpZ2h0KGcsIHUpOyB9KSk7XG4gICAgICB5ICs9IG1heEhlaWdodCAvIDI7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgICAgcG9zWShnLCB1LCByZXZlcnNlWSA/IC15IDogeSk7XG4gICAgICB9KTtcbiAgICAgIHkgKz0gbWF4SGVpZ2h0IC8gMiArIGNvbmZpZy5yYW5rU2VwO1xuICAgIH0pO1xuXG4gICAgLy8gVHJhbnNsYXRlIGxheW91dCBzbyB0aGF0IHRvcCBsZWZ0IGNvcm5lciBvZiBib3VuZGluZyByZWN0YW5nbGUgaGFzXG4gICAgLy8gY29vcmRpbmF0ZSAoMCwgMCkuXG4gICAgdmFyIG1pblggPSB1dGlsLm1pbihnLm5vZGVzKCkubWFwKGZ1bmN0aW9uKHUpIHsgcmV0dXJuIHBvc1goZywgdSkgLSB3aWR0aChnLCB1KSAvIDI7IH0pKTtcbiAgICB2YXIgbWluWSA9IHV0aWwubWluKGcubm9kZXMoKS5tYXAoZnVuY3Rpb24odSkgeyByZXR1cm4gcG9zWShnLCB1KSAtIGhlaWdodChnLCB1KSAvIDI7IH0pKTtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHtcbiAgICAgIHBvc1goZywgdSwgcG9zWChnLCB1KSAtIG1pblgpO1xuICAgICAgcG9zWShnLCB1LCBwb3NZKGcsIHUpIC0gbWluWSk7XG4gICAgfSk7XG4gIH1cblxuICAvKlxuICAgKiBHZW5lcmF0ZSBhbiBJRCB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlcHJlc2VudCBhbnkgdW5kaXJlY3RlZCBlZGdlIHRoYXQgaXNcbiAgICogaW5jaWRlbnQgb24gYHVgIGFuZCBgdmAuXG4gICAqL1xuICBmdW5jdGlvbiB1bmRpckVkZ2VJZCh1LCB2KSB7XG4gICAgcmV0dXJuIHUgPCB2XG4gICAgICA/IHUudG9TdHJpbmcoKS5sZW5ndGggKyAnOicgKyB1ICsgJy0nICsgdlxuICAgICAgOiB2LnRvU3RyaW5nKCkubGVuZ3RoICsgJzonICsgdiArICctJyArIHU7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kQ29uZmxpY3RzKGcsIGxheWVyaW5nKSB7XG4gICAgdmFyIGNvbmZsaWN0cyA9IHt9LCAvLyBTZXQgb2YgY29uZmxpY3RpbmcgZWRnZSBpZHNcbiAgICAgICAgcG9zID0ge30sICAgICAgIC8vIFBvc2l0aW9uIG9mIG5vZGUgaW4gaXRzIGxheWVyXG4gICAgICAgIHByZXZMYXllcixcbiAgICAgICAgY3VyckxheWVyLFxuICAgICAgICBrMCwgICAgIC8vIFBvc2l0aW9uIG9mIHRoZSBsYXN0IGlubmVyIHNlZ21lbnQgaW4gdGhlIHByZXZpb3VzIGxheWVyXG4gICAgICAgIGwsICAgICAgLy8gQ3VycmVudCBwb3NpdGlvbiBpbiB0aGUgY3VycmVudCBsYXllciAoZm9yIGl0ZXJhdGlvbiB1cCB0byBgbDFgKVxuICAgICAgICBrMTsgICAgIC8vIFBvc2l0aW9uIG9mIHRoZSBuZXh0IGlubmVyIHNlZ21lbnQgaW4gdGhlIHByZXZpb3VzIGxheWVyIG9yXG4gICAgICAgICAgICAgICAgLy8gdGhlIHBvc2l0aW9uIG9mIHRoZSBsYXN0IGVsZW1lbnQgaW4gdGhlIHByZXZpb3VzIGxheWVyXG5cbiAgICBpZiAobGF5ZXJpbmcubGVuZ3RoIDw9IDIpIHJldHVybiBjb25mbGljdHM7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVDb25mbGljdHModikge1xuICAgICAgdmFyIGsgPSBwb3Nbdl07XG4gICAgICBpZiAoayA8IGswIHx8IGsgPiBrMSkge1xuICAgICAgICBjb25mbGljdHNbdW5kaXJFZGdlSWQoY3VyckxheWVyW2xdLCB2KV0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxheWVyaW5nWzFdLmZvckVhY2goZnVuY3Rpb24odSwgaSkgeyBwb3NbdV0gPSBpOyB9KTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGxheWVyaW5nLmxlbmd0aCAtIDE7ICsraSkge1xuICAgICAgcHJldkxheWVyID0gbGF5ZXJpbmdbaV07XG4gICAgICBjdXJyTGF5ZXIgPSBsYXllcmluZ1tpKzFdO1xuICAgICAgazAgPSAwO1xuICAgICAgbCA9IDA7XG5cbiAgICAgIC8vIFNjYW4gY3VycmVudCBsYXllciBmb3IgbmV4dCBub2RlIHRoYXQgaXMgaW5jaWRlbnQgdG8gYW4gaW5uZXIgc2VnZW1lbnRcbiAgICAgIC8vIGJldHdlZW4gbGF5ZXJpbmdbaSsxXSBhbmQgbGF5ZXJpbmdbaV0uXG4gICAgICBmb3IgKHZhciBsMSA9IDA7IGwxIDwgY3VyckxheWVyLmxlbmd0aDsgKytsMSkge1xuICAgICAgICB2YXIgdSA9IGN1cnJMYXllcltsMV07IC8vIE5leHQgaW5uZXIgc2VnbWVudCBpbiB0aGUgY3VycmVudCBsYXllciBvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxhc3Qgbm9kZSBpbiB0aGUgY3VycmVudCBsYXllclxuICAgICAgICBwb3NbdV0gPSBsMTtcbiAgICAgICAgazEgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgaWYgKGcubm9kZSh1KS5kdW1teSkge1xuICAgICAgICAgIHZhciB1UHJlZCA9IGcucHJlZGVjZXNzb3JzKHUpWzBdO1xuICAgICAgICAgIC8vIE5vdGU6IEluIHRoZSBjYXNlIG9mIHNlbGYgbG9vcHMgYW5kIHNpZGV3YXlzIGVkZ2VzIGl0IGlzIHBvc3NpYmxlXG4gICAgICAgICAgLy8gZm9yIGEgZHVtbXkgbm90IHRvIGhhdmUgYSBwcmVkZWNlc3Nvci5cbiAgICAgICAgICBpZiAodVByZWQgIT09IHVuZGVmaW5lZCAmJiBnLm5vZGUodVByZWQpLmR1bW15KVxuICAgICAgICAgICAgazEgPSBwb3NbdVByZWRdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChrMSA9PT0gdW5kZWZpbmVkICYmIGwxID09PSBjdXJyTGF5ZXIubGVuZ3RoIC0gMSlcbiAgICAgICAgICBrMSA9IHByZXZMYXllci5sZW5ndGggLSAxO1xuXG4gICAgICAgIGlmIChrMSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZm9yICg7IGwgPD0gbDE7ICsrbCkge1xuICAgICAgICAgICAgZy5wcmVkZWNlc3NvcnMoY3VyckxheWVyW2xdKS5mb3JFYWNoKHVwZGF0ZUNvbmZsaWN0cyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGswID0gazE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmxpY3RzO1xuICB9XG5cbiAgZnVuY3Rpb24gdmVydGljYWxBbGlnbm1lbnQoZywgbGF5ZXJpbmcsIGNvbmZsaWN0cywgcmVsYXRpb25zaGlwKSB7XG4gICAgdmFyIHBvcyA9IHt9LCAgIC8vIFBvc2l0aW9uIGZvciBhIG5vZGUgaW4gaXRzIGxheWVyXG4gICAgICAgIHJvb3QgPSB7fSwgIC8vIFJvb3Qgb2YgdGhlIGJsb2NrIHRoYXQgdGhlIG5vZGUgcGFydGljaXBhdGVzIGluXG4gICAgICAgIGFsaWduID0ge307IC8vIFBvaW50cyB0byB0aGUgbmV4dCBub2RlIGluIHRoZSBibG9jayBvciwgaWYgdGhlIGxhc3RcbiAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCBpbiB0aGUgYmxvY2ssIHBvaW50cyB0byB0aGUgZmlyc3QgYmxvY2sncyByb290XG5cbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHUsIGkpIHtcbiAgICAgICAgcm9vdFt1XSA9IHU7XG4gICAgICAgIGFsaWduW3VdID0gdTtcbiAgICAgICAgcG9zW3VdID0gaTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgdmFyIHByZXZJZHggPSAtMTtcbiAgICAgIGxheWVyLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICB2YXIgcmVsYXRlZCA9IGdbcmVsYXRpb25zaGlwXSh2KSwgLy8gQWRqYWNlbnQgbm9kZXMgZnJvbSB0aGUgcHJldmlvdXMgbGF5ZXJcbiAgICAgICAgICAgIG1pZDsgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBtaWQgcG9pbnQgaW4gdGhlIHJlbGF0ZWQgYXJyYXlcblxuICAgICAgICBpZiAocmVsYXRlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVsYXRlZC5zb3J0KGZ1bmN0aW9uKHgsIHkpIHsgcmV0dXJuIHBvc1t4XSAtIHBvc1t5XTsgfSk7XG4gICAgICAgICAgbWlkID0gKHJlbGF0ZWQubGVuZ3RoIC0gMSkgLyAyO1xuICAgICAgICAgIHJlbGF0ZWQuc2xpY2UoTWF0aC5mbG9vcihtaWQpLCBNYXRoLmNlaWwobWlkKSArIDEpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgICAgICAgaWYgKGFsaWduW3ZdID09PSB2KSB7XG4gICAgICAgICAgICAgIGlmICghY29uZmxpY3RzW3VuZGlyRWRnZUlkKHUsIHYpXSAmJiBwcmV2SWR4IDwgcG9zW3VdKSB7XG4gICAgICAgICAgICAgICAgYWxpZ25bdV0gPSB2O1xuICAgICAgICAgICAgICAgIGFsaWduW3ZdID0gcm9vdFt2XSA9IHJvb3RbdV07XG4gICAgICAgICAgICAgICAgcHJldklkeCA9IHBvc1t1XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHBvczogcG9zLCByb290OiByb290LCBhbGlnbjogYWxpZ24gfTtcbiAgfVxuXG4gIC8vIFRoaXMgZnVuY3Rpb24gZGV2aWF0ZXMgZnJvbSB0aGUgc3RhbmRhcmQgQksgYWxnb3JpdGhtIGluIHR3byB3YXlzLiBGaXJzdFxuICAvLyBpdCB0YWtlcyBpbnRvIGFjY291bnQgdGhlIHNpemUgb2YgdGhlIG5vZGVzLiBTZWNvbmQgaXQgaW5jbHVkZXMgYSBmaXggdG9cbiAgLy8gdGhlIG9yaWdpbmFsIGFsZ29yaXRobSB0aGF0IGlzIGRlc2NyaWJlZCBpbiBDYXJzdGVucywgXCJOb2RlIGFuZCBMYWJlbFxuICAvLyBQbGFjZW1lbnQgaW4gYSBMYXllcmVkIExheW91dCBBbGdvcml0aG1cIi5cbiAgZnVuY3Rpb24gaG9yaXpvbnRhbENvbXBhY3Rpb24oZywgbGF5ZXJpbmcsIHBvcywgcm9vdCwgYWxpZ24pIHtcbiAgICB2YXIgc2luayA9IHt9LCAgICAgICAvLyBNYXBwaW5nIG9mIG5vZGUgaWQgLT4gc2luayBub2RlIGlkIGZvciBjbGFzc1xuICAgICAgICBtYXliZVNoaWZ0ID0ge30sIC8vIE1hcHBpbmcgb2Ygc2luayBub2RlIGlkIC0+IHsgY2xhc3Mgbm9kZSBpZCwgbWluIHNoaWZ0IH1cbiAgICAgICAgc2hpZnQgPSB7fSwgICAgICAvLyBNYXBwaW5nIG9mIHNpbmsgbm9kZSBpZCAtPiBzaGlmdFxuICAgICAgICBwcmVkID0ge30sICAgICAgIC8vIE1hcHBpbmcgb2Ygbm9kZSBpZCAtPiBwcmVkZWNlc3NvciBub2RlIChvciBudWxsKVxuICAgICAgICB4cyA9IHt9OyAgICAgICAgIC8vIENhbGN1bGF0ZWQgWCBwb3NpdGlvbnNcblxuICAgIGxheWVyaW5nLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIGxheWVyLmZvckVhY2goZnVuY3Rpb24odSwgaSkge1xuICAgICAgICBzaW5rW3VdID0gdTtcbiAgICAgICAgbWF5YmVTaGlmdFt1XSA9IHt9O1xuICAgICAgICBpZiAoaSA+IDApXG4gICAgICAgICAgcHJlZFt1XSA9IGxheWVyW2kgLSAxXTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlU2hpZnQodG9TaGlmdCwgbmVpZ2hib3IsIGRlbHRhKSB7XG4gICAgICBpZiAoIShuZWlnaGJvciBpbiBtYXliZVNoaWZ0W3RvU2hpZnRdKSkge1xuICAgICAgICBtYXliZVNoaWZ0W3RvU2hpZnRdW25laWdoYm9yXSA9IGRlbHRhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF5YmVTaGlmdFt0b1NoaWZ0XVtuZWlnaGJvcl0gPSBNYXRoLm1pbihtYXliZVNoaWZ0W3RvU2hpZnRdW25laWdoYm9yXSwgZGVsdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBsYWNlQmxvY2sodikge1xuICAgICAgaWYgKCEodiBpbiB4cykpIHtcbiAgICAgICAgeHNbdl0gPSAwO1xuICAgICAgICB2YXIgdyA9IHY7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICBpZiAocG9zW3ddID4gMCkge1xuICAgICAgICAgICAgdmFyIHUgPSByb290W3ByZWRbd11dO1xuICAgICAgICAgICAgcGxhY2VCbG9jayh1KTtcbiAgICAgICAgICAgIGlmIChzaW5rW3ZdID09PSB2KSB7XG4gICAgICAgICAgICAgIHNpbmtbdl0gPSBzaW5rW3VdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGRlbHRhID0gc2VwKGcsIHByZWRbd10pICsgc2VwKGcsIHcpO1xuICAgICAgICAgICAgaWYgKHNpbmtbdl0gIT09IHNpbmtbdV0pIHtcbiAgICAgICAgICAgICAgdXBkYXRlU2hpZnQoc2lua1t1XSwgc2lua1t2XSwgeHNbdl0gLSB4c1t1XSAtIGRlbHRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHhzW3ZdID0gTWF0aC5tYXgoeHNbdl0sIHhzW3VdICsgZGVsdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3ID0gYWxpZ25bd107XG4gICAgICAgIH0gd2hpbGUgKHcgIT09IHYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJvb3QgY29vcmRpbmF0ZXMgcmVsYXRpdmUgdG8gc2lua1xuICAgIHV0aWwudmFsdWVzKHJvb3QpLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgcGxhY2VCbG9jayh2KTtcbiAgICB9KTtcblxuICAgIC8vIEFic29sdXRlIGNvb3JkaW5hdGVzXG4gICAgLy8gVGhlcmUgaXMgYW4gYXNzdW1wdGlvbiBoZXJlIHRoYXQgd2UndmUgcmVzb2x2ZWQgc2hpZnRzIGZvciBhbnkgY2xhc3Nlc1xuICAgIC8vIHRoYXQgYmVnaW4gYXQgYW4gZWFybGllciBsYXllci4gV2UgZ3VhcmFudGVlIHRoaXMgYnkgdmlzaXRpbmcgbGF5ZXJzIGluXG4gICAgLy8gb3JkZXIuXG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgbGF5ZXIuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICAgIHhzW3ZdID0geHNbcm9vdFt2XV07XG4gICAgICAgIGlmICh2ID09PSByb290W3ZdICYmIHYgPT09IHNpbmtbdl0pIHtcbiAgICAgICAgICB2YXIgbWluU2hpZnQgPSAwO1xuICAgICAgICAgIGlmICh2IGluIG1heWJlU2hpZnQgJiYgT2JqZWN0LmtleXMobWF5YmVTaGlmdFt2XSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWluU2hpZnQgPSB1dGlsLm1pbihPYmplY3Qua2V5cyhtYXliZVNoaWZ0W3ZdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbih1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXliZVNoaWZ0W3ZdW3VdICsgKHUgaW4gc2hpZnQgPyBzaGlmdFt1XSA6IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2hpZnRbdl0gPSBtaW5TaGlmdDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgeHNbdl0gKz0gc2hpZnRbc2lua1tyb290W3ZdXV0gfHwgMDtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHhzO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZE1pbkNvb3JkKGcsIGxheWVyaW5nLCB4cykge1xuICAgIHJldHVybiB1dGlsLm1pbihsYXllcmluZy5tYXAoZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIHZhciB1ID0gbGF5ZXJbMF07XG4gICAgICByZXR1cm4geHNbdV07XG4gICAgfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZE1heENvb3JkKGcsIGxheWVyaW5nLCB4cykge1xuICAgIHJldHVybiB1dGlsLm1heChsYXllcmluZy5tYXAoZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIHZhciB1ID0gbGF5ZXJbbGF5ZXIubGVuZ3RoIC0gMV07XG4gICAgICByZXR1cm4geHNbdV07XG4gICAgfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gYmFsYW5jZShnLCBsYXllcmluZywgeHNzKSB7XG4gICAgdmFyIG1pbiA9IHt9LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNaW4gY29vcmRpbmF0ZSBmb3IgdGhlIGFsaWdubWVudFxuICAgICAgICBtYXggPSB7fSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWF4IGNvb3JkaW5hdGUgZm9yIHRoZSBhbGdpbm1lbnRcbiAgICAgICAgc21hbGxlc3RBbGlnbm1lbnQsXG4gICAgICAgIHNoaWZ0ID0ge307ICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbW91bnQgdG8gc2hpZnQgYSBnaXZlbiBhbGlnbm1lbnRcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUFsaWdubWVudCh2KSB7XG4gICAgICB4c3NbYWxpZ25tZW50XVt2XSArPSBzaGlmdFthbGlnbm1lbnRdO1xuICAgIH1cblxuICAgIHZhciBzbWFsbGVzdCA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICBmb3IgKHZhciBhbGlnbm1lbnQgaW4geHNzKSB7XG4gICAgICB2YXIgeHMgPSB4c3NbYWxpZ25tZW50XTtcbiAgICAgIG1pblthbGlnbm1lbnRdID0gZmluZE1pbkNvb3JkKGcsIGxheWVyaW5nLCB4cyk7XG4gICAgICBtYXhbYWxpZ25tZW50XSA9IGZpbmRNYXhDb29yZChnLCBsYXllcmluZywgeHMpO1xuICAgICAgdmFyIHcgPSBtYXhbYWxpZ25tZW50XSAtIG1pblthbGlnbm1lbnRdO1xuICAgICAgaWYgKHcgPCBzbWFsbGVzdCkge1xuICAgICAgICBzbWFsbGVzdCA9IHc7XG4gICAgICAgIHNtYWxsZXN0QWxpZ25tZW50ID0gYWxpZ25tZW50O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERldGVybWluZSBob3cgbXVjaCB0byBhZGp1c3QgcG9zaXRpb25pbmcgZm9yIGVhY2ggYWxpZ25tZW50XG4gICAgWyd1JywgJ2QnXS5mb3JFYWNoKGZ1bmN0aW9uKHZlcnREaXIpIHtcbiAgICAgIFsnbCcsICdyJ10uZm9yRWFjaChmdW5jdGlvbihob3JpekRpcikge1xuICAgICAgICB2YXIgYWxpZ25tZW50ID0gdmVydERpciArIGhvcml6RGlyO1xuICAgICAgICBzaGlmdFthbGlnbm1lbnRdID0gaG9yaXpEaXIgPT09ICdsJ1xuICAgICAgICAgICAgPyBtaW5bc21hbGxlc3RBbGlnbm1lbnRdIC0gbWluW2FsaWdubWVudF1cbiAgICAgICAgICAgIDogbWF4W3NtYWxsZXN0QWxpZ25tZW50XSAtIG1heFthbGlnbm1lbnRdO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBGaW5kIGF2ZXJhZ2Ugb2YgbWVkaWFucyBmb3IgeHNzIGFycmF5XG4gICAgZm9yIChhbGlnbm1lbnQgaW4geHNzKSB7XG4gICAgICBnLmVhY2hOb2RlKHVwZGF0ZUFsaWdubWVudCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZmxpcEhvcml6b250YWxseSh4cykge1xuICAgIGZvciAodmFyIHUgaW4geHMpIHtcbiAgICAgIHhzW3VdID0gLXhzW3VdO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJldmVyc2VJbm5lck9yZGVyKGxheWVyaW5nKSB7XG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgbGF5ZXIucmV2ZXJzZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gd2lkdGgoZywgdSkge1xuICAgIHN3aXRjaCAoZy5ncmFwaCgpLnJhbmtEaXIpIHtcbiAgICAgIGNhc2UgJ0xSJzogcmV0dXJuIGcubm9kZSh1KS5oZWlnaHQ7XG4gICAgICBjYXNlICdSTCc6IHJldHVybiBnLm5vZGUodSkuaGVpZ2h0O1xuICAgICAgZGVmYXVsdDogICByZXR1cm4gZy5ub2RlKHUpLndpZHRoO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlaWdodChnLCB1KSB7XG4gICAgc3dpdGNoKGcuZ3JhcGgoKS5yYW5rRGlyKSB7XG4gICAgICBjYXNlICdMUic6IHJldHVybiBnLm5vZGUodSkud2lkdGg7XG4gICAgICBjYXNlICdSTCc6IHJldHVybiBnLm5vZGUodSkud2lkdGg7XG4gICAgICBkZWZhdWx0OiAgIHJldHVybiBnLm5vZGUodSkuaGVpZ2h0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlcChnLCB1KSB7XG4gICAgaWYgKGNvbmZpZy51bml2ZXJzYWxTZXAgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBjb25maWcudW5pdmVyc2FsU2VwO1xuICAgIH1cbiAgICB2YXIgdyA9IHdpZHRoKGcsIHUpO1xuICAgIHZhciBzID0gZy5ub2RlKHUpLmR1bW15ID8gY29uZmlnLmVkZ2VTZXAgOiBjb25maWcubm9kZVNlcDtcbiAgICByZXR1cm4gKHcgKyBzKSAvIDI7XG4gIH1cblxuICBmdW5jdGlvbiBwb3NYKGcsIHUsIHgpIHtcbiAgICBpZiAoZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdMUicgfHwgZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdSTCcpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpLnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSkueSA9IHg7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpLng7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSkueCA9IHg7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcG9zWERlYnVnKG5hbWUsIGcsIHUsIHgpIHtcbiAgICBpZiAoZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdMUicgfHwgZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdSTCcpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpW25hbWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZy5ub2RlKHUpW25hbWVdID0geDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBnLm5vZGUodSlbbmFtZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSlbbmFtZV0gPSB4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc1koZywgdSwgeSkge1xuICAgIGlmIChnLmdyYXBoKCkucmFua0RpciA9PT0gJ0xSJyB8fCBnLmdyYXBoKCkucmFua0RpciA9PT0gJ1JMJykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBnLm5vZGUodSkueDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGcubm9kZSh1KS54ID0geTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBnLm5vZGUodSkueTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGcubm9kZSh1KS55ID0geTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZWJ1Z1Bvc2l0aW9uaW5nKGFsaWduLCBnLCBsYXllcmluZywgeHMpIHtcbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGwsIGxpKSB7XG4gICAgICB2YXIgdSwgeFU7XG4gICAgICBsLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICB2YXIgeFYgPSB4c1t2XTtcbiAgICAgICAgaWYgKHUpIHtcbiAgICAgICAgICB2YXIgcyA9IHNlcChnLCB1KSArIHNlcChnLCB2KTtcbiAgICAgICAgICBpZiAoeFYgLSB4VSA8IHMpXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUG9zaXRpb24gcGhhc2U6IHNlcCB2aW9sYXRpb24uIEFsaWduOiAnICsgYWxpZ24gKyAnLiBMYXllcjogJyArIGxpICsgJy4gJyArXG4gICAgICAgICAgICAgICdVOiAnICsgdSArICcgVjogJyArIHYgKyAnLiBBY3R1YWwgc2VwOiAnICsgKHhWIC0geFUpICsgJyBFeHBlY3RlZCBzZXA6ICcgKyBzKTtcbiAgICAgICAgfVxuICAgICAgICB1ID0gdjtcbiAgICAgICAgeFUgPSB4VjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgIGFjeWNsaWMgPSByZXF1aXJlKCcuL3JhbmsvYWN5Y2xpYycpLFxuICAgIGluaXRSYW5rID0gcmVxdWlyZSgnLi9yYW5rL2luaXRSYW5rJyksXG4gICAgZmVhc2libGVUcmVlID0gcmVxdWlyZSgnLi9yYW5rL2ZlYXNpYmxlVHJlZScpLFxuICAgIGNvbnN0cmFpbnRzID0gcmVxdWlyZSgnLi9yYW5rL2NvbnN0cmFpbnRzJyksXG4gICAgc2ltcGxleCA9IHJlcXVpcmUoJy4vcmFuay9zaW1wbGV4JyksXG4gICAgY29tcG9uZW50cyA9IHJlcXVpcmUoJ2dyYXBobGliJykuYWxnLmNvbXBvbmVudHMsXG4gICAgZmlsdGVyID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5maWx0ZXI7XG5cbmV4cG9ydHMucnVuID0gcnVuO1xuZXhwb3J0cy5yZXN0b3JlRWRnZXMgPSByZXN0b3JlRWRnZXM7XG5cbi8qXG4gKiBIZXVyaXN0aWMgZnVuY3Rpb24gdGhhdCBhc3NpZ25zIGEgcmFuayB0byBlYWNoIG5vZGUgb2YgdGhlIGlucHV0IGdyYXBoIHdpdGhcbiAqIHRoZSBpbnRlbnQgb2YgbWluaW1pemluZyBlZGdlIGxlbmd0aHMsIHdoaWxlIHJlc3BlY3RpbmcgdGhlIGBtaW5MZW5gXG4gKiBhdHRyaWJ1dGUgb2YgaW5jaWRlbnQgZWRnZXMuXG4gKlxuICogUHJlcmVxdWlzaXRlczpcbiAqXG4gKiAgKiBFYWNoIGVkZ2UgaW4gdGhlIGlucHV0IGdyYXBoIG11c3QgaGF2ZSBhbiBhc3NpZ25lZCAnbWluTGVuJyBhdHRyaWJ1dGVcbiAqL1xuZnVuY3Rpb24gcnVuKGcsIHVzZVNpbXBsZXgpIHtcbiAgZXhwYW5kU2VsZkxvb3BzKGcpO1xuXG4gIC8vIElmIHRoZXJlIGFyZSByYW5rIGNvbnN0cmFpbnRzIG9uIG5vZGVzLCB0aGVuIGJ1aWxkIGEgbmV3IGdyYXBoIHRoYXRcbiAgLy8gZW5jb2RlcyB0aGUgY29uc3RyYWludHMuXG4gIHV0aWwudGltZSgnY29uc3RyYWludHMuYXBwbHknLCBjb25zdHJhaW50cy5hcHBseSkoZyk7XG5cbiAgZXhwYW5kU2lkZXdheXNFZGdlcyhnKTtcblxuICAvLyBSZXZlcnNlIGVkZ2VzIHRvIGdldCBhbiBhY3ljbGljIGdyYXBoLCB3ZSBrZWVwIHRoZSBncmFwaCBpbiBhbiBhY3ljbGljXG4gIC8vIHN0YXRlIHVudGlsIHRoZSB2ZXJ5IGVuZC5cbiAgdXRpbC50aW1lKCdhY3ljbGljJywgYWN5Y2xpYykoZyk7XG5cbiAgLy8gQ29udmVydCB0aGUgZ3JhcGggaW50byBhIGZsYXQgZ3JhcGggZm9yIHJhbmtpbmdcbiAgdmFyIGZsYXRHcmFwaCA9IGcuZmlsdGVyTm9kZXModXRpbC5maWx0ZXJOb25TdWJncmFwaHMoZykpO1xuXG4gIC8vIEFzc2lnbiBhbiBpbml0aWFsIHJhbmtpbmcgdXNpbmcgREZTLlxuICBpbml0UmFuayhmbGF0R3JhcGgpO1xuXG4gIC8vIEZvciBlYWNoIGNvbXBvbmVudCBpbXByb3ZlIHRoZSBhc3NpZ25lZCByYW5rcy5cbiAgY29tcG9uZW50cyhmbGF0R3JhcGgpLmZvckVhY2goZnVuY3Rpb24oY21wdCkge1xuICAgIHZhciBzdWJncmFwaCA9IGZsYXRHcmFwaC5maWx0ZXJOb2RlcyhmaWx0ZXIubm9kZXNGcm9tTGlzdChjbXB0KSk7XG4gICAgcmFua0NvbXBvbmVudChzdWJncmFwaCwgdXNlU2ltcGxleCk7XG4gIH0pO1xuXG4gIC8vIFJlbGF4IG9yaWdpbmFsIGNvbnN0cmFpbnRzXG4gIHV0aWwudGltZSgnY29uc3RyYWludHMucmVsYXgnLCBjb25zdHJhaW50cy5yZWxheChnKSk7XG5cbiAgLy8gV2hlbiBoYW5kbGluZyBub2RlcyB3aXRoIGNvbnN0cmFpbmVkIHJhbmtzIGl0IGlzIHBvc3NpYmxlIHRvIGVuZCB1cCB3aXRoXG4gIC8vIGVkZ2VzIHRoYXQgcG9pbnQgdG8gcHJldmlvdXMgcmFua3MuIE1vc3Qgb2YgdGhlIHN1YnNlcXVlbnQgYWxnb3JpdGhtcyBhc3N1bWVcbiAgLy8gdGhhdCBlZGdlcyBhcmUgcG9pbnRpbmcgdG8gc3VjY2Vzc2l2ZSByYW5rcyBvbmx5LiBIZXJlIHdlIHJldmVyc2UgYW55IFwiYmFja1xuICAvLyBlZGdlc1wiIGFuZCBtYXJrIHRoZW0gYXMgc3VjaC4gVGhlIGFjeWNsaWMgYWxnb3JpdGhtIHdpbGwgcmV2ZXJzZSB0aGVtIGFzIGFcbiAgLy8gcG9zdCBwcm9jZXNzaW5nIHN0ZXAuXG4gIHV0aWwudGltZSgncmVvcmllbnRFZGdlcycsIHJlb3JpZW50RWRnZXMpKGcpO1xufVxuXG5mdW5jdGlvbiByZXN0b3JlRWRnZXMoZykge1xuICBhY3ljbGljLnVuZG8oZyk7XG59XG5cbi8qXG4gKiBFeHBhbmQgc2VsZiBsb29wcyBpbnRvIHRocmVlIGR1bW15IG5vZGVzLiBPbmUgd2lsbCBzaXQgYWJvdmUgdGhlIGluY2lkZW50XG4gKiBub2RlLCBvbmUgd2lsbCBiZSBhdCB0aGUgc2FtZSBsZXZlbCwgYW5kIG9uZSBiZWxvdy4gVGhlIHJlc3VsdCBsb29rcyBsaWtlOlxuICpcbiAqICAgICAgICAgLy0tPC0teC0tLT4tLVxcXG4gKiAgICAgbm9kZSAgICAgICAgICAgICAgeVxuICogICAgICAgICBcXC0tPC0tei0tLT4tLS9cbiAqXG4gKiBEdW1teSBub2RlcyB4LCB5LCB6IGdpdmUgdXMgdGhlIHNoYXBlIG9mIGEgbG9vcCBhbmQgbm9kZSB5IGlzIHdoZXJlIHdlIHBsYWNlXG4gKiB0aGUgbGFiZWwuXG4gKlxuICogVE9ETzogY29uc29saWRhdGUga25vd2xlZGdlIG9mIGR1bW15IG5vZGUgY29uc3RydWN0aW9uLlxuICogVE9ETzogc3VwcG9ydCBtaW5MZW4gPSAyXG4gKi9cbmZ1bmN0aW9uIGV4cGFuZFNlbGZMb29wcyhnKSB7XG4gIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgYSkge1xuICAgIGlmICh1ID09PSB2KSB7XG4gICAgICB2YXIgeCA9IGFkZER1bW15Tm9kZShnLCBlLCB1LCB2LCBhLCAwLCBmYWxzZSksXG4gICAgICAgICAgeSA9IGFkZER1bW15Tm9kZShnLCBlLCB1LCB2LCBhLCAxLCB0cnVlKSxcbiAgICAgICAgICB6ID0gYWRkRHVtbXlOb2RlKGcsIGUsIHUsIHYsIGEsIDIsIGZhbHNlKTtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB4LCB1LCB7bWluTGVuOiAxLCBzZWxmTG9vcDogdHJ1ZX0pO1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHgsIHksIHttaW5MZW46IDEsIHNlbGZMb29wOiB0cnVlfSk7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgeiwge21pbkxlbjogMSwgc2VsZkxvb3A6IHRydWV9KTtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB5LCB6LCB7bWluTGVuOiAxLCBzZWxmTG9vcDogdHJ1ZX0pO1xuICAgICAgZy5kZWxFZGdlKGUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZFNpZGV3YXlzRWRnZXMoZykge1xuICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIGEpIHtcbiAgICBpZiAodSA9PT0gdikge1xuICAgICAgdmFyIG9yaWdFZGdlID0gYS5vcmlnaW5hbEVkZ2UsXG4gICAgICAgICAgZHVtbXkgPSBhZGREdW1teU5vZGUoZywgb3JpZ0VkZ2UuZSwgb3JpZ0VkZ2UudSwgb3JpZ0VkZ2Uudiwgb3JpZ0VkZ2UudmFsdWUsIDAsIHRydWUpO1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIGR1bW15LCB7bWluTGVuOiAxfSk7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgZHVtbXksIHYsIHttaW5MZW46IDF9KTtcbiAgICAgIGcuZGVsRWRnZShlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGREdW1teU5vZGUoZywgZSwgdSwgdiwgYSwgaW5kZXgsIGlzTGFiZWwpIHtcbiAgcmV0dXJuIGcuYWRkTm9kZShudWxsLCB7XG4gICAgd2lkdGg6IGlzTGFiZWwgPyBhLndpZHRoIDogMCxcbiAgICBoZWlnaHQ6IGlzTGFiZWwgPyBhLmhlaWdodCA6IDAsXG4gICAgZWRnZTogeyBpZDogZSwgc291cmNlOiB1LCB0YXJnZXQ6IHYsIGF0dHJzOiBhIH0sXG4gICAgZHVtbXk6IHRydWUsXG4gICAgaW5kZXg6IGluZGV4XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZW9yaWVudEVkZ2VzKGcpIHtcbiAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIGlmIChnLm5vZGUodSkucmFuayA+IGcubm9kZSh2KS5yYW5rKSB7XG4gICAgICBnLmRlbEVkZ2UoZSk7XG4gICAgICB2YWx1ZS5yZXZlcnNlZCA9IHRydWU7XG4gICAgICBnLmFkZEVkZ2UoZSwgdiwgdSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJhbmtDb21wb25lbnQoc3ViZ3JhcGgsIHVzZVNpbXBsZXgpIHtcbiAgdmFyIHNwYW5uaW5nVHJlZSA9IGZlYXNpYmxlVHJlZShzdWJncmFwaCk7XG5cbiAgaWYgKHVzZVNpbXBsZXgpIHtcbiAgICB1dGlsLmxvZygxLCAnVXNpbmcgbmV0d29yayBzaW1wbGV4IGZvciByYW5raW5nJyk7XG4gICAgc2ltcGxleChzdWJncmFwaCwgc3Bhbm5pbmdUcmVlKTtcbiAgfVxuICBub3JtYWxpemUoc3ViZ3JhcGgpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemUoZykge1xuICB2YXIgbSA9IHV0aWwubWluKGcubm9kZXMoKS5tYXAoZnVuY3Rpb24odSkgeyByZXR1cm4gZy5ub2RlKHUpLnJhbms7IH0pKTtcbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCBub2RlKSB7IG5vZGUucmFuayAtPSBtOyB9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gYWN5Y2xpYztcbm1vZHVsZS5leHBvcnRzLnVuZG8gPSB1bmRvO1xuXG4vKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhIGRpcmVjdGVkIGdyYXBoIHRoYXQgbWF5IGhhdmUgY3ljbGVzIGFuZCByZXZlcnNlcyBlZGdlc1xuICogYXMgYXBwcm9wcmlhdGUgdG8gYnJlYWsgdGhlc2UgY3ljbGVzLiBFYWNoIHJldmVyc2VkIGVkZ2UgaXMgYXNzaWduZWQgYVxuICogYHJldmVyc2VkYCBhdHRyaWJ1dGUgd2l0aCB0aGUgdmFsdWUgYHRydWVgLlxuICpcbiAqIFRoZXJlIHNob3VsZCBiZSBubyBzZWxmIGxvb3BzIGluIHRoZSBncmFwaC5cbiAqL1xuZnVuY3Rpb24gYWN5Y2xpYyhnKSB7XG4gIHZhciBvblN0YWNrID0ge30sXG4gICAgICB2aXNpdGVkID0ge30sXG4gICAgICByZXZlcnNlQ291bnQgPSAwO1xuICBcbiAgZnVuY3Rpb24gZGZzKHUpIHtcbiAgICBpZiAodSBpbiB2aXNpdGVkKSByZXR1cm47XG4gICAgdmlzaXRlZFt1XSA9IG9uU3RhY2tbdV0gPSB0cnVlO1xuICAgIGcub3V0RWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgdCA9IGcudGFyZ2V0KGUpLFxuICAgICAgICAgIHZhbHVlO1xuXG4gICAgICBpZiAodSA9PT0gdCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXYXJuaW5nOiBmb3VuZCBzZWxmIGxvb3AgXCInICsgZSArICdcIiBmb3Igbm9kZSBcIicgKyB1ICsgJ1wiJyk7XG4gICAgICB9IGVsc2UgaWYgKHQgaW4gb25TdGFjaykge1xuICAgICAgICB2YWx1ZSA9IGcuZWRnZShlKTtcbiAgICAgICAgZy5kZWxFZGdlKGUpO1xuICAgICAgICB2YWx1ZS5yZXZlcnNlZCA9IHRydWU7XG4gICAgICAgICsrcmV2ZXJzZUNvdW50O1xuICAgICAgICBnLmFkZEVkZ2UoZSwgdCwgdSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGZzKHQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZGVsZXRlIG9uU3RhY2tbdV07XG4gIH1cblxuICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHsgZGZzKHUpOyB9KTtcblxuICB1dGlsLmxvZygyLCAnQWN5Y2xpYyBQaGFzZTogcmV2ZXJzZWQgJyArIHJldmVyc2VDb3VudCArICcgZWRnZShzKScpO1xuXG4gIHJldHVybiByZXZlcnNlQ291bnQ7XG59XG5cbi8qXG4gKiBHaXZlbiBhIGdyYXBoIHRoYXQgaGFzIGhhZCB0aGUgYWN5Y2xpYyBvcGVyYXRpb24gYXBwbGllZCwgdGhpcyBmdW5jdGlvblxuICogdW5kb2VzIHRoYXQgb3BlcmF0aW9uLiBNb3JlIHNwZWNpZmljYWxseSwgYW55IGVkZ2Ugd2l0aCB0aGUgYHJldmVyc2VkYFxuICogYXR0cmlidXRlIGlzIGFnYWluIHJldmVyc2VkIHRvIHJlc3RvcmUgdGhlIG9yaWdpbmFsIGRpcmVjdGlvbiBvZiB0aGUgZWRnZS5cbiAqL1xuZnVuY3Rpb24gdW5kbyhnKSB7XG4gIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgcywgdCwgYSkge1xuICAgIGlmIChhLnJldmVyc2VkKSB7XG4gICAgICBkZWxldGUgYS5yZXZlcnNlZDtcbiAgICAgIGcuZGVsRWRnZShlKTtcbiAgICAgIGcuYWRkRWRnZShlLCB0LCBzLCBhKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmFwcGx5ID0gZnVuY3Rpb24oZykge1xuICBmdW5jdGlvbiBkZnMoc2cpIHtcbiAgICB2YXIgcmFua1NldHMgPSB7fTtcbiAgICBnLmNoaWxkcmVuKHNnKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgIGlmIChnLmNoaWxkcmVuKHUpLmxlbmd0aCkge1xuICAgICAgICBkZnModSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlID0gZy5ub2RlKHUpLFxuICAgICAgICAgIHByZWZSYW5rID0gdmFsdWUucHJlZlJhbms7XG4gICAgICBpZiAocHJlZlJhbmsgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIWNoZWNrU3VwcG9ydGVkUHJlZlJhbmsocHJlZlJhbmspKSB7IHJldHVybjsgfVxuXG4gICAgICAgIGlmICghKHByZWZSYW5rIGluIHJhbmtTZXRzKSkge1xuICAgICAgICAgIHJhbmtTZXRzLnByZWZSYW5rID0gW3VdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJhbmtTZXRzLnByZWZSYW5rLnB1c2godSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmV3VSA9IHJhbmtTZXRzW3ByZWZSYW5rXTtcbiAgICAgICAgaWYgKG5ld1UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG5ld1UgPSByYW5rU2V0c1twcmVmUmFua10gPSBnLmFkZE5vZGUobnVsbCwgeyBvcmlnaW5hbE5vZGVzOiBbXSB9KTtcbiAgICAgICAgICBnLnBhcmVudChuZXdVLCBzZyk7XG4gICAgICAgIH1cblxuICAgICAgICByZWRpcmVjdEluRWRnZXMoZywgdSwgbmV3VSwgcHJlZlJhbmsgPT09ICdtaW4nKTtcbiAgICAgICAgcmVkaXJlY3RPdXRFZGdlcyhnLCB1LCBuZXdVLCBwcmVmUmFuayA9PT0gJ21heCcpO1xuXG4gICAgICAgIC8vIFNhdmUgb3JpZ2luYWwgbm9kZSBhbmQgcmVtb3ZlIGl0IGZyb20gcmVkdWNlZCBncmFwaFxuICAgICAgICBnLm5vZGUobmV3VSkub3JpZ2luYWxOb2Rlcy5wdXNoKHsgdTogdSwgdmFsdWU6IHZhbHVlLCBwYXJlbnQ6IHNnIH0pO1xuICAgICAgICBnLmRlbE5vZGUodSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhZGRMaWdodEVkZ2VzRnJvbU1pbk5vZGUoZywgc2csIHJhbmtTZXRzLm1pbik7XG4gICAgYWRkTGlnaHRFZGdlc1RvTWF4Tm9kZShnLCBzZywgcmFua1NldHMubWF4KTtcbiAgfVxuXG4gIGRmcyhudWxsKTtcbn07XG5cbmZ1bmN0aW9uIGNoZWNrU3VwcG9ydGVkUHJlZlJhbmsocHJlZlJhbmspIHtcbiAgaWYgKHByZWZSYW5rICE9PSAnbWluJyAmJiBwcmVmUmFuayAhPT0gJ21heCcgJiYgcHJlZlJhbmsuaW5kZXhPZignc2FtZV8nKSAhPT0gMCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1Vuc3VwcG9ydGVkIHJhbmsgdHlwZTogJyArIHByZWZSYW5rKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlZGlyZWN0SW5FZGdlcyhnLCB1LCBuZXdVLCByZXZlcnNlKSB7XG4gIGcuaW5FZGdlcyh1KS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgb3JpZ1ZhbHVlID0gZy5lZGdlKGUpLFxuICAgICAgICB2YWx1ZTtcbiAgICBpZiAob3JpZ1ZhbHVlLm9yaWdpbmFsRWRnZSkge1xuICAgICAgdmFsdWUgPSBvcmlnVmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gIHtcbiAgICAgICAgb3JpZ2luYWxFZGdlOiB7IGU6IGUsIHU6IGcuc291cmNlKGUpLCB2OiBnLnRhcmdldChlKSwgdmFsdWU6IG9yaWdWYWx1ZSB9LFxuICAgICAgICBtaW5MZW46IGcuZWRnZShlKS5taW5MZW5cbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRG8gbm90IHJldmVyc2UgZWRnZXMgZm9yIHNlbGYtbG9vcHMuXG4gICAgaWYgKG9yaWdWYWx1ZS5zZWxmTG9vcCkge1xuICAgICAgcmV2ZXJzZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBhbGwgZWRnZXMgdG8gbWluIGFyZSByZXZlcnNlZFxuICAgICAgZy5hZGRFZGdlKG51bGwsIG5ld1UsIGcuc291cmNlKGUpLCB2YWx1ZSk7XG4gICAgICB2YWx1ZS5yZXZlcnNlZCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGcuYWRkRWRnZShudWxsLCBnLnNvdXJjZShlKSwgbmV3VSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlZGlyZWN0T3V0RWRnZXMoZywgdSwgbmV3VSwgcmV2ZXJzZSkge1xuICBnLm91dEVkZ2VzKHUpLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgIHZhciBvcmlnVmFsdWUgPSBnLmVkZ2UoZSksXG4gICAgICAgIHZhbHVlO1xuICAgIGlmIChvcmlnVmFsdWUub3JpZ2luYWxFZGdlKSB7XG4gICAgICB2YWx1ZSA9IG9yaWdWYWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgPSAge1xuICAgICAgICBvcmlnaW5hbEVkZ2U6IHsgZTogZSwgdTogZy5zb3VyY2UoZSksIHY6IGcudGFyZ2V0KGUpLCB2YWx1ZTogb3JpZ1ZhbHVlIH0sXG4gICAgICAgIG1pbkxlbjogZy5lZGdlKGUpLm1pbkxlblxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBEbyBub3QgcmV2ZXJzZSBlZGdlcyBmb3Igc2VsZi1sb29wcy5cbiAgICBpZiAob3JpZ1ZhbHVlLnNlbGZMb29wKSB7XG4gICAgICByZXZlcnNlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIC8vIEVuc3VyZSB0aGF0IGFsbCBlZGdlcyBmcm9tIG1heCBhcmUgcmV2ZXJzZWRcbiAgICAgIGcuYWRkRWRnZShudWxsLCBnLnRhcmdldChlKSwgbmV3VSwgdmFsdWUpO1xuICAgICAgdmFsdWUucmV2ZXJzZWQgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgbmV3VSwgZy50YXJnZXQoZSksIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRMaWdodEVkZ2VzRnJvbU1pbk5vZGUoZywgc2csIG1pbk5vZGUpIHtcbiAgaWYgKG1pbk5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgIGcuY2hpbGRyZW4oc2cpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgLy8gVGhlIGR1bW15IGNoZWNrIGVuc3VyZXMgd2UgZG9uJ3QgYWRkIGFuIGVkZ2UgaWYgdGhlIG5vZGUgaXMgaW52b2x2ZWRcbiAgICAgIC8vIGluIGEgc2VsZiBsb29wIG9yIHNpZGV3YXlzIGVkZ2UuXG4gICAgICBpZiAodSAhPT0gbWluTm9kZSAmJiAhZy5vdXRFZGdlcyhtaW5Ob2RlLCB1KS5sZW5ndGggJiYgIWcubm9kZSh1KS5kdW1teSkge1xuICAgICAgICBnLmFkZEVkZ2UobnVsbCwgbWluTm9kZSwgdSwgeyBtaW5MZW46IDAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkTGlnaHRFZGdlc1RvTWF4Tm9kZShnLCBzZywgbWF4Tm9kZSkge1xuICBpZiAobWF4Tm9kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZy5jaGlsZHJlbihzZykuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICAvLyBUaGUgZHVtbXkgY2hlY2sgZW5zdXJlcyB3ZSBkb24ndCBhZGQgYW4gZWRnZSBpZiB0aGUgbm9kZSBpcyBpbnZvbHZlZFxuICAgICAgLy8gaW4gYSBzZWxmIGxvb3Agb3Igc2lkZXdheXMgZWRnZS5cbiAgICAgIGlmICh1ICE9PSBtYXhOb2RlICYmICFnLm91dEVkZ2VzKHUsIG1heE5vZGUpLmxlbmd0aCAmJiAhZy5ub2RlKHUpLmR1bW15KSB7XG4gICAgICAgIGcuYWRkRWRnZShudWxsLCB1LCBtYXhOb2RlLCB7IG1pbkxlbjogMCB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKlxuICogVGhpcyBmdW5jdGlvbiBcInJlbGF4ZXNcIiB0aGUgY29uc3RyYWludHMgYXBwbGllZCBwcmV2aW91c2x5IGJ5IHRoZSBcImFwcGx5XCJcbiAqIGZ1bmN0aW9uLiBJdCBleHBhbmRzIGFueSBub2RlcyB0aGF0IHdlcmUgY29sbGFwc2VkIGFuZCBhc3NpZ25zIHRoZSByYW5rIG9mXG4gKiB0aGUgY29sbGFwc2VkIG5vZGUgdG8gZWFjaCBvZiB0aGUgZXhwYW5kZWQgbm9kZXMuIEl0IGFsc28gcmVzdG9yZXMgdGhlXG4gKiBvcmlnaW5hbCBlZGdlcyBhbmQgcmVtb3ZlcyBhbnkgZHVtbXkgZWRnZXMgcG9pbnRpbmcgYXQgdGhlIGNvbGxhcHNlZCBub2Rlcy5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIHByb2Nlc3Mgb2YgcmVtb3ZpbmcgY29sbGFwc2VkIG5vZGVzIGFsc28gcmVtb3ZlcyBkdW1teSBlZGdlc1xuICogYXV0b21hdGljYWxseS5cbiAqL1xuZXhwb3J0cy5yZWxheCA9IGZ1bmN0aW9uKGcpIHtcbiAgLy8gU2F2ZSBvcmlnaW5hbCBlZGdlc1xuICB2YXIgb3JpZ2luYWxFZGdlcyA9IFtdO1xuICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgdmFyIG9yaWdpbmFsRWRnZSA9IHZhbHVlLm9yaWdpbmFsRWRnZTtcbiAgICBpZiAob3JpZ2luYWxFZGdlKSB7XG4gICAgICBvcmlnaW5hbEVkZ2VzLnB1c2gob3JpZ2luYWxFZGdlKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEV4cGFuZCBjb2xsYXBzZWQgbm9kZXNcbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIHZhciBvcmlnaW5hbE5vZGVzID0gdmFsdWUub3JpZ2luYWxOb2RlcztcbiAgICBpZiAob3JpZ2luYWxOb2Rlcykge1xuICAgICAgb3JpZ2luYWxOb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG9yaWdpbmFsTm9kZSkge1xuICAgICAgICBvcmlnaW5hbE5vZGUudmFsdWUucmFuayA9IHZhbHVlLnJhbms7XG4gICAgICAgIGcuYWRkTm9kZShvcmlnaW5hbE5vZGUudSwgb3JpZ2luYWxOb2RlLnZhbHVlKTtcbiAgICAgICAgZy5wYXJlbnQob3JpZ2luYWxOb2RlLnUsIG9yaWdpbmFsTm9kZS5wYXJlbnQpO1xuICAgICAgfSk7XG4gICAgICBnLmRlbE5vZGUodSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBSZXN0b3JlIG9yaWdpbmFsIGVkZ2VzXG4gIG9yaWdpbmFsRWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XG4gICAgZy5hZGRFZGdlKGVkZ2UuZSwgZWRnZS51LCBlZGdlLnYsIGVkZ2UudmFsdWUpO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGpzaGludCAtVzA3OSAqL1xudmFyIFNldCA9IHJlcXVpcmUoJ2NwLWRhdGEnKS5TZXQsXG4vKiBqc2hpbnQgK1cwNzkgKi9cbiAgICBEaWdyYXBoID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5EaWdyYXBoLFxuICAgIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZmVhc2libGVUcmVlO1xuXG4vKlxuICogR2l2ZW4gYW4gYWN5Y2xpYyBncmFwaCB3aXRoIGVhY2ggbm9kZSBhc3NpZ25lZCBhIGByYW5rYCBhdHRyaWJ1dGUsIHRoaXNcbiAqIGZ1bmN0aW9uIGNvbnN0cnVjdHMgYW5kIHJldHVybnMgYSBzcGFubmluZyB0cmVlLiBUaGlzIGZ1bmN0aW9uIG1heSByZWR1Y2VcbiAqIHRoZSBsZW5ndGggb2Ygc29tZSBlZGdlcyBmcm9tIHRoZSBpbml0aWFsIHJhbmsgYXNzaWdubWVudCB3aGlsZSBtYWludGFpbmluZ1xuICogdGhlIGBtaW5MZW5gIHNwZWNpZmllZCBieSBlYWNoIGVkZ2UuXG4gKlxuICogUHJlcmVxdWlzaXRlczpcbiAqXG4gKiAqIFRoZSBpbnB1dCBncmFwaCBpcyBhY3ljbGljXG4gKiAqIEVhY2ggbm9kZSBpbiB0aGUgaW5wdXQgZ3JhcGggaGFzIGFuIGFzc2lnbmVkIGByYW5rYCBhdHRyaWJ1dGVcbiAqICogRWFjaCBlZGdlIGluIHRoZSBpbnB1dCBncmFwaCBoYXMgYW4gYXNzaWduZWQgYG1pbkxlbmAgYXR0cmlidXRlXG4gKlxuICogT3V0cHV0czpcbiAqXG4gKiBBIGZlYXNpYmxlIHNwYW5uaW5nIHRyZWUgZm9yIHRoZSBpbnB1dCBncmFwaCAoaS5lLiBhIHNwYW5uaW5nIHRyZWUgdGhhdFxuICogcmVzcGVjdHMgZWFjaCBncmFwaCBlZGdlJ3MgYG1pbkxlbmAgYXR0cmlidXRlKSByZXByZXNlbnRlZCBhcyBhIERpZ3JhcGggd2l0aFxuICogYSBgcm9vdGAgYXR0cmlidXRlIG9uIGdyYXBoLlxuICpcbiAqIE5vZGVzIGhhdmUgdGhlIHNhbWUgaWQgYW5kIHZhbHVlIGFzIHRoYXQgaW4gdGhlIGlucHV0IGdyYXBoLlxuICpcbiAqIEVkZ2VzIGluIHRoZSB0cmVlIGhhdmUgYXJiaXRyYXJpbHkgYXNzaWduZWQgaWRzLiBUaGUgYXR0cmlidXRlcyBmb3IgZWRnZXNcbiAqIGluY2x1ZGUgYHJldmVyc2VkYC4gYHJldmVyc2VkYCBpbmRpY2F0ZXMgdGhhdCB0aGUgZWRnZSBpcyBhXG4gKiBiYWNrIGVkZ2UgaW4gdGhlIGlucHV0IGdyYXBoLlxuICovXG5mdW5jdGlvbiBmZWFzaWJsZVRyZWUoZykge1xuICB2YXIgcmVtYWluaW5nID0gbmV3IFNldChnLm5vZGVzKCkpLFxuICAgICAgdHJlZSA9IG5ldyBEaWdyYXBoKCk7XG5cbiAgaWYgKHJlbWFpbmluZy5zaXplKCkgPT09IDEpIHtcbiAgICB2YXIgcm9vdCA9IGcubm9kZXMoKVswXTtcbiAgICB0cmVlLmFkZE5vZGUocm9vdCwge30pO1xuICAgIHRyZWUuZ3JhcGgoeyByb290OiByb290IH0pO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkVGlnaHRFZGdlcyh2KSB7XG4gICAgdmFyIGNvbnRpbnVlVG9TY2FuID0gdHJ1ZTtcbiAgICBnLnByZWRlY2Vzc29ycyh2KS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgIGlmIChyZW1haW5pbmcuaGFzKHUpICYmICFzbGFjayhnLCB1LCB2KSkge1xuICAgICAgICBpZiAocmVtYWluaW5nLmhhcyh2KSkge1xuICAgICAgICAgIHRyZWUuYWRkTm9kZSh2LCB7fSk7XG4gICAgICAgICAgcmVtYWluaW5nLnJlbW92ZSh2KTtcbiAgICAgICAgICB0cmVlLmdyYXBoKHsgcm9vdDogdiB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyZWUuYWRkTm9kZSh1LCB7fSk7XG4gICAgICAgIHRyZWUuYWRkRWRnZShudWxsLCB1LCB2LCB7IHJldmVyc2VkOiB0cnVlIH0pO1xuICAgICAgICByZW1haW5pbmcucmVtb3ZlKHUpO1xuICAgICAgICBhZGRUaWdodEVkZ2VzKHUpO1xuICAgICAgICBjb250aW51ZVRvU2NhbiA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZy5zdWNjZXNzb3JzKHYpLmZvckVhY2goZnVuY3Rpb24odykgIHtcbiAgICAgIGlmIChyZW1haW5pbmcuaGFzKHcpICYmICFzbGFjayhnLCB2LCB3KSkge1xuICAgICAgICBpZiAocmVtYWluaW5nLmhhcyh2KSkge1xuICAgICAgICAgIHRyZWUuYWRkTm9kZSh2LCB7fSk7XG4gICAgICAgICAgcmVtYWluaW5nLnJlbW92ZSh2KTtcbiAgICAgICAgICB0cmVlLmdyYXBoKHsgcm9vdDogdiB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyZWUuYWRkTm9kZSh3LCB7fSk7XG4gICAgICAgIHRyZWUuYWRkRWRnZShudWxsLCB2LCB3LCB7fSk7XG4gICAgICAgIHJlbWFpbmluZy5yZW1vdmUodyk7XG4gICAgICAgIGFkZFRpZ2h0RWRnZXModyk7XG4gICAgICAgIGNvbnRpbnVlVG9TY2FuID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvbnRpbnVlVG9TY2FuO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVGlnaHRFZGdlKCkge1xuICAgIHZhciBtaW5TbGFjayA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgcmVtYWluaW5nLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGcucHJlZGVjZXNzb3JzKHYpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgICBpZiAoIXJlbWFpbmluZy5oYXModSkpIHtcbiAgICAgICAgICB2YXIgZWRnZVNsYWNrID0gc2xhY2soZywgdSwgdik7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKGVkZ2VTbGFjaykgPCBNYXRoLmFicyhtaW5TbGFjaykpIHtcbiAgICAgICAgICAgIG1pblNsYWNrID0gLWVkZ2VTbGFjaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBnLnN1Y2Nlc3NvcnModikuZm9yRWFjaChmdW5jdGlvbih3KSB7XG4gICAgICAgIGlmICghcmVtYWluaW5nLmhhcyh3KSkge1xuICAgICAgICAgIHZhciBlZGdlU2xhY2sgPSBzbGFjayhnLCB2LCB3KTtcbiAgICAgICAgICBpZiAoTWF0aC5hYnMoZWRnZVNsYWNrKSA8IE1hdGguYWJzKG1pblNsYWNrKSkge1xuICAgICAgICAgICAgbWluU2xhY2sgPSBlZGdlU2xhY2s7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRyZWUuZWFjaE5vZGUoZnVuY3Rpb24odSkgeyBnLm5vZGUodSkucmFuayAtPSBtaW5TbGFjazsgfSk7XG4gIH1cblxuICB3aGlsZSAocmVtYWluaW5nLnNpemUoKSkge1xuICAgIHZhciBub2Rlc1RvU2VhcmNoID0gIXRyZWUub3JkZXIoKSA/IHJlbWFpbmluZy5rZXlzKCkgOiB0cmVlLm5vZGVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbm9kZXNUb1NlYXJjaC5sZW5ndGg7XG4gICAgICAgICBpIDwgaWwgJiYgYWRkVGlnaHRFZGdlcyhub2Rlc1RvU2VhcmNoW2ldKTtcbiAgICAgICAgICsraSk7XG4gICAgaWYgKHJlbWFpbmluZy5zaXplKCkpIHtcbiAgICAgIGNyZWF0ZVRpZ2h0RWRnZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cmVlO1xufVxuXG5mdW5jdGlvbiBzbGFjayhnLCB1LCB2KSB7XG4gIHZhciByYW5rRGlmZiA9IGcubm9kZSh2KS5yYW5rIC0gZy5ub2RlKHUpLnJhbms7XG4gIHZhciBtYXhNaW5MZW4gPSB1dGlsLm1heChnLm91dEVkZ2VzKHUsIHYpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihlKSB7IHJldHVybiBnLmVkZ2UoZSkubWluTGVuOyB9KSk7XG4gIHJldHVybiByYW5rRGlmZiAtIG1heE1pbkxlbjtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gICAgdG9wc29ydCA9IHJlcXVpcmUoJ2dyYXBobGliJykuYWxnLnRvcHNvcnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5pdFJhbms7XG5cbi8qXG4gKiBBc3NpZ25zIGEgYHJhbmtgIGF0dHJpYnV0ZSB0byBlYWNoIG5vZGUgaW4gdGhlIGlucHV0IGdyYXBoIGFuZCBlbnN1cmVzIHRoYXRcbiAqIHRoaXMgcmFuayByZXNwZWN0cyB0aGUgYG1pbkxlbmAgYXR0cmlidXRlIG9mIGluY2lkZW50IGVkZ2VzLlxuICpcbiAqIFByZXJlcXVpc2l0ZXM6XG4gKlxuICogICogVGhlIGlucHV0IGdyYXBoIG11c3QgYmUgYWN5Y2xpY1xuICogICogRWFjaCBlZGdlIGluIHRoZSBpbnB1dCBncmFwaCBtdXN0IGhhdmUgYW4gYXNzaWduZWQgJ21pbkxlbicgYXR0cmlidXRlXG4gKi9cbmZ1bmN0aW9uIGluaXRSYW5rKGcpIHtcbiAgdmFyIHNvcnRlZCA9IHRvcHNvcnQoZyk7XG5cbiAgc29ydGVkLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgIHZhciBpbkVkZ2VzID0gZy5pbkVkZ2VzKHUpO1xuICAgIGlmIChpbkVkZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZy5ub2RlKHUpLnJhbmsgPSAwO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBtaW5MZW5zID0gaW5FZGdlcy5tYXAoZnVuY3Rpb24oZSkge1xuICAgICAgcmV0dXJuIGcubm9kZShnLnNvdXJjZShlKSkucmFuayArIGcuZWRnZShlKS5taW5MZW47XG4gICAgfSk7XG4gICAgZy5ub2RlKHUpLnJhbmsgPSB1dGlsLm1heChtaW5MZW5zKTtcbiAgfSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzbGFjazogc2xhY2tcbn07XG5cbi8qXG4gKiBBIGhlbHBlciB0byBjYWxjdWxhdGUgdGhlIHNsYWNrIGJldHdlZW4gdHdvIG5vZGVzIChgdWAgYW5kIGB2YCkgZ2l2ZW4gYVxuICogYG1pbkxlbmAgY29uc3RyYWludC4gVGhlIHNsYWNrIHJlcHJlc2VudHMgaG93IG11Y2ggdGhlIGRpc3RhbmNlIGJldHdlZW4gYHVgXG4gKiBhbmQgYHZgIGNvdWxkIHNocmluayB3aGlsZSBtYWludGFpbmluZyB0aGUgYG1pbkxlbmAgY29uc3RyYWludC4gSWYgdGhlIHZhbHVlXG4gKiBpcyBuZWdhdGl2ZSB0aGVuIHRoZSBjb25zdHJhaW50IGlzIGN1cnJlbnRseSB2aW9sYXRlZC5cbiAqXG4gIFRoaXMgZnVuY3Rpb24gcmVxdWlyZXMgdGhhdCBgdWAgYW5kIGB2YCBhcmUgaW4gYGdyYXBoYCBhbmQgdGhleSBib3RoIGhhdmUgYVxuICBgcmFua2AgYXR0cmlidXRlLlxuICovXG5mdW5jdGlvbiBzbGFjayhncmFwaCwgdSwgdiwgbWluTGVuKSB7XG4gIHJldHVybiBNYXRoLmFicyhncmFwaC5ub2RlKHUpLnJhbmsgLSBncmFwaC5ub2RlKHYpLnJhbmspIC0gbWluTGVuO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKSxcbiAgICByYW5rVXRpbCA9IHJlcXVpcmUoJy4vcmFua1V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaW1wbGV4O1xuXG5mdW5jdGlvbiBzaW1wbGV4KGdyYXBoLCBzcGFubmluZ1RyZWUpIHtcbiAgLy8gVGhlIG5ldHdvcmsgc2ltcGxleCBhbGdvcml0aG0gcmVwZWF0ZWRseSByZXBsYWNlcyBlZGdlcyBvZlxuICAvLyB0aGUgc3Bhbm5pbmcgdHJlZSB3aXRoIG5lZ2F0aXZlIGN1dCB2YWx1ZXMgdW50aWwgbm8gc3VjaFxuICAvLyBlZGdlIGV4aXN0cy5cbiAgaW5pdEN1dFZhbHVlcyhncmFwaCwgc3Bhbm5pbmdUcmVlKTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgZSA9IGxlYXZlRWRnZShzcGFubmluZ1RyZWUpO1xuICAgIGlmIChlID09PSBudWxsKSBicmVhaztcbiAgICB2YXIgZiA9IGVudGVyRWRnZShncmFwaCwgc3Bhbm5pbmdUcmVlLCBlKTtcbiAgICBleGNoYW5nZShncmFwaCwgc3Bhbm5pbmdUcmVlLCBlLCBmKTtcbiAgfVxufVxuXG4vKlxuICogU2V0IHRoZSBjdXQgdmFsdWVzIG9mIGVkZ2VzIGluIHRoZSBzcGFubmluZyB0cmVlIGJ5IGEgZGVwdGgtZmlyc3RcbiAqIHBvc3RvcmRlciB0cmF2ZXJzYWwuICBUaGUgY3V0IHZhbHVlIGNvcnJlc3BvbmRzIHRvIHRoZSBjb3N0LCBpblxuICogdGVybXMgb2YgYSByYW5raW5nJ3MgZWRnZSBsZW5ndGggc3VtLCBvZiBsZW5ndGhlbmluZyBhbiBlZGdlLlxuICogTmVnYXRpdmUgY3V0IHZhbHVlcyB0eXBpY2FsbHkgaW5kaWNhdGUgZWRnZXMgdGhhdCB3b3VsZCB5aWVsZCBhXG4gKiBzbWFsbGVyIGVkZ2UgbGVuZ3RoIHN1bSBpZiB0aGV5IHdlcmUgbGVuZ3RoZW5lZC5cbiAqL1xuZnVuY3Rpb24gaW5pdEN1dFZhbHVlcyhncmFwaCwgc3Bhbm5pbmdUcmVlKSB7XG4gIGNvbXB1dGVMb3dMaW0oc3Bhbm5pbmdUcmVlKTtcblxuICBzcGFubmluZ1RyZWUuZWFjaEVkZ2UoZnVuY3Rpb24oaWQsIHUsIHYsIHRyZWVWYWx1ZSkge1xuICAgIHRyZWVWYWx1ZS5jdXRWYWx1ZSA9IDA7XG4gIH0pO1xuXG4gIC8vIFByb3BhZ2F0ZSBjdXQgdmFsdWVzIHVwIHRoZSB0cmVlLlxuICBmdW5jdGlvbiBkZnMobikge1xuICAgIHZhciBjaGlsZHJlbiA9IHNwYW5uaW5nVHJlZS5zdWNjZXNzb3JzKG4pO1xuICAgIGZvciAodmFyIGMgaW4gY2hpbGRyZW4pIHtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2NdO1xuICAgICAgZGZzKGNoaWxkKTtcbiAgICB9XG4gICAgaWYgKG4gIT09IHNwYW5uaW5nVHJlZS5ncmFwaCgpLnJvb3QpIHtcbiAgICAgIHNldEN1dFZhbHVlKGdyYXBoLCBzcGFubmluZ1RyZWUsIG4pO1xuICAgIH1cbiAgfVxuICBkZnMoc3Bhbm5pbmdUcmVlLmdyYXBoKCkucm9vdCk7XG59XG5cbi8qXG4gKiBQZXJmb3JtIGEgREZTIHBvc3RvcmRlciB0cmF2ZXJzYWwsIGxhYmVsaW5nIGVhY2ggbm9kZSB2IHdpdGhcbiAqIGl0cyB0cmF2ZXJzYWwgb3JkZXIgJ2xpbSh2KScgYW5kIHRoZSBtaW5pbXVtIHRyYXZlcnNhbCBudW1iZXJcbiAqIG9mIGFueSBvZiBpdHMgZGVzY2VuZGFudHMgJ2xvdyh2KScuICBUaGlzIHByb3ZpZGVzIGFuIGVmZmljaWVudFxuICogd2F5IHRvIHRlc3Qgd2hldGhlciB1IGlzIGFuIGFuY2VzdG9yIG9mIHYgc2luY2VcbiAqIGxvdyh1KSA8PSBsaW0odikgPD0gbGltKHUpIGlmIGFuZCBvbmx5IGlmIHUgaXMgYW4gYW5jZXN0b3IuXG4gKi9cbmZ1bmN0aW9uIGNvbXB1dGVMb3dMaW0odHJlZSkge1xuICB2YXIgcG9zdE9yZGVyTnVtID0gMDtcbiAgXG4gIGZ1bmN0aW9uIGRmcyhuKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdHJlZS5zdWNjZXNzb3JzKG4pO1xuICAgIHZhciBsb3cgPSBwb3N0T3JkZXJOdW07XG4gICAgZm9yICh2YXIgYyBpbiBjaGlsZHJlbikge1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5bY107XG4gICAgICBkZnMoY2hpbGQpO1xuICAgICAgbG93ID0gTWF0aC5taW4obG93LCB0cmVlLm5vZGUoY2hpbGQpLmxvdyk7XG4gICAgfVxuICAgIHRyZWUubm9kZShuKS5sb3cgPSBsb3c7XG4gICAgdHJlZS5ub2RlKG4pLmxpbSA9IHBvc3RPcmRlck51bSsrO1xuICB9XG5cbiAgZGZzKHRyZWUuZ3JhcGgoKS5yb290KTtcbn1cblxuLypcbiAqIFRvIGNvbXB1dGUgdGhlIGN1dCB2YWx1ZSBvZiB0aGUgZWRnZSBwYXJlbnQgLT4gY2hpbGQsIHdlIGNvbnNpZGVyXG4gKiBpdCBhbmQgYW55IG90aGVyIGdyYXBoIGVkZ2VzIHRvIG9yIGZyb20gdGhlIGNoaWxkLlxuICogICAgICAgICAgcGFyZW50XG4gKiAgICAgICAgICAgICB8XG4gKiAgICAgICAgICAgY2hpbGRcbiAqICAgICAgICAgIC8gICAgICBcXFxuICogICAgICAgICB1ICAgICAgICB2XG4gKi9cbmZ1bmN0aW9uIHNldEN1dFZhbHVlKGdyYXBoLCB0cmVlLCBjaGlsZCkge1xuICB2YXIgcGFyZW50RWRnZSA9IHRyZWUuaW5FZGdlcyhjaGlsZClbMF07XG5cbiAgLy8gTGlzdCBvZiBjaGlsZCdzIGNoaWxkcmVuIGluIHRoZSBzcGFubmluZyB0cmVlLlxuICB2YXIgZ3JhbmRjaGlsZHJlbiA9IFtdO1xuICB2YXIgZ3JhbmRjaGlsZEVkZ2VzID0gdHJlZS5vdXRFZGdlcyhjaGlsZCk7XG4gIGZvciAodmFyIGdjZSBpbiBncmFuZGNoaWxkRWRnZXMpIHtcbiAgICBncmFuZGNoaWxkcmVuLnB1c2godHJlZS50YXJnZXQoZ3JhbmRjaGlsZEVkZ2VzW2djZV0pKTtcbiAgfVxuXG4gIHZhciBjdXRWYWx1ZSA9IDA7XG5cbiAgLy8gVE9ETzogUmVwbGFjZSB1bml0IGluY3JlbWVudC9kZWNyZW1lbnQgd2l0aCBlZGdlIHdlaWdodHMuXG4gIHZhciBFID0gMDsgICAgLy8gRWRnZXMgZnJvbSBjaGlsZCB0byBncmFuZGNoaWxkJ3Mgc3VidHJlZS5cbiAgdmFyIEYgPSAwOyAgICAvLyBFZGdlcyB0byBjaGlsZCBmcm9tIGdyYW5kY2hpbGQncyBzdWJ0cmVlLlxuICB2YXIgRyA9IDA7ICAgIC8vIEVkZ2VzIGZyb20gY2hpbGQgdG8gbm9kZXMgb3V0c2lkZSBvZiBjaGlsZCdzIHN1YnRyZWUuXG4gIHZhciBIID0gMDsgICAgLy8gRWRnZXMgZnJvbSBub2RlcyBvdXRzaWRlIG9mIGNoaWxkJ3Mgc3VidHJlZSB0byBjaGlsZC5cblxuICAvLyBDb25zaWRlciBhbGwgZ3JhcGggZWRnZXMgZnJvbSBjaGlsZC5cbiAgdmFyIG91dEVkZ2VzID0gZ3JhcGgub3V0RWRnZXMoY2hpbGQpO1xuICB2YXIgZ2M7XG4gIGZvciAodmFyIG9lIGluIG91dEVkZ2VzKSB7XG4gICAgdmFyIHN1Y2MgPSBncmFwaC50YXJnZXQob3V0RWRnZXNbb2VdKTtcbiAgICBmb3IgKGdjIGluIGdyYW5kY2hpbGRyZW4pIHtcbiAgICAgIGlmIChpblN1YnRyZWUodHJlZSwgc3VjYywgZ3JhbmRjaGlsZHJlbltnY10pKSB7XG4gICAgICAgIEUrKztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpblN1YnRyZWUodHJlZSwgc3VjYywgY2hpbGQpKSB7XG4gICAgICBHKys7XG4gICAgfVxuICB9XG5cbiAgLy8gQ29uc2lkZXIgYWxsIGdyYXBoIGVkZ2VzIHRvIGNoaWxkLlxuICB2YXIgaW5FZGdlcyA9IGdyYXBoLmluRWRnZXMoY2hpbGQpO1xuICBmb3IgKHZhciBpZSBpbiBpbkVkZ2VzKSB7XG4gICAgdmFyIHByZWQgPSBncmFwaC5zb3VyY2UoaW5FZGdlc1tpZV0pO1xuICAgIGZvciAoZ2MgaW4gZ3JhbmRjaGlsZHJlbikge1xuICAgICAgaWYgKGluU3VidHJlZSh0cmVlLCBwcmVkLCBncmFuZGNoaWxkcmVuW2djXSkpIHtcbiAgICAgICAgRisrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWluU3VidHJlZSh0cmVlLCBwcmVkLCBjaGlsZCkpIHtcbiAgICAgIEgrKztcbiAgICB9XG4gIH1cblxuICAvLyBDb250cmlidXRpb25zIGRlcGVuZCBvbiB0aGUgYWxpZ25tZW50IG9mIHRoZSBwYXJlbnQgLT4gY2hpbGQgZWRnZVxuICAvLyBhbmQgdGhlIGNoaWxkIC0+IHUgb3IgdiBlZGdlcy5cbiAgdmFyIGdyYW5kY2hpbGRDdXRTdW0gPSAwO1xuICBmb3IgKGdjIGluIGdyYW5kY2hpbGRyZW4pIHtcbiAgICB2YXIgY3YgPSB0cmVlLmVkZ2UoZ3JhbmRjaGlsZEVkZ2VzW2djXSkuY3V0VmFsdWU7XG4gICAgaWYgKCF0cmVlLmVkZ2UoZ3JhbmRjaGlsZEVkZ2VzW2djXSkucmV2ZXJzZWQpIHtcbiAgICAgIGdyYW5kY2hpbGRDdXRTdW0gKz0gY3Y7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdyYW5kY2hpbGRDdXRTdW0gLT0gY3Y7XG4gICAgfVxuICB9XG5cbiAgaWYgKCF0cmVlLmVkZ2UocGFyZW50RWRnZSkucmV2ZXJzZWQpIHtcbiAgICBjdXRWYWx1ZSArPSBncmFuZGNoaWxkQ3V0U3VtIC0gRSArIEYgLSBHICsgSDtcbiAgfSBlbHNlIHtcbiAgICBjdXRWYWx1ZSAtPSBncmFuZGNoaWxkQ3V0U3VtIC0gRSArIEYgLSBHICsgSDtcbiAgfVxuXG4gIHRyZWUuZWRnZShwYXJlbnRFZGdlKS5jdXRWYWx1ZSA9IGN1dFZhbHVlO1xufVxuXG4vKlxuICogUmV0dXJuIHdoZXRoZXIgbiBpcyBhIG5vZGUgaW4gdGhlIHN1YnRyZWUgd2l0aCB0aGUgZ2l2ZW5cbiAqIHJvb3QuXG4gKi9cbmZ1bmN0aW9uIGluU3VidHJlZSh0cmVlLCBuLCByb290KSB7XG4gIHJldHVybiAodHJlZS5ub2RlKHJvb3QpLmxvdyA8PSB0cmVlLm5vZGUobikubGltICYmXG4gICAgICAgICAgdHJlZS5ub2RlKG4pLmxpbSA8PSB0cmVlLm5vZGUocm9vdCkubGltKTtcbn1cblxuLypcbiAqIFJldHVybiBhbiBlZGdlIGZyb20gdGhlIHRyZWUgd2l0aCBhIG5lZ2F0aXZlIGN1dCB2YWx1ZSwgb3IgbnVsbCBpZiB0aGVyZVxuICogaXMgbm9uZS5cbiAqL1xuZnVuY3Rpb24gbGVhdmVFZGdlKHRyZWUpIHtcbiAgdmFyIGVkZ2VzID0gdHJlZS5lZGdlcygpO1xuICBmb3IgKHZhciBuIGluIGVkZ2VzKSB7XG4gICAgdmFyIGUgPSBlZGdlc1tuXTtcbiAgICB2YXIgdHJlZVZhbHVlID0gdHJlZS5lZGdlKGUpO1xuICAgIGlmICh0cmVlVmFsdWUuY3V0VmFsdWUgPCAwKSB7XG4gICAgICByZXR1cm4gZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qXG4gKiBUaGUgZWRnZSBlIHNob3VsZCBiZSBhbiBlZGdlIGluIHRoZSB0cmVlLCB3aXRoIGFuIHVuZGVybHlpbmcgZWRnZVxuICogaW4gdGhlIGdyYXBoLCB3aXRoIGEgbmVnYXRpdmUgY3V0IHZhbHVlLiAgT2YgdGhlIHR3byBub2RlcyBpbmNpZGVudFxuICogb24gdGhlIGVkZ2UsIHRha2UgdGhlIGxvd2VyIG9uZS4gIGVudGVyRWRnZSByZXR1cm5zIGFuIGVkZ2Ugd2l0aFxuICogbWluaW11bSBzbGFjayBnb2luZyBmcm9tIG91dHNpZGUgb2YgdGhhdCBub2RlJ3Mgc3VidHJlZSB0byBpbnNpZGVcbiAqIG9mIHRoYXQgbm9kZSdzIHN1YnRyZWUuXG4gKi9cbmZ1bmN0aW9uIGVudGVyRWRnZShncmFwaCwgdHJlZSwgZSkge1xuICB2YXIgc291cmNlID0gdHJlZS5zb3VyY2UoZSk7XG4gIHZhciB0YXJnZXQgPSB0cmVlLnRhcmdldChlKTtcbiAgdmFyIGxvd2VyID0gdHJlZS5ub2RlKHRhcmdldCkubGltIDwgdHJlZS5ub2RlKHNvdXJjZSkubGltID8gdGFyZ2V0IDogc291cmNlO1xuXG4gIC8vIElzIHRoZSB0cmVlIGVkZ2UgYWxpZ25lZCB3aXRoIHRoZSBncmFwaCBlZGdlP1xuICB2YXIgYWxpZ25lZCA9ICF0cmVlLmVkZ2UoZSkucmV2ZXJzZWQ7XG5cbiAgdmFyIG1pblNsYWNrID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICB2YXIgbWluU2xhY2tFZGdlO1xuICBpZiAoYWxpZ25lZCkge1xuICAgIGdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGlkLCB1LCB2LCB2YWx1ZSkge1xuICAgICAgaWYgKGlkICE9PSBlICYmIGluU3VidHJlZSh0cmVlLCB1LCBsb3dlcikgJiYgIWluU3VidHJlZSh0cmVlLCB2LCBsb3dlcikpIHtcbiAgICAgICAgdmFyIHNsYWNrID0gcmFua1V0aWwuc2xhY2soZ3JhcGgsIHUsIHYsIHZhbHVlLm1pbkxlbik7XG4gICAgICAgIGlmIChzbGFjayA8IG1pblNsYWNrKSB7XG4gICAgICAgICAgbWluU2xhY2sgPSBzbGFjaztcbiAgICAgICAgICBtaW5TbGFja0VkZ2UgPSBpZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGlkLCB1LCB2LCB2YWx1ZSkge1xuICAgICAgaWYgKGlkICE9PSBlICYmICFpblN1YnRyZWUodHJlZSwgdSwgbG93ZXIpICYmIGluU3VidHJlZSh0cmVlLCB2LCBsb3dlcikpIHtcbiAgICAgICAgdmFyIHNsYWNrID0gcmFua1V0aWwuc2xhY2soZ3JhcGgsIHUsIHYsIHZhbHVlLm1pbkxlbik7XG4gICAgICAgIGlmIChzbGFjayA8IG1pblNsYWNrKSB7XG4gICAgICAgICAgbWluU2xhY2sgPSBzbGFjaztcbiAgICAgICAgICBtaW5TbGFja0VkZ2UgPSBpZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgaWYgKG1pblNsYWNrRWRnZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIG91dHNpZGUgPSBbXTtcbiAgICB2YXIgaW5zaWRlID0gW107XG4gICAgZ3JhcGguZWFjaE5vZGUoZnVuY3Rpb24oaWQpIHtcbiAgICAgIGlmICghaW5TdWJ0cmVlKHRyZWUsIGlkLCBsb3dlcikpIHtcbiAgICAgICAgb3V0c2lkZS5wdXNoKGlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluc2lkZS5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGVkZ2UgZm91bmQgZnJvbSBvdXRzaWRlIG9mIHRyZWUgdG8gaW5zaWRlJyk7XG4gIH1cblxuICByZXR1cm4gbWluU2xhY2tFZGdlO1xufVxuXG4vKlxuICogUmVwbGFjZSBlZGdlIGUgd2l0aCBlZGdlIGYgaW4gdGhlIHRyZWUsIHJlY2FsY3VsYXRpbmcgdGhlIHRyZWUgcm9vdCxcbiAqIHRoZSBub2RlcycgbG93IGFuZCBsaW0gcHJvcGVydGllcyBhbmQgdGhlIGVkZ2VzJyBjdXQgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBleGNoYW5nZShncmFwaCwgdHJlZSwgZSwgZikge1xuICB0cmVlLmRlbEVkZ2UoZSk7XG4gIHZhciBzb3VyY2UgPSBncmFwaC5zb3VyY2UoZik7XG4gIHZhciB0YXJnZXQgPSBncmFwaC50YXJnZXQoZik7XG5cbiAgLy8gUmVkaXJlY3QgZWRnZXMgc28gdGhhdCB0YXJnZXQgaXMgdGhlIHJvb3Qgb2YgaXRzIHN1YnRyZWUuXG4gIGZ1bmN0aW9uIHJlZGlyZWN0KHYpIHtcbiAgICB2YXIgZWRnZXMgPSB0cmVlLmluRWRnZXModik7XG4gICAgZm9yICh2YXIgaSBpbiBlZGdlcykge1xuICAgICAgdmFyIGUgPSBlZGdlc1tpXTtcbiAgICAgIHZhciB1ID0gdHJlZS5zb3VyY2UoZSk7XG4gICAgICB2YXIgdmFsdWUgPSB0cmVlLmVkZ2UoZSk7XG4gICAgICByZWRpcmVjdCh1KTtcbiAgICAgIHRyZWUuZGVsRWRnZShlKTtcbiAgICAgIHZhbHVlLnJldmVyc2VkID0gIXZhbHVlLnJldmVyc2VkO1xuICAgICAgdHJlZS5hZGRFZGdlKGUsIHYsIHUsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZWRpcmVjdCh0YXJnZXQpO1xuXG4gIHZhciByb290ID0gc291cmNlO1xuICB2YXIgZWRnZXMgPSB0cmVlLmluRWRnZXMocm9vdCk7XG4gIHdoaWxlIChlZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgcm9vdCA9IHRyZWUuc291cmNlKGVkZ2VzWzBdKTtcbiAgICBlZGdlcyA9IHRyZWUuaW5FZGdlcyhyb290KTtcbiAgfVxuXG4gIHRyZWUuZ3JhcGgoKS5yb290ID0gcm9vdDtcblxuICB0cmVlLmFkZEVkZ2UobnVsbCwgc291cmNlLCB0YXJnZXQsIHtjdXRWYWx1ZTogMH0pO1xuXG4gIGluaXRDdXRWYWx1ZXMoZ3JhcGgsIHRyZWUpO1xuXG4gIGFkanVzdFJhbmtzKGdyYXBoLCB0cmVlKTtcbn1cblxuLypcbiAqIFJlc2V0IHRoZSByYW5rcyBvZiBhbGwgbm9kZXMgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3Bhbm5pbmcgdHJlZS5cbiAqIFRoZSByYW5rIG9mIHRoZSB0cmVlJ3Mgcm9vdCByZW1haW5zIHVuY2hhbmdlZCwgd2hpbGUgYWxsIG90aGVyXG4gKiBub2RlcyBhcmUgc2V0IHRvIHRoZSBzdW0gb2YgbWluaW11bSBsZW5ndGggY29uc3RyYWludHMgYWxvbmdcbiAqIHRoZSBwYXRoIGZyb20gdGhlIHJvb3QuXG4gKi9cbmZ1bmN0aW9uIGFkanVzdFJhbmtzKGdyYXBoLCB0cmVlKSB7XG4gIGZ1bmN0aW9uIGRmcyhwKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdHJlZS5zdWNjZXNzb3JzKHApO1xuICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oYykge1xuICAgICAgdmFyIG1pbkxlbiA9IG1pbmltdW1MZW5ndGgoZ3JhcGgsIHAsIGMpO1xuICAgICAgZ3JhcGgubm9kZShjKS5yYW5rID0gZ3JhcGgubm9kZShwKS5yYW5rICsgbWluTGVuO1xuICAgICAgZGZzKGMpO1xuICAgIH0pO1xuICB9XG5cbiAgZGZzKHRyZWUuZ3JhcGgoKS5yb290KTtcbn1cblxuLypcbiAqIElmIHUgYW5kIHYgYXJlIGNvbm5lY3RlZCBieSBzb21lIGVkZ2VzIGluIHRoZSBncmFwaCwgcmV0dXJuIHRoZVxuICogbWluaW11bSBsZW5ndGggb2YgdGhvc2UgZWRnZXMsIGFzIGEgcG9zaXRpdmUgbnVtYmVyIGlmIHYgc3VjY2VlZHNcbiAqIHUgYW5kIGFzIGEgbmVnYXRpdmUgbnVtYmVyIGlmIHYgcHJlY2VkZXMgdS5cbiAqL1xuZnVuY3Rpb24gbWluaW11bUxlbmd0aChncmFwaCwgdSwgdikge1xuICB2YXIgb3V0RWRnZXMgPSBncmFwaC5vdXRFZGdlcyh1LCB2KTtcbiAgaWYgKG91dEVkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gdXRpbC5tYXgob3V0RWRnZXMubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBncmFwaC5lZGdlKGUpLm1pbkxlbjtcbiAgICB9KSk7XG4gIH1cblxuICB2YXIgaW5FZGdlcyA9IGdyYXBoLmluRWRnZXModSwgdik7XG4gIGlmIChpbkVkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gLXV0aWwubWF4KGluRWRnZXMubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBncmFwaC5lZGdlKGUpLm1pbkxlbjtcbiAgICB9KSk7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLypcbiAqIFJldHVybnMgdGhlIHNtYWxsZXN0IHZhbHVlIGluIHRoZSBhcnJheS5cbiAqL1xuZXhwb3J0cy5taW4gPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIHZhbHVlcyk7XG59O1xuXG4vKlxuICogUmV0dXJucyB0aGUgbGFyZ2VzdCB2YWx1ZSBpbiB0aGUgYXJyYXkuXG4gKi9cbmV4cG9ydHMubWF4ID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZXMpO1xufTtcblxuLypcbiAqIFJldHVybnMgYHRydWVgIG9ubHkgaWYgYGYoeClgIGlzIGB0cnVlYCBmb3IgYWxsIGB4YCBpbiBgeHNgLiBPdGhlcndpc2VcbiAqIHJldHVybnMgYGZhbHNlYC4gVGhpcyBmdW5jdGlvbiB3aWxsIHJldHVybiBpbW1lZGlhdGVseSBpZiBpdCBmaW5kcyBhXG4gKiBjYXNlIHdoZXJlIGBmKHgpYCBkb2VzIG5vdCBob2xkLlxuICovXG5leHBvcnRzLmFsbCA9IGZ1bmN0aW9uKHhzLCBmKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoIWYoeHNbaV0pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLypcbiAqIEFjY3VtdWxhdGVzIHRoZSBzdW0gb2YgZWxlbWVudHMgaW4gdGhlIGdpdmVuIGFycmF5IHVzaW5nIHRoZSBgK2Agb3BlcmF0b3IuXG4gKi9cbmV4cG9ydHMuc3VtID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKGFjYywgeCkgeyByZXR1cm4gYWNjICsgeDsgfSwgMCk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgdmFsdWVzIGluIHRoZSBnaXZlbiBvYmplY3QuXG4gKi9cbmV4cG9ydHMudmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmopLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiBvYmpba107IH0pO1xufTtcblxuZXhwb3J0cy5zaHVmZmxlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgZm9yICh2YXIgaSA9IGFycmF5Lmxlbmd0aCAtIDE7IGkgPiAwOyAtLWkpIHtcbiAgICB2YXIgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xuICAgIHZhciBhaiA9IGFycmF5W2pdO1xuICAgIGFycmF5W2pdID0gYXJyYXlbaV07XG4gICAgYXJyYXlbaV0gPSBhajtcbiAgfVxufTtcblxuZXhwb3J0cy5wcm9wZXJ0eUFjY2Vzc29yID0gZnVuY3Rpb24oc2VsZiwgY29uZmlnLCBmaWVsZCwgc2V0SG9vaykge1xuICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGNvbmZpZ1tmaWVsZF07XG4gICAgY29uZmlnW2ZpZWxkXSA9IHg7XG4gICAgaWYgKHNldEhvb2spIHNldEhvb2soeCk7XG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG59O1xuXG4vKlxuICogR2l2ZW4gYSBsYXllcmVkLCBkaXJlY3RlZCBncmFwaCB3aXRoIGByYW5rYCBhbmQgYG9yZGVyYCBub2RlIGF0dHJpYnV0ZXMsXG4gKiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYW4gYXJyYXkgb2Ygb3JkZXJlZCByYW5rcy4gRWFjaCByYW5rIGNvbnRhaW5zIGFuIGFycmF5XG4gKiBvZiB0aGUgaWRzIG9mIHRoZSBub2RlcyBpbiB0aGF0IHJhbmsgaW4gdGhlIG9yZGVyIHNwZWNpZmllZCBieSB0aGUgYG9yZGVyYFxuICogYXR0cmlidXRlLlxuICovXG5leHBvcnRzLm9yZGVyaW5nID0gZnVuY3Rpb24oZykge1xuICB2YXIgb3JkZXJpbmcgPSBbXTtcbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIHZhciByYW5rID0gb3JkZXJpbmdbdmFsdWUucmFua10gfHwgKG9yZGVyaW5nW3ZhbHVlLnJhbmtdID0gW10pO1xuICAgIHJhbmtbdmFsdWUub3JkZXJdID0gdTtcbiAgfSk7XG4gIHJldHVybiBvcmRlcmluZztcbn07XG5cbi8qXG4gKiBBIGZpbHRlciB0aGF0IGNhbiBiZSB1c2VkIHdpdGggYGZpbHRlck5vZGVzYCB0byBnZXQgYSBncmFwaCB0aGF0IG9ubHlcbiAqIGluY2x1ZGVzIG5vZGVzIHRoYXQgZG8gbm90IGNvbnRhaW4gb3RoZXJzIG5vZGVzLlxuICovXG5leHBvcnRzLmZpbHRlck5vblN1YmdyYXBocyA9IGZ1bmN0aW9uKGcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHUpIHtcbiAgICByZXR1cm4gZy5jaGlsZHJlbih1KS5sZW5ndGggPT09IDA7XG4gIH07XG59O1xuXG4vKlxuICogUmV0dXJucyBhIG5ldyBmdW5jdGlvbiB0aGF0IHdyYXBzIGBmdW5jYCB3aXRoIGEgdGltZXIuIFRoZSB3cmFwcGVyIGxvZ3MgdGhlXG4gKiB0aW1lIGl0IHRha2VzIHRvIGV4ZWN1dGUgdGhlIGZ1bmN0aW9uLlxuICpcbiAqIFRoZSB0aW1lciB3aWxsIGJlIGVuYWJsZWQgcHJvdmlkZWQgYGxvZy5sZXZlbCA+PSAxYC5cbiAqL1xuZnVuY3Rpb24gdGltZShuYW1lLCBmdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgbG9nKDEsIG5hbWUgKyAnIHRpbWU6ICcgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydCkgKyAnbXMnKTtcbiAgICB9XG4gIH07XG59XG50aW1lLmVuYWJsZWQgPSBmYWxzZTtcblxuZXhwb3J0cy50aW1lID0gdGltZTtcblxuLypcbiAqIEEgZ2xvYmFsIGxvZ2dlciB3aXRoIHRoZSBzcGVjaWZpY2F0aW9uIGBsb2cobGV2ZWwsIG1lc3NhZ2UsIC4uLilgIHRoYXRcbiAqIHdpbGwgbG9nIGEgbWVzc2FnZSB0byB0aGUgY29uc29sZSBpZiBgbG9nLmxldmVsID49IGxldmVsYC5cbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsKSB7XG4gIGlmIChsb2cubGV2ZWwgPj0gbGV2ZWwpIHtcbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfVxufVxubG9nLmxldmVsID0gMDtcblxuZXhwb3J0cy5sb2cgPSBsb2c7XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICcwLjQuNic7XG4iLCJleHBvcnRzLlNldCA9IHJlcXVpcmUoJy4vbGliL1NldCcpO1xuZXhwb3J0cy5Qcmlvcml0eVF1ZXVlID0gcmVxdWlyZSgnLi9saWIvUHJpb3JpdHlRdWV1ZScpO1xuZXhwb3J0cy52ZXJzaW9uID0gcmVxdWlyZSgnLi9saWIvdmVyc2lvbicpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBQcmlvcml0eVF1ZXVlO1xuXG4vKipcbiAqIEEgbWluLXByaW9yaXR5IHF1ZXVlIGRhdGEgc3RydWN0dXJlLiBUaGlzIGFsZ29yaXRobSBpcyBkZXJpdmVkIGZyb20gQ29ybWVuLFxuICogZXQgYWwuLCBcIkludHJvZHVjdGlvbiB0byBBbGdvcml0aG1zXCIuIFRoZSBiYXNpYyBpZGVhIG9mIGEgbWluLXByaW9yaXR5XG4gKiBxdWV1ZSBpcyB0aGF0IHlvdSBjYW4gZWZmaWNpZW50bHkgKGluIE8oMSkgdGltZSkgZ2V0IHRoZSBzbWFsbGVzdCBrZXkgaW5cbiAqIHRoZSBxdWV1ZS4gQWRkaW5nIGFuZCByZW1vdmluZyBlbGVtZW50cyB0YWtlcyBPKGxvZyBuKSB0aW1lLiBBIGtleSBjYW5cbiAqIGhhdmUgaXRzIHByaW9yaXR5IGRlY3JlYXNlZCBpbiBPKGxvZyBuKSB0aW1lLlxuICovXG5mdW5jdGlvbiBQcmlvcml0eVF1ZXVlKCkge1xuICB0aGlzLl9hcnIgPSBbXTtcbiAgdGhpcy5fa2V5SW5kaWNlcyA9IHt9O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiB0aGUgcXVldWUuIFRha2VzIGBPKDEpYCB0aW1lLlxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9hcnIubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBrZXlzIHRoYXQgYXJlIGluIHRoZSBxdWV1ZS4gVGFrZXMgYE8obilgIHRpbWUuXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX2Fyci5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXk7IH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGB0cnVlYCBpZiAqKmtleSoqIGlzIGluIHRoZSBxdWV1ZSBhbmQgYGZhbHNlYCBpZiBub3QuXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKGtleSkge1xuICByZXR1cm4ga2V5IGluIHRoaXMuX2tleUluZGljZXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHByaW9yaXR5IGZvciAqKmtleSoqLiBJZiAqKmtleSoqIGlzIG5vdCBwcmVzZW50IGluIHRoZSBxdWV1ZVxuICogdGhlbiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYHVuZGVmaW5lZGAuIFRha2VzIGBPKDEpYCB0aW1lLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBrZXlcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUucHJpb3JpdHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgdmFyIGluZGV4ID0gdGhpcy5fa2V5SW5kaWNlc1trZXldO1xuICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5O1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGtleSBmb3IgdGhlIG1pbmltdW0gZWxlbWVudCBpbiB0aGlzIHF1ZXVlLiBJZiB0aGUgcXVldWUgaXNcbiAqIGVtcHR5IHRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yLiBUYWtlcyBgTygxKWAgdGltZS5cbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnNpemUoKSA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlF1ZXVlIHVuZGVyZmxvd1wiKTtcbiAgfVxuICByZXR1cm4gdGhpcy5fYXJyWzBdLmtleTtcbn07XG5cbi8qKlxuICogSW5zZXJ0cyBhIG5ldyBrZXkgaW50byB0aGUgcHJpb3JpdHkgcXVldWUuIElmIHRoZSBrZXkgYWxyZWFkeSBleGlzdHMgaW5cbiAqIHRoZSBxdWV1ZSB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYGZhbHNlYDsgb3RoZXJ3aXNlIGl0IHdpbGwgcmV0dXJuIGB0cnVlYC5cbiAqIFRha2VzIGBPKG4pYCB0aW1lLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBrZXkgdGhlIGtleSB0byBhZGRcbiAqIEBwYXJhbSB7TnVtYmVyfSBwcmlvcml0eSB0aGUgaW5pdGlhbCBwcmlvcml0eSBmb3IgdGhlIGtleVxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihrZXksIHByaW9yaXR5KSB7XG4gIHZhciBrZXlJbmRpY2VzID0gdGhpcy5fa2V5SW5kaWNlcztcbiAgaWYgKCEoa2V5IGluIGtleUluZGljZXMpKSB7XG4gICAgdmFyIGFyciA9IHRoaXMuX2FycjtcbiAgICB2YXIgaW5kZXggPSBhcnIubGVuZ3RoO1xuICAgIGtleUluZGljZXNba2V5XSA9IGluZGV4O1xuICAgIGFyci5wdXNoKHtrZXk6IGtleSwgcHJpb3JpdHk6IHByaW9yaXR5fSk7XG4gICAgdGhpcy5fZGVjcmVhc2UoaW5kZXgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhbmQgcmV0dXJucyB0aGUgc21hbGxlc3Qga2V5IGluIHRoZSBxdWV1ZS4gVGFrZXMgYE8obG9nIG4pYCB0aW1lLlxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5yZW1vdmVNaW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fc3dhcCgwLCB0aGlzLl9hcnIubGVuZ3RoIC0gMSk7XG4gIHZhciBtaW4gPSB0aGlzLl9hcnIucG9wKCk7XG4gIGRlbGV0ZSB0aGlzLl9rZXlJbmRpY2VzW21pbi5rZXldO1xuICB0aGlzLl9oZWFwaWZ5KDApO1xuICByZXR1cm4gbWluLmtleTtcbn07XG5cbi8qKlxuICogRGVjcmVhc2VzIHRoZSBwcmlvcml0eSBmb3IgKiprZXkqKiB0byAqKnByaW9yaXR5KiouIElmIHRoZSBuZXcgcHJpb3JpdHkgaXNcbiAqIGdyZWF0ZXIgdGhhbiB0aGUgcHJldmlvdXMgcHJpb3JpdHksIHRoaXMgZnVuY3Rpb24gd2lsbCB0aHJvdyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0ga2V5IHRoZSBrZXkgZm9yIHdoaWNoIHRvIHJhaXNlIHByaW9yaXR5XG4gKiBAcGFyYW0ge051bWJlcn0gcHJpb3JpdHkgdGhlIG5ldyBwcmlvcml0eSBmb3IgdGhlIGtleVxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5kZWNyZWFzZSA9IGZ1bmN0aW9uKGtleSwgcHJpb3JpdHkpIHtcbiAgdmFyIGluZGV4ID0gdGhpcy5fa2V5SW5kaWNlc1trZXldO1xuICBpZiAocHJpb3JpdHkgPiB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTmV3IHByaW9yaXR5IGlzIGdyZWF0ZXIgdGhhbiBjdXJyZW50IHByaW9yaXR5LiBcIiArXG4gICAgICAgIFwiS2V5OiBcIiArIGtleSArIFwiIE9sZDogXCIgKyB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5ICsgXCIgTmV3OiBcIiArIHByaW9yaXR5KTtcbiAgfVxuICB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5ID0gcHJpb3JpdHk7XG4gIHRoaXMuX2RlY3JlYXNlKGluZGV4KTtcbn07XG5cblByaW9yaXR5UXVldWUucHJvdG90eXBlLl9oZWFwaWZ5ID0gZnVuY3Rpb24oaSkge1xuICB2YXIgYXJyID0gdGhpcy5fYXJyO1xuICB2YXIgbCA9IDIgKiBpLFxuICAgICAgciA9IGwgKyAxLFxuICAgICAgbGFyZ2VzdCA9IGk7XG4gIGlmIChsIDwgYXJyLmxlbmd0aCkge1xuICAgIGxhcmdlc3QgPSBhcnJbbF0ucHJpb3JpdHkgPCBhcnJbbGFyZ2VzdF0ucHJpb3JpdHkgPyBsIDogbGFyZ2VzdDtcbiAgICBpZiAociA8IGFyci5sZW5ndGgpIHtcbiAgICAgIGxhcmdlc3QgPSBhcnJbcl0ucHJpb3JpdHkgPCBhcnJbbGFyZ2VzdF0ucHJpb3JpdHkgPyByIDogbGFyZ2VzdDtcbiAgICB9XG4gICAgaWYgKGxhcmdlc3QgIT09IGkpIHtcbiAgICAgIHRoaXMuX3N3YXAoaSwgbGFyZ2VzdCk7XG4gICAgICB0aGlzLl9oZWFwaWZ5KGxhcmdlc3QpO1xuICAgIH1cbiAgfVxufTtcblxuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuX2RlY3JlYXNlID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgdmFyIGFyciA9IHRoaXMuX2FycjtcbiAgdmFyIHByaW9yaXR5ID0gYXJyW2luZGV4XS5wcmlvcml0eTtcbiAgdmFyIHBhcmVudDtcbiAgd2hpbGUgKGluZGV4ICE9PSAwKSB7XG4gICAgcGFyZW50ID0gaW5kZXggPj4gMTtcbiAgICBpZiAoYXJyW3BhcmVudF0ucHJpb3JpdHkgPCBwcmlvcml0eSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3N3YXAoaW5kZXgsIHBhcmVudCk7XG4gICAgaW5kZXggPSBwYXJlbnQ7XG4gIH1cbn07XG5cblByaW9yaXR5UXVldWUucHJvdG90eXBlLl9zd2FwID0gZnVuY3Rpb24oaSwgaikge1xuICB2YXIgYXJyID0gdGhpcy5fYXJyO1xuICB2YXIga2V5SW5kaWNlcyA9IHRoaXMuX2tleUluZGljZXM7XG4gIHZhciBvcmlnQXJySSA9IGFycltpXTtcbiAgdmFyIG9yaWdBcnJKID0gYXJyW2pdO1xuICBhcnJbaV0gPSBvcmlnQXJySjtcbiAgYXJyW2pdID0gb3JpZ0Fyckk7XG4gIGtleUluZGljZXNbb3JpZ0Fyckoua2V5XSA9IGk7XG4gIGtleUluZGljZXNbb3JpZ0Fyckkua2V5XSA9IGo7XG59O1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZXQ7XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIG5ldyBTZXQgd2l0aCBhbiBvcHRpb25hbCBzZXQgb2YgYGluaXRpYWxLZXlzYC5cbiAqXG4gKiBJdCBpcyBpbXBvcnRhbnQgdG8gbm90ZSB0aGF0IGtleXMgYXJlIGNvZXJjZWQgdG8gU3RyaW5nIGZvciBtb3N0IHB1cnBvc2VzXG4gKiB3aXRoIHRoaXMgb2JqZWN0LCBzaW1pbGFyIHRvIHRoZSBiZWhhdmlvciBvZiBKYXZhU2NyaXB0J3MgT2JqZWN0LiBGb3JcbiAqIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgd2lsbCBhZGQgb25seSBvbmUga2V5OlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTZXQoKTtcbiAqICAgICBzLmFkZCgxKTtcbiAqICAgICBzLmFkZChcIjFcIik7XG4gKlxuICogSG93ZXZlciwgdGhlIHR5cGUgb2YgdGhlIGtleSBpcyBwcmVzZXJ2ZWQgaW50ZXJuYWxseSBzbyB0aGF0IGBrZXlzYCByZXR1cm5zXG4gKiB0aGUgb3JpZ2luYWwga2V5IHNldCB1bmNvZXJjZWQuIEZvciB0aGUgYWJvdmUgZXhhbXBsZSwgYGtleXNgIHdvdWxkIHJldHVyblxuICogYFsxXWAuXG4gKi9cbmZ1bmN0aW9uIFNldChpbml0aWFsS2V5cykge1xuICB0aGlzLl9zaXplID0gMDtcbiAgdGhpcy5fa2V5cyA9IHt9O1xuXG4gIGlmIChpbml0aWFsS2V5cykge1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGluaXRpYWxLZXlzLmxlbmd0aDsgaSA8IGlsOyArK2kpIHtcbiAgICAgIHRoaXMuYWRkKGluaXRpYWxLZXlzW2ldKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IFNldCB0aGF0IHJlcHJlc2VudHMgdGhlIHNldCBpbnRlcnNlY3Rpb24gb2YgdGhlIGFycmF5IG9mIGdpdmVuXG4gKiBzZXRzLlxuICovXG5TZXQuaW50ZXJzZWN0ID0gZnVuY3Rpb24oc2V0cykge1xuICBpZiAoc2V0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IFNldCgpO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IG5ldyBTZXQoIXV0aWwuaXNBcnJheShzZXRzWzBdKSA/IHNldHNbMF0ua2V5cygpIDogc2V0c1swXSk7XG4gIGZvciAodmFyIGkgPSAxLCBpbCA9IHNldHMubGVuZ3RoOyBpIDwgaWw7ICsraSkge1xuICAgIHZhciByZXN1bHRLZXlzID0gcmVzdWx0LmtleXMoKSxcbiAgICAgICAgb3RoZXIgPSAhdXRpbC5pc0FycmF5KHNldHNbaV0pID8gc2V0c1tpXSA6IG5ldyBTZXQoc2V0c1tpXSk7XG4gICAgZm9yICh2YXIgaiA9IDAsIGpsID0gcmVzdWx0S2V5cy5sZW5ndGg7IGogPCBqbDsgKytqKSB7XG4gICAgICB2YXIga2V5ID0gcmVzdWx0S2V5c1tqXTtcbiAgICAgIGlmICghb3RoZXIuaGFzKGtleSkpIHtcbiAgICAgICAgcmVzdWx0LnJlbW92ZShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgU2V0IHRoYXQgcmVwcmVzZW50cyB0aGUgc2V0IHVuaW9uIG9mIHRoZSBhcnJheSBvZiBnaXZlbiBzZXRzLlxuICovXG5TZXQudW5pb24gPSBmdW5jdGlvbihzZXRzKSB7XG4gIHZhciB0b3RhbEVsZW1zID0gdXRpbC5yZWR1Y2Uoc2V0cywgZnVuY3Rpb24obGhzLCByaHMpIHtcbiAgICByZXR1cm4gbGhzICsgKHJocy5zaXplID8gcmhzLnNpemUoKSA6IHJocy5sZW5ndGgpO1xuICB9LCAwKTtcbiAgdmFyIGFyciA9IG5ldyBBcnJheSh0b3RhbEVsZW1zKTtcblxuICB2YXIgayA9IDA7XG4gIGZvciAodmFyIGkgPSAwLCBpbCA9IHNldHMubGVuZ3RoOyBpIDwgaWw7ICsraSkge1xuICAgIHZhciBjdXIgPSBzZXRzW2ldLFxuICAgICAgICBrZXlzID0gIXV0aWwuaXNBcnJheShjdXIpID8gY3VyLmtleXMoKSA6IGN1cjtcbiAgICBmb3IgKHZhciBqID0gMCwgamwgPSBrZXlzLmxlbmd0aDsgaiA8IGpsOyArK2opIHtcbiAgICAgIGFycltrKytdID0ga2V5c1tqXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNldChhcnIpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzaXplIG9mIHRoaXMgc2V0IGluIGBPKDEpYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3NpemU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGtleXMgaW4gdGhpcyBzZXQuIFRha2VzIGBPKG4pYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHZhbHVlcyh0aGlzLl9rZXlzKTtcbn07XG5cbi8qKlxuICogVGVzdHMgaWYgYSBrZXkgaXMgcHJlc2VudCBpbiB0aGlzIFNldC4gUmV0dXJucyBgdHJ1ZWAgaWYgaXQgaXMgYW5kIGBmYWxzZWBcbiAqIGlmIG5vdC4gVGFrZXMgYE8oMSlgIHRpbWUuXG4gKi9cblNldC5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24oa2V5KSB7XG4gIHJldHVybiBrZXkgaW4gdGhpcy5fa2V5cztcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBrZXkgdG8gdGhpcyBTZXQgaWYgaXQgaXMgbm90IGFscmVhZHkgcHJlc2VudC4gUmV0dXJucyBgdHJ1ZWAgaWZcbiAqIHRoZSBrZXkgd2FzIGFkZGVkIGFuZCBgZmFsc2VgIGlmIGl0IHdhcyBhbHJlYWR5IHByZXNlbnQuIFRha2VzIGBPKDEpYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKGtleSkge1xuICBpZiAoIShrZXkgaW4gdGhpcy5fa2V5cykpIHtcbiAgICB0aGlzLl9rZXlzW2tleV0gPSBrZXk7XG4gICAgKyt0aGlzLl9zaXplO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGtleSBmcm9tIHRoaXMgU2V0LiBJZiB0aGUga2V5IHdhcyByZW1vdmVkIHRoaXMgZnVuY3Rpb24gcmV0dXJuc1xuICogYHRydWVgLiBJZiBub3QsIGl0IHJldHVybnMgYGZhbHNlYC4gVGFrZXMgYE8oMSlgIHRpbWUuXG4gKi9cblNldC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oa2V5KSB7XG4gIGlmIChrZXkgaW4gdGhpcy5fa2V5cykge1xuICAgIGRlbGV0ZSB0aGlzLl9rZXlzW2tleV07XG4gICAgLS10aGlzLl9zaXplO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIGFsbCB2YWx1ZXMgZm9yIHByb3BlcnRpZXMgb2YgKipvKiouXG4gKi9cbmZ1bmN0aW9uIHZhbHVlcyhvKSB7XG4gIHZhciBrcyA9IE9iamVjdC5rZXlzKG8pLFxuICAgICAgbGVuID0ga3MubGVuZ3RoLFxuICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbiksXG4gICAgICBpO1xuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICByZXN1bHRbaV0gPSBvW2tzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiLypcbiAqIFRoaXMgcG9seWZpbGwgY29tZXMgZnJvbVxuICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvaXNBcnJheVxuICovXG5pZighQXJyYXkuaXNBcnJheSkge1xuICBleHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbiAodkFyZykge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodkFyZykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59IGVsc2Uge1xuICBleHBvcnRzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufVxuXG4vKlxuICogU2xpZ2h0bHkgYWRhcHRlZCBwb2x5ZmlsbCBmcm9tXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9SZWR1Y2VcbiAqL1xuaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBBcnJheS5wcm90b3R5cGUucmVkdWNlKSB7XG4gIGV4cG9ydHMucmVkdWNlID0gZnVuY3Rpb24oYXJyYXksIGNhbGxiYWNrLCBvcHRfaW5pdGlhbFZhbHVlKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGlmIChudWxsID09PSBhcnJheSB8fCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIGFycmF5KSB7XG4gICAgICAvLyBBdCB0aGUgbW9tZW50IGFsbCBtb2Rlcm4gYnJvd3NlcnMsIHRoYXQgc3VwcG9ydCBzdHJpY3QgbW9kZSwgaGF2ZVxuICAgICAgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UuIEZvciBpbnN0YW5jZSwgSUU4XG4gICAgICAvLyBkb2VzIG5vdCBzdXBwb3J0IHN0cmljdCBtb2RlLCBzbyB0aGlzIGNoZWNrIGlzIGFjdHVhbGx5IHVzZWxlc3MuXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICdBcnJheS5wcm90b3R5cGUucmVkdWNlIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGNhbGxiYWNrKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGNhbGxiYWNrICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgaW5kZXgsIHZhbHVlLFxuICAgICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGggPj4+IDAsXG4gICAgICAgIGlzVmFsdWVTZXQgPSBmYWxzZTtcbiAgICBpZiAoMSA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHZhbHVlID0gb3B0X2luaXRpYWxWYWx1ZTtcbiAgICAgIGlzVmFsdWVTZXQgPSB0cnVlO1xuICAgIH1cbiAgICBmb3IgKGluZGV4ID0gMDsgbGVuZ3RoID4gaW5kZXg7ICsraW5kZXgpIHtcbiAgICAgIGlmIChhcnJheS5oYXNPd25Qcm9wZXJ0eShpbmRleCkpIHtcbiAgICAgICAgaWYgKGlzVmFsdWVTZXQpIHtcbiAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrKHZhbHVlLCBhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBhcnJheVtpbmRleF07XG4gICAgICAgICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpc1ZhbHVlU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJyk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcbn0gZWxzZSB7XG4gIGV4cG9ydHMucmVkdWNlID0gZnVuY3Rpb24oYXJyYXksIGNhbGxiYWNrLCBvcHRfaW5pdGlhbFZhbHVlKSB7XG4gICAgcmV0dXJuIGFycmF5LnJlZHVjZShjYWxsYmFjaywgb3B0X2luaXRpYWxWYWx1ZSk7XG4gIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICcxLjEuMyc7XG4iLCJleHBvcnRzLkdyYXBoID0gcmVxdWlyZShcIi4vbGliL0dyYXBoXCIpO1xuZXhwb3J0cy5EaWdyYXBoID0gcmVxdWlyZShcIi4vbGliL0RpZ3JhcGhcIik7XG5leHBvcnRzLkNHcmFwaCA9IHJlcXVpcmUoXCIuL2xpYi9DR3JhcGhcIik7XG5leHBvcnRzLkNEaWdyYXBoID0gcmVxdWlyZShcIi4vbGliL0NEaWdyYXBoXCIpO1xucmVxdWlyZShcIi4vbGliL2dyYXBoLWNvbnZlcnRlcnNcIik7XG5cbmV4cG9ydHMuYWxnID0ge1xuICBpc0FjeWNsaWM6IHJlcXVpcmUoXCIuL2xpYi9hbGcvaXNBY3ljbGljXCIpLFxuICBjb21wb25lbnRzOiByZXF1aXJlKFwiLi9saWIvYWxnL2NvbXBvbmVudHNcIiksXG4gIGRpamtzdHJhOiByZXF1aXJlKFwiLi9saWIvYWxnL2RpamtzdHJhXCIpLFxuICBkaWprc3RyYUFsbDogcmVxdWlyZShcIi4vbGliL2FsZy9kaWprc3RyYUFsbFwiKSxcbiAgZmluZEN5Y2xlczogcmVxdWlyZShcIi4vbGliL2FsZy9maW5kQ3ljbGVzXCIpLFxuICBmbG95ZFdhcnNoYWxsOiByZXF1aXJlKFwiLi9saWIvYWxnL2Zsb3lkV2Fyc2hhbGxcIiksXG4gIHBvc3RvcmRlcjogcmVxdWlyZShcIi4vbGliL2FsZy9wb3N0b3JkZXJcIiksXG4gIHByZW9yZGVyOiByZXF1aXJlKFwiLi9saWIvYWxnL3ByZW9yZGVyXCIpLFxuICBwcmltOiByZXF1aXJlKFwiLi9saWIvYWxnL3ByaW1cIiksXG4gIHRhcmphbjogcmVxdWlyZShcIi4vbGliL2FsZy90YXJqYW5cIiksXG4gIHRvcHNvcnQ6IHJlcXVpcmUoXCIuL2xpYi9hbGcvdG9wc29ydFwiKVxufTtcblxuZXhwb3J0cy5jb252ZXJ0ZXIgPSB7XG4gIGpzb246IHJlcXVpcmUoXCIuL2xpYi9jb252ZXJ0ZXIvanNvbi5qc1wiKVxufTtcblxudmFyIGZpbHRlciA9IHJlcXVpcmUoXCIuL2xpYi9maWx0ZXJcIik7XG5leHBvcnRzLmZpbHRlciA9IHtcbiAgYWxsOiBmaWx0ZXIuYWxsLFxuICBub2Rlc0Zyb21MaXN0OiBmaWx0ZXIubm9kZXNGcm9tTGlzdFxufTtcblxuZXhwb3J0cy52ZXJzaW9uID0gcmVxdWlyZShcIi4vbGliL3ZlcnNpb25cIik7XG4iLCIvKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5TZXQ7XG4vKiBqc2hpbnQgK1cwNzkgKi9cblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlR3JhcGg7XG5cbmZ1bmN0aW9uIEJhc2VHcmFwaCgpIHtcbiAgLy8gVGhlIHZhbHVlIGFzc2lnbmVkIHRvIHRoZSBncmFwaCBpdHNlbGYuXG4gIHRoaXMuX3ZhbHVlID0gdW5kZWZpbmVkO1xuXG4gIC8vIE1hcCBvZiBub2RlIGlkIC0+IHsgaWQsIHZhbHVlIH1cbiAgdGhpcy5fbm9kZXMgPSB7fTtcblxuICAvLyBNYXAgb2YgZWRnZSBpZCAtPiB7IGlkLCB1LCB2LCB2YWx1ZSB9XG4gIHRoaXMuX2VkZ2VzID0ge307XG5cbiAgLy8gVXNlZCB0byBnZW5lcmF0ZSBhIHVuaXF1ZSBpZCBpbiB0aGUgZ3JhcGhcbiAgdGhpcy5fbmV4dElkID0gMDtcbn1cblxuLy8gTnVtYmVyIG9mIG5vZGVzXG5CYXNlR3JhcGgucHJvdG90eXBlLm9yZGVyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9ub2RlcykubGVuZ3RoO1xufTtcblxuLy8gTnVtYmVyIG9mIGVkZ2VzXG5CYXNlR3JhcGgucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2VkZ2VzKS5sZW5ndGg7XG59O1xuXG4vLyBBY2Nlc3NvciBmb3IgZ3JhcGggbGV2ZWwgdmFsdWVcbkJhc2VHcmFwaC5wcm90b3R5cGUuZ3JhcGggPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgfVxuICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5oYXNOb2RlID0gZnVuY3Rpb24odSkge1xuICByZXR1cm4gdSBpbiB0aGlzLl9ub2Rlcztcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUubm9kZSA9IGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gIHZhciBub2RlID0gdGhpcy5fc3RyaWN0R2V0Tm9kZSh1KTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbm9kZS52YWx1ZTtcbiAgfVxuICBub2RlLnZhbHVlID0gdmFsdWU7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLm5vZGVzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IFtdO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKGlkKSB7IG5vZGVzLnB1c2goaWQpOyB9KTtcbiAgcmV0dXJuIG5vZGVzO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5lYWNoTm9kZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgZm9yICh2YXIgayBpbiB0aGlzLl9ub2Rlcykge1xuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZXNba107XG4gICAgZnVuYyhub2RlLmlkLCBub2RlLnZhbHVlKTtcbiAgfVxufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5oYXNFZGdlID0gZnVuY3Rpb24oZSkge1xuICByZXR1cm4gZSBpbiB0aGlzLl9lZGdlcztcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuZWRnZSA9IGZ1bmN0aW9uKGUsIHZhbHVlKSB7XG4gIHZhciBlZGdlID0gdGhpcy5fc3RyaWN0R2V0RWRnZShlKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZWRnZS52YWx1ZTtcbiAgfVxuICBlZGdlLnZhbHVlID0gdmFsdWU7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmVkZ2VzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBlcyA9IFtdO1xuICB0aGlzLmVhY2hFZGdlKGZ1bmN0aW9uKGlkKSB7IGVzLnB1c2goaWQpOyB9KTtcbiAgcmV0dXJuIGVzO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5lYWNoRWRnZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgZm9yICh2YXIgayBpbiB0aGlzLl9lZGdlcykge1xuICAgIHZhciBlZGdlID0gdGhpcy5fZWRnZXNba107XG4gICAgZnVuYyhlZGdlLmlkLCBlZGdlLnUsIGVkZ2UudiwgZWRnZS52YWx1ZSk7XG4gIH1cbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuaW5jaWRlbnROb2RlcyA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGVkZ2UgPSB0aGlzLl9zdHJpY3RHZXRFZGdlKGUpO1xuICByZXR1cm4gW2VkZ2UudSwgZWRnZS52XTtcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuYWRkTm9kZSA9IGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gIGlmICh1ID09PSB1bmRlZmluZWQgfHwgdSA9PT0gbnVsbCkge1xuICAgIGRvIHtcbiAgICAgIHUgPSBcIl9cIiArICgrK3RoaXMuX25leHRJZCk7XG4gICAgfSB3aGlsZSAodGhpcy5oYXNOb2RlKHUpKTtcbiAgfSBlbHNlIGlmICh0aGlzLmhhc05vZGUodSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJHcmFwaCBhbHJlYWR5IGhhcyBub2RlICdcIiArIHUgKyBcIidcIik7XG4gIH1cbiAgdGhpcy5fbm9kZXNbdV0gPSB7IGlkOiB1LCB2YWx1ZTogdmFsdWUgfTtcbiAgcmV0dXJuIHU7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmRlbE5vZGUgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHRoaXMuaW5jaWRlbnRFZGdlcyh1KS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHsgdGhpcy5kZWxFZGdlKGUpOyB9LCB0aGlzKTtcbiAgZGVsZXRlIHRoaXMuX25vZGVzW3VdO1xufTtcblxuLy8gaW5NYXAgYW5kIG91dE1hcCBhcmUgb3Bwb3NpdGUgc2lkZXMgb2YgYW4gaW5jaWRlbmNlIG1hcC4gRm9yIGV4YW1wbGUsIGZvclxuLy8gR3JhcGggdGhlc2Ugd291bGQgYm90aCBjb21lIGZyb20gdGhlIF9pbmNpZGVudEVkZ2VzIG1hcCwgd2hpbGUgZm9yIERpZ3JhcGhcbi8vIHRoZXkgd291bGQgY29tZSBmcm9tIF9pbkVkZ2VzIGFuZCBfb3V0RWRnZXMuXG5CYXNlR3JhcGgucHJvdG90eXBlLl9hZGRFZGdlID0gZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUsIGluTWFwLCBvdXRNYXApIHtcbiAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh1KTtcbiAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh2KTtcblxuICBpZiAoZSA9PT0gdW5kZWZpbmVkIHx8IGUgPT09IG51bGwpIHtcbiAgICBkbyB7XG4gICAgICBlID0gXCJfXCIgKyAoKyt0aGlzLl9uZXh0SWQpO1xuICAgIH0gd2hpbGUgKHRoaXMuaGFzRWRnZShlKSk7XG4gIH1cbiAgZWxzZSBpZiAodGhpcy5oYXNFZGdlKGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiR3JhcGggYWxyZWFkeSBoYXMgZWRnZSAnXCIgKyBlICsgXCInXCIpO1xuICB9XG5cbiAgdGhpcy5fZWRnZXNbZV0gPSB7IGlkOiBlLCB1OiB1LCB2OiB2LCB2YWx1ZTogdmFsdWUgfTtcbiAgYWRkRWRnZVRvTWFwKGluTWFwW3ZdLCB1LCBlKTtcbiAgYWRkRWRnZVRvTWFwKG91dE1hcFt1XSwgdiwgZSk7XG5cbiAgcmV0dXJuIGU7XG59O1xuXG4vLyBTZWUgbm90ZSBmb3IgX2FkZEVkZ2UgcmVnYXJkaW5nIGluTWFwIGFuZCBvdXRNYXAuXG5CYXNlR3JhcGgucHJvdG90eXBlLl9kZWxFZGdlID0gZnVuY3Rpb24oZSwgaW5NYXAsIG91dE1hcCkge1xuICB2YXIgZWRnZSA9IHRoaXMuX3N0cmljdEdldEVkZ2UoZSk7XG4gIGRlbEVkZ2VGcm9tTWFwKGluTWFwW2VkZ2Uudl0sIGVkZ2UudSwgZSk7XG4gIGRlbEVkZ2VGcm9tTWFwKG91dE1hcFtlZGdlLnVdLCBlZGdlLnYsIGUpO1xuICBkZWxldGUgdGhpcy5fZWRnZXNbZV07XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNvcHkgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigpO1xuICBjb3B5LmdyYXBoKHRoaXMuZ3JhcGgoKSk7XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgY29weS5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gIHRoaXMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHsgY29weS5hZGRFZGdlKGUsIHUsIHYsIHZhbHVlKTsgfSk7XG4gIGNvcHkuX25leHRJZCA9IHRoaXMuX25leHRJZDtcbiAgcmV0dXJuIGNvcHk7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmZpbHRlck5vZGVzID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gIHZhciBjb3B5ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoKTtcbiAgY29weS5ncmFwaCh0aGlzLmdyYXBoKCkpO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgaWYgKGZpbHRlcih1KSkge1xuICAgICAgY29weS5hZGROb2RlKHUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICB0aGlzLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgaWYgKGNvcHkuaGFzTm9kZSh1KSAmJiBjb3B5Lmhhc05vZGUodikpIHtcbiAgICAgIGNvcHkuYWRkRWRnZShlLCB1LCB2LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGNvcHk7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLl9zdHJpY3RHZXROb2RlID0gZnVuY3Rpb24odSkge1xuICB2YXIgbm9kZSA9IHRoaXMuX25vZGVzW3VdO1xuICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9kZSAnXCIgKyB1ICsgXCInIGlzIG5vdCBpbiBncmFwaFwiKTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuX3N0cmljdEdldEVkZ2UgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBlZGdlID0gdGhpcy5fZWRnZXNbZV07XG4gIGlmIChlZGdlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJFZGdlICdcIiArIGUgKyBcIicgaXMgbm90IGluIGdyYXBoXCIpO1xuICB9XG4gIHJldHVybiBlZGdlO1xufTtcblxuZnVuY3Rpb24gYWRkRWRnZVRvTWFwKG1hcCwgdiwgZSkge1xuICAobWFwW3ZdIHx8IChtYXBbdl0gPSBuZXcgU2V0KCkpKS5hZGQoZSk7XG59XG5cbmZ1bmN0aW9uIGRlbEVkZ2VGcm9tTWFwKG1hcCwgdiwgZSkge1xuICB2YXIgdkVudHJ5ID0gbWFwW3ZdO1xuICB2RW50cnkucmVtb3ZlKGUpO1xuICBpZiAodkVudHJ5LnNpemUoKSA9PT0gMCkge1xuICAgIGRlbGV0ZSBtYXBbdl07XG4gIH1cbn1cblxuIiwidmFyIERpZ3JhcGggPSByZXF1aXJlKFwiLi9EaWdyYXBoXCIpLFxuICAgIGNvbXBvdW5kaWZ5ID0gcmVxdWlyZShcIi4vY29tcG91bmRpZnlcIik7XG5cbnZhciBDRGlncmFwaCA9IGNvbXBvdW5kaWZ5KERpZ3JhcGgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENEaWdyYXBoO1xuXG5DRGlncmFwaC5mcm9tRGlncmFwaCA9IGZ1bmN0aW9uKHNyYykge1xuICB2YXIgZyA9IG5ldyBDRGlncmFwaCgpLFxuICAgICAgZ3JhcGhWYWx1ZSA9IHNyYy5ncmFwaCgpO1xuXG4gIGlmIChncmFwaFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICBnLmdyYXBoKGdyYXBoVmFsdWUpO1xuICB9XG5cbiAgc3JjLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGcuYWRkTm9kZSh1KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5hZGROb2RlKHUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICBzcmMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHYpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdiwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBnO1xufTtcblxuQ0RpZ3JhcGgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIkNEaWdyYXBoIFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgMik7XG59O1xuIiwidmFyIEdyYXBoID0gcmVxdWlyZShcIi4vR3JhcGhcIiksXG4gICAgY29tcG91bmRpZnkgPSByZXF1aXJlKFwiLi9jb21wb3VuZGlmeVwiKTtcblxudmFyIENHcmFwaCA9IGNvbXBvdW5kaWZ5KEdyYXBoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDR3JhcGg7XG5cbkNHcmFwaC5mcm9tR3JhcGggPSBmdW5jdGlvbihzcmMpIHtcbiAgdmFyIGcgPSBuZXcgQ0dyYXBoKCksXG4gICAgICBncmFwaFZhbHVlID0gc3JjLmdyYXBoKCk7XG5cbiAgaWYgKGdyYXBoVmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGcuZ3JhcGgoZ3JhcGhWYWx1ZSk7XG4gIH1cblxuICBzcmMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZy5hZGROb2RlKHUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZE5vZGUodSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHNyYy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGc7XG59O1xuXG5DR3JhcGgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIkNHcmFwaCBcIiArIEpTT04uc3RyaW5naWZ5KHRoaXMsIG51bGwsIDIpO1xufTtcbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgb3JnYW5pemVkIHdpdGggaW4gdGhlIGZvbGxvd2luZyBvcmRlcjpcbiAqXG4gKiBFeHBvcnRzXG4gKiBHcmFwaCBjb25zdHJ1Y3RvcnNcbiAqIEdyYXBoIHF1ZXJpZXMgKGUuZy4gbm9kZXMoKSwgZWRnZXMoKVxuICogR3JhcGggbXV0YXRvcnNcbiAqIEhlbHBlciBmdW5jdGlvbnNcbiAqL1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIiksXG4gICAgQmFzZUdyYXBoID0gcmVxdWlyZShcIi4vQmFzZUdyYXBoXCIpLFxuLyoganNoaW50IC1XMDc5ICovXG4gICAgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gRGlncmFwaDtcblxuLypcbiAqIENvbnN0cnVjdG9yIHRvIGNyZWF0ZSBhIG5ldyBkaXJlY3RlZCBtdWx0aS1ncmFwaC5cbiAqL1xuZnVuY3Rpb24gRGlncmFwaCgpIHtcbiAgQmFzZUdyYXBoLmNhbGwodGhpcyk7XG5cbiAgLyohIE1hcCBvZiBzb3VyY2VJZCAtPiB7dGFyZ2V0SWQgLT4gU2V0IG9mIGVkZ2UgaWRzfSAqL1xuICB0aGlzLl9pbkVkZ2VzID0ge307XG5cbiAgLyohIE1hcCBvZiB0YXJnZXRJZCAtPiB7c291cmNlSWQgLT4gU2V0IG9mIGVkZ2UgaWRzfSAqL1xuICB0aGlzLl9vdXRFZGdlcyA9IHt9O1xufVxuXG5EaWdyYXBoLnByb3RvdHlwZSA9IG5ldyBCYXNlR3JhcGgoKTtcbkRpZ3JhcGgucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRGlncmFwaDtcblxuLypcbiAqIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuaXNEaXJlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFsbCBzdWNjZXNzb3JzIG9mIHRoZSBub2RlIHdpdGggdGhlIGlkIGB1YC4gVGhhdCBpcywgYWxsIG5vZGVzXG4gKiB0aGF0IGhhdmUgdGhlIG5vZGUgYHVgIGFzIHRoZWlyIHNvdXJjZSBhcmUgcmV0dXJuZWQuXG4gKiBcbiAqIElmIG5vIG5vZGUgYHVgIGV4aXN0cyBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHUgYSBub2RlIGlkXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLnN1Y2Nlc3NvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9vdXRFZGdlc1t1XSlcbiAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24odikgeyByZXR1cm4gdGhpcy5fbm9kZXNbdl0uaWQ7IH0sIHRoaXMpO1xufTtcblxuLypcbiAqIFJldHVybnMgYWxsIHByZWRlY2Vzc29ycyBvZiB0aGUgbm9kZSB3aXRoIHRoZSBpZCBgdWAuIFRoYXQgaXMsIGFsbCBub2Rlc1xuICogdGhhdCBoYXZlIHRoZSBub2RlIGB1YCBhcyB0aGVpciB0YXJnZXQgYXJlIHJldHVybmVkLlxuICogXG4gKiBJZiBubyBub2RlIGB1YCBleGlzdHMgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5wcmVkZWNlc3NvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9pbkVkZ2VzW3VdKVxuICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiB0aGlzLl9ub2Rlc1t2XS5pZDsgfSwgdGhpcyk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbGwgbm9kZXMgdGhhdCBhcmUgYWRqYWNlbnQgdG8gdGhlIG5vZGUgd2l0aCB0aGUgaWQgYHVgLiBJbiBvdGhlclxuICogd29yZHMsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgc2V0IG9mIGFsbCBzdWNjZXNzb3JzIGFuZCBwcmVkZWNlc3NvcnMgb2ZcbiAqIG5vZGUgYHVgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5uZWlnaGJvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHJldHVybiBTZXQudW5pb24oW3RoaXMuc3VjY2Vzc29ycyh1KSwgdGhpcy5wcmVkZWNlc3NvcnModSldKS5rZXlzKCk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbGwgbm9kZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSBubyBpbi1lZGdlcy5cbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuc291cmNlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiB0aGlzLl9maWx0ZXJOb2RlcyhmdW5jdGlvbih1KSB7XG4gICAgLy8gVGhpcyBjb3VsZCBoYXZlIGJldHRlciBzcGFjZSBjaGFyYWN0ZXJpc3RpY3MgaWYgd2UgaGFkIGFuIGluRGVncmVlIGZ1bmN0aW9uLlxuICAgIHJldHVybiBzZWxmLmluRWRnZXModSkubGVuZ3RoID09PSAwO1xuICB9KTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFsbCBub2RlcyBpbiB0aGUgZ3JhcGggdGhhdCBoYXZlIG5vIG91dC1lZGdlcy5cbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuc2lua3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gdGhpcy5fZmlsdGVyTm9kZXMoZnVuY3Rpb24odSkge1xuICAgIC8vIFRoaXMgY291bGQgaGF2ZSBiZXR0ZXIgc3BhY2UgY2hhcmFjdGVyaXN0aWNzIGlmIHdlIGhhdmUgYW4gb3V0RGVncmVlIGZ1bmN0aW9uLlxuICAgIHJldHVybiBzZWxmLm91dEVkZ2VzKHUpLmxlbmd0aCA9PT0gMDtcbiAgfSk7XG59O1xuXG4vKlxuICogUmV0dXJucyB0aGUgc291cmNlIG5vZGUgaW5jaWRlbnQgb24gdGhlIGVkZ2UgaWRlbnRpZmllZCBieSB0aGUgaWQgYGVgLiBJZiBub1xuICogc3VjaCBlZGdlIGV4aXN0cyBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGUgYW4gZWRnZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5zb3VyY2UgPSBmdW5jdGlvbihlKSB7XG4gIHJldHVybiB0aGlzLl9zdHJpY3RHZXRFZGdlKGUpLnU7XG59O1xuXG4vKlxuICogUmV0dXJucyB0aGUgdGFyZ2V0IG5vZGUgaW5jaWRlbnQgb24gdGhlIGVkZ2UgaWRlbnRpZmllZCBieSB0aGUgaWQgYGVgLiBJZiBub1xuICogc3VjaCBlZGdlIGV4aXN0cyBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGUgYW4gZWRnZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS50YXJnZXQgPSBmdW5jdGlvbihlKSB7XG4gIHJldHVybiB0aGlzLl9zdHJpY3RHZXRFZGdlKGUpLnY7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBpZHMgZm9yIGFsbCBlZGdlcyBpbiB0aGUgZ3JhcGggdGhhdCBoYXZlIHRoZSBub2RlXG4gKiBgdGFyZ2V0YCBhcyB0aGVpciB0YXJnZXQuIElmIHRoZSBub2RlIGB0YXJnZXRgIGlzIG5vdCBpbiB0aGUgZ3JhcGggdGhpc1xuICogZnVuY3Rpb24gcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIE9wdGlvbmFsbHkgYSBgc291cmNlYCBub2RlIGNhbiBhbHNvIGJlIHNwZWNpZmllZC4gVGhpcyBjYXVzZXMgdGhlIHJlc3VsdHNcbiAqIHRvIGJlIGZpbHRlcmVkIHN1Y2ggdGhhdCBvbmx5IGVkZ2VzIGZyb20gYHNvdXJjZWAgdG8gYHRhcmdldGAgYXJlIGluY2x1ZGVkLlxuICogSWYgdGhlIG5vZGUgYHNvdXJjZWAgaXMgc3BlY2lmaWVkIGJ1dCBpcyBub3QgaW4gdGhlIGdyYXBoIHRoZW4gdGhpcyBmdW5jdGlvblxuICogcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0YXJnZXQgdGhlIHRhcmdldCBub2RlIGlkXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NvdXJjZV0gYW4gb3B0aW9uYWwgc291cmNlIG5vZGUgaWRcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuaW5FZGdlcyA9IGZ1bmN0aW9uKHRhcmdldCwgc291cmNlKSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodGFyZ2V0KTtcbiAgdmFyIHJlc3VsdHMgPSBTZXQudW5pb24odXRpbC52YWx1ZXModGhpcy5faW5FZGdlc1t0YXJnZXRdKSkua2V5cygpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHNvdXJjZSk7XG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uKGUpIHsgcmV0dXJuIHRoaXMuc291cmNlKGUpID09PSBzb3VyY2U7IH0sIHRoaXMpO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufTtcblxuLypcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgaWRzIGZvciBhbGwgZWRnZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSB0aGUgbm9kZVxuICogYHNvdXJjZWAgYXMgdGhlaXIgc291cmNlLiBJZiB0aGUgbm9kZSBgc291cmNlYCBpcyBub3QgaW4gdGhlIGdyYXBoIHRoaXNcbiAqIGZ1bmN0aW9uIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBPcHRpb25hbGx5IGEgYHRhcmdldGAgbm9kZSBtYXkgYWxzbyBiZSBzcGVjaWZpZWQuIFRoaXMgY2F1c2VzIHRoZSByZXN1bHRzXG4gKiB0byBiZSBmaWx0ZXJlZCBzdWNoIHRoYXQgb25seSBlZGdlcyBmcm9tIGBzb3VyY2VgIHRvIGB0YXJnZXRgIGFyZSBpbmNsdWRlZC5cbiAqIElmIHRoZSBub2RlIGB0YXJnZXRgIGlzIHNwZWNpZmllZCBidXQgaXMgbm90IGluIHRoZSBncmFwaCB0aGVuIHRoaXMgZnVuY3Rpb25cbiAqIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIHRoZSBzb3VyY2Ugbm9kZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IFt0YXJnZXRdIGFuIG9wdGlvbmFsIHRhcmdldCBub2RlIGlkXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLm91dEVkZ2VzID0gZnVuY3Rpb24oc291cmNlLCB0YXJnZXQpIHtcbiAgdGhpcy5fc3RyaWN0R2V0Tm9kZShzb3VyY2UpO1xuICB2YXIgcmVzdWx0cyA9IFNldC51bmlvbih1dGlsLnZhbHVlcyh0aGlzLl9vdXRFZGdlc1tzb3VyY2VdKSkua2V5cygpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHRhcmdldCk7XG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uKGUpIHsgcmV0dXJuIHRoaXMudGFyZ2V0KGUpID09PSB0YXJnZXQ7IH0sIHRoaXMpO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufTtcblxuLypcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgaWRzIGZvciBhbGwgZWRnZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSB0aGUgYHVgIGFzXG4gKiB0aGVpciBzb3VyY2Ugb3IgdGhlaXIgdGFyZ2V0LiBJZiB0aGUgbm9kZSBgdWAgaXMgbm90IGluIHRoZSBncmFwaCB0aGlzXG4gKiBmdW5jdGlvbiByYWlzZXMgYW4gRXJyb3IuXG4gKlxuICogT3B0aW9uYWxseSBhIGB2YCBub2RlIG1heSBhbHNvIGJlIHNwZWNpZmllZC4gVGhpcyBjYXVzZXMgdGhlIHJlc3VsdHMgdG8gYmVcbiAqIGZpbHRlcmVkIHN1Y2ggdGhhdCBvbmx5IGVkZ2VzIGJldHdlZW4gYHVgIGFuZCBgdmAgLSBpbiBlaXRoZXIgZGlyZWN0aW9uIC1cbiAqIGFyZSBpbmNsdWRlZC4gSUYgdGhlIG5vZGUgYHZgIGlzIHNwZWNpZmllZCBidXQgbm90IGluIHRoZSBncmFwaCB0aGVuIHRoaXNcbiAqIGZ1bmN0aW9uIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSB0aGUgbm9kZSBmb3Igd2hpY2ggdG8gZmluZCBpbmNpZGVudCBlZGdlc1xuICogQHBhcmFtIHtTdHJpbmd9IFt2XSBvcHRpb24gbm9kZSB0aGF0IG11c3QgYmUgYWRqYWNlbnQgdG8gYHVgXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLmluY2lkZW50RWRnZXMgPSBmdW5jdGlvbih1LCB2KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIHJldHVybiBTZXQudW5pb24oW3RoaXMub3V0RWRnZXModSwgdiksIHRoaXMub3V0RWRnZXModiwgdSldKS5rZXlzKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFNldC51bmlvbihbdGhpcy5pbkVkZ2VzKHUpLCB0aGlzLm91dEVkZ2VzKHUpXSkua2V5cygpO1xuICB9XG59O1xuXG4vKlxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIGdyYXBoLlxuICovXG5EaWdyYXBoLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJEaWdyYXBoIFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgMik7XG59O1xuXG4vKlxuICogQWRkcyBhIG5ldyBub2RlIHdpdGggdGhlIGlkIGB1YCB0byB0aGUgZ3JhcGggYW5kIGFzc2lnbnMgaXQgdGhlIHZhbHVlXG4gKiBgdmFsdWVgLiBJZiBhIG5vZGUgd2l0aCB0aGUgaWQgaXMgYWxyZWFkeSBhIHBhcnQgb2YgdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb25cbiAqIHRocm93cyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSBhIG5vZGUgaWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGFuIG9wdGlvbmFsIHZhbHVlIHRvIGF0dGFjaCB0byB0aGUgbm9kZVxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5hZGROb2RlID0gZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgdSA9IEJhc2VHcmFwaC5wcm90b3R5cGUuYWRkTm9kZS5jYWxsKHRoaXMsIHUsIHZhbHVlKTtcbiAgdGhpcy5faW5FZGdlc1t1XSA9IHt9O1xuICB0aGlzLl9vdXRFZGdlc1t1XSA9IHt9O1xuICByZXR1cm4gdTtcbn07XG5cbi8qXG4gKiBSZW1vdmVzIGEgbm9kZSBmcm9tIHRoZSBncmFwaCB0aGF0IGhhcyB0aGUgaWQgYHVgLiBBbnkgZWRnZXMgaW5jaWRlbnQgb24gdGhlXG4gKiBub2RlIGFyZSBhbHNvIHJlbW92ZWQuIElmIHRoZSBncmFwaCBkb2VzIG5vdCBjb250YWluIGEgbm9kZSB3aXRoIHRoZSBpZCB0aGlzXG4gKiBmdW5jdGlvbiB3aWxsIHRocm93IGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5kZWxOb2RlID0gZnVuY3Rpb24odSkge1xuICBCYXNlR3JhcGgucHJvdG90eXBlLmRlbE5vZGUuY2FsbCh0aGlzLCB1KTtcbiAgZGVsZXRlIHRoaXMuX2luRWRnZXNbdV07XG4gIGRlbGV0ZSB0aGlzLl9vdXRFZGdlc1t1XTtcbn07XG5cbi8qXG4gKiBBZGRzIGEgbmV3IGVkZ2UgdG8gdGhlIGdyYXBoIHdpdGggdGhlIGlkIGBlYCBmcm9tIGEgbm9kZSB3aXRoIHRoZSBpZCBgc291cmNlYFxuICogdG8gYSBub2RlIHdpdGggYW4gaWQgYHRhcmdldGAgYW5kIGFzc2lnbnMgaXQgdGhlIHZhbHVlIGB2YWx1ZWAuIFRoaXMgZ3JhcGhcbiAqIGFsbG93cyBtb3JlIHRoYW4gb25lIGVkZ2UgZnJvbSBgc291cmNlYCB0byBgdGFyZ2V0YCBhcyBsb25nIGFzIHRoZSBpZCBgZWBcbiAqIGlzIHVuaXF1ZSBpbiB0aGUgc2V0IG9mIGVkZ2VzLiBJZiBgZWAgaXMgYG51bGxgIHRoZSBncmFwaCB3aWxsIGFzc2lnbiBhXG4gKiB1bmlxdWUgaWRlbnRpZmllciB0byB0aGUgZWRnZS5cbiAqXG4gKiBJZiBgc291cmNlYCBvciBgdGFyZ2V0YCBhcmUgbm90IHByZXNlbnQgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gd2lsbFxuICogdGhyb3cgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtlXSBhbiBlZGdlIGlkXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIHRoZSBzb3VyY2Ugbm9kZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IHRhcmdldCB0aGUgdGFyZ2V0IG5vZGUgaWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGFuIG9wdGlvbmFsIHZhbHVlIHRvIGF0dGFjaCB0byB0aGUgZWRnZVxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5hZGRFZGdlID0gZnVuY3Rpb24oZSwgc291cmNlLCB0YXJnZXQsIHZhbHVlKSB7XG4gIHJldHVybiBCYXNlR3JhcGgucHJvdG90eXBlLl9hZGRFZGdlLmNhbGwodGhpcywgZSwgc291cmNlLCB0YXJnZXQsIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2luRWRnZXMsIHRoaXMuX291dEVkZ2VzKTtcbn07XG5cbi8qXG4gKiBSZW1vdmVzIGFuIGVkZ2UgaW4gdGhlIGdyYXBoIHdpdGggdGhlIGlkIGBlYC4gSWYgbm8gZWRnZSBpbiB0aGUgZ3JhcGggaGFzXG4gKiB0aGUgaWQgYGVgIHRoaXMgZnVuY3Rpb24gd2lsbCB0aHJvdyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZSBhbiBlZGdlIGlkXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLmRlbEVkZ2UgPSBmdW5jdGlvbihlKSB7XG4gIEJhc2VHcmFwaC5wcm90b3R5cGUuX2RlbEVkZ2UuY2FsbCh0aGlzLCBlLCB0aGlzLl9pbkVkZ2VzLCB0aGlzLl9vdXRFZGdlcyk7XG59O1xuXG4vLyBVbmxpa2UgQmFzZUdyYXBoLmZpbHRlck5vZGVzLCB0aGlzIGhlbHBlciBqdXN0IHJldHVybnMgbm9kZXMgdGhhdFxuLy8gc2F0aXNmeSBhIHByZWRpY2F0ZS5cbkRpZ3JhcGgucHJvdG90eXBlLl9maWx0ZXJOb2RlcyA9IGZ1bmN0aW9uKHByZWQpIHtcbiAgdmFyIGZpbHRlcmVkID0gW107XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIGlmIChwcmVkKHUpKSB7XG4gICAgICBmaWx0ZXJlZC5wdXNoKHUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmaWx0ZXJlZDtcbn07XG5cbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgb3JnYW5pemVkIHdpdGggaW4gdGhlIGZvbGxvd2luZyBvcmRlcjpcbiAqXG4gKiBFeHBvcnRzXG4gKiBHcmFwaCBjb25zdHJ1Y3RvcnNcbiAqIEdyYXBoIHF1ZXJpZXMgKGUuZy4gbm9kZXMoKSwgZWRnZXMoKVxuICogR3JhcGggbXV0YXRvcnNcbiAqIEhlbHBlciBmdW5jdGlvbnNcbiAqL1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIiksXG4gICAgQmFzZUdyYXBoID0gcmVxdWlyZShcIi4vQmFzZUdyYXBoXCIpLFxuLyoganNoaW50IC1XMDc5ICovXG4gICAgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gR3JhcGg7XG5cbi8qXG4gKiBDb25zdHJ1Y3RvciB0byBjcmVhdGUgYSBuZXcgdW5kaXJlY3RlZCBtdWx0aS1ncmFwaC5cbiAqL1xuZnVuY3Rpb24gR3JhcGgoKSB7XG4gIEJhc2VHcmFwaC5jYWxsKHRoaXMpO1xuXG4gIC8qISBNYXAgb2Ygbm9kZUlkIC0+IHsgb3RoZXJOb2RlSWQgLT4gU2V0IG9mIGVkZ2UgaWRzIH0gKi9cbiAgdGhpcy5faW5jaWRlbnRFZGdlcyA9IHt9O1xufVxuXG5HcmFwaC5wcm90b3R5cGUgPSBuZXcgQmFzZUdyYXBoKCk7XG5HcmFwaC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBHcmFwaDtcblxuLypcbiAqIEFsd2F5cyByZXR1cm5zIGBmYWxzZWAuXG4gKi9cbkdyYXBoLnByb3RvdHlwZS5pc0RpcmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFsbCBub2RlcyB0aGF0IGFyZSBhZGphY2VudCB0byB0aGUgbm9kZSB3aXRoIHRoZSBpZCBgdWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHUgYSBub2RlIGlkXG4gKi9cbkdyYXBoLnByb3RvdHlwZS5uZWlnaGJvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9pbmNpZGVudEVkZ2VzW3VdKVxuICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiB0aGlzLl9ub2Rlc1t2XS5pZDsgfSwgdGhpcyk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBpZHMgZm9yIGFsbCBlZGdlcyBpbiB0aGUgZ3JhcGggdGhhdCBhcmUgaW5jaWRlbnQgb24gYHVgLlxuICogSWYgdGhlIG5vZGUgYHVgIGlzIG5vdCBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiByYWlzZXMgYW4gRXJyb3IuXG4gKlxuICogT3B0aW9uYWxseSBhIGB2YCBub2RlIG1heSBhbHNvIGJlIHNwZWNpZmllZC4gVGhpcyBjYXVzZXMgdGhlIHJlc3VsdHMgdG8gYmVcbiAqIGZpbHRlcmVkIHN1Y2ggdGhhdCBvbmx5IGVkZ2VzIGJldHdlZW4gYHVgIGFuZCBgdmAgYXJlIGluY2x1ZGVkLiBJZiB0aGUgbm9kZVxuICogYHZgIGlzIHNwZWNpZmllZCBidXQgbm90IGluIHRoZSBncmFwaCB0aGVuIHRoaXMgZnVuY3Rpb24gcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IHRoZSBub2RlIGZvciB3aGljaCB0byBmaW5kIGluY2lkZW50IGVkZ2VzXG4gKiBAcGFyYW0ge1N0cmluZ30gW3ZdIG9wdGlvbiBub2RlIHRoYXQgbXVzdCBiZSBhZGphY2VudCB0byBgdWBcbiAqL1xuR3JhcGgucHJvdG90eXBlLmluY2lkZW50RWRnZXMgPSBmdW5jdGlvbih1LCB2KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIHRoaXMuX3N0cmljdEdldE5vZGUodik7XG4gICAgcmV0dXJuIHYgaW4gdGhpcy5faW5jaWRlbnRFZGdlc1t1XSA/IHRoaXMuX2luY2lkZW50RWRnZXNbdV1bdl0ua2V5cygpIDogW107XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFNldC51bmlvbih1dGlsLnZhbHVlcyh0aGlzLl9pbmNpZGVudEVkZ2VzW3VdKSkua2V5cygpO1xuICB9XG59O1xuXG4vKlxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIGdyYXBoLlxuICovXG5HcmFwaC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiR3JhcGggXCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLCBudWxsLCAyKTtcbn07XG5cbi8qXG4gKiBBZGRzIGEgbmV3IG5vZGUgd2l0aCB0aGUgaWQgYHVgIHRvIHRoZSBncmFwaCBhbmQgYXNzaWducyBpdCB0aGUgdmFsdWVcbiAqIGB2YWx1ZWAuIElmIGEgbm9kZSB3aXRoIHRoZSBpZCBpcyBhbHJlYWR5IGEgcGFydCBvZiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvblxuICogdGhyb3dzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICogQHBhcmFtIHtPYmplY3R9IFt2YWx1ZV0gYW4gb3B0aW9uYWwgdmFsdWUgdG8gYXR0YWNoIHRvIHRoZSBub2RlXG4gKi9cbkdyYXBoLnByb3RvdHlwZS5hZGROb2RlID0gZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgdSA9IEJhc2VHcmFwaC5wcm90b3R5cGUuYWRkTm9kZS5jYWxsKHRoaXMsIHUsIHZhbHVlKTtcbiAgdGhpcy5faW5jaWRlbnRFZGdlc1t1XSA9IHt9O1xuICByZXR1cm4gdTtcbn07XG5cbi8qXG4gKiBSZW1vdmVzIGEgbm9kZSBmcm9tIHRoZSBncmFwaCB0aGF0IGhhcyB0aGUgaWQgYHVgLiBBbnkgZWRnZXMgaW5jaWRlbnQgb24gdGhlXG4gKiBub2RlIGFyZSBhbHNvIHJlbW92ZWQuIElmIHRoZSBncmFwaCBkb2VzIG5vdCBjb250YWluIGEgbm9kZSB3aXRoIHRoZSBpZCB0aGlzXG4gKiBmdW5jdGlvbiB3aWxsIHRocm93IGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5HcmFwaC5wcm90b3R5cGUuZGVsTm9kZSA9IGZ1bmN0aW9uKHUpIHtcbiAgQmFzZUdyYXBoLnByb3RvdHlwZS5kZWxOb2RlLmNhbGwodGhpcywgdSk7XG4gIGRlbGV0ZSB0aGlzLl9pbmNpZGVudEVkZ2VzW3VdO1xufTtcblxuLypcbiAqIEFkZHMgYSBuZXcgZWRnZSB0byB0aGUgZ3JhcGggd2l0aCB0aGUgaWQgYGVgIGJldHdlZW4gYSBub2RlIHdpdGggdGhlIGlkIGB1YFxuICogYW5kIGEgbm9kZSB3aXRoIGFuIGlkIGB2YCBhbmQgYXNzaWducyBpdCB0aGUgdmFsdWUgYHZhbHVlYC4gVGhpcyBncmFwaFxuICogYWxsb3dzIG1vcmUgdGhhbiBvbmUgZWRnZSBiZXR3ZWVuIGB1YCBhbmQgYHZgIGFzIGxvbmcgYXMgdGhlIGlkIGBlYFxuICogaXMgdW5pcXVlIGluIHRoZSBzZXQgb2YgZWRnZXMuIElmIGBlYCBpcyBgbnVsbGAgdGhlIGdyYXBoIHdpbGwgYXNzaWduIGFcbiAqIHVuaXF1ZSBpZGVudGlmaWVyIHRvIHRoZSBlZGdlLlxuICpcbiAqIElmIGB1YCBvciBgdmAgYXJlIG5vdCBwcmVzZW50IGluIHRoZSBncmFwaCB0aGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW5cbiAqIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbZV0gYW4gZWRnZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IHUgdGhlIG5vZGUgaWQgb2Ygb25lIG9mIHRoZSBhZGphY2VudCBub2Rlc1xuICogQHBhcmFtIHtTdHJpbmd9IHYgdGhlIG5vZGUgaWQgb2YgdGhlIG90aGVyIGFkamFjZW50IG5vZGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGFuIG9wdGlvbmFsIHZhbHVlIHRvIGF0dGFjaCB0byB0aGUgZWRnZVxuICovXG5HcmFwaC5wcm90b3R5cGUuYWRkRWRnZSA9IGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gIHJldHVybiBCYXNlR3JhcGgucHJvdG90eXBlLl9hZGRFZGdlLmNhbGwodGhpcywgZSwgdSwgdiwgdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5jaWRlbnRFZGdlcywgdGhpcy5faW5jaWRlbnRFZGdlcyk7XG59O1xuXG4vKlxuICogUmVtb3ZlcyBhbiBlZGdlIGluIHRoZSBncmFwaCB3aXRoIHRoZSBpZCBgZWAuIElmIG5vIGVkZ2UgaW4gdGhlIGdyYXBoIGhhc1xuICogdGhlIGlkIGBlYCB0aGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGUgYW4gZWRnZSBpZFxuICovXG5HcmFwaC5wcm90b3R5cGUuZGVsRWRnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgQmFzZUdyYXBoLnByb3RvdHlwZS5fZGVsRWRnZS5jYWxsKHRoaXMsIGUsIHRoaXMuX2luY2lkZW50RWRnZXMsIHRoaXMuX2luY2lkZW50RWRnZXMpO1xufTtcblxuIiwiLyoganNoaW50IC1XMDc5ICovXG52YXIgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50cztcblxuLyoqXG4gKiBGaW5kcyBhbGwgW2Nvbm5lY3RlZCBjb21wb25lbnRzXVtdIGluIGEgZ3JhcGggYW5kIHJldHVybnMgYW4gYXJyYXkgb2YgdGhlc2VcbiAqIGNvbXBvbmVudHMuIEVhY2ggY29tcG9uZW50IGlzIGl0c2VsZiBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSBpZHMgb2Ygbm9kZXNcbiAqIGluIHRoZSBjb21wb25lbnQuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIHdpdGggdW5kaXJlY3RlZCBHcmFwaHMuXG4gKlxuICogW2Nvbm5lY3RlZCBjb21wb25lbnRzXTogaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Db25uZWN0ZWRfY29tcG9uZW50XyhncmFwaF90aGVvcnkpXG4gKlxuICogQHBhcmFtIHtHcmFwaH0gZyB0aGUgZ3JhcGggdG8gc2VhcmNoIGZvciBjb21wb25lbnRzXG4gKi9cbmZ1bmN0aW9uIGNvbXBvbmVudHMoZykge1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuICB2YXIgdmlzaXRlZCA9IG5ldyBTZXQoKTtcblxuICBmdW5jdGlvbiBkZnModiwgY29tcG9uZW50KSB7XG4gICAgaWYgKCF2aXNpdGVkLmhhcyh2KSkge1xuICAgICAgdmlzaXRlZC5hZGQodik7XG4gICAgICBjb21wb25lbnQucHVzaCh2KTtcbiAgICAgIGcubmVpZ2hib3JzKHYpLmZvckVhY2goZnVuY3Rpb24odykge1xuICAgICAgICBkZnModywgY29tcG9uZW50KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGcubm9kZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgY29tcG9uZW50ID0gW107XG4gICAgZGZzKHYsIGNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBvbmVudC5sZW5ndGggPiAwKSB7XG4gICAgICByZXN1bHRzLnB1c2goY29tcG9uZW50KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIiwidmFyIFByaW9yaXR5UXVldWUgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5Qcmlvcml0eVF1ZXVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRpamtzdHJhO1xuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgW0RpamtzdHJhJ3MgYWxnb3JpdGhtXVtdIHdoaWNoIGZpbmRzXG4gKiB0aGUgc2hvcnRlc3QgcGF0aCBmcm9tICoqc291cmNlKiogdG8gYWxsIG90aGVyIG5vZGVzIGluICoqZyoqLiBUaGlzXG4gKiBmdW5jdGlvbiByZXR1cm5zIGEgbWFwIG9mIGB1IC0+IHsgZGlzdGFuY2UsIHByZWRlY2Vzc29yIH1gLiBUaGUgZGlzdGFuY2VcbiAqIHByb3BlcnR5IGhvbGRzIHRoZSBzdW0gb2YgdGhlIHdlaWdodHMgZnJvbSAqKnNvdXJjZSoqIHRvIGB1YCBhbG9uZyB0aGVcbiAqIHNob3J0ZXN0IHBhdGggb3IgYE51bWJlci5QT1NJVElWRV9JTkZJTklUWWAgaWYgdGhlcmUgaXMgbm8gcGF0aCBmcm9tXG4gKiAqKnNvdXJjZSoqLiBUaGUgcHJlZGVjZXNzb3IgcHJvcGVydHkgY2FuIGJlIHVzZWQgdG8gd2FsayB0aGUgaW5kaXZpZHVhbFxuICogZWxlbWVudHMgb2YgdGhlIHBhdGggZnJvbSAqKnNvdXJjZSoqIHRvICoqdSoqIGluIHJldmVyc2Ugb3JkZXIuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhbiBvcHRpb25hbCBgd2VpZ2h0RnVuYyhlKWAgd2hpY2ggcmV0dXJucyB0aGVcbiAqIHdlaWdodCBvZiB0aGUgZWRnZSBgZWAuIElmIG5vIHdlaWdodEZ1bmMgaXMgc3VwcGxpZWQgdGhlbiBlYWNoIGVkZ2UgaXNcbiAqIGFzc3VtZWQgdG8gaGF2ZSBhIHdlaWdodCBvZiAxLiBUaGlzIGZ1bmN0aW9uIHRocm93cyBhbiBFcnJvciBpZiBhbnkgb2ZcbiAqIHRoZSB0cmF2ZXJzZWQgZWRnZXMgaGF2ZSBhIG5lZ2F0aXZlIGVkZ2Ugd2VpZ2h0LlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYW4gb3B0aW9uYWwgYGluY2lkZW50RnVuYyh1KWAgd2hpY2ggcmV0dXJucyB0aGUgaWRzIG9mXG4gKiBhbGwgZWRnZXMgaW5jaWRlbnQgdG8gdGhlIG5vZGUgYHVgIGZvciB0aGUgcHVycG9zZXMgb2Ygc2hvcnRlc3QgcGF0aFxuICogdHJhdmVyc2FsLiBCeSBkZWZhdWx0IHRoaXMgZnVuY3Rpb24gdXNlcyB0aGUgYGcub3V0RWRnZXNgIGZvciBEaWdyYXBocyBhbmRcbiAqIGBnLmluY2lkZW50RWRnZXNgIGZvciBHcmFwaHMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBgTygofEV8ICsgfFZ8KSAqIGxvZyB8VnwpYCB0aW1lLlxuICpcbiAqIFtEaWprc3RyYSdzIGFsZ29yaXRobV06IGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRGlqa3N0cmElMjdzX2FsZ29yaXRobVxuICpcbiAqIEBwYXJhbSB7R3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNlYXJjaCBmb3Igc2hvcnRlc3QgcGF0aHMgZnJvbSAqKnNvdXJjZSoqXG4gKiBAcGFyYW0ge09iamVjdH0gc291cmNlIHRoZSBzb3VyY2UgZnJvbSB3aGljaCB0byBzdGFydCB0aGUgc2VhcmNoXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbd2VpZ2h0RnVuY10gb3B0aW9uYWwgd2VpZ2h0IGZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaW5jaWRlbnRGdW5jXSBvcHRpb25hbCBpbmNpZGVudCBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBkaWprc3RyYShnLCBzb3VyY2UsIHdlaWdodEZ1bmMsIGluY2lkZW50RnVuYykge1xuICB2YXIgcmVzdWx0cyA9IHt9LFxuICAgICAgcHEgPSBuZXcgUHJpb3JpdHlRdWV1ZSgpO1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZU5laWdoYm9ycyhlKSB7XG4gICAgdmFyIGluY2lkZW50Tm9kZXMgPSBnLmluY2lkZW50Tm9kZXMoZSksXG4gICAgICAgIHYgPSBpbmNpZGVudE5vZGVzWzBdICE9PSB1ID8gaW5jaWRlbnROb2Rlc1swXSA6IGluY2lkZW50Tm9kZXNbMV0sXG4gICAgICAgIHZFbnRyeSA9IHJlc3VsdHNbdl0sXG4gICAgICAgIHdlaWdodCA9IHdlaWdodEZ1bmMoZSksXG4gICAgICAgIGRpc3RhbmNlID0gdUVudHJ5LmRpc3RhbmNlICsgd2VpZ2h0O1xuXG4gICAgaWYgKHdlaWdodCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImRpamtzdHJhIGRvZXMgbm90IGFsbG93IG5lZ2F0aXZlIGVkZ2Ugd2VpZ2h0cy4gQmFkIGVkZ2U6IFwiICsgZSArIFwiIFdlaWdodDogXCIgKyB3ZWlnaHQpO1xuICAgIH1cblxuICAgIGlmIChkaXN0YW5jZSA8IHZFbnRyeS5kaXN0YW5jZSkge1xuICAgICAgdkVudHJ5LmRpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgICB2RW50cnkucHJlZGVjZXNzb3IgPSB1O1xuICAgICAgcHEuZGVjcmVhc2UodiwgZGlzdGFuY2UpO1xuICAgIH1cbiAgfVxuXG4gIHdlaWdodEZ1bmMgPSB3ZWlnaHRGdW5jIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gMTsgfTtcbiAgaW5jaWRlbnRGdW5jID0gaW5jaWRlbnRGdW5jIHx8IChnLmlzRGlyZWN0ZWQoKVxuICAgICAgPyBmdW5jdGlvbih1KSB7IHJldHVybiBnLm91dEVkZ2VzKHUpOyB9XG4gICAgICA6IGZ1bmN0aW9uKHUpIHsgcmV0dXJuIGcuaW5jaWRlbnRFZGdlcyh1KTsgfSk7XG5cbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1KSB7XG4gICAgdmFyIGRpc3RhbmNlID0gdSA9PT0gc291cmNlID8gMCA6IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICByZXN1bHRzW3VdID0geyBkaXN0YW5jZTogZGlzdGFuY2UgfTtcbiAgICBwcS5hZGQodSwgZGlzdGFuY2UpO1xuICB9KTtcblxuICB2YXIgdSwgdUVudHJ5O1xuICB3aGlsZSAocHEuc2l6ZSgpID4gMCkge1xuICAgIHUgPSBwcS5yZW1vdmVNaW4oKTtcbiAgICB1RW50cnkgPSByZXN1bHRzW3VdO1xuICAgIGlmICh1RW50cnkuZGlzdGFuY2UgPT09IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaW5jaWRlbnRGdW5jKHUpLmZvckVhY2godXBkYXRlTmVpZ2hib3JzKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIiwidmFyIGRpamtzdHJhID0gcmVxdWlyZShcIi4vZGlqa3N0cmFcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZGlqa3N0cmFBbGw7XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBmaW5kcyB0aGUgc2hvcnRlc3QgcGF0aCBmcm9tIGVhY2ggbm9kZSB0byBldmVyeSBvdGhlclxuICogcmVhY2hhYmxlIG5vZGUgaW4gdGhlIGdyYXBoLiBJdCBpcyBzaW1pbGFyIHRvIFthbGcuZGlqa3N0cmFdW10sIGJ1dFxuICogaW5zdGVhZCBvZiByZXR1cm5pbmcgYSBzaW5nbGUtc291cmNlIGFycmF5LCBpdCByZXR1cm5zIGEgbWFwcGluZyBvZlxuICogb2YgYHNvdXJjZSAtPiBhbGcuZGlqa3N0YShnLCBzb3VyY2UsIHdlaWdodEZ1bmMsIGluY2lkZW50RnVuYylgLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYW4gb3B0aW9uYWwgYHdlaWdodEZ1bmMoZSlgIHdoaWNoIHJldHVybnMgdGhlXG4gKiB3ZWlnaHQgb2YgdGhlIGVkZ2UgYGVgLiBJZiBubyB3ZWlnaHRGdW5jIGlzIHN1cHBsaWVkIHRoZW4gZWFjaCBlZGdlIGlzXG4gKiBhc3N1bWVkIHRvIGhhdmUgYSB3ZWlnaHQgb2YgMS4gVGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IgaWYgYW55IG9mXG4gKiB0aGUgdHJhdmVyc2VkIGVkZ2VzIGhhdmUgYSBuZWdhdGl2ZSBlZGdlIHdlaWdodC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGFuIG9wdGlvbmFsIGBpbmNpZGVudEZ1bmModSlgIHdoaWNoIHJldHVybnMgdGhlIGlkcyBvZlxuICogYWxsIGVkZ2VzIGluY2lkZW50IHRvIHRoZSBub2RlIGB1YCBmb3IgdGhlIHB1cnBvc2VzIG9mIHNob3J0ZXN0IHBhdGhcbiAqIHRyYXZlcnNhbC4gQnkgZGVmYXVsdCB0aGlzIGZ1bmN0aW9uIHVzZXMgdGhlIGBvdXRFZGdlc2AgZnVuY3Rpb24gb24gdGhlXG4gKiBzdXBwbGllZCBncmFwaC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGBPKHxWfCAqICh8RXwgKyB8VnwpICogbG9nIHxWfClgIHRpbWUuXG4gKlxuICogW2FsZy5kaWprc3RyYV06IGRpamtzdHJhLmpzLmh0bWwjZGlqa3N0cmFcbiAqXG4gKiBAcGFyYW0ge0dyYXBofSBnIHRoZSBncmFwaCB0byBzZWFyY2ggZm9yIHNob3J0ZXN0IHBhdGhzIGZyb20gKipzb3VyY2UqKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3dlaWdodEZ1bmNdIG9wdGlvbmFsIHdlaWdodCBmdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2luY2lkZW50RnVuY10gb3B0aW9uYWwgaW5jaWRlbnQgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gZGlqa3N0cmFBbGwoZywgd2VpZ2h0RnVuYywgaW5jaWRlbnRGdW5jKSB7XG4gIHZhciByZXN1bHRzID0ge307XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIHJlc3VsdHNbdV0gPSBkaWprc3RyYShnLCB1LCB3ZWlnaHRGdW5jLCBpbmNpZGVudEZ1bmMpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iLCJ2YXIgdGFyamFuID0gcmVxdWlyZShcIi4vdGFyamFuXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZpbmRDeWNsZXM7XG5cbi8qXG4gKiBHaXZlbiBhIERpZ3JhcGggKipnKiogdGhpcyBmdW5jdGlvbiByZXR1cm5zIGFsbCBub2RlcyB0aGF0IGFyZSBwYXJ0IG9mIGFcbiAqIGN5Y2xlLiBTaW5jZSB0aGVyZSBtYXkgYmUgbW9yZSB0aGFuIG9uZSBjeWNsZSBpbiBhIGdyYXBoIHRoaXMgZnVuY3Rpb25cbiAqIHJldHVybnMgYW4gYXJyYXkgb2YgdGhlc2UgY3ljbGVzLCB3aGVyZSBlYWNoIGN5Y2xlIGlzIGl0c2VsZiByZXByZXNlbnRlZFxuICogYnkgYW4gYXJyYXkgb2YgaWRzIGZvciBlYWNoIG5vZGUgaW52b2x2ZWQgaW4gdGhhdCBjeWNsZS5cbiAqXG4gKiBbYWxnLmlzQWN5Y2xpY11bXSBpcyBtb3JlIGVmZmljaWVudCBpZiB5b3Ugb25seSBuZWVkIHRvIGRldGVybWluZSB3aGV0aGVyXG4gKiBhIGdyYXBoIGhhcyBhIGN5Y2xlIG9yIG5vdC5cbiAqXG4gKiBbYWxnLmlzQWN5Y2xpY106IGlzQWN5Y2xpYy5qcy5odG1sI2lzQWN5Y2xpY1xuICpcbiAqIEBwYXJhbSB7RGlncmFwaH0gZyB0aGUgZ3JhcGggdG8gc2VhcmNoIGZvciBjeWNsZXMuXG4gKi9cbmZ1bmN0aW9uIGZpbmRDeWNsZXMoZykge1xuICByZXR1cm4gdGFyamFuKGcpLmZpbHRlcihmdW5jdGlvbihjbXB0KSB7IHJldHVybiBjbXB0Lmxlbmd0aCA+IDE7IH0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmbG95ZFdhcnNoYWxsO1xuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlIFtGbG95ZC1XYXJzaGFsbCBhbGdvcml0aG1dW10sXG4gKiB3aGljaCBmaW5kcyB0aGUgc2hvcnRlc3QgcGF0aCBmcm9tIGVhY2ggbm9kZSB0byBldmVyeSBvdGhlciByZWFjaGFibGUgbm9kZVxuICogaW4gdGhlIGdyYXBoLiBJdCBpcyBzaW1pbGFyIHRvIFthbGcuZGlqa3N0cmFBbGxdW10sIGJ1dCBpdCBoYW5kbGVzIG5lZ2F0aXZlXG4gKiBlZGdlIHdlaWdodHMgYW5kIGlzIG1vcmUgZWZmaWNpZW50IGZvciBzb21lIHR5cGVzIG9mIGdyYXBocy4gVGhpcyBmdW5jdGlvblxuICogcmV0dXJucyBhIG1hcCBvZiBgc291cmNlIC0+IHsgdGFyZ2V0IC0+IHsgZGlzdGFuY2UsIHByZWRlY2Vzc29yIH1gLiBUaGVcbiAqIGRpc3RhbmNlIHByb3BlcnR5IGhvbGRzIHRoZSBzdW0gb2YgdGhlIHdlaWdodHMgZnJvbSBgc291cmNlYCB0byBgdGFyZ2V0YFxuICogYWxvbmcgdGhlIHNob3J0ZXN0IHBhdGggb2YgYE51bWJlci5QT1NJVElWRV9JTkZJTklUWWAgaWYgdGhlcmUgaXMgbm8gcGF0aFxuICogZnJvbSBgc291cmNlYC4gVGhlIHByZWRlY2Vzc29yIHByb3BlcnR5IGNhbiBiZSB1c2VkIHRvIHdhbGsgdGhlIGluZGl2aWR1YWxcbiAqIGVsZW1lbnRzIG9mIHRoZSBwYXRoIGZyb20gYHNvdXJjZWAgdG8gYHRhcmdldGAgaW4gcmV2ZXJzZSBvcmRlci5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGFuIG9wdGlvbmFsIGB3ZWlnaHRGdW5jKGUpYCB3aGljaCByZXR1cm5zIHRoZVxuICogd2VpZ2h0IG9mIHRoZSBlZGdlIGBlYC4gSWYgbm8gd2VpZ2h0RnVuYyBpcyBzdXBwbGllZCB0aGVuIGVhY2ggZWRnZSBpc1xuICogYXNzdW1lZCB0byBoYXZlIGEgd2VpZ2h0IG9mIDEuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhbiBvcHRpb25hbCBgaW5jaWRlbnRGdW5jKHUpYCB3aGljaCByZXR1cm5zIHRoZSBpZHMgb2ZcbiAqIGFsbCBlZGdlcyBpbmNpZGVudCB0byB0aGUgbm9kZSBgdWAgZm9yIHRoZSBwdXJwb3NlcyBvZiBzaG9ydGVzdCBwYXRoXG4gKiB0cmF2ZXJzYWwuIEJ5IGRlZmF1bHQgdGhpcyBmdW5jdGlvbiB1c2VzIHRoZSBgb3V0RWRnZXNgIGZ1bmN0aW9uIG9uIHRoZVxuICogc3VwcGxpZWQgZ3JhcGguXG4gKlxuICogVGhpcyBhbGdvcml0aG0gdGFrZXMgTyh8VnxeMykgdGltZS5cbiAqXG4gKiBbRmxveWQtV2Fyc2hhbGwgYWxnb3JpdGhtXTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmxveWQtV2Fyc2hhbGxfYWxnb3JpdGhtXG4gKiBbYWxnLmRpamtzdHJhQWxsXTogZGlqa3N0cmFBbGwuanMuaHRtbCNkaWprc3RyYUFsbFxuICpcbiAqIEBwYXJhbSB7R3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNlYXJjaCBmb3Igc2hvcnRlc3QgcGF0aHMgZnJvbSAqKnNvdXJjZSoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbd2VpZ2h0RnVuY10gb3B0aW9uYWwgd2VpZ2h0IGZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaW5jaWRlbnRGdW5jXSBvcHRpb25hbCBpbmNpZGVudCBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBmbG95ZFdhcnNoYWxsKGcsIHdlaWdodEZ1bmMsIGluY2lkZW50RnVuYykge1xuICB2YXIgcmVzdWx0cyA9IHt9LFxuICAgICAgbm9kZXMgPSBnLm5vZGVzKCk7XG5cbiAgd2VpZ2h0RnVuYyA9IHdlaWdodEZ1bmMgfHwgZnVuY3Rpb24oKSB7IHJldHVybiAxOyB9O1xuICBpbmNpZGVudEZ1bmMgPSBpbmNpZGVudEZ1bmMgfHwgKGcuaXNEaXJlY3RlZCgpXG4gICAgICA/IGZ1bmN0aW9uKHUpIHsgcmV0dXJuIGcub3V0RWRnZXModSk7IH1cbiAgICAgIDogZnVuY3Rpb24odSkgeyByZXR1cm4gZy5pbmNpZGVudEVkZ2VzKHUpOyB9KTtcblxuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICByZXN1bHRzW3VdID0ge307XG4gICAgcmVzdWx0c1t1XVt1XSA9IHsgZGlzdGFuY2U6IDAgfTtcbiAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICh1ICE9PSB2KSB7XG4gICAgICAgIHJlc3VsdHNbdV1bdl0gPSB7IGRpc3RhbmNlOiBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpbmNpZGVudEZ1bmModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgaW5jaWRlbnROb2RlcyA9IGcuaW5jaWRlbnROb2RlcyhlKSxcbiAgICAgICAgICB2ID0gaW5jaWRlbnROb2Rlc1swXSAhPT0gdSA/IGluY2lkZW50Tm9kZXNbMF0gOiBpbmNpZGVudE5vZGVzWzFdLFxuICAgICAgICAgIGQgPSB3ZWlnaHRGdW5jKGUpO1xuICAgICAgaWYgKGQgPCByZXN1bHRzW3VdW3ZdLmRpc3RhbmNlKSB7XG4gICAgICAgIHJlc3VsdHNbdV1bdl0gPSB7IGRpc3RhbmNlOiBkLCBwcmVkZWNlc3NvcjogdSB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICB2YXIgcm93SyA9IHJlc3VsdHNba107XG4gICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihpKSB7XG4gICAgICB2YXIgcm93SSA9IHJlc3VsdHNbaV07XG4gICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGopIHtcbiAgICAgICAgdmFyIGlrID0gcm93SVtrXTtcbiAgICAgICAgdmFyIGtqID0gcm93S1tqXTtcbiAgICAgICAgdmFyIGlqID0gcm93SVtqXTtcbiAgICAgICAgdmFyIGFsdERpc3RhbmNlID0gaWsuZGlzdGFuY2UgKyBrai5kaXN0YW5jZTtcbiAgICAgICAgaWYgKGFsdERpc3RhbmNlIDwgaWouZGlzdGFuY2UpIHtcbiAgICAgICAgICBpai5kaXN0YW5jZSA9IGFsdERpc3RhbmNlO1xuICAgICAgICAgIGlqLnByZWRlY2Vzc29yID0ga2oucHJlZGVjZXNzb3I7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiIsInZhciB0b3Bzb3J0ID0gcmVxdWlyZShcIi4vdG9wc29ydFwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBpc0FjeWNsaWM7XG5cbi8qXG4gKiBHaXZlbiBhIERpZ3JhcGggKipnKiogdGhpcyBmdW5jdGlvbiByZXR1cm5zIGB0cnVlYCBpZiB0aGUgZ3JhcGggaGFzIG5vXG4gKiBjeWNsZXMgYW5kIHJldHVybnMgYGZhbHNlYCBpZiBpdCBkb2VzLiBUaGlzIGFsZ29yaXRobSByZXR1cm5zIGFzIHNvb24gYXMgaXRcbiAqIGRldGVjdHMgdGhlIGZpcnN0IGN5Y2xlLlxuICpcbiAqIFVzZSBbYWxnLmZpbmRDeWNsZXNdW10gaWYgeW91IG5lZWQgdGhlIGFjdHVhbCBsaXN0IG9mIGN5Y2xlcyBpbiBhIGdyYXBoLlxuICpcbiAqIFthbGcuZmluZEN5Y2xlc106IGZpbmRDeWNsZXMuanMuaHRtbCNmaW5kQ3ljbGVzXG4gKlxuICogQHBhcmFtIHtEaWdyYXBofSBnIHRoZSBncmFwaCB0byB0ZXN0IGZvciBjeWNsZXNcbiAqL1xuZnVuY3Rpb24gaXNBY3ljbGljKGcpIHtcbiAgdHJ5IHtcbiAgICB0b3Bzb3J0KGcpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiB0b3Bzb3J0LkN5Y2xlRXhjZXB0aW9uKSByZXR1cm4gZmFsc2U7XG4gICAgdGhyb3cgZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cbiIsIi8qIGpzaGludCAtVzA3OSAqL1xudmFyIFNldCA9IHJlcXVpcmUoXCJjcC1kYXRhXCIpLlNldDtcbi8qIGpzaGludCArVzA3OSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBvc3RvcmRlcjtcblxuLy8gUG9zdG9yZGVyIHRyYXZlcnNhbCBvZiBnLCBjYWxsaW5nIGYgZm9yIGVhY2ggdmlzaXRlZCBub2RlLiBBc3N1bWVzIHRoZSBncmFwaFxuLy8gaXMgYSB0cmVlLlxuZnVuY3Rpb24gcG9zdG9yZGVyKGcsIHJvb3QsIGYpIHtcbiAgdmFyIHZpc2l0ZWQgPSBuZXcgU2V0KCk7XG4gIGlmIChnLmlzRGlyZWN0ZWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBmb3IgdW5kaXJlY3RlZCBncmFwaHNcIik7XG4gIH1cbiAgZnVuY3Rpb24gZGZzKHUsIHByZXYpIHtcbiAgICBpZiAodmlzaXRlZC5oYXModSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBpbnB1dCBncmFwaCBpcyBub3QgYSB0cmVlOiBcIiArIGcpO1xuICAgIH1cbiAgICB2aXNpdGVkLmFkZCh1KTtcbiAgICBnLm5laWdoYm9ycyh1KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICh2ICE9PSBwcmV2KSBkZnModiwgdSk7XG4gICAgfSk7XG4gICAgZih1KTtcbiAgfVxuICBkZnMocm9vdCk7XG59XG4iLCIvKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5TZXQ7XG4vKiBqc2hpbnQgK1cwNzkgKi9cblxubW9kdWxlLmV4cG9ydHMgPSBwcmVvcmRlcjtcblxuLy8gUHJlb3JkZXIgdHJhdmVyc2FsIG9mIGcsIGNhbGxpbmcgZiBmb3IgZWFjaCB2aXNpdGVkIG5vZGUuIEFzc3VtZXMgdGhlIGdyYXBoXG4vLyBpcyBhIHRyZWUuXG5mdW5jdGlvbiBwcmVvcmRlcihnLCByb290LCBmKSB7XG4gIHZhciB2aXNpdGVkID0gbmV3IFNldCgpO1xuICBpZiAoZy5pc0RpcmVjdGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgZm9yIHVuZGlyZWN0ZWQgZ3JhcGhzXCIpO1xuICB9XG4gIGZ1bmN0aW9uIGRmcyh1LCBwcmV2KSB7XG4gICAgaWYgKHZpc2l0ZWQuaGFzKHUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgaW5wdXQgZ3JhcGggaXMgbm90IGEgdHJlZTogXCIgKyBnKTtcbiAgICB9XG4gICAgdmlzaXRlZC5hZGQodSk7XG4gICAgZih1KTtcbiAgICBnLm5laWdoYm9ycyh1KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICh2ICE9PSBwcmV2KSBkZnModiwgdSk7XG4gICAgfSk7XG4gIH1cbiAgZGZzKHJvb3QpO1xufVxuIiwidmFyIEdyYXBoID0gcmVxdWlyZShcIi4uL0dyYXBoXCIpLFxuICAgIFByaW9yaXR5UXVldWUgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5Qcmlvcml0eVF1ZXVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHByaW07XG5cbi8qKlxuICogW1ByaW0ncyBhbGdvcml0aG1dW10gdGFrZXMgYSBjb25uZWN0ZWQgdW5kaXJlY3RlZCBncmFwaCBhbmQgZ2VuZXJhdGVzIGFcbiAqIFttaW5pbXVtIHNwYW5uaW5nIHRyZWVdW10uIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgbWluaW11bSBzcGFubmluZ1xuICogdHJlZSBhcyBhbiB1bmRpcmVjdGVkIGdyYXBoLiBUaGlzIGFsZ29yaXRobSBpcyBkZXJpdmVkIGZyb20gdGhlIGRlc2NyaXB0aW9uXG4gKiBpbiBcIkludHJvZHVjdGlvbiB0byBBbGdvcml0aG1zXCIsIFRoaXJkIEVkaXRpb24sIENvcm1lbiwgZXQgYWwuLCBQZyA2MzQuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhIGB3ZWlnaHRGdW5jKGUpYCB3aGljaCByZXR1cm5zIHRoZSB3ZWlnaHQgb2YgdGhlIGVkZ2VcbiAqIGBlYC4gSXQgdGhyb3dzIGFuIEVycm9yIGlmIHRoZSBncmFwaCBpcyBub3QgY29ubmVjdGVkLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYE8ofEV8IGxvZyB8VnwpYCB0aW1lLlxuICpcbiAqIFtQcmltJ3MgYWxnb3JpdGhtXTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUHJpbSdzX2FsZ29yaXRobVxuICogW21pbmltdW0gc3Bhbm5pbmcgdHJlZV06IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL01pbmltdW1fc3Bhbm5pbmdfdHJlZVxuICpcbiAqIEBwYXJhbSB7R3JhcGh9IGcgdGhlIGdyYXBoIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIG1pbmltdW0gc3Bhbm5pbmcgdHJlZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gd2VpZ2h0RnVuYyB0aGUgd2VpZ2h0IGZ1bmN0aW9uIHRvIHVzZVxuICovXG5mdW5jdGlvbiBwcmltKGcsIHdlaWdodEZ1bmMpIHtcbiAgdmFyIHJlc3VsdCA9IG5ldyBHcmFwaCgpLFxuICAgICAgcGFyZW50cyA9IHt9LFxuICAgICAgcHEgPSBuZXcgUHJpb3JpdHlRdWV1ZSgpLFxuICAgICAgdTtcblxuICBmdW5jdGlvbiB1cGRhdGVOZWlnaGJvcnMoZSkge1xuICAgIHZhciBpbmNpZGVudE5vZGVzID0gZy5pbmNpZGVudE5vZGVzKGUpLFxuICAgICAgICB2ID0gaW5jaWRlbnROb2Rlc1swXSAhPT0gdSA/IGluY2lkZW50Tm9kZXNbMF0gOiBpbmNpZGVudE5vZGVzWzFdLFxuICAgICAgICBwcmkgPSBwcS5wcmlvcml0eSh2KTtcbiAgICBpZiAocHJpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBlZGdlV2VpZ2h0ID0gd2VpZ2h0RnVuYyhlKTtcbiAgICAgIGlmIChlZGdlV2VpZ2h0IDwgcHJpKSB7XG4gICAgICAgIHBhcmVudHNbdl0gPSB1O1xuICAgICAgICBwcS5kZWNyZWFzZSh2LCBlZGdlV2VpZ2h0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZy5vcmRlcigpID09PSAwKSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIHBxLmFkZCh1LCBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkpO1xuICAgIHJlc3VsdC5hZGROb2RlKHUpO1xuICB9KTtcblxuICAvLyBTdGFydCBmcm9tIGFuIGFyYml0cmFyeSBub2RlXG4gIHBxLmRlY3JlYXNlKGcubm9kZXMoKVswXSwgMCk7XG5cbiAgdmFyIGluaXQgPSBmYWxzZTtcbiAgd2hpbGUgKHBxLnNpemUoKSA+IDApIHtcbiAgICB1ID0gcHEucmVtb3ZlTWluKCk7XG4gICAgaWYgKHUgaW4gcGFyZW50cykge1xuICAgICAgcmVzdWx0LmFkZEVkZ2UobnVsbCwgdSwgcGFyZW50c1t1XSk7XG4gICAgfSBlbHNlIGlmIChpbml0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnB1dCBncmFwaCBpcyBub3QgY29ubmVjdGVkOiBcIiArIGcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbml0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBnLmluY2lkZW50RWRnZXModSkuZm9yRWFjaCh1cGRhdGVOZWlnaGJvcnMpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGFyamFuO1xuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgW1RhcmphbidzIGFsZ29yaXRobV1bXSB3aGljaCBmaW5kc1xuICogYWxsIFtzdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50c11bXSBpbiB0aGUgZGlyZWN0ZWQgZ3JhcGggKipnKiouIEVhY2hcbiAqIHN0cm9uZ2x5IGNvbm5lY3RlZCBjb21wb25lbnQgaXMgY29tcG9zZWQgb2Ygbm9kZXMgdGhhdCBjYW4gcmVhY2ggYWxsIG90aGVyXG4gKiBub2RlcyBpbiB0aGUgY29tcG9uZW50IHZpYSBkaXJlY3RlZCBlZGdlcy4gQSBzdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50XG4gKiBjYW4gY29uc2lzdCBvZiBhIHNpbmdsZSBub2RlIGlmIHRoYXQgbm9kZSBjYW5ub3QgYm90aCByZWFjaCBhbmQgYmUgcmVhY2hlZFxuICogYnkgYW55IG90aGVyIHNwZWNpZmljIG5vZGUgaW4gdGhlIGdyYXBoLiBDb21wb25lbnRzIG9mIG1vcmUgdGhhbiBvbmUgbm9kZVxuICogYXJlIGd1YXJhbnRlZWQgdG8gaGF2ZSBhdCBsZWFzdCBvbmUgY3ljbGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiByZXR1cm5zIGFuIGFycmF5IG9mIGNvbXBvbmVudHMuIEVhY2ggY29tcG9uZW50IGlzIGl0c2VsZiBhblxuICogYXJyYXkgdGhhdCBjb250YWlucyB0aGUgaWRzIG9mIGFsbCBub2RlcyBpbiB0aGUgY29tcG9uZW50LlxuICpcbiAqIFtUYXJqYW4ncyBhbGdvcml0aG1dOiBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1RhcmphbidzX3N0cm9uZ2x5X2Nvbm5lY3RlZF9jb21wb25lbnRzX2FsZ29yaXRobVxuICogW3N0cm9uZ2x5IGNvbm5lY3RlZCBjb21wb25lbnRzXTogaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdHJvbmdseV9jb25uZWN0ZWRfY29tcG9uZW50XG4gKlxuICogQHBhcmFtIHtEaWdyYXBofSBnIHRoZSBncmFwaCB0byBzZWFyY2ggZm9yIHN0cm9uZ2x5IGNvbm5lY3RlZCBjb21wb25lbnRzXG4gKi9cbmZ1bmN0aW9uIHRhcmphbihnKSB7XG4gIGlmICghZy5pc0RpcmVjdGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0YXJqYW4gY2FuIG9ubHkgYmUgYXBwbGllZCB0byBhIGRpcmVjdGVkIGdyYXBoLiBCYWQgaW5wdXQ6IFwiICsgZyk7XG4gIH1cblxuICB2YXIgaW5kZXggPSAwLFxuICAgICAgc3RhY2sgPSBbXSxcbiAgICAgIHZpc2l0ZWQgPSB7fSwgLy8gbm9kZSBpZCAtPiB7IG9uU3RhY2ssIGxvd2xpbmssIGluZGV4IH1cbiAgICAgIHJlc3VsdHMgPSBbXTtcblxuICBmdW5jdGlvbiBkZnModSkge1xuICAgIHZhciBlbnRyeSA9IHZpc2l0ZWRbdV0gPSB7XG4gICAgICBvblN0YWNrOiB0cnVlLFxuICAgICAgbG93bGluazogaW5kZXgsXG4gICAgICBpbmRleDogaW5kZXgrK1xuICAgIH07XG4gICAgc3RhY2sucHVzaCh1KTtcblxuICAgIGcuc3VjY2Vzc29ycyh1KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghKHYgaW4gdmlzaXRlZCkpIHtcbiAgICAgICAgZGZzKHYpO1xuICAgICAgICBlbnRyeS5sb3dsaW5rID0gTWF0aC5taW4oZW50cnkubG93bGluaywgdmlzaXRlZFt2XS5sb3dsaW5rKTtcbiAgICAgIH0gZWxzZSBpZiAodmlzaXRlZFt2XS5vblN0YWNrKSB7XG4gICAgICAgIGVudHJ5Lmxvd2xpbmsgPSBNYXRoLm1pbihlbnRyeS5sb3dsaW5rLCB2aXNpdGVkW3ZdLmluZGV4KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChlbnRyeS5sb3dsaW5rID09PSBlbnRyeS5pbmRleCkge1xuICAgICAgdmFyIGNtcHQgPSBbXSxcbiAgICAgICAgICB2O1xuICAgICAgZG8ge1xuICAgICAgICB2ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHZpc2l0ZWRbdl0ub25TdGFjayA9IGZhbHNlO1xuICAgICAgICBjbXB0LnB1c2godik7XG4gICAgICB9IHdoaWxlICh1ICE9PSB2KTtcbiAgICAgIHJlc3VsdHMucHVzaChjbXB0KTtcbiAgICB9XG4gIH1cblxuICBnLm5vZGVzKCkuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgaWYgKCEodSBpbiB2aXNpdGVkKSkge1xuICAgICAgZGZzKHUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvcHNvcnQ7XG50b3Bzb3J0LkN5Y2xlRXhjZXB0aW9uID0gQ3ljbGVFeGNlcHRpb247XG5cbi8qXG4gKiBHaXZlbiBhIGdyYXBoICoqZyoqLCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYW4gb3JkZXJlZCBsaXN0IG9mIG5vZGVzIHN1Y2hcbiAqIHRoYXQgZm9yIGVhY2ggZWRnZSBgdSAtPiB2YCwgYHVgIGFwcGVhcnMgYmVmb3JlIGB2YCBpbiB0aGUgbGlzdC4gSWYgdGhlXG4gKiBncmFwaCBoYXMgYSBjeWNsZSBpdCBpcyBpbXBvc3NpYmxlIHRvIGdlbmVyYXRlIHN1Y2ggYSBsaXN0IGFuZFxuICogKipDeWNsZUV4Y2VwdGlvbioqIGlzIHRocm93bi5cbiAqXG4gKiBTZWUgW3RvcG9sb2dpY2FsIHNvcnRpbmddKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1RvcG9sb2dpY2FsX3NvcnRpbmcpXG4gKiBmb3IgbW9yZSBkZXRhaWxzIGFib3V0IGhvdyB0aGlzIGFsZ29yaXRobSB3b3Jrcy5cbiAqXG4gKiBAcGFyYW0ge0RpZ3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNvcnRcbiAqL1xuZnVuY3Rpb24gdG9wc29ydChnKSB7XG4gIGlmICghZy5pc0RpcmVjdGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0b3Bzb3J0IGNhbiBvbmx5IGJlIGFwcGxpZWQgdG8gYSBkaXJlY3RlZCBncmFwaC4gQmFkIGlucHV0OiBcIiArIGcpO1xuICB9XG5cbiAgdmFyIHZpc2l0ZWQgPSB7fTtcbiAgdmFyIHN0YWNrID0ge307XG4gIHZhciByZXN1bHRzID0gW107XG5cbiAgZnVuY3Rpb24gdmlzaXQobm9kZSkge1xuICAgIGlmIChub2RlIGluIHN0YWNrKSB7XG4gICAgICB0aHJvdyBuZXcgQ3ljbGVFeGNlcHRpb24oKTtcbiAgICB9XG5cbiAgICBpZiAoIShub2RlIGluIHZpc2l0ZWQpKSB7XG4gICAgICBzdGFja1tub2RlXSA9IHRydWU7XG4gICAgICB2aXNpdGVkW25vZGVdID0gdHJ1ZTtcbiAgICAgIGcucHJlZGVjZXNzb3JzKG5vZGUpLmZvckVhY2goZnVuY3Rpb24ocHJlZCkge1xuICAgICAgICB2aXNpdChwcmVkKTtcbiAgICAgIH0pO1xuICAgICAgZGVsZXRlIHN0YWNrW25vZGVdO1xuICAgICAgcmVzdWx0cy5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBzaW5rcyA9IGcuc2lua3MoKTtcbiAgaWYgKGcub3JkZXIoKSAhPT0gMCAmJiBzaW5rcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgQ3ljbGVFeGNlcHRpb24oKTtcbiAgfVxuXG4gIGcuc2lua3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHNpbmspIHtcbiAgICB2aXNpdChzaW5rKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIEN5Y2xlRXhjZXB0aW9uKCkge31cblxuQ3ljbGVFeGNlcHRpb24ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIkdyYXBoIGhhcyBhdCBsZWFzdCBvbmUgY3ljbGVcIjtcbn07XG4iLCIvLyBUaGlzIGZpbGUgcHJvdmlkZXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBtaXhlcy1pbiBEb3QgYmVoYXZpb3IgdG8gYW5cbi8vIGV4aXN0aW5nIGdyYXBoIHByb3RvdHlwZS5cblxuLyoganNoaW50IC1XMDc5ICovXG52YXIgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG91bmRpZnk7XG5cbi8vIEV4dGVuZHMgdGhlIGdpdmVuIFN1cGVyQ29uc3RydWN0b3Igd2l0aCB0aGUgYWJpbGl0eSBmb3Igbm9kZXMgdG8gY29udGFpblxuLy8gb3RoZXIgbm9kZXMuIEEgc3BlY2lhbCBub2RlIGlkIGBudWxsYCBpcyB1c2VkIHRvIGluZGljYXRlIHRoZSByb290IGdyYXBoLlxuZnVuY3Rpb24gY29tcG91bmRpZnkoU3VwZXJDb25zdHJ1Y3Rvcikge1xuICBmdW5jdGlvbiBDb25zdHJ1Y3RvcigpIHtcbiAgICBTdXBlckNvbnN0cnVjdG9yLmNhbGwodGhpcyk7XG5cbiAgICAvLyBNYXAgb2Ygb2JqZWN0IGlkIC0+IHBhcmVudCBpZCAob3IgbnVsbCBmb3Igcm9vdCBncmFwaClcbiAgICB0aGlzLl9wYXJlbnRzID0ge307XG5cbiAgICAvLyBNYXAgb2YgaWQgKG9yIG51bGwpIC0+IGNoaWxkcmVuIHNldFxuICAgIHRoaXMuX2NoaWxkcmVuID0ge307XG4gICAgdGhpcy5fY2hpbGRyZW5bbnVsbF0gPSBuZXcgU2V0KCk7XG4gIH1cblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgU3VwZXJDb25zdHJ1Y3RvcigpO1xuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUucGFyZW50ID0gZnVuY3Rpb24odSwgcGFyZW50KSB7XG4gICAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh1KTtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudHNbdV07XG4gICAgfVxuXG4gICAgaWYgKHUgPT09IHBhcmVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG1ha2UgXCIgKyB1ICsgXCIgYSBwYXJlbnQgb2YgaXRzZWxmXCIpO1xuICAgIH1cbiAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHBhcmVudCk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2hpbGRyZW5bdGhpcy5fcGFyZW50c1t1XV0ucmVtb3ZlKHUpO1xuICAgIHRoaXMuX3BhcmVudHNbdV0gPSBwYXJlbnQ7XG4gICAgdGhpcy5fY2hpbGRyZW5bcGFyZW50XS5hZGQodSk7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmNoaWxkcmVuID0gZnVuY3Rpb24odSkge1xuICAgIGlmICh1ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW5bdV0ua2V5cygpO1xuICB9O1xuXG4gIENvbnN0cnVjdG9yLnByb3RvdHlwZS5hZGROb2RlID0gZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICB1ID0gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuYWRkTm9kZS5jYWxsKHRoaXMsIHUsIHZhbHVlKTtcbiAgICB0aGlzLl9wYXJlbnRzW3VdID0gbnVsbDtcbiAgICB0aGlzLl9jaGlsZHJlblt1XSA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLl9jaGlsZHJlbltudWxsXS5hZGQodSk7XG4gICAgcmV0dXJuIHU7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmRlbE5vZGUgPSBmdW5jdGlvbih1KSB7XG4gICAgLy8gUHJvbW90ZSBhbGwgY2hpbGRyZW4gdG8gdGhlIHBhcmVudCBvZiB0aGUgc3ViZ3JhcGhcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnQodSk7XG4gICAgdGhpcy5fY2hpbGRyZW5bdV0ua2V5cygpLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgIHRoaXMucGFyZW50KGNoaWxkLCBwYXJlbnQpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fY2hpbGRyZW5bcGFyZW50XS5yZW1vdmUodSk7XG4gICAgZGVsZXRlIHRoaXMuX3BhcmVudHNbdV07XG4gICAgZGVsZXRlIHRoaXMuX2NoaWxkcmVuW3VdO1xuXG4gICAgcmV0dXJuIFN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLmRlbE5vZGUuY2FsbCh0aGlzLCB1KTtcbiAgfTtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb3B5ID0gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29weS5jYWxsKHRoaXMpO1xuICAgIHRoaXMubm9kZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgIGNvcHkucGFyZW50KHUsIHRoaXMucGFyZW50KHUpKTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZmlsdGVyTm9kZXMgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGNvcHkgPSBTdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZS5maWx0ZXJOb2Rlcy5jYWxsKHRoaXMsIGZpbHRlcik7XG5cbiAgICB2YXIgcGFyZW50cyA9IHt9O1xuICAgIGZ1bmN0aW9uIGZpbmRQYXJlbnQodSkge1xuICAgICAgdmFyIHBhcmVudCA9IHNlbGYucGFyZW50KHUpO1xuICAgICAgaWYgKHBhcmVudCA9PT0gbnVsbCB8fCBjb3B5Lmhhc05vZGUocGFyZW50KSkge1xuICAgICAgICBwYXJlbnRzW3VdID0gcGFyZW50O1xuICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgfSBlbHNlIGlmIChwYXJlbnQgaW4gcGFyZW50cykge1xuICAgICAgICByZXR1cm4gcGFyZW50c1twYXJlbnRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZpbmRQYXJlbnQocGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb3B5LmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHsgY29weS5wYXJlbnQodSwgZmluZFBhcmVudCh1KSk7IH0pO1xuXG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgcmV0dXJuIENvbnN0cnVjdG9yO1xufVxuIiwidmFyIEdyYXBoID0gcmVxdWlyZShcIi4uL0dyYXBoXCIpLFxuICAgIERpZ3JhcGggPSByZXF1aXJlKFwiLi4vRGlncmFwaFwiKSxcbiAgICBDR3JhcGggPSByZXF1aXJlKFwiLi4vQ0dyYXBoXCIpLFxuICAgIENEaWdyYXBoID0gcmVxdWlyZShcIi4uL0NEaWdyYXBoXCIpO1xuXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uKG5vZGVzLCBlZGdlcywgQ3Rvcikge1xuICBDdG9yID0gQ3RvciB8fCBEaWdyYXBoO1xuXG4gIGlmICh0eXBlT2Yobm9kZXMpICE9PSBcIkFycmF5XCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJub2RlcyBpcyBub3QgYW4gQXJyYXlcIik7XG4gIH1cblxuICBpZiAodHlwZU9mKGVkZ2VzKSAhPT0gXCJBcnJheVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZWRnZXMgaXMgbm90IGFuIEFycmF5XCIpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBDdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgc3dpdGNoKEN0b3IpIHtcbiAgICAgIGNhc2UgXCJncmFwaFwiOiBDdG9yID0gR3JhcGg7IGJyZWFrO1xuICAgICAgY2FzZSBcImRpZ3JhcGhcIjogQ3RvciA9IERpZ3JhcGg7IGJyZWFrO1xuICAgICAgY2FzZSBcImNncmFwaFwiOiBDdG9yID0gQ0dyYXBoOyBicmVhaztcbiAgICAgIGNhc2UgXCJjZGlncmFwaFwiOiBDdG9yID0gQ0RpZ3JhcGg7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKFwiVW5yZWNvZ25pemVkIGdyYXBoIHR5cGU6IFwiICsgQ3Rvcik7XG4gICAgfVxuICB9XG5cbiAgdmFyIGdyYXBoID0gbmV3IEN0b3IoKTtcblxuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICBncmFwaC5hZGROb2RlKHUuaWQsIHUudmFsdWUpO1xuICB9KTtcblxuICAvLyBJZiB0aGUgZ3JhcGggaXMgY29tcG91bmQsIHNldCB1cCBjaGlsZHJlbi4uLlxuICBpZiAoZ3JhcGgucGFyZW50KSB7XG4gICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICBpZiAodS5jaGlsZHJlbikge1xuICAgICAgICB1LmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICAgIGdyYXBoLnBhcmVudCh2LCB1LmlkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICBncmFwaC5hZGRFZGdlKGUuaWQsIGUudSwgZS52LCBlLnZhbHVlKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGdyYXBoO1xufTtcblxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbihncmFwaCkge1xuICB2YXIgbm9kZXMgPSBbXTtcbiAgdmFyIGVkZ2VzID0gW107XG5cbiAgZ3JhcGguZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICB2YXIgbm9kZSA9IHtpZDogdSwgdmFsdWU6IHZhbHVlfTtcbiAgICBpZiAoZ3JhcGguY2hpbGRyZW4pIHtcbiAgICAgIHZhciBjaGlsZHJlbiA9IGdyYXBoLmNoaWxkcmVuKHUpO1xuICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICBub2RlLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgICB9XG4gICAgfVxuICAgIG5vZGVzLnB1c2gobm9kZSk7XG4gIH0pO1xuXG4gIGdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgZWRnZXMucHVzaCh7aWQ6IGUsIHU6IHUsIHY6IHYsIHZhbHVlOiB2YWx1ZX0pO1xuICB9KTtcblxuICB2YXIgdHlwZTtcbiAgaWYgKGdyYXBoIGluc3RhbmNlb2YgQ0RpZ3JhcGgpIHtcbiAgICB0eXBlID0gXCJjZGlncmFwaFwiO1xuICB9IGVsc2UgaWYgKGdyYXBoIGluc3RhbmNlb2YgQ0dyYXBoKSB7XG4gICAgdHlwZSA9IFwiY2dyYXBoXCI7XG4gIH0gZWxzZSBpZiAoZ3JhcGggaW5zdGFuY2VvZiBEaWdyYXBoKSB7XG4gICAgdHlwZSA9IFwiZGlncmFwaFwiO1xuICB9IGVsc2UgaWYgKGdyYXBoIGluc3RhbmNlb2YgR3JhcGgpIHtcbiAgICB0eXBlID0gXCJncmFwaFwiO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGRldGVybWluZSB0eXBlIG9mIGdyYXBoOiBcIiArIGdyYXBoKTtcbiAgfVxuXG4gIHJldHVybiB7IG5vZGVzOiBub2RlcywgZWRnZXM6IGVkZ2VzLCB0eXBlOiB0eXBlIH07XG59O1xuXG5mdW5jdGlvbiB0eXBlT2Yob2JqKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKS5zbGljZSg4LCAtMSk7XG59XG4iLCIvKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5TZXQ7XG4vKiBqc2hpbnQgK1cwNzkgKi9cblxuZXhwb3J0cy5hbGwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbn07XG5cbmV4cG9ydHMubm9kZXNGcm9tTGlzdCA9IGZ1bmN0aW9uKG5vZGVzKSB7XG4gIHZhciBzZXQgPSBuZXcgU2V0KG5vZGVzKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHUpIHtcbiAgICByZXR1cm4gc2V0Lmhhcyh1KTtcbiAgfTtcbn07XG4iLCJ2YXIgR3JhcGggPSByZXF1aXJlKFwiLi9HcmFwaFwiKSxcbiAgICBEaWdyYXBoID0gcmVxdWlyZShcIi4vRGlncmFwaFwiKTtcblxuLy8gU2lkZS1lZmZlY3QgYmFzZWQgY2hhbmdlcyBhcmUgbG91c3ksIGJ1dCBub2RlIGRvZXNuJ3Qgc2VlbSB0byByZXNvbHZlIHRoZVxuLy8gcmVxdWlyZXMgY3ljbGUuXG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBkaXJlY3RlZCBncmFwaCB1c2luZyB0aGUgbm9kZXMgYW5kIGVkZ2VzIGZyb20gdGhpcyBncmFwaC4gVGhlXG4gKiBuZXcgZ3JhcGggd2lsbCBoYXZlIHRoZSBzYW1lIG5vZGVzLCBidXQgd2lsbCBoYXZlIHR3aWNlIHRoZSBudW1iZXIgb2YgZWRnZXM6XG4gKiBlYWNoIGVkZ2UgaXMgc3BsaXQgaW50byB0d28gZWRnZXMgd2l0aCBvcHBvc2l0ZSBkaXJlY3Rpb25zLiBFZGdlIGlkcyxcbiAqIGNvbnNlcXVlbnRseSwgYXJlIG5vdCBwcmVzZXJ2ZWQgYnkgdGhpcyB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuR3JhcGgucHJvdG90eXBlLnRvRGlncmFwaCA9XG5HcmFwaC5wcm90b3R5cGUuYXNEaXJlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZyA9IG5ldyBEaWdyYXBoKCk7XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgZy5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gIHRoaXMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdiwgdmFsdWUpO1xuICAgIGcuYWRkRWRnZShudWxsLCB2LCB1LCB2YWx1ZSk7XG4gIH0pO1xuICByZXR1cm4gZztcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyB1bmRpcmVjdGVkIGdyYXBoIHVzaW5nIHRoZSBub2RlcyBhbmQgZWRnZXMgZnJvbSB0aGlzIGdyYXBoLlxuICogVGhlIG5ldyBncmFwaCB3aWxsIGhhdmUgdGhlIHNhbWUgbm9kZXMsIGJ1dCB0aGUgZWRnZXMgd2lsbCBiZSBtYWRlXG4gKiB1bmRpcmVjdGVkLiBFZGdlIGlkcyBhcmUgcHJlc2VydmVkIGluIHRoaXMgdHJhbnNmb3JtYXRpb24uXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLnRvR3JhcGggPVxuRGlncmFwaC5wcm90b3R5cGUuYXNVbmRpcmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gIHZhciBnID0gbmV3IEdyYXBoKCk7XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgZy5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gIHRoaXMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBnLmFkZEVkZ2UoZSwgdSwgdiwgdmFsdWUpO1xuICB9KTtcbiAgcmV0dXJuIGc7XG59O1xuIiwiLy8gUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgdmFsdWVzIGZvciBwcm9wZXJ0aWVzIG9mICoqbyoqLlxuZXhwb3J0cy52YWx1ZXMgPSBmdW5jdGlvbihvKSB7XG4gIHZhciBrcyA9IE9iamVjdC5rZXlzKG8pLFxuICAgICAgbGVuID0ga3MubGVuZ3RoLFxuICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbiksXG4gICAgICBpO1xuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICByZXN1bHRbaV0gPSBvW2tzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gJzAuNy40JztcbiIsInZhciBwYXJzZSA9IHJlcXVpcmUoXCIuL2xpYi9wYXJzZVwiKSxcbiAgICB3cml0ZSA9IHJlcXVpcmUoXCIuL2xpYi93cml0ZVwiKSxcbiAgICB2ZXJzaW9uID0gcmVxdWlyZShcIi4vbGliL3ZlcnNpb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvLyBET1QgZ3JhcGhzXG4gIERvdEdyYXBoOiByZXF1aXJlKFwiLi9saWIvRG90R3JhcGhcIiksXG4gIERvdERpZ3JhcGg6IHJlcXVpcmUoXCIuL2xpYi9Eb3REaWdyYXBoXCIpLFxuXG4gIC8vIFBhcnNpbmdcbiAgcGFyc2U6IHBhcnNlLFxuICBkZWNvZGU6IHBhcnNlLFxuICBwYXJzZU1hbnk6IHBhcnNlLnBhcnNlTWFueSxcblxuICAvLyBXcml0aW5nXG4gIHdyaXRlOiB3cml0ZSxcbiAgZW5jb2RlOiB3cml0ZSxcblxuICAvLyBWZXJzaW9uXG4gIHZlcnNpb246IHZlcnNpb24sXG5cbiAgLy8gRm9yIGxldmVsdXAgZW5jb2RpbmdcbiAgdHlwZTogXCJkb3RcIixcbiAgYnVmZmVyOiBmYWxzZVxufTtcbiIsInZhciBDRGlncmFwaCA9IHJlcXVpcmUoXCJncmFwaGxpYlwiKS5DRGlncmFwaCxcbiAgICBkb3RpZnkgPSByZXF1aXJlKFwiLi9kb3RpZnlcIik7XG5cbnZhciBEb3REaWdyYXBoID0gZG90aWZ5KENEaWdyYXBoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb3REaWdyYXBoO1xuXG5Eb3REaWdyYXBoLmZyb21EaWdyYXBoID0gZnVuY3Rpb24oc3JjKSB7XG4gIHZhciBnID0gbmV3IERvdERpZ3JhcGgoKSxcbiAgICAgIGdyYXBoVmFsdWUgPSBzcmMuZ3JhcGgoKTtcblxuICBpZiAoZ3JhcGhWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZy5ncmFwaChncmFwaFZhbHVlKTtcbiAgfVxuXG4gIHNyYy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBnLmFkZE5vZGUodSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGcuYWRkTm9kZSh1LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgc3JjLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHYsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZztcbn07XG4iLCJ2YXIgQ0dyYXBoID0gcmVxdWlyZShcImdyYXBobGliXCIpLkNHcmFwaCxcbiAgICBkb3RpZnkgPSByZXF1aXJlKFwiLi9kb3RpZnlcIik7XG5cbnZhciBEb3RHcmFwaCA9IGRvdGlmeShDR3JhcGgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvdEdyYXBoO1xuXG5Eb3RHcmFwaC5mcm9tR3JhcGggPSBmdW5jdGlvbihzcmMpIHtcbiAgdmFyIGcgPSBuZXcgRG90R3JhcGgoKSxcbiAgICAgIGdyYXBoVmFsdWUgPSBzcmMuZ3JhcGgoKTtcblxuICBpZiAoZ3JhcGhWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZy5ncmFwaChncmFwaFZhbHVlKTtcbiAgfVxuXG4gIHNyYy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBnLmFkZE5vZGUodSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGcuYWRkTm9kZSh1LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgc3JjLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHYsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZztcbn07XG4iLCIvLyBBIHNpbXBsZSBjbGFzcyBmb3IgcHJldHR5IHByaW50aW5nIHN0cmluZ3Mgd2l0aCBpbmRlbnRhdGlvblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyaXRlcjtcblxudmFyIElOREVOVCA9IFwiICAgIFwiO1xuXG5mdW5jdGlvbiBXcml0ZXIoKSB7XG4gIHRoaXMuX2luZGVudCA9IFwiXCI7XG4gIHRoaXMuX2NvbnRlbnQgPSBcIlwiO1xuICB0aGlzLl9zaG91bGRJbmRlbnQgPSB0cnVlO1xufVxuXG5Xcml0ZXIucHJvdG90eXBlLmluZGVudCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9pbmRlbnQgKz0gSU5ERU5UO1xufTtcblxuV3JpdGVyLnByb3RvdHlwZS51bmluZGVudCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9pbmRlbnQgPSB0aGlzLl9pbmRlbnQuc2xpY2UoSU5ERU5ULmxlbmd0aCk7XG59O1xuXG5Xcml0ZXIucHJvdG90eXBlLndyaXRlTGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgdGhpcy53cml0ZSgobGluZSB8fCBcIlwiKSArIFwiXFxuXCIpO1xuICB0aGlzLl9zaG91bGRJbmRlbnQgPSB0cnVlO1xufTtcblxuV3JpdGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKHN0cikge1xuICBpZiAodGhpcy5fc2hvdWxkSW5kZW50KSB7XG4gICAgdGhpcy5fc2hvdWxkSW5kZW50ID0gZmFsc2U7XG4gICAgdGhpcy5fY29udGVudCArPSB0aGlzLl9pbmRlbnQ7XG4gIH1cbiAgdGhpcy5fY29udGVudCArPSBzdHI7XG59O1xuXG5Xcml0ZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9jb250ZW50O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XG4gIC8qXG4gICAqIEdlbmVyYXRlZCBieSBQRUcuanMgMC43LjAuXG4gICAqXG4gICAqIGh0dHA6Ly9wZWdqcy5tYWpkYS5jei9cbiAgICovXG4gIFxuICBmdW5jdGlvbiBxdW90ZShzKSB7XG4gICAgLypcbiAgICAgKiBFQ01BLTI2MiwgNXRoIGVkLiwgNy44LjQ6IEFsbCBjaGFyYWN0ZXJzIG1heSBhcHBlYXIgbGl0ZXJhbGx5IGluIGFcbiAgICAgKiBzdHJpbmcgbGl0ZXJhbCBleGNlcHQgZm9yIHRoZSBjbG9zaW5nIHF1b3RlIGNoYXJhY3RlciwgYmFja3NsYXNoLFxuICAgICAqIGNhcnJpYWdlIHJldHVybiwgbGluZSBzZXBhcmF0b3IsIHBhcmFncmFwaCBzZXBhcmF0b3IsIGFuZCBsaW5lIGZlZWQuXG4gICAgICogQW55IGNoYXJhY3RlciBtYXkgYXBwZWFyIGluIHRoZSBmb3JtIG9mIGFuIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgKlxuICAgICAqIEZvciBwb3J0YWJpbGl0eSwgd2UgYWxzbyBlc2NhcGUgZXNjYXBlIGFsbCBjb250cm9sIGFuZCBub24tQVNDSUlcbiAgICAgKiBjaGFyYWN0ZXJzLiBOb3RlIHRoYXQgXCJcXDBcIiBhbmQgXCJcXHZcIiBlc2NhcGUgc2VxdWVuY2VzIGFyZSBub3QgdXNlZFxuICAgICAqIGJlY2F1c2UgSlNIaW50IGRvZXMgbm90IGxpa2UgdGhlIGZpcnN0IGFuZCBJRSB0aGUgc2Vjb25kLlxuICAgICAqL1xuICAgICByZXR1cm4gJ1wiJyArIHNcbiAgICAgIC5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpICAvLyBiYWNrc2xhc2hcbiAgICAgIC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgICAgLy8gY2xvc2luZyBxdW90ZSBjaGFyYWN0ZXJcbiAgICAgIC5yZXBsYWNlKC9cXHgwOC9nLCAnXFxcXGInKSAvLyBiYWNrc3BhY2VcbiAgICAgIC5yZXBsYWNlKC9cXHQvZywgJ1xcXFx0JykgICAvLyBob3Jpem9udGFsIHRhYlxuICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKSAgIC8vIGxpbmUgZmVlZFxuICAgICAgLnJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKSAgIC8vIGZvcm0gZmVlZFxuICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKSAgIC8vIGNhcnJpYWdlIHJldHVyblxuICAgICAgLnJlcGxhY2UoL1tcXHgwMC1cXHgwN1xceDBCXFx4MEUtXFx4MUZcXHg4MC1cXHVGRkZGXS9nLCBlc2NhcGUpXG4gICAgICArICdcIic7XG4gIH1cbiAgXG4gIHZhciByZXN1bHQgPSB7XG4gICAgLypcbiAgICAgKiBQYXJzZXMgdGhlIGlucHV0IHdpdGggYSBnZW5lcmF0ZWQgcGFyc2VyLiBJZiB0aGUgcGFyc2luZyBpcyBzdWNjZXNzZnVsbCxcbiAgICAgKiByZXR1cm5zIGEgdmFsdWUgZXhwbGljaXRseSBvciBpbXBsaWNpdGx5IHNwZWNpZmllZCBieSB0aGUgZ3JhbW1hciBmcm9tXG4gICAgICogd2hpY2ggdGhlIHBhcnNlciB3YXMgZ2VuZXJhdGVkIChzZWUgfFBFRy5idWlsZFBhcnNlcnwpLiBJZiB0aGUgcGFyc2luZyBpc1xuICAgICAqIHVuc3VjY2Vzc2Z1bCwgdGhyb3dzIHxQRUcucGFyc2VyLlN5bnRheEVycm9yfCBkZXNjcmliaW5nIHRoZSBlcnJvci5cbiAgICAgKi9cbiAgICBwYXJzZTogZnVuY3Rpb24oaW5wdXQsIHN0YXJ0UnVsZSkge1xuICAgICAgdmFyIHBhcnNlRnVuY3Rpb25zID0ge1xuICAgICAgICBcInN0YXJ0XCI6IHBhcnNlX3N0YXJ0LFxuICAgICAgICBcImdyYXBoU3RtdFwiOiBwYXJzZV9ncmFwaFN0bXQsXG4gICAgICAgIFwic3RtdExpc3RcIjogcGFyc2Vfc3RtdExpc3QsXG4gICAgICAgIFwic3RtdFwiOiBwYXJzZV9zdG10LFxuICAgICAgICBcImF0dHJTdG10XCI6IHBhcnNlX2F0dHJTdG10LFxuICAgICAgICBcImlubGluZUF0dHJTdG10XCI6IHBhcnNlX2lubGluZUF0dHJTdG10LFxuICAgICAgICBcIm5vZGVTdG10XCI6IHBhcnNlX25vZGVTdG10LFxuICAgICAgICBcImVkZ2VTdG10XCI6IHBhcnNlX2VkZ2VTdG10LFxuICAgICAgICBcInN1YmdyYXBoU3RtdFwiOiBwYXJzZV9zdWJncmFwaFN0bXQsXG4gICAgICAgIFwiYXR0ckxpc3RcIjogcGFyc2VfYXR0ckxpc3QsXG4gICAgICAgIFwiYXR0ckxpc3RCbG9ja1wiOiBwYXJzZV9hdHRyTGlzdEJsb2NrLFxuICAgICAgICBcImFMaXN0XCI6IHBhcnNlX2FMaXN0LFxuICAgICAgICBcImVkZ2VSSFNcIjogcGFyc2VfZWRnZVJIUyxcbiAgICAgICAgXCJpZERlZlwiOiBwYXJzZV9pZERlZixcbiAgICAgICAgXCJub2RlSWRPclN1YmdyYXBoXCI6IHBhcnNlX25vZGVJZE9yU3ViZ3JhcGgsXG4gICAgICAgIFwibm9kZUlkXCI6IHBhcnNlX25vZGVJZCxcbiAgICAgICAgXCJwb3J0XCI6IHBhcnNlX3BvcnQsXG4gICAgICAgIFwiY29tcGFzc1B0XCI6IHBhcnNlX2NvbXBhc3NQdCxcbiAgICAgICAgXCJpZFwiOiBwYXJzZV9pZCxcbiAgICAgICAgXCJub2RlXCI6IHBhcnNlX25vZGUsXG4gICAgICAgIFwiZWRnZVwiOiBwYXJzZV9lZGdlLFxuICAgICAgICBcImdyYXBoXCI6IHBhcnNlX2dyYXBoLFxuICAgICAgICBcImRpZ3JhcGhcIjogcGFyc2VfZGlncmFwaCxcbiAgICAgICAgXCJzdWJncmFwaFwiOiBwYXJzZV9zdWJncmFwaCxcbiAgICAgICAgXCJzdHJpY3RcIjogcGFyc2Vfc3RyaWN0LFxuICAgICAgICBcImdyYXBoVHlwZVwiOiBwYXJzZV9ncmFwaFR5cGUsXG4gICAgICAgIFwid2hpdGVzcGFjZVwiOiBwYXJzZV93aGl0ZXNwYWNlLFxuICAgICAgICBcImNvbW1lbnRcIjogcGFyc2VfY29tbWVudCxcbiAgICAgICAgXCJfXCI6IHBhcnNlX19cbiAgICAgIH07XG4gICAgICBcbiAgICAgIGlmIChzdGFydFJ1bGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAocGFyc2VGdW5jdGlvbnNbc3RhcnRSdWxlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBydWxlIG5hbWU6IFwiICsgcXVvdGUoc3RhcnRSdWxlKSArIFwiLlwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnRSdWxlID0gXCJzdGFydFwiO1xuICAgICAgfVxuICAgICAgXG4gICAgICB2YXIgcG9zID0gMDtcbiAgICAgIHZhciByZXBvcnRGYWlsdXJlcyA9IDA7XG4gICAgICB2YXIgcmlnaHRtb3N0RmFpbHVyZXNQb3MgPSAwO1xuICAgICAgdmFyIHJpZ2h0bW9zdEZhaWx1cmVzRXhwZWN0ZWQgPSBbXTtcbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFkTGVmdChpbnB1dCwgcGFkZGluZywgbGVuZ3RoKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBpbnB1dDtcbiAgICAgICAgXG4gICAgICAgIHZhciBwYWRMZW5ndGggPSBsZW5ndGggLSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFkTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICByZXN1bHQgPSBwYWRkaW5nICsgcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBlc2NhcGUoY2gpIHtcbiAgICAgICAgdmFyIGNoYXJDb2RlID0gY2guY2hhckNvZGVBdCgwKTtcbiAgICAgICAgdmFyIGVzY2FwZUNoYXI7XG4gICAgICAgIHZhciBsZW5ndGg7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2hhckNvZGUgPD0gMHhGRikge1xuICAgICAgICAgIGVzY2FwZUNoYXIgPSAneCc7XG4gICAgICAgICAgbGVuZ3RoID0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlc2NhcGVDaGFyID0gJ3UnO1xuICAgICAgICAgIGxlbmd0aCA9IDQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiAnXFxcXCcgKyBlc2NhcGVDaGFyICsgcGFkTGVmdChjaGFyQ29kZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSwgJzAnLCBsZW5ndGgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBtYXRjaEZhaWxlZChmYWlsdXJlKSB7XG4gICAgICAgIGlmIChwb3MgPCByaWdodG1vc3RGYWlsdXJlc1Bvcykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHBvcyA+IHJpZ2h0bW9zdEZhaWx1cmVzUG9zKSB7XG4gICAgICAgICAgcmlnaHRtb3N0RmFpbHVyZXNQb3MgPSBwb3M7XG4gICAgICAgICAgcmlnaHRtb3N0RmFpbHVyZXNFeHBlY3RlZCA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByaWdodG1vc3RGYWlsdXJlc0V4cGVjdGVkLnB1c2goZmFpbHVyZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX3N0YXJ0KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MTtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdDEgPSBwYXJzZV9ncmFwaFN0bXQoKTtcbiAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gW107XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAucHVzaChyZXN1bHQxKTtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBwYXJzZV9ncmFwaFN0bXQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX2dyYXBoU3RtdCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQsIHJlc3VsdDUsIHJlc3VsdDYsIHJlc3VsdDcsIHJlc3VsdDgsIHJlc3VsdDksIHJlc3VsdDEwLCByZXN1bHQxMSwgcmVzdWx0MTI7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxLCBwb3MyO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IFtdO1xuICAgICAgICByZXN1bHQxID0gcGFyc2VfXygpO1xuICAgICAgICB3aGlsZSAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAucHVzaChyZXN1bHQxKTtcbiAgICAgICAgICByZXN1bHQxID0gcGFyc2VfXygpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICByZXN1bHQxID0gcGFyc2Vfc3RyaWN0KCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQxID0gW3Jlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0MSA9IHJlc3VsdDEgIT09IG51bGwgPyByZXN1bHQxIDogXCJcIjtcbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX2dyYXBoVHlwZSgpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IFtdO1xuICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDMucHVzaChyZXN1bHQ0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX2lkKCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHJlc3VsdDQgIT09IG51bGwgPyByZXN1bHQ0IDogXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NSA9IFtdO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NiA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ2ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDUucHVzaChyZXN1bHQ2KTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0NiA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ1ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDEyMykge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDYgPSBcIntcIjtcbiAgICAgICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ2ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIntcXFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0NiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDcgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ4ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ3LnB1c2gocmVzdWx0OCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ4ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0NyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OCA9IHBhcnNlX3N0bXRMaXN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ4ID0gcmVzdWx0OCAhPT0gbnVsbCA/IHJlc3VsdDggOiBcIlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDggIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQxMCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDEwICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OS5wdXNoKHJlc3VsdDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQxMCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0OSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDEyNSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MTAgPSBcIn1cIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQxMCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwifVxcXCJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQxMCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MTEgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDEyID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDEyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDExLnB1c2gocmVzdWx0MTIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQxMiA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQxMSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQsIHJlc3VsdDUsIHJlc3VsdDYsIHJlc3VsdDcsIHJlc3VsdDgsIHJlc3VsdDksIHJlc3VsdDEwLCByZXN1bHQxMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIHR5cGUsIGlkLCBzdG10cykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7dHlwZTogdHlwZSwgaWQ6IGlkLCBzdG10czogc3RtdHN9O1xuICAgICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzJdLCByZXN1bHQwWzRdLCByZXN1bHQwWzhdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX3N0bXRMaXN0KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NCwgcmVzdWx0NSwgcmVzdWx0NiwgcmVzdWx0NztcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2Vfc3RtdCgpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDEgPSBbXTtcbiAgICAgICAgICByZXN1bHQyID0gcGFyc2VfXygpO1xuICAgICAgICAgIHdoaWxlIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQxLnB1c2gocmVzdWx0Mik7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfXygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNTkpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiO1wiO1xuICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCI7XFxcIlwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0MiA9IHJlc3VsdDIgIT09IG51bGwgPyByZXN1bHQyIDogXCJcIjtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBbXTtcbiAgICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgICAgcmVzdWx0NCA9IFtdO1xuICAgICAgICAgICAgICByZXN1bHQ1ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0NSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDQucHVzaChyZXN1bHQ1KTtcbiAgICAgICAgICAgICAgICByZXN1bHQ1ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0NSA9IHBhcnNlX3N0bXQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0NSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NiA9IFtdO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NyA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ3ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDYucHVzaChyZXN1bHQ3KTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0NyA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ2ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDU5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0NyA9IFwiO1wiO1xuICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDcgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiO1xcXCJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDcgPSByZXN1bHQ3ICE9PSBudWxsID8gcmVzdWx0NyA6IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ3ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IFtyZXN1bHQ0LCByZXN1bHQ1LCByZXN1bHQ2LCByZXN1bHQ3XTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0My5wdXNoKHJlc3VsdDQpO1xuICAgICAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IFtdO1xuICAgICAgICAgICAgICAgIHJlc3VsdDUgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDQucHVzaChyZXN1bHQ1KTtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDUgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQ1ID0gcGFyc2Vfc3RtdCgpO1xuICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0NiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ3ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0NyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDYucHVzaChyZXN1bHQ3KTtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ3ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ2ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNTkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDcgPSBcIjtcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ3ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCI7XFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0NyA9IHJlc3VsdDcgIT09IG51bGwgPyByZXN1bHQ3IDogXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0NyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IFtyZXN1bHQ0LCByZXN1bHQ1LCByZXN1bHQ2LCByZXN1bHQ3XTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBmaXJzdCwgcmVzdCkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBbZmlyc3RdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChyZXN0W2ldWzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFszXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9zdG10KCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9hdHRyU3RtdCgpO1xuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9lZGdlU3RtdCgpO1xuICAgICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQwID0gcGFyc2Vfc3ViZ3JhcGhTdG10KCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gcGFyc2VfaW5saW5lQXR0clN0bXQoKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gcGFyc2Vfbm9kZVN0bXQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfYXR0clN0bXQoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9ncmFwaCgpO1xuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9ub2RlKCk7XG4gICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9lZGdlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfYXR0ckxpc3QoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIHR5cGUsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogXCJhdHRyXCIsIGF0dHJUeXBlOiB0eXBlLCBhdHRyczogYXR0cnMgfHwge319O1xuICAgICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzBdLCByZXN1bHQwWzJdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX2lubGluZUF0dHJTdG10KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NDtcbiAgICAgICAgdmFyIHBvczAsIHBvczE7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfaWQoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDYxKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBcIj1cIjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiPVxcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQzLnB1c2gocmVzdWx0NCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDQgPSBwYXJzZV9pZCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDRdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgaywgdikge1xuICAgICAgICAgICAgICAgIHZhciBhdHRycyA9IHt9O1xuICAgICAgICAgICAgICAgIGF0dHJzW2tdID0gdjtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBcImlubGluZUF0dHJcIiwgYXR0cnM6IGF0dHJzIH07XG4gICAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbNF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2Vfbm9kZVN0bXQoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9ub2RlSWQoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9hdHRyTGlzdCgpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHJlc3VsdDIgIT09IG51bGwgPyByZXN1bHQyIDogXCJcIjtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGlkLCBhdHRycykgeyByZXR1cm4ge3R5cGU6IFwibm9kZVwiLCBpZDogaWQsIGF0dHJzOiBhdHRycyB8fCB7fX07IH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbMl0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfZWRnZVN0bXQoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyLCByZXN1bHQzLCByZXN1bHQ0O1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9ub2RlSWRPclN1YmdyYXBoKCk7XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfZWRnZVJIUygpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IFtdO1xuICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDMucHVzaChyZXN1bHQ0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX2F0dHJMaXN0KCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHJlc3VsdDQgIT09IG51bGwgPyByZXN1bHQ0IDogXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyLCByZXN1bHQzLCByZXN1bHQ0XTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGxocywgcmhzLCBhdHRycykge1xuICAgICAgICAgICAgICAgIHZhciBlbGVtcyA9IFtsaHNdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmhzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1zLnB1c2gocmhzW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogXCJlZGdlXCIsIGVsZW1zOiBlbGVtcywgYXR0cnM6IGF0dHJzIHx8IHt9IH07XG4gICAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbMl0sIHJlc3VsdDBbNF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2Vfc3ViZ3JhcGhTdG10KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NCwgcmVzdWx0NTtcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczIsIHBvczM7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2Vfc3ViZ3JhcGgoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHBvczMgPSBwb3M7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfaWQoKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQzLnB1c2gocmVzdWx0NCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQyID0gcmVzdWx0MiAhPT0gbnVsbCA/IHJlc3VsdDIgOiBcIlwiO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0MCA9IHJlc3VsdDAgIT09IG51bGwgPyByZXN1bHQwIDogXCJcIjtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSAxMjMpIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBcIntcIjtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJ7XFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBbXTtcbiAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICB3aGlsZSAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyLnB1c2gocmVzdWx0Myk7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQzID0gcGFyc2Vfc3RtdExpc3QoKTtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHJlc3VsdDMgIT09IG51bGwgPyByZXN1bHQzIDogXCJcIjtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gW107XG4gICAgICAgICAgICAgICAgcmVzdWx0NSA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0NSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NC5wdXNoKHJlc3VsdDUpO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NSA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDEyNSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ1ID0gXCJ9XCI7XG4gICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0NSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIn1cXFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAocmVzdWx0NSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQsIHJlc3VsdDVdO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBpZCwgc3RtdHMpIHtcbiAgICAgICAgICAgICAgICBpZCA9IGlkWzJdIHx8IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IFwic3ViZ3JhcGhcIiwgaWQ6IGlkWzBdLCBzdG10czogc3RtdHMgfTtcbiAgICAgICAgICAgICAgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFszXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9hdHRyTGlzdCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDM7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxLCBwb3MyO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX2F0dHJMaXN0QmxvY2soKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICByZXN1bHQyID0gW107XG4gICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0Mi5wdXNoKHJlc3VsdDMpO1xuICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9hdHRyTGlzdEJsb2NrKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICByZXN1bHQyID0gW107XG4gICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0Mi5wdXNoKHJlc3VsdDMpO1xuICAgICAgICAgICAgICByZXN1bHQzID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX2F0dHJMaXN0QmxvY2soKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDNdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGZpcnN0LCByZXN0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGZpcnN0O1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByaWdodEJpYXNlZE1lcmdlKHJlc3VsdCwgcmVzdFtpXVsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDBbMF0sIHJlc3VsdDBbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfYXR0ckxpc3RCbG9jaygpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQ7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gOTEpIHtcbiAgICAgICAgICByZXN1bHQwID0gXCJbXCI7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJbXFxcIlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9hTGlzdCgpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHJlc3VsdDIgIT09IG51bGwgPyByZXN1bHQyIDogXCJcIjtcbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQzLnB1c2gocmVzdWx0NCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDkzKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gXCJdXCI7XG4gICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXVxcXCJcIik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDRdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgYUxpc3QpIHsgcmV0dXJuIGFMaXN0OyB9KShwb3MwLCByZXN1bHQwWzJdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX2FMaXN0KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NCwgcmVzdWx0NTtcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfaWREZWYoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICByZXN1bHQyID0gW107XG4gICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0Mi5wdXNoKHJlc3VsdDMpO1xuICAgICAgICAgICAgcmVzdWx0MyA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBcIixcIjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQzID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLFxcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdDMgPSByZXN1bHQzICE9PSBudWxsID8gcmVzdWx0MyA6IFwiXCI7XG4gICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQ0ID0gW107XG4gICAgICAgICAgICAgIHJlc3VsdDUgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ1ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0NC5wdXNoKHJlc3VsdDUpO1xuICAgICAgICAgICAgICAgIHJlc3VsdDUgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ1ID0gcGFyc2VfaWREZWYoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0NSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzLCByZXN1bHQ0LCByZXN1bHQ1XTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgIHJlc3VsdDIgPSBbXTtcbiAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICB3aGlsZSAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQyLnB1c2gocmVzdWx0Myk7XG4gICAgICAgICAgICAgIHJlc3VsdDMgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSA0NCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBcIixcIjtcbiAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQzID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIixcXFwiXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQzID0gcmVzdWx0MyAhPT0gbnVsbCA/IHJlc3VsdDMgOiBcIlwiO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDQgPSBbXTtcbiAgICAgICAgICAgICAgICByZXN1bHQ1ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ1ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQ0LnB1c2gocmVzdWx0NSk7XG4gICAgICAgICAgICAgICAgICByZXN1bHQ1ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NSA9IHBhcnNlX2lkRGVmKCk7XG4gICAgICAgICAgICAgICAgICBpZiAocmVzdWx0NSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gW3Jlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQsIHJlc3VsdDVdO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDFdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgZmlyc3QsIHJlc3QpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJpZ2h0Qmlhc2VkTWVyZ2UocmVzdWx0LCByZXN0W2ldWzNdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9lZGdlUkhTKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NDtcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiLS1cIikge1xuICAgICAgICAgIHJlc3VsdDAgPSBcIi0tXCI7XG4gICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCItLVxcXCJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IChmdW5jdGlvbihvZmZzZXQpIHsgcmV0dXJuIGRpcmVjdGVkOyB9KShwb3MpID8gbnVsbCA6IFwiXCI7XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIi0+XCIpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBcIi0+XCI7XG4gICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLT5cXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MSA9IChmdW5jdGlvbihvZmZzZXQpIHsgcmV0dXJuIGRpcmVjdGVkOyB9KShwb3MpID8gXCJcIiA6IG51bGw7XG4gICAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9ub2RlSWRPclN1YmdyYXBoKCk7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQzID0gW107XG4gICAgICAgICAgICAgIHJlc3VsdDQgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0My5wdXNoKHJlc3VsdDQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdDQgPSBwYXJzZV9fKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfZWRnZVJIUygpO1xuICAgICAgICAgICAgICAgIHJlc3VsdDQgPSByZXN1bHQ0ICE9PSBudWxsID8gcmVzdWx0NCA6IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCByaHMsIHJlc3QpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gW3Joc107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHJlc3RbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzJdLCByZXN1bHQwWzRdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX2lkRGVmKCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NDtcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICByZXN1bHQwID0gcGFyc2VfaWQoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICBwb3MyID0gcG9zO1xuICAgICAgICAgIHJlc3VsdDEgPSBbXTtcbiAgICAgICAgICByZXN1bHQyID0gcGFyc2VfXygpO1xuICAgICAgICAgIHdoaWxlIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQxLnB1c2gocmVzdWx0Mik7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfXygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNjEpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiPVwiO1xuICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCI9XFxcIlwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IFtdO1xuICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDMucHVzaChyZXN1bHQ0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0NCA9IHBhcnNlX2lkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDEgPSBbcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDEgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0MSA9IHJlc3VsdDEgIT09IG51bGwgPyByZXN1bHQxIDogXCJcIjtcbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGssIHYpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tdID0gdlszXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICB9KShwb3MwLCByZXN1bHQwWzBdLCByZXN1bHQwWzFdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX25vZGVJZE9yU3ViZ3JhcGgoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICB2YXIgcG9zMDtcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9zdWJncmFwaFN0bXQoKTtcbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9ub2RlSWQoKTtcbiAgICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGlkKSB7IHJldHVybiB7IHR5cGU6IFwibm9kZVwiLCBpZDogaWQsIGF0dHJzOiB7fSB9OyB9KShwb3MwLCByZXN1bHQwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9ub2RlSWQoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyO1xuICAgICAgICB2YXIgcG9zMCwgcG9zMTtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIHBvczEgPSBwb3M7XG4gICAgICAgIHJlc3VsdDAgPSBwYXJzZV9pZCgpO1xuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDEgPSBbXTtcbiAgICAgICAgICByZXN1bHQyID0gcGFyc2VfXygpO1xuICAgICAgICAgIHdoaWxlIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQxLnB1c2gocmVzdWx0Mik7XG4gICAgICAgICAgICByZXN1bHQyID0gcGFyc2VfXygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX3BvcnQoKTtcbiAgICAgICAgICAgIHJlc3VsdDIgPSByZXN1bHQyICE9PSBudWxsID8gcmVzdWx0MiA6IFwiXCI7XG4gICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBpZCkgeyByZXR1cm4gaWQ7IH0pKHBvczAsIHJlc3VsdDBbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfcG9ydCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQsIHJlc3VsdDUsIHJlc3VsdDY7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNTgpIHtcbiAgICAgICAgICByZXN1bHQwID0gXCI6XCI7XG4gICAgICAgICAgcG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCI6XFxcIlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgcmVzdWx0MiA9IHBhcnNlX18oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBwYXJzZV9pZCgpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MyA9IFtdO1xuICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDMucHVzaChyZXN1bHQ0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQ0ID0gcGFyc2VfXygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSA1OCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IFwiOlwiO1xuICAgICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIjpcXFwiXCIpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0NCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NSA9IFtdO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0NiA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ2ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDUucHVzaChyZXN1bHQ2KTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0NiA9IHBhcnNlX18oKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQ1ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDYgPSBwYXJzZV9jb21wYXNzUHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDYgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gW3Jlc3VsdDQsIHJlc3VsdDUsIHJlc3VsdDZdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdDQgPSByZXN1bHQ0ICE9PSBudWxsID8gcmVzdWx0NCA6IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdDQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MywgcmVzdWx0NF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfY29tcGFzc1B0KCkge1xuICAgICAgICB2YXIgcmVzdWx0MDtcbiAgICAgICAgXG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCAyKSA9PT0gXCJuZVwiKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IFwibmVcIjtcbiAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIm5lXFxcIlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwic2VcIikge1xuICAgICAgICAgICAgcmVzdWx0MCA9IFwic2VcIjtcbiAgICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJzZVxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwic3dcIikge1xuICAgICAgICAgICAgICByZXN1bHQwID0gXCJzd1wiO1xuICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJzd1xcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCAyKSA9PT0gXCJud1wiKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IFwibndcIjtcbiAgICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIm53XFxcIlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSAxMTApIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBcIm5cIjtcbiAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJuXFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDEwMSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gXCJlXCI7XG4gICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcImVcXFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSAxMTUpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gXCJzXCI7XG4gICAgICAgICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJzXFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSAxMTkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBcIndcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJ3XFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDk5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBcImNcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiY1xcXCJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDk1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IFwiX1wiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiX1xcXCJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9pZCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDIsIHJlc3VsdDMsIHJlc3VsdDQ7XG4gICAgICAgIHZhciBwb3MwLCBwb3MxLCBwb3MyLCBwb3MzO1xuICAgICAgICBcbiAgICAgICAgcmVwb3J0RmFpbHVyZXMrKztcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgaWYgKC9eW2EtekEtWlxcdTAyMDAtXFx1MDM3N19dLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgIHJlc3VsdDAgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiW2EtekEtWlxcXFx1MDIwMC1cXFxcdTAzNzdfXVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQxID0gW107XG4gICAgICAgICAgaWYgKC9eW2EtekEtWlxcdTAyMDAtXFx1MDM3N18wLTldLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgcmVzdWx0MiA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiW2EtekEtWlxcXFx1MDIwMC1cXFxcdTAzNzdfMC05XVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgIGlmICgvXlthLXpBLVpcXHUwMjAwLVxcdTAzNzdfMC05XS8udGVzdChpbnB1dC5jaGFyQXQocG9zKSkpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlthLXpBLVpcXFxcdTAyMDAtXFxcXHUwMzc3XzAtOV1cIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBmc3QsIHJlc3QpIHsgcmV0dXJuIGZzdCArIHJlc3Quam9pbihcIlwiKTsgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgICBwb3MxID0gcG9zO1xuICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDQ1KSB7XG4gICAgICAgICAgICByZXN1bHQwID0gXCItXCI7XG4gICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLVxcXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdDAgPSByZXN1bHQwICE9PSBudWxsID8gcmVzdWx0MCA6IFwiXCI7XG4gICAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDQ2KSB7XG4gICAgICAgICAgICAgIHJlc3VsdDEgPSBcIi5cIjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLlxcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHQxICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmICgvXlswLTldLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQzID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiWzAtOV1cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IFtdO1xuICAgICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQyLnB1c2gocmVzdWx0Myk7XG4gICAgICAgICAgICAgICAgICBpZiAoL15bMC05XS8udGVzdChpbnB1dC5jaGFyQXQocG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MyA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlswLTldXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIHNpZ24sIGRvdCwgYWZ0ZXIpIHsgcmV0dXJuIHNpZ24gKyBkb3QgKyBhZnRlci5qb2luKFwiXCIpOyB9KShwb3MwLCByZXN1bHQwWzBdLCByZXN1bHQwWzFdLCByZXN1bHQwWzJdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDQ1KSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBcIi1cIjtcbiAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLVxcXCJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdDAgPSByZXN1bHQwICE9PSBudWxsID8gcmVzdWx0MCA6IFwiXCI7XG4gICAgICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBpZiAoL15bMC05XS8udGVzdChpbnB1dC5jaGFyQXQocG9zKSkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlswLTldXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDEgPSBbXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgICAgICAgaWYgKC9eWzAtOV0vLnRlc3QoaW5wdXQuY2hhckF0KHBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJbMC05XVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gNDYpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBcIi5cIjtcbiAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIuXFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBbXTtcbiAgICAgICAgICAgICAgICAgIGlmICgvXlswLTldLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ0ID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiWzAtOV1cIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHdoaWxlIChyZXN1bHQ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDMucHVzaChyZXN1bHQ0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKC9eWzAtOV0vLnRlc3QoaW5wdXQuY2hhckF0KHBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0NCA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJbMC05XVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQyID0gcmVzdWx0MiAhPT0gbnVsbCA/IHJlc3VsdDIgOiBcIlwiO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gW3Jlc3VsdDAsIHJlc3VsdDEsIHJlc3VsdDJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIHNpZ24sIGJlZm9yZSwgYWZ0ZXIpIHsgcmV0dXJuIHNpZ24gKyBiZWZvcmUuam9pbihcIlwiKSArIChhZnRlclswXSB8fCBcIlwiKSArIChhZnRlclsxXSB8fCBbXSkuam9pbihcIlwiKTsgfSkocG9zMCwgcmVzdWx0MFswXSwgcmVzdWx0MFsxXSwgcmVzdWx0MFsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gMzQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gXCJcXFwiXCI7XG4gICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJcXFxcXFxcIlxcXCJcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIlxcXFxcXFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBcIlxcXFxcXFwiXCI7XG4gICAgICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXFxcXFxcXFxcXFxcXFxcIlxcXCJcIik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQyID0gKGZ1bmN0aW9uKG9mZnNldCkgeyByZXR1cm4gJ1wiJzsgfSkocG9zMik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgICAgICAgIHBvczMgPSBwb3M7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwb3MpID09PSA5Mikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gXCJcXFxcXCI7XG4gICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIlxcXFxcXFxcXFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKC9eW15cIl0vLnRlc3QoaW5wdXQuY2hhckF0KHBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MyA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJbXlxcXCJdXCIpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHBvcyA9IHBvczM7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gKGZ1bmN0aW9uKG9mZnNldCwgY2gpIHsgcmV0dXJuIFwiXFxcXFwiICsgY2g7IH0pKHBvczIsIHJlc3VsdDJbMV0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDIgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgvXlteXCJdLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiW15cXFwiXVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd2hpbGUgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiXFxcXFxcXCJcIikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gXCJcXFxcXFxcIlwiO1xuICAgICAgICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJcXFxcXFxcXFxcXFxcXFwiXFxcIlwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IChmdW5jdGlvbihvZmZzZXQpIHsgcmV0dXJuICdcIic7IH0pKHBvczIpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDIgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICAgICAgICAgIHBvczMgPSBwb3M7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBvcykgPT09IDkyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiXFxcXFwiO1xuICAgICAgICAgICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiXFxcXFxcXFxcXFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICgvXlteXCJdLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MyA9IGlucHV0LmNoYXJBdChwb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiW15cXFwiXVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBbcmVzdWx0MiwgcmVzdWx0M107XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSAoZnVuY3Rpb24ob2Zmc2V0LCBjaCkgeyByZXR1cm4gXCJcXFxcXCIgKyBjaDsgfSkocG9zMiwgcmVzdWx0MlsxXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdDIgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBwb3MyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKC9eW15cIl0vLnRlc3QoaW5wdXQuY2hhckF0KHBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQyID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJbXlxcXCJdXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocG9zKSA9PT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiXFxcIlwiO1xuICAgICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJcXFxcXFxcIlxcXCJcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0Ml07XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGlkKSB7IHJldHVybiBpZC5qb2luKFwiXCIpOyB9KShwb3MwLCByZXN1bHQwWzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVwb3J0RmFpbHVyZXMtLTtcbiAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwICYmIHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaEZhaWxlZChcImlkZW50aWZpZXJcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX25vZGUoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICB2YXIgcG9zMDtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCA0KS50b0xvd2VyQ2FzZSgpID09PSBcIm5vZGVcIikge1xuICAgICAgICAgIHJlc3VsdDAgPSBpbnB1dC5zdWJzdHIocG9zLCA0KTtcbiAgICAgICAgICBwb3MgKz0gNDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcIm5vZGVcXFwiXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBrKSB7IHJldHVybiBrLnRvTG93ZXJDYXNlKCk7IH0pKHBvczAsIHJlc3VsdDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfZWRnZSgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDA7XG4gICAgICAgIHZhciBwb3MwO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDQpLnRvTG93ZXJDYXNlKCkgPT09IFwiZWRnZVwiKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IGlucHV0LnN1YnN0cihwb3MsIDQpO1xuICAgICAgICAgIHBvcyArPSA0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiZWRnZVxcXCJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGspIHsgcmV0dXJuIGsudG9Mb3dlckNhc2UoKTsgfSkocG9zMCwgcmVzdWx0MCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9ncmFwaCgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDA7XG4gICAgICAgIHZhciBwb3MwO1xuICAgICAgICBcbiAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDUpLnRvTG93ZXJDYXNlKCkgPT09IFwiZ3JhcGhcIikge1xuICAgICAgICAgIHJlc3VsdDAgPSBpbnB1dC5zdWJzdHIocG9zLCA1KTtcbiAgICAgICAgICBwb3MgKz0gNTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcImdyYXBoXFxcIlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgaykgeyByZXR1cm4gay50b0xvd2VyQ2FzZSgpOyB9KShwb3MwLCByZXN1bHQwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX2RpZ3JhcGgoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICB2YXIgcG9zMDtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCA3KS50b0xvd2VyQ2FzZSgpID09PSBcImRpZ3JhcGhcIikge1xuICAgICAgICAgIHJlc3VsdDAgPSBpbnB1dC5zdWJzdHIocG9zLCA3KTtcbiAgICAgICAgICBwb3MgKz0gNztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiXFxcImRpZ3JhcGhcXFwiXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSAoZnVuY3Rpb24ob2Zmc2V0LCBrKSB7IHJldHVybiBrLnRvTG93ZXJDYXNlKCk7IH0pKHBvczAsIHJlc3VsdDApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2Vfc3ViZ3JhcGgoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICB2YXIgcG9zMDtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCA4KS50b0xvd2VyQ2FzZSgpID09PSBcInN1YmdyYXBoXCIpIHtcbiAgICAgICAgICByZXN1bHQwID0gaW5wdXQuc3Vic3RyKHBvcywgOCk7XG4gICAgICAgICAgcG9zICs9IDg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCJzdWJncmFwaFxcXCJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IChmdW5jdGlvbihvZmZzZXQsIGspIHsgcmV0dXJuIGsudG9Mb3dlckNhc2UoKTsgfSkocG9zMCwgcmVzdWx0MCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgPT09IG51bGwpIHtcbiAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9zdHJpY3QoKSB7XG4gICAgICAgIHZhciByZXN1bHQwO1xuICAgICAgICB2YXIgcG9zMDtcbiAgICAgICAgXG4gICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocG9zLCA2KS50b0xvd2VyQ2FzZSgpID09PSBcInN0cmljdFwiKSB7XG4gICAgICAgICAgcmVzdWx0MCA9IGlucHV0LnN1YnN0cihwb3MsIDYpO1xuICAgICAgICAgIHBvcyArPSA2O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwic3RyaWN0XFxcIlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdDAgIT09IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgaykgeyByZXR1cm4gay50b0xvd2VyQ2FzZSgpOyB9KShwb3MwLCByZXN1bHQwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvcyA9IHBvczA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX2dyYXBoVHlwZSgpIHtcbiAgICAgICAgdmFyIHJlc3VsdDA7XG4gICAgICAgIHZhciBwb3MwO1xuICAgICAgICBcbiAgICAgICAgcmVzdWx0MCA9IHBhcnNlX2dyYXBoKCk7XG4gICAgICAgIGlmIChyZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgcG9zMCA9IHBvcztcbiAgICAgICAgICByZXN1bHQwID0gcGFyc2VfZGlncmFwaCgpO1xuICAgICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQwID0gKGZ1bmN0aW9uKG9mZnNldCwgZ3JhcGgpIHtcbiAgICAgICAgICAgICAgICAgIGRpcmVjdGVkID0gZ3JhcGggPT09IFwiZGlncmFwaFwiO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGdyYXBoO1xuICAgICAgICAgICAgICAgIH0pKHBvczAsIHJlc3VsdDApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHBhcnNlX3doaXRlc3BhY2UoKSB7XG4gICAgICAgIHZhciByZXN1bHQwLCByZXN1bHQxO1xuICAgICAgICBcbiAgICAgICAgcmVwb3J0RmFpbHVyZXMrKztcbiAgICAgICAgaWYgKC9eWyBcXHRcXHJcXG5dLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgIHJlc3VsdDEgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICBwb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQxID0gbnVsbDtcbiAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiWyBcXFxcdFxcXFxyXFxcXG5dXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSBbXTtcbiAgICAgICAgICB3aGlsZSAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MC5wdXNoKHJlc3VsdDEpO1xuICAgICAgICAgICAgaWYgKC9eWyBcXHRcXHJcXG5dLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgICByZXN1bHQxID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MSA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiWyBcXFxcdFxcXFxyXFxcXG5dXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJlcG9ydEZhaWx1cmVzLS07XG4gICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCAmJiByZXN1bHQwID09PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hGYWlsZWQoXCJ3aGl0ZXNwYWNlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQwO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBwYXJzZV9jb21tZW50KCkge1xuICAgICAgICB2YXIgcmVzdWx0MCwgcmVzdWx0MSwgcmVzdWx0MiwgcmVzdWx0MztcbiAgICAgICAgdmFyIHBvczAsIHBvczEsIHBvczI7XG4gICAgICAgIFxuICAgICAgICByZXBvcnRGYWlsdXJlcysrO1xuICAgICAgICBwb3MwID0gcG9zO1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiLy9cIikge1xuICAgICAgICAgIHJlc3VsdDAgPSBcIi8vXCI7XG4gICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIvL1xcXCJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQwICE9PSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgIGlmICgvXlteXFxuXS8udGVzdChpbnB1dC5jaGFyQXQocG9zKSkpIHtcbiAgICAgICAgICAgIHJlc3VsdDIgPSBpbnB1dC5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlteXFxcXG5dXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAocmVzdWx0MiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MS5wdXNoKHJlc3VsdDIpO1xuICAgICAgICAgICAgaWYgKC9eW15cXG5dLy50ZXN0KGlucHV0LmNoYXJBdChwb3MpKSkge1xuICAgICAgICAgICAgICByZXN1bHQyID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgIHBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG1hdGNoRmFpbGVkKFwiW15cXFxcbl1cIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJlc3VsdDEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBbcmVzdWx0MCwgcmVzdWx0MV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBudWxsO1xuICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHBvczAgPSBwb3M7XG4gICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIi8qXCIpIHtcbiAgICAgICAgICAgIHJlc3VsdDAgPSBcIi8qXCI7XG4gICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiLypcXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzdWx0MCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0MSA9IFtdO1xuICAgICAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgICAgIHBvczIgPSBwb3M7XG4gICAgICAgICAgICByZXBvcnRGYWlsdXJlcysrO1xuICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIiovXCIpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiKi9cIjtcbiAgICAgICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiKi9cXFwiXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXBvcnRGYWlsdXJlcy0tO1xuICAgICAgICAgICAgaWYgKHJlc3VsdDIgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmVzdWx0MiA9IFwiXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5sZW5ndGggPiBwb3MpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQzID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgICAgcG9zKys7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MyA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcImFueSBjaGFyYWN0ZXJcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJlc3VsdDEucHVzaChyZXN1bHQyKTtcbiAgICAgICAgICAgICAgcG9zMSA9IHBvcztcbiAgICAgICAgICAgICAgcG9zMiA9IHBvcztcbiAgICAgICAgICAgICAgcmVwb3J0RmFpbHVyZXMrKztcbiAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwb3MsIDIpID09PSBcIiovXCIpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gXCIqL1wiO1xuICAgICAgICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChyZXBvcnRGYWlsdXJlcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJcXFwiKi9cXFwiXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXBvcnRGYWlsdXJlcy0tO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0MiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBcIlwiO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBudWxsO1xuICAgICAgICAgICAgICAgIHBvcyA9IHBvczI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHJlc3VsdDIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQubGVuZ3RoID4gcG9zKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQzID0gaW5wdXQuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgICAgICBwb3MrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hGYWlsZWQoXCJhbnkgY2hhcmFjdGVyXCIpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0MyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IFtyZXN1bHQyLCByZXN1bHQzXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQyID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0MSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBvcywgMikgPT09IFwiKi9cIikge1xuICAgICAgICAgICAgICAgIHJlc3VsdDIgPSBcIiovXCI7XG4gICAgICAgICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MiA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKHJlcG9ydEZhaWx1cmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICBtYXRjaEZhaWxlZChcIlxcXCIqL1xcXCJcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0MCA9IFtyZXN1bHQwLCByZXN1bHQxLCByZXN1bHQyXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQwID0gbnVsbDtcbiAgICAgICAgICAgICAgcG9zID0gcG9zMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0MCA9IG51bGw7XG4gICAgICAgICAgICBwb3MgPSBwb3MwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXBvcnRGYWlsdXJlcy0tO1xuICAgICAgICBpZiAocmVwb3J0RmFpbHVyZXMgPT09IDAgJiYgcmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIG1hdGNoRmFpbGVkKFwiY29tbWVudFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0MDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gcGFyc2VfXygpIHtcbiAgICAgICAgdmFyIHJlc3VsdDA7XG4gICAgICAgIFxuICAgICAgICByZXN1bHQwID0gcGFyc2Vfd2hpdGVzcGFjZSgpO1xuICAgICAgICBpZiAocmVzdWx0MCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJlc3VsdDAgPSBwYXJzZV9jb21tZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIFxuICAgICAgZnVuY3Rpb24gY2xlYW51cEV4cGVjdGVkKGV4cGVjdGVkKSB7XG4gICAgICAgIGV4cGVjdGVkLnNvcnQoKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBsYXN0RXhwZWN0ZWQgPSBudWxsO1xuICAgICAgICB2YXIgY2xlYW5FeHBlY3RlZCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4cGVjdGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGV4cGVjdGVkW2ldICE9PSBsYXN0RXhwZWN0ZWQpIHtcbiAgICAgICAgICAgIGNsZWFuRXhwZWN0ZWQucHVzaChleHBlY3RlZFtpXSk7XG4gICAgICAgICAgICBsYXN0RXhwZWN0ZWQgPSBleHBlY3RlZFtpXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsZWFuRXhwZWN0ZWQ7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGNvbXB1dGVFcnJvclBvc2l0aW9uKCkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBUaGUgZmlyc3QgaWRlYSB3YXMgdG8gdXNlIHxTdHJpbmcuc3BsaXR8IHRvIGJyZWFrIHRoZSBpbnB1dCB1cCB0byB0aGVcbiAgICAgICAgICogZXJyb3IgcG9zaXRpb24gYWxvbmcgbmV3bGluZXMgYW5kIGRlcml2ZSB0aGUgbGluZSBhbmQgY29sdW1uIGZyb21cbiAgICAgICAgICogdGhlcmUuIEhvd2V2ZXIgSUUncyB8c3BsaXR8IGltcGxlbWVudGF0aW9uIGlzIHNvIGJyb2tlbiB0aGF0IGl0IHdhc1xuICAgICAgICAgKiBlbm91Z2ggdG8gcHJldmVudCBpdC5cbiAgICAgICAgICovXG4gICAgICAgIFxuICAgICAgICB2YXIgbGluZSA9IDE7XG4gICAgICAgIHZhciBjb2x1bW4gPSAxO1xuICAgICAgICB2YXIgc2VlbkNSID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IE1hdGgubWF4KHBvcywgcmlnaHRtb3N0RmFpbHVyZXNQb3MpOyBpKyspIHtcbiAgICAgICAgICB2YXIgY2ggPSBpbnB1dC5jaGFyQXQoaSk7XG4gICAgICAgICAgaWYgKGNoID09PSBcIlxcblwiKSB7XG4gICAgICAgICAgICBpZiAoIXNlZW5DUikgeyBsaW5lKys7IH1cbiAgICAgICAgICAgIGNvbHVtbiA9IDE7XG4gICAgICAgICAgICBzZWVuQ1IgPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSBcIlxcclwiIHx8IGNoID09PSBcIlxcdTIwMjhcIiB8fCBjaCA9PT0gXCJcXHUyMDI5XCIpIHtcbiAgICAgICAgICAgIGxpbmUrKztcbiAgICAgICAgICAgIGNvbHVtbiA9IDE7XG4gICAgICAgICAgICBzZWVuQ1IgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb2x1bW4rKztcbiAgICAgICAgICAgIHNlZW5DUiA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgbGluZTogbGluZSwgY29sdW1uOiBjb2x1bW4gfTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgXG4gICAgICAgICAgdmFyIGRpcmVjdGVkO1xuICAgICAgXG4gICAgICAgICAgZnVuY3Rpb24gcmlnaHRCaWFzZWRNZXJnZShsaHMsIHJocykge1xuICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgIGZvciAodmFyIGsgaW4gbGhzKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHRba10gPSBsaHNba107XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yICh2YXIgayBpbiByaHMpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdFtrXSA9IHJoc1trXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0OyAgICAgXG4gICAgICAgICAgfVxuICAgICAgXG4gICAgICBcbiAgICAgIHZhciByZXN1bHQgPSBwYXJzZUZ1bmN0aW9uc1tzdGFydFJ1bGVdKCk7XG4gICAgICBcbiAgICAgIC8qXG4gICAgICAgKiBUaGUgcGFyc2VyIGlzIG5vdyBpbiBvbmUgb2YgdGhlIGZvbGxvd2luZyB0aHJlZSBzdGF0ZXM6XG4gICAgICAgKlxuICAgICAgICogMS4gVGhlIHBhcnNlciBzdWNjZXNzZnVsbHkgcGFyc2VkIHRoZSB3aG9sZSBpbnB1dC5cbiAgICAgICAqXG4gICAgICAgKiAgICAtIHxyZXN1bHQgIT09IG51bGx8XG4gICAgICAgKiAgICAtIHxwb3MgPT09IGlucHV0Lmxlbmd0aHxcbiAgICAgICAqICAgIC0gfHJpZ2h0bW9zdEZhaWx1cmVzRXhwZWN0ZWR8IG1heSBvciBtYXkgbm90IGNvbnRhaW4gc29tZXRoaW5nXG4gICAgICAgKlxuICAgICAgICogMi4gVGhlIHBhcnNlciBzdWNjZXNzZnVsbHkgcGFyc2VkIG9ubHkgYSBwYXJ0IG9mIHRoZSBpbnB1dC5cbiAgICAgICAqXG4gICAgICAgKiAgICAtIHxyZXN1bHQgIT09IG51bGx8XG4gICAgICAgKiAgICAtIHxwb3MgPCBpbnB1dC5sZW5ndGh8XG4gICAgICAgKiAgICAtIHxyaWdodG1vc3RGYWlsdXJlc0V4cGVjdGVkfCBtYXkgb3IgbWF5IG5vdCBjb250YWluIHNvbWV0aGluZ1xuICAgICAgICpcbiAgICAgICAqIDMuIFRoZSBwYXJzZXIgZGlkIG5vdCBzdWNjZXNzZnVsbHkgcGFyc2UgYW55IHBhcnQgb2YgdGhlIGlucHV0LlxuICAgICAgICpcbiAgICAgICAqICAgLSB8cmVzdWx0ID09PSBudWxsfFxuICAgICAgICogICAtIHxwb3MgPT09IDB8XG4gICAgICAgKiAgIC0gfHJpZ2h0bW9zdEZhaWx1cmVzRXhwZWN0ZWR8IGNvbnRhaW5zIGF0IGxlYXN0IG9uZSBmYWlsdXJlXG4gICAgICAgKlxuICAgICAgICogQWxsIGNvZGUgZm9sbG93aW5nIHRoaXMgY29tbWVudCAoaW5jbHVkaW5nIGNhbGxlZCBmdW5jdGlvbnMpIG11c3RcbiAgICAgICAqIGhhbmRsZSB0aGVzZSBzdGF0ZXMuXG4gICAgICAgKi9cbiAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgcG9zICE9PSBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IE1hdGgubWF4KHBvcywgcmlnaHRtb3N0RmFpbHVyZXNQb3MpO1xuICAgICAgICB2YXIgZm91bmQgPSBvZmZzZXQgPCBpbnB1dC5sZW5ndGggPyBpbnB1dC5jaGFyQXQob2Zmc2V0KSA6IG51bGw7XG4gICAgICAgIHZhciBlcnJvclBvc2l0aW9uID0gY29tcHV0ZUVycm9yUG9zaXRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIHRocm93IG5ldyB0aGlzLlN5bnRheEVycm9yKFxuICAgICAgICAgIGNsZWFudXBFeHBlY3RlZChyaWdodG1vc3RGYWlsdXJlc0V4cGVjdGVkKSxcbiAgICAgICAgICBmb3VuZCxcbiAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgZXJyb3JQb3NpdGlvbi5saW5lLFxuICAgICAgICAgIGVycm9yUG9zaXRpb24uY29sdW1uXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKiBSZXR1cm5zIHRoZSBwYXJzZXIgc291cmNlIGNvZGUuICovXG4gICAgdG9Tb3VyY2U6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fc291cmNlOyB9XG4gIH07XG4gIFxuICAvKiBUaHJvd24gd2hlbiBhIHBhcnNlciBlbmNvdW50ZXJzIGEgc3ludGF4IGVycm9yLiAqL1xuICBcbiAgcmVzdWx0LlN5bnRheEVycm9yID0gZnVuY3Rpb24oZXhwZWN0ZWQsIGZvdW5kLCBvZmZzZXQsIGxpbmUsIGNvbHVtbikge1xuICAgIGZ1bmN0aW9uIGJ1aWxkTWVzc2FnZShleHBlY3RlZCwgZm91bmQpIHtcbiAgICAgIHZhciBleHBlY3RlZEh1bWFuaXplZCwgZm91bmRIdW1hbml6ZWQ7XG4gICAgICBcbiAgICAgIHN3aXRjaCAoZXhwZWN0ZWQubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICBleHBlY3RlZEh1bWFuaXplZCA9IFwiZW5kIG9mIGlucHV0XCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBleHBlY3RlZEh1bWFuaXplZCA9IGV4cGVjdGVkWzBdO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGV4cGVjdGVkSHVtYW5pemVkID0gZXhwZWN0ZWQuc2xpY2UoMCwgZXhwZWN0ZWQubGVuZ3RoIC0gMSkuam9pbihcIiwgXCIpXG4gICAgICAgICAgICArIFwiIG9yIFwiXG4gICAgICAgICAgICArIGV4cGVjdGVkW2V4cGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmb3VuZEh1bWFuaXplZCA9IGZvdW5kID8gcXVvdGUoZm91bmQpIDogXCJlbmQgb2YgaW5wdXRcIjtcbiAgICAgIFxuICAgICAgcmV0dXJuIFwiRXhwZWN0ZWQgXCIgKyBleHBlY3RlZEh1bWFuaXplZCArIFwiIGJ1dCBcIiArIGZvdW5kSHVtYW5pemVkICsgXCIgZm91bmQuXCI7XG4gICAgfVxuICAgIFxuICAgIHRoaXMubmFtZSA9IFwiU3ludGF4RXJyb3JcIjtcbiAgICB0aGlzLmV4cGVjdGVkID0gZXhwZWN0ZWQ7XG4gICAgdGhpcy5mb3VuZCA9IGZvdW5kO1xuICAgIHRoaXMubWVzc2FnZSA9IGJ1aWxkTWVzc2FnZShleHBlY3RlZCwgZm91bmQpO1xuICAgIHRoaXMub2Zmc2V0ID0gb2Zmc2V0O1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBjb2x1bW47XG4gIH07XG4gIFxuICByZXN1bHQuU3ludGF4RXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuICBcbiAgcmV0dXJuIHJlc3VsdDtcbn0pKCk7XG4iLCIvLyBUaGlzIGZpbGUgcHJvdmlkZXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBtaXhlcy1pbiBEb3QgYmVoYXZpb3IgdG8gYW5cbi8vIGV4aXN0aW5nIGdyYXBoIHByb3RvdHlwZS5cblxubW9kdWxlLmV4cG9ydHMgPSBkb3RpZnk7XG5cbi8vIEV4dGVuZHMgdGhlIGdpdmVuIFN1cGVyQ29uc3RydWN0b3Igd2l0aCBET1QgYmVoYXZpb3IgYW5kIHJldHVybnMgdGhlIG5ld1xuLy8gY29uc3RydWN0b3IuXG5mdW5jdGlvbiBkb3RpZnkoU3VwZXJDb25zdHJ1Y3Rvcikge1xuICBmdW5jdGlvbiBDb25zdHJ1Y3RvcigpIHtcbiAgICBTdXBlckNvbnN0cnVjdG9yLmNhbGwodGhpcyk7XG4gICAgdGhpcy5ncmFwaCh7fSk7XG4gIH1cblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgU3VwZXJDb25zdHJ1Y3RvcigpO1xuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ3JhcGggPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgICAgcmV0dXJuIFN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLmdyYXBoLmNhbGwodGhpcyk7XG4gICAgfVxuICAgIHRoaXMuX2NoZWNrVmFsdWVUeXBlKHZhbHVlKTtcbiAgICByZXR1cm4gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ3JhcGguY2FsbCh0aGlzLCB2YWx1ZSk7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLm5vZGUgPSBmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIFN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLm5vZGUuY2FsbCh0aGlzLCB1KTtcbiAgICB9XG4gICAgdGhpcy5fY2hlY2tWYWx1ZVR5cGUodmFsdWUpO1xuICAgIHJldHVybiBTdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZS5ub2RlLmNhbGwodGhpcywgdSwgdmFsdWUpO1xuICB9O1xuXG4gIENvbnN0cnVjdG9yLnByb3RvdHlwZS5hZGROb2RlID0gZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIHZhbHVlID0ge307XG4gICAgfVxuICAgIHRoaXMuX2NoZWNrVmFsdWVUeXBlKHZhbHVlKTtcbiAgICByZXR1cm4gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuYWRkTm9kZS5jYWxsKHRoaXMsIHUsIHZhbHVlKTtcbiAgfTtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZWRnZSA9IGZ1bmN0aW9uKGUsIHZhbHVlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZWRnZS5jYWxsKHRoaXMsIGUpO1xuICAgIH1cbiAgICB0aGlzLl9jaGVja1ZhbHVlVHlwZSh2YWx1ZSk7XG4gICAgcmV0dXJuIFN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLmVkZ2UuY2FsbCh0aGlzLCBlLCB2YWx1ZSk7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmFkZEVkZ2UgPSBmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgNCkge1xuICAgICAgdmFsdWUgPSB7fTtcbiAgICB9XG4gICAgdGhpcy5fY2hlY2tWYWx1ZVR5cGUodmFsdWUpO1xuICAgIHJldHVybiBTdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZS5hZGRFZGdlLmNhbGwodGhpcywgZSwgdSwgdiwgdmFsdWUpO1xuICB9O1xuXG4gIENvbnN0cnVjdG9yLnByb3RvdHlwZS5fY2hlY2tWYWx1ZVR5cGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbHVlIG11c3QgYmUgbm9uLW51bGwgYW5kIG9mIHR5cGUgJ29iamVjdCdcIik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBDb25zdHJ1Y3Rvcjtcbn1cbiIsInZhciBEb3REaWdyYXBoID0gcmVxdWlyZShcIi4vRG90RGlncmFwaFwiKSxcbiAgICBEb3RHcmFwaCA9IHJlcXVpcmUoXCIuL0RvdEdyYXBoXCIpO1xuXG52YXIgZG90X3BhcnNlciA9IHJlcXVpcmUoXCIuL2RvdC1ncmFtbWFyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlO1xubW9kdWxlLmV4cG9ydHMucGFyc2VNYW55ID0gcGFyc2VNYW55O1xuXG4vKlxuICogUGFyc2VzIGEgc2luZ2xlIERPVCBncmFwaCBmcm9tIHRoZSBnaXZlbiBzdHJpbmcgYW5kIHJldHVybnMgaXQgYXMgb25lIG9mOlxuICpcbiAqICogYERpZ3JhcGhgIGlmIHRoZSBpbnB1dCBncmFwaCBpcyBhIGBkaWdyYXBoYC5cbiAqICogYEdyYXBoYCBpZiB0aGUgaW5wdXQgZ3JhcGggaXMgYSBgZ3JhcGhgLlxuICpcbiAqIE5vdGU6IHRoaXMgaXMgZXhwb3J0ZWQgYXMgdGhlIG1vZHVsZSBleHBvcnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciB0aGUgRE9UIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBvbmUgb3IgbW9yZSBncmFwaHNcbiAqL1xuZnVuY3Rpb24gcGFyc2Uoc3RyKSB7XG4gIHZhciBwYXJzZVRyZWUgPSBkb3RfcGFyc2VyLnBhcnNlKHN0ciwgXCJncmFwaFN0bXRcIik7XG4gIHJldHVybiBidWlsZEdyYXBoKHBhcnNlVHJlZSk7XG59XG5cbi8qXG4gKiBQYXJzZXMgb25lIG9yIG1vcmUgRE9UIGdyYXBocyBpbiB0aGUgZ2l2ZW4gc3RyaW5nIGFuZCByZXR1cm5zIHRoZW0gdXNpbmdcbiAqIHRoZSBzYW1lIHJ1bGVzIGFzIGRlc2NyaWJlZCBpbiBbcGFyc2VdW10gZm9yIGluZGl2aWR1YWwgZ3JhcGhzLlxuICpcbiAqIFtwYXJzZV06IHBhcnNlLmpzLmh0bWwjcGFyc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIHRoZSBET1Qgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIG9uZSBvciBtb3JlIGdyYXBoc1xuICovXG5mdW5jdGlvbiBwYXJzZU1hbnkoc3RyKSB7XG4gIHZhciBwYXJzZVRyZWUgPSBkb3RfcGFyc2VyLnBhcnNlKHN0cik7XG5cbiAgcmV0dXJuIHBhcnNlVHJlZS5tYXAoZnVuY3Rpb24oc3VidHJlZSkge1xuICAgIHJldHVybiBidWlsZEdyYXBoKHN1YnRyZWUpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYnVpbGRHcmFwaChwYXJzZVRyZWUpIHtcbiAgdmFyIGcgPSBwYXJzZVRyZWUudHlwZSA9PT0gXCJncmFwaFwiID8gbmV3IERvdEdyYXBoKCkgOiBuZXcgRG90RGlncmFwaCgpO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5vZGUoaWQsIGF0dHJzLCBzZykge1xuICAgIGlmICghKGcuaGFzTm9kZShpZCkpKSB7XG4gICAgICAvLyBXZSBvbmx5IGFwcGx5IGRlZmF1bHQgYXR0cmlidXRlcyB0byBhIG5vZGUgd2hlbiBpdCBpcyBmaXJzdCBkZWZpbmVkLlxuICAgICAgLy8gSWYgdGhlIG5vZGUgaXMgc3Vic2VxdWVudGx5IHVzZWQgaW4gZWRnZXMsIHdlIHNraXAgYXBwbHkgZGVmYXVsdFxuICAgICAgLy8gYXR0cmlidXRlcy5cbiAgICAgIGcuYWRkTm9kZShpZCwgZGVmYXVsdEF0dHJzLmdldChcIm5vZGVcIiwge30pKTtcblxuICAgICAgLy8gVGhlIFwibGFiZWxcIiBhdHRyaWJ1dGUgaXMgZ2l2ZW4gc3BlY2lhbCB0cmVhdG1lbnQ6IGlmIGl0IGlzIG5vdFxuICAgICAgLy8gZGVmaW5lZCB3ZSBzZXQgaXQgdG8gdGhlIGlkIG9mIHRoZSBub2RlLlxuICAgICAgaWYgKGcubm9kZShpZCkubGFiZWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBnLm5vZGUoaWQpLmxhYmVsID0gaWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZyAhPT0gbnVsbCkge1xuICAgICAgICBnLnBhcmVudChpZCwgc2cpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYXR0cnMpIHtcbiAgICAgIG1lcmdlQXR0cmlidXRlcyhhdHRycywgZy5ub2RlKGlkKSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRWRnZShzb3VyY2UsIHRhcmdldCwgYXR0cnMpIHtcbiAgICB2YXIgZWRnZSA9IHt9O1xuICAgIG1lcmdlQXR0cmlidXRlcyhkZWZhdWx0QXR0cnMuZ2V0KFwiZWRnZVwiLCBhdHRycyksIGVkZ2UpO1xuICAgIHZhciBpZCA9IGF0dHJzLmlkID8gYXR0cnMuaWQgOiBudWxsO1xuICAgIGcuYWRkRWRnZShpZCwgc291cmNlLCB0YXJnZXQsIGVkZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29sbGVjdE5vZGVJZHMoc3RtdCkge1xuICAgIHZhciBpZHMgPSB7fSxcbiAgICAgICAgc3RhY2sgPSBbXSxcbiAgICAgICAgY3VycjtcbiAgICBmdW5jdGlvbiBwdXNoU3RhY2soZSkgeyBzdGFjay5wdXNoKGUpOyB9XG5cbiAgICBwdXNoU3RhY2soc3RtdCk7XG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCAhPT0gMCkge1xuICAgICAgY3VyciA9IHN0YWNrLnBvcCgpO1xuICAgICAgc3dpdGNoIChjdXJyLnR5cGUpIHtcbiAgICAgICAgY2FzZSBcIm5vZGVcIjogaWRzW2N1cnIuaWRdID0gdHJ1ZTsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJlZGdlXCI6XG4gICAgICAgICAgY3Vyci5lbGVtcy5mb3JFYWNoKHB1c2hTdGFjayk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJzdWJncmFwaFwiOlxuICAgICAgICAgIGN1cnIuc3RtdHMuZm9yRWFjaChwdXNoU3RhY2spO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoaWRzKTtcbiAgfVxuXG4gIC8qXG4gICAqIFdlIHVzZSBhIGNoYWluIG9mIHByb3RvdHlwZXMgdG8gbWFpbnRhaW4gcHJvcGVydGllcyBhcyB3ZSBkZXNjZW5kIGludG9cbiAgICogc3ViZ3JhcGhzLiBUaGlzIGFsbG93cyB1cyB0byBzaW1wbHkgZ2V0IHRoZSB2YWx1ZSBmb3IgYSBwcm9wZXJ0eSBhbmQgaGF2ZVxuICAgKiB0aGUgVk0gZG8gYXBwcm9wcmlhdGUgcmVzb2x1dGlvbi4gV2hlbiB3ZSBsZWF2ZSBhIHN1YmdyYXBoIHdlIHNpbXBseSBzZXRcbiAgICogdGhlIGN1cnJlbnQgY29udGV4dCB0byB0aGUgcHJvdG90eXBlIG9mIHRoZSBjdXJyZW50IGRlZmF1bHRzIG9iamVjdC5cbiAgICogQWx0ZXJuYXRpdmVseSwgdGhpcyBjb3VsZCBoYXZlIGJlZW4gd3JpdHRlbiB1c2luZyBhIHN0YWNrLlxuICAgKi9cbiAgdmFyIGRlZmF1bHRBdHRycyA9IHtcbiAgICBfZGVmYXVsdDoge30sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uIGdldCh0eXBlLCBhdHRycykge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9kZWZhdWx0W3R5cGVdICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHZhciBtZXJnZWRBdHRycyA9IHt9O1xuICAgICAgICAvLyBjbG9uZSBkZWZhdWx0IGF0dHJpYnV0ZXMgc28gdGhleSB3b24ndCBnZXQgb3ZlcndyaXR0ZW4gaW4gdGhlIG5leHQgc3RlcFxuICAgICAgICBtZXJnZUF0dHJpYnV0ZXModGhpcy5fZGVmYXVsdFt0eXBlXSwgbWVyZ2VkQXR0cnMpO1xuICAgICAgICAvLyBtZXJnZSBzdGF0ZW1lbnQgYXR0cmlidXRlcyB3aXRoIGRlZmF1bHQgYXR0cmlidXRlcywgcHJlY2VkZW5jZSBnaXZlIHRvIHN0bXQgYXR0cmlidXRlc1xuICAgICAgICBtZXJnZUF0dHJpYnV0ZXMoYXR0cnMsIG1lcmdlZEF0dHJzKTtcbiAgICAgICAgcmV0dXJuIG1lcmdlZEF0dHJzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGF0dHJzO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXQ6IGZ1bmN0aW9uIHNldCh0eXBlLCBhdHRycykge1xuICAgICAgdGhpcy5fZGVmYXVsdFt0eXBlXSA9IHRoaXMuZ2V0KHR5cGUsIGF0dHJzKTtcbiAgICB9LFxuXG4gICAgZW50ZXJTdWJEaWdyYXBoOiBmdW5jdGlvbigpIHtcbiAgICAgIGZ1bmN0aW9uIFN1YkRpZ3JhcGgoKSB7fVxuICAgICAgU3ViRGlncmFwaC5wcm90b3R5cGUgPSB0aGlzLl9kZWZhdWx0O1xuICAgICAgdmFyIHN1YmdyYXBoID0gbmV3IFN1YkRpZ3JhcGgoKTtcbiAgICAgIHRoaXMuX2RlZmF1bHQgPSBzdWJncmFwaDtcbiAgICB9LFxuXG4gICAgZXhpdFN1YkRpZ3JhcGg6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fZGVmYXVsdCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzLl9kZWZhdWx0KTtcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gaGFuZGxlU3RtdChzdG10LCBzZykge1xuICAgIHZhciBhdHRycyA9IHN0bXQuYXR0cnM7XG4gICAgc3dpdGNoIChzdG10LnR5cGUpIHtcbiAgICAgIGNhc2UgXCJub2RlXCI6XG4gICAgICAgIGNyZWF0ZU5vZGUoc3RtdC5pZCwgYXR0cnMsIHNnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiZWRnZVwiOlxuICAgICAgICB2YXIgcHJldixcbiAgICAgICAgICAgIGN1cnI7XG4gICAgICAgIHN0bXQuZWxlbXMuZm9yRWFjaChmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgaGFuZGxlU3RtdChlbGVtLCBzZyk7XG5cbiAgICAgICAgICBzd2l0Y2goZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwibm9kZVwiOiBjdXJyID0gW2VsZW0uaWRdOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJzdWJncmFwaFwiOiBjdXJyID0gY29sbGVjdE5vZGVJZHMoZWxlbSk7IGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgY3VycmVudGx5IHN1cHBvcnQgc3ViZ3JhcGhzIGluY2lkZW50IG9uIGFuIGVkZ2VcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgdHlwZSBpbmNpZGVudCBvbiBlZGdlOiBcIiArIGVsZW0udHlwZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIHByZXYuZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICAgIGN1cnIuZm9yRWFjaChmdW5jdGlvbihjKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlRWRnZShwLCBjLCBhdHRycyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHByZXYgPSBjdXJyO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwic3ViZ3JhcGhcIjpcbiAgICAgICAgZGVmYXVsdEF0dHJzLmVudGVyU3ViRGlncmFwaCgpO1xuICAgICAgICBzdG10LmlkID0gZy5hZGROb2RlKHN0bXQuaWQpO1xuICAgICAgICBpZiAoc2cgIT09IG51bGwpIHsgZy5wYXJlbnQoc3RtdC5pZCwgc2cpOyB9XG4gICAgICAgIGlmIChzdG10LnN0bXRzKSB7XG4gICAgICAgICAgc3RtdC5zdG10cy5mb3JFYWNoKGZ1bmN0aW9uKHMpIHsgaGFuZGxlU3RtdChzLCBzdG10LmlkKTsgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgbm8gY2hpbGRyZW4gd2UgcmVtb3ZlIHRoZSBzdWJncmFwaFxuICAgICAgICBpZiAoZy5jaGlsZHJlbihzdG10LmlkKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBnLmRlbE5vZGUoc3RtdC5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdEF0dHJzLmV4aXRTdWJEaWdyYXBoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImF0dHJcIjpcbiAgICAgICAgZGVmYXVsdEF0dHJzLnNldChzdG10LmF0dHJUeXBlLCBhdHRycyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImlubGluZUF0dHJcIjpcbiAgICAgICAgaWYgKHN0bXQuYXR0cnMpIHtcbiAgICAgICAgICBtZXJnZUF0dHJpYnV0ZXMoYXR0cnMsIHNnID09PSBudWxsID8gZy5ncmFwaCgpIDogZy5ub2RlKHNnKSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBzdGF0ZW1lbnQgdHlwZTogXCIgKyBzdG10LnR5cGUpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChwYXJzZVRyZWUuc3RtdHMpIHtcbiAgICBwYXJzZVRyZWUuc3RtdHMuZm9yRWFjaChmdW5jdGlvbihzdG10KSB7XG4gICAgICBoYW5kbGVTdG10KHN0bXQsIG51bGwpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGc7XG59XG5cbi8vIENvcGllcyBhbGwga2V5LXZhbHVlIHBhaXJzIGZyb20gYHNyY2AgdG8gYGRzdGAuIFRoaXMgY29weSBpcyBkZXN0cnVjdGl2ZTogaWZcbi8vIGEga2V5IGFwcGVhcnMgaW4gYm90aCBgc3JjYCBhbmQgYGRzdGAgdGhlIHZhbHVlIGZyb20gYHNyY2Agd2lsbCBvdmVyd3JpdGVcbi8vIHRoZSB2YWx1ZSBpbiBgZHN0YC5cbmZ1bmN0aW9uIG1lcmdlQXR0cmlidXRlcyhzcmMsIGRzdCkge1xuICBPYmplY3Qua2V5cyhzcmMpLmZvckVhY2goZnVuY3Rpb24oaykgeyBkc3Rba10gPSBzcmNba107IH0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSAnMC40LjEwJztcbiIsInZhciBXcml0ZXIgPSByZXF1aXJlKCcuL1dyaXRlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHdyaXRlO1xuXG52YXIgVU5FU0NBUEVEX0lEX1BBVFRFUk4gPSAvXlthLXpBLVpcXDIwMC1cXDM3N19dW2EtekEtWlxcMjAwLVxcMzc3XzAtOV0qJC87XG5cbi8qXG4gKiBXcml0ZXMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGdyYXBoIGluIHRoZSBET1QgbGFuZ3VhZ2UuXG4gKlxuICogTm90ZTogdGhpcyBpcyBleHBvcnRlZCBhcyB0aGUgbW9kdWxlIGV4cG9ydFxuICpcbiAqIEBwYXJhbSB7R3JhcGh8RGlncmFwaH0gZyB0aGUgZ3JhcGggdG8gc2VyaWFsaXplXG4gKi9cbmZ1bmN0aW9uIHdyaXRlKGcpIHtcbiAgdmFyIGVjID0gZy5pc0RpcmVjdGVkKCkgPyAnLT4nIDogJy0tJztcbiAgdmFyIHdyaXRlciA9IG5ldyBXcml0ZXIoKTtcblxuICB3cml0ZXIud3JpdGVMaW5lKChnLmlzRGlyZWN0ZWQoKSA/ICdkaWdyYXBoJyA6ICdncmFwaCcpICsgJyB7Jyk7XG4gIHdyaXRlci5pbmRlbnQoKTtcblxuICB2YXIgZ3JhcGhBdHRycyA9IGcuZ3JhcGgoKTtcblxuICBpZihncmFwaEF0dHJzKSB7XG4gICAgT2JqZWN0LmtleXMoZ3JhcGhBdHRycykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHdyaXRlci53cml0ZUxpbmUoaWQoaykgKyAnPScgKyBpZChncmFwaEF0dHJzW2tdKSArICc7Jyk7XG4gICAgfSk7XG4gIH1cblxuICB3cml0ZVN1YmdyYXBoKGcsIG51bGwsIHdyaXRlcik7XG5cbiAgZy5lZGdlcygpLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgIHdyaXRlRWRnZShnLCBlLCBlYywgd3JpdGVyKTtcbiAgfSk7XG5cbiAgd3JpdGVyLnVuaW5kZW50KCk7XG4gIHdyaXRlci53cml0ZUxpbmUoJ30nKTtcblxuICByZXR1cm4gd3JpdGVyLnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlU3ViZ3JhcGgoZywgdSwgd3JpdGVyKSB7XG4gIHZhciBjaGlsZHJlbiA9IGcuY2hpbGRyZW4gPyBnLmNoaWxkcmVuKHUpIDogKHUgPT09IG51bGwgPyBnLm5vZGVzKCkgOiBbXSk7XG4gIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgIGlmICghZy5jaGlsZHJlbiB8fCBnLmNoaWxkcmVuKHYpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgd3JpdGVOb2RlKGcsIHYsIHdyaXRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdyaXRlci53cml0ZUxpbmUoJ3N1YmdyYXBoICcgKyBpZCh2KSArICcgeycpO1xuICAgICAgd3JpdGVyLmluZGVudCgpO1xuXG4gICAgICB2YXIgYXR0cnMgPSBnLm5vZGUodik7XG4gICAgICBPYmplY3Qua2V5cyhhdHRycykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgd3JpdGVyLndyaXRlTGluZShpZChrKSArICc9JyArIGlkKGF0dHJzW2tdKSArICc7Jyk7XG4gICAgICB9KTtcblxuICAgICAgd3JpdGVTdWJncmFwaChnLCB2LCB3cml0ZXIpO1xuICAgICAgd3JpdGVyLnVuaW5kZW50KCk7XG4gICAgICB3cml0ZXIud3JpdGVMaW5lKCd9Jyk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gaWQob2JqKSB7XG4gIGlmICh0eXBlb2Ygb2JqID09PSAnbnVtYmVyJyB8fCBvYmoudG9TdHJpbmcoKS5tYXRjaChVTkVTQ0FQRURfSURfUEFUVEVSTikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgcmV0dXJuICdcIicgKyBvYmoudG9TdHJpbmcoKS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCInO1xufVxuXG5mdW5jdGlvbiB3cml0ZU5vZGUoZywgdSwgd3JpdGVyKSB7XG4gIHZhciBhdHRycyA9IGcubm9kZSh1KTtcbiAgd3JpdGVyLndyaXRlKGlkKHUpKTtcblxuICBpZiAoYXR0cnMpIHtcbiAgICB2YXIgYXR0clN0cnMgPSBPYmplY3Qua2V5cyhhdHRycykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBpZChrKSArICc9JyArIGlkKGF0dHJzW2tdKTtcbiAgICB9KTtcblxuICAgIGlmIChhdHRyU3Rycy5sZW5ndGgpIHtcbiAgICAgIHdyaXRlci53cml0ZSgnIFsnICsgYXR0clN0cnMuam9pbignLCcpICsgJ10nKTtcbiAgICB9XG4gIH1cblxuICB3cml0ZXIud3JpdGVMaW5lKCk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRWRnZShnLCBlLCBlYywgd3JpdGVyKSB7XG4gIHZhciBhdHRycyA9IGcuZWRnZShlKSxcbiAgICAgIGluY2lkZW50ID0gZy5pbmNpZGVudE5vZGVzKGUpLFxuICAgICAgdSA9IGluY2lkZW50WzBdLFxuICAgICAgdiA9IGluY2lkZW50WzFdO1xuXG4gIHdyaXRlci53cml0ZShpZCh1KSArICcgJyArIGVjICsgJyAnICsgaWQodikpO1xuICBpZiAoYXR0cnMpIHtcbiAgICB2YXIgYXR0clN0cnMgPSBPYmplY3Qua2V5cyhhdHRycykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBpZChrKSArICc9JyArIGlkKGF0dHJzW2tdKTtcbiAgICB9KTtcblxuICAgIGlmIChhdHRyU3Rycy5sZW5ndGgpIHtcbiAgICAgIHdyaXRlci53cml0ZSgnIFsnICsgYXR0clN0cnMuam9pbignLCcpICsgJ10nKTtcbiAgICB9XG4gIH1cblxuICB3cml0ZXIud3JpdGVMaW5lKCk7XG59XG5cbiJdfQ==
