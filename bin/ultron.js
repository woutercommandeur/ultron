(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ULTRON = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Delaunay;

(function() {
  "use strict";

  var EPSILON = 1.0 / 1048576.0;

  function supertriangle(vertices) {
    var xmin = Number.POSITIVE_INFINITY,
        ymin = Number.POSITIVE_INFINITY,
        xmax = Number.NEGATIVE_INFINITY,
        ymax = Number.NEGATIVE_INFINITY,
        i, dx, dy, dmax, xmid, ymid;

    for(i = vertices.length; i--; ) {
      if(vertices[i][0] < xmin) xmin = vertices[i][0];
      if(vertices[i][0] > xmax) xmax = vertices[i][0];
      if(vertices[i][1] < ymin) ymin = vertices[i][1];
      if(vertices[i][1] > ymax) ymax = vertices[i][1];
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [
      [xmid - 20 * dmax, ymid -      dmax],
      [xmid            , ymid + 20 * dmax],
      [xmid + 20 * dmax, ymid -      dmax]
    ];
  }

  function circumcircle(vertices, i, j, k) {
    var x1 = vertices[i][0],
        y1 = vertices[i][1],
        x2 = vertices[j][0],
        y2 = vertices[j][1],
        x3 = vertices[k][0],
        y3 = vertices[k][1],
        fabsy1y2 = Math.abs(y1 - y2),
        fabsy2y3 = Math.abs(y2 - y3),
        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

    /* Check for coincident points */
    if(fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
      throw new Error("Eek! Coincident points!");

    if(fabsy1y2 < EPSILON) {
      m2  = -((x3 - x2) / (y3 - y2));
      mx2 = (x2 + x3) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (x2 + x1) / 2.0;
      yc  = m2 * (xc - mx2) + my2;
    }

    else if(fabsy2y3 < EPSILON) {
      m1  = -((x2 - x1) / (y2 - y1));
      mx1 = (x1 + x2) / 2.0;
      my1 = (y1 + y2) / 2.0;
      xc  = (x3 + x2) / 2.0;
      yc  = m1 * (xc - mx1) + my1;
    }

    else {
      m1  = -((x2 - x1) / (y2 - y1));
      m2  = -((x3 - x2) / (y3 - y2));
      mx1 = (x1 + x2) / 2.0;
      mx2 = (x2 + x3) / 2.0;
      my1 = (y1 + y2) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      yc  = (fabsy1y2 > fabsy2y3) ?
        m1 * (xc - mx1) + my1 :
        m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return {i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy};
  }

  function dedup(edges) {
    var i, j, a, b, m, n;

    for(j = edges.length; j; ) {
      b = edges[--j];
      a = edges[--j];

      for(i = j; i; ) {
        n = edges[--i];
        m = edges[--i];

        if((a === m && b === n) || (a === n && b === m)) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay = {
    triangulate: function(vertices, key) {
      var n = vertices.length,
          i, j, indices, st, open, closed, edges, dx, dy, a, b, c;

      /* Bail if there aren't enough vertices to form any triangles. */
      if(n < 3)
        return [];

      /* Slice out the actual vertices from the passed objects. (Duplicate the
       * array even if we don't, though, since we need to make a supertriangle
       * later on!) */
      vertices = vertices.slice(0);

      if(key)
        for(i = n; i--; )
          vertices[i] = vertices[i][key];

      /* Make an array of indices into the vertex array, sorted by the
       * vertices' x-position. */
      indices = new Array(n);

      for(i = n; i--; )
        indices[i] = i;

      indices.sort(function(i, j) {
        return vertices[j][0] - vertices[i][0];
      });

      /* Next, find the vertices of the supertriangle (which contains all other
       * triangles), and append them onto the end of a (copy of) the vertex
       * array. */
      st = supertriangle(vertices);
      vertices.push(st[0], st[1], st[2]);
      
      /* Initialize the open list (containing the supertriangle and nothing
       * else) and the closed list (which is empty since we havn't processed
       * any triangles yet). */
      open   = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      closed = [];
      edges  = [];

      /* Incrementally add each vertex to the mesh. */
      for(i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for(j = open.length; j--; ) {
          /* If this point is to the right of this triangle's circumcircle,
           * then this triangle should never get checked again. Remove it
           * from the open list, add it to the closed list, and skip. */
          dx = vertices[c][0] - open[j].x;
          if(dx > 0.0 && dx * dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy = vertices[c][1] - open[j].y;
          if(dx * dx + dy * dy - open[j].r > EPSILON)
            continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(
            open[j].i, open[j].j,
            open[j].j, open[j].k,
            open[j].k, open[j].i
          );
          open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        dedup(edges);

        /* Add a new triangle for each edge. */
        for(j = edges.length; j; ) {
          b = edges[--j];
          a = edges[--j];
          open.push(circumcircle(vertices, a, b, c));
        }
      }

      /* Copy any remaining open triangles to the closed list, and then
       * remove any triangles that share a vertex with the supertriangle,
       * building a list of triplets that represent triangles. */
      for(i = open.length; i--; )
        closed.push(open[i]);
      open.length = 0;

      for(i = closed.length; i--; )
        if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
          open.push(closed[i].i, closed[i].j, closed[i].k);

      /* Yay, we're done! */
      return open;
    },
    contains: function(tri, p) {
      /* Bounding box test first, for quick rejections. */
      if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
         (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
         (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
         (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]))
        return null;

      var a = tri[1][0] - tri[0][0],
          b = tri[2][0] - tri[0][0],
          c = tri[1][1] - tri[0][1],
          d = tri[2][1] - tri[0][1],
          i = a * d - b * c;

      /* Degenerate tri. */
      if(i === 0.0)
        return null;

      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
          v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

      /* If we're outside the tri, fail. */
      if(u < 0.0 || v < 0.0 || (u + v) > 1.0)
        return null;

      return [u, v];
    }
  };

  if(typeof module !== "undefined")
    module.exports = Delaunay;
})();

},{}],2:[function(require,module,exports){
'use strict';

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],3:[function(require,module,exports){
/**
 *  request-frame - requestAnimationFrame & cancelAnimationFrame polyfill for
 *   optimal cross-browser development.
 *    Version:  v1.2.3
 *     License:  MIT
 *      Copyright Julien Etienne 2015 All Rights Reserved.
 *        github:  https://github.com/julienetie/request-frame
 *‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
 */
(function (window) {

/**
 * @param  {String} type - request | cancel | native.
 * @return {Function} Timing function.
 */
function requestFrame(type) {
    // The only vendor prefixes required.
    var vendors = ['moz', 'webkit'],

        // Disassembled timing function abbreviations.
        aF = 'AnimationFrame',
        rqAF = 'Request' + aF,

        // Final assigned functions.
        assignedRequestAnimationFrame,
        assignedCancelAnimationFrame,

        // Initial time of the timing lapse.
        previousTime = 0,

        mozRAF = window.mozRequestAnimationFrame,
        mozCAF = window.mozCancelAnimationFrame,

        // Checks for firefox 4 - 10 function pair mismatch.
        hasMozMismatch = mozRAF && !mozCAF,

        func;

    // Date.now polyfill, mainly for legacy IE versions.
    if (!Date.now) {
        Date.now = function() {
            return new Date().getTime();
        };
    }

    /**
     * hasIOS6RequestAnimationFrameBug.
     * @See {@Link https://gist.github.com/julienetie/86ac394ec41f1271ff0a}
     * - for Commentary.
     * @Copyright 2015 - Julien Etienne. 
     * @License: MIT.
     */
    function hasIOS6RequestAnimationFrameBug() {
        var webkitRAF = window.webkitRequestAnimationFrame,
            rAF = window.requestAnimationFrame,

            // CSS/ Device with max for iOS6 Devices.
            hasMobileDeviceWidth = screen.width <= 768 ? true : false,

            // Only supports webkit prefixed requestAnimtionFrane.
            requiresWebkitprefix = !(webkitRAF && rAF),

            // iOS6 webkit browsers don't support performance now.
            hasNoNavigationTiming = window.performance ? false : true,

            iOS6Notice = 'setTimeout is being used as a substitiue for' +
            'requestAnimationFrame due to a bug within iOS 6 builds',

            hasIOS6Bug = requiresWebkitprefix && hasMobileDeviceWidth &&
            hasNoNavigationTiming;

        function bugCheckresults(timingFnA, timingFnB, notice) {
            if (timingFnA || timingFnB) {
                console.warn(notice);
                return true;
            } else {
                return false;
            }
        }

        function displayResults() {
            if (hasIOS6Bug) {
                return bugCheckresults(webkitRAF, rAF, iOS6Notice);
            } else {
                return false;
            }
        }

        return displayResults();
    }

    /**
     * Native clearTimeout function.
     * @return {Function}
     */
    function clearTimeoutWithId(id) {
        clearTimeout(id);
    }

    /**
     * Based on a polyfill by Erik, introduced by Paul Irish & 
     * further improved by Darius Bacon.
     * @see  {@link http://www.paulirish.com/2011/
     * requestanimationframe-for-smart-animating}
     * @see  {@link https://github.com/darius/requestAnimationFrame/blob/
     * master/requestAnimationFrame.js}
     * @callback {Number} Timestamp.
     * @return {Function} setTimeout Function.
     */
    function setTimeoutWithTimestamp(callback) {
        var immediateTime = Date.now(),
            lapsedTime = Math.max(previousTime + 16, immediateTime);
        return setTimeout(function() {
                callback(previousTime = lapsedTime);
            },
            lapsedTime - immediateTime);
    }

    /**
     * Queries the native function, prefixed function 
     * or use the setTimeoutWithTimestamp function.
     * @return {Function}
     */
    function queryRequestAnimationFrame() {
        if (Array.prototype.filter) {
            assignedRequestAnimationFrame = window['request' + aF] ||
                window[vendors.filter(function(vendor) {
                    if (window[vendor + rqAF] !== undefined)
                        return vendor;
                }) + rqAF] || setTimeoutWithTimestamp;
        } else {
            return setTimeoutWithTimestamp;
        }
        if (!hasIOS6RequestAnimationFrameBug()) {
            return assignedRequestAnimationFrame;
        } else {
            return setTimeoutWithTimestamp;
        }
    }

    /**
     * Queries the native function, prefixed function 
     * or use the clearTimeoutWithId function.
     * @return {Function}
     */
    function queryCancelAnimationFrame() {
        var cancellationNames = [];
        if (Array.prototype.map) {
            vendors.map(function(vendor) {
                return ['Cancel', 'CancelRequest'].map(
                    function(cancellationNamePrefix) {
                        cancellationNames.push(vendor +
                            cancellationNamePrefix + aF);
                    });
            });
        } else {
            return clearTimeoutWithId;
        }

        /**
         * Checks for the prefixed cancelAnimationFrame implementation.
         * @param  {Array} prefixedNames - An array of the prefixed names. 
         * @param  {Number} i - Iteration start point.
         * @return {Function} prefixed cancelAnimationFrame function.
         */
        function prefixedCancelAnimationFrame(prefixedNames, i) {
            var cancellationFunction;
            for (; i < prefixedNames.length; i++) {
                if (window[prefixedNames[i]]) {
                    cancellationFunction = window[prefixedNames[i]];
                    break;
                }
            }
            return cancellationFunction;
        }

        // Use truthly function
        assignedCancelAnimationFrame = window['cancel' + aF] ||
            prefixedCancelAnimationFrame(cancellationNames, 0) ||
            clearTimeoutWithId;

        // Check for iOS 6 bug
        if (!hasIOS6RequestAnimationFrameBug()) {
            return assignedCancelAnimationFrame;
        } else {
            return clearTimeoutWithId;
        }
    }

    function getRequestFn() {
        if (hasMozMismatch) {
            return setTimeoutWithTimestamp;
        } else {
            return queryRequestAnimationFrame();
        }
    }

    function getCancelFn() {
        return queryCancelAnimationFrame();
    }

    function setNativeFn() {
        if (hasMozMismatch) {
            window.requestAnimationFrame = setTimeoutWithTimestamp;
            window.cancelAnimationFrame = clearTimeoutWithId;
        } else {
            window.requestAnimationFrame = queryRequestAnimationFrame();
            window.cancelAnimationFrame = queryCancelAnimationFrame();
        }
    }

    /**
     * The type value "request" singles out firefox 4 - 10 and 
     * assigns the setTimeout function if plausible.
     */

    switch (type) {
        case 'request':
        case '':
            func = getRequestFn();
            break;

        case 'cancel':
            func = getCancelFn();
            break;

        case 'native':
            setNativeFn();
            break;
        default:
            throw new Error('RequestFrame parameter is not a type.');
    }
    return func;
}


// Node.js/ CommonJS
if (typeof module === 'object' && typeof module.exports === 'object') {
module.exports = exports = requestFrame;
}

// AMD
else if (typeof define === 'function' && define.amd) {
define(function() {
  return requestFrame;
});
}

// Default to window as global
else if (typeof window === 'object') {
window.requestFrame = requestFrame;
}
/* global -module, -exports, -define */

}(window));

},{}],4:[function(require,module,exports){
var ua = typeof window !== 'undefined' ? window.navigator.userAgent : ''
  , isOSX = /OS X/.test(ua)
  , isOpera = /Opera/.test(ua)
  , maybeFirefox = !/like Gecko/.test(ua) && !isOpera

var i, output = module.exports = {
  0:  isOSX ? '<menu>' : '<UNK>'
, 1:  '<mouse 1>'
, 2:  '<mouse 2>'
, 3:  '<break>'
, 4:  '<mouse 3>'
, 5:  '<mouse 4>'
, 6:  '<mouse 5>'
, 8:  '<backspace>'
, 9:  '<tab>'
, 12: '<clear>'
, 13: '<enter>'
, 16: '<shift>'
, 17: '<control>'
, 18: '<alt>'
, 19: '<pause>'
, 20: '<caps-lock>'
, 21: '<ime-hangul>'
, 23: '<ime-junja>'
, 24: '<ime-final>'
, 25: '<ime-kanji>'
, 27: '<escape>'
, 28: '<ime-convert>'
, 29: '<ime-nonconvert>'
, 30: '<ime-accept>'
, 31: '<ime-mode-change>'
, 27: '<escape>'
, 32: '<space>'
, 33: '<page-up>'
, 34: '<page-down>'
, 35: '<end>'
, 36: '<home>'
, 37: '<left>'
, 38: '<up>'
, 39: '<right>'
, 40: '<down>'
, 41: '<select>'
, 42: '<print>'
, 43: '<execute>'
, 44: '<snapshot>'
, 45: '<insert>'
, 46: '<delete>'
, 47: '<help>'
, 91: '<meta>'  // meta-left -- no one handles left and right properly, so we coerce into one.
, 92: '<meta>'  // meta-right
, 93: isOSX ? '<meta>' : '<menu>'      // chrome,opera,safari all report this for meta-right (osx mbp).
, 95: '<sleep>'
, 106: '<num-*>'
, 107: '<num-+>'
, 108: '<num-enter>'
, 109: '<num-->'
, 110: '<num-.>'
, 111: '<num-/>'
, 144: '<num-lock>'
, 145: '<scroll-lock>'
, 160: '<shift-left>'
, 161: '<shift-right>'
, 162: '<control-left>'
, 163: '<control-right>'
, 164: '<alt-left>'
, 165: '<alt-right>'
, 166: '<browser-back>'
, 167: '<browser-forward>'
, 168: '<browser-refresh>'
, 169: '<browser-stop>'
, 170: '<browser-search>'
, 171: '<browser-favorites>'
, 172: '<browser-home>'

  // ff/osx reports '<volume-mute>' for '-'
, 173: isOSX && maybeFirefox ? '-' : '<volume-mute>'
, 174: '<volume-down>'
, 175: '<volume-up>'
, 176: '<next-track>'
, 177: '<prev-track>'
, 178: '<stop>'
, 179: '<play-pause>'
, 180: '<launch-mail>'
, 181: '<launch-media-select>'
, 182: '<launch-app 1>'
, 183: '<launch-app 2>'
, 186: ';'
, 187: '='
, 188: ','
, 189: '-'
, 190: '.'
, 191: '/'
, 192: '`'
, 219: '['
, 220: '\\'
, 221: ']'
, 222: "'"
, 223: '<meta>'
, 224: '<meta>'       // firefox reports meta here.
, 226: '<alt-gr>'
, 229: '<ime-process>'
, 231: isOpera ? '`' : '<unicode>'
, 246: '<attention>'
, 247: '<crsel>'
, 248: '<exsel>'
, 249: '<erase-eof>'
, 250: '<play>'
, 251: '<zoom>'
, 252: '<no-name>'
, 253: '<pa-1>'
, 254: '<clear>'
}

for(i = 58; i < 65; ++i) {
  output[i] = String.fromCharCode(i)
}

// 0-9
for(i = 48; i < 58; ++i) {
  output[i] = (i - 48)+''
}

// A-Z
for(i = 65; i < 91; ++i) {
  output[i] = String.fromCharCode(i)
}

// num0-9
for(i = 96; i < 106; ++i) {
  output[i] = '<num-'+(i - 96)+'>'
}

// F1-F24
for(i = 112; i < 136; ++i) {
  output[i] = 'F'+(i-111)
}

},{}],5:[function(require,module,exports){
'use strict';

var gpcas = gpcas || {};
gpcas.util = {};
gpcas.geometry = {};

exports = module.exports = gpcas;

//////////
var Clip, BundleState, LmtNode, TopPolygonNode, AetTree, HState, VertexType, VertexNode, ItNodeTable, StNode;

//Object.prototype.equals = function(x) {
function equals(x1, x) {

    var p;
    for(p in x1) {
        if(typeof(x[p])==='undefined') {return false;}
    }

    for(p in x1) {
        if (x1[p]) {
            switch(typeof(x1[p])) {
                case 'object':
                    if (!equals(x1[p], x[p])) { return false; } break;
                case 'function':
                    if (typeof(x[p])==='undefined' ||
                        (p !== 'equals' && x1[p].toString() !== x[p].toString()))
                        return false;
                    break;
                default:
                    if (x1[p] !== x[p]) { return false; }
            }
        } else {
            if (x[p])
                return false;
        }
    }

    for(p in x) {
        if(typeof(x1[p])==='undefined') {return false;}
    }

    return true;
}
///point
var Point = function(x,y) {
    this.x = x;
    this.y = y;
};
gpcas.geometry.Point = Point;

////////////// CLASS ArrayHelper ////////////////////////////////////
gpcas.util.ArrayHelper = function() {};
var gpcstatic = gpcas.util.ArrayHelper;

gpcstatic.create2DArray = function(x,y){
    var a = [];
    for (var i=0; i<x; i++){
        a[i]= [];
    }
    return a;
};
gpcstatic.valueEqual = function(obj1, obj2) {
    if (obj1===obj2) return true;
    if(equals(obj1, obj2)) return true;

    return false;
}
gpcstatic.sortPointsClockwise = function(vertices) {
    var isArrayList  = false;

    if (vertices instanceof gpcas.util.ArrayList){
        vertices= vertices.toArray();
        isArrayList=true;
    }

    //point
    var maxTop   = null;
    var maxBottom  = null;
    var maxLeft   = null;
    var maxRight  = null;


    var maxLeftIndex;
    var newVertices = vertices;



    for (var i  = 0; i<vertices.length; i++){
        var vertex  = vertices[i] ;

        if ((maxTop===null)||(maxTop.y>vertex.y)||((maxTop.y===vertex.y)&&(vertex.x<maxTop.x))){
            maxTop=vertex;
        }
        if ((maxBottom===null)||(maxBottom.y<vertex.y)||((maxBottom.y===vertex.y)&&(vertex.x>maxBottom.x))){
            maxBottom=vertex;
        }
        if ((maxLeft===null)||(maxLeft.x>vertex.x)||((maxLeft.x===vertex.x)&&(vertex.y>maxLeft.y))){
            maxLeft=vertex;
            maxLeftIndex=i;
        }
        if ((maxRight===null)||(maxRight.x<vertex.x)||((maxRight.x===vertex.x)&&(vertex.y<maxRight.y))){
            maxRight=vertex;
        }
    }

    if (maxLeftIndex>0){
        newVertices = []
        var j = 0;
        for (var i=maxLeftIndex; i<vertices.length;i++){
            newVertices[j++]=vertices[i];
        }
        for (var i=0; i<maxLeftIndex; i++){
            newVertices[j++]=vertices[i];
        }
        vertices=newVertices;
    }


    var reverse  = false;
    for(var i=0 ; i<vertices.length;i++) {
        var vertex = vertices[i];
        if (equals(vertex, maxBottom)){
            reverse=true;
            break;
        } else if (equals(vertex, maxTop)){
            break;
        }
    }
    if (reverse){
        newVertices=[]
        newVertices[0]=vertices[0];
        var j =1;
        for (var i=vertices.length-1; i>0; i--){
            newVertices[j++]=vertices[i];
        }
        vertices=newVertices;
    }

    return (isArrayList?(new gpcas.util.ArrayList(vertices)):(vertices));
}

/////////////// END ArrayHelper  ////////////////////////////////////////////////

var ArrayHelper = gpcas.util.ArrayHelper;
////////////////// CLASS ArrayList  /////////////////////////

gpcas.util.ArrayList = function(arr) {
	this._array = [];
	if(arr != null) {
		this._array=arr;
	}

};
var p = gpcas.util.ArrayList.prototype;

p.add = function(value) {
    this._array.push(value);
};
p.get = function(index) {
    return this._array[index];
};
p.size = function() {
	return this._array.length;
};
p.clear = function() {
    this._array  = [];

};
p.equals = function(list) {
    if (this._array.length != list.size()) return false;

    for (var i = 0; i<this._array.length ; i++){
        var obj1  = this._array[i];
        var obj2  = list.get(i);

        if (!ArrayHelper.valueEqual(obj1,obj2)){
            return false;
        }
    }
    return true;
}
p.hashCode = function(){
    return 0;
};
p.isEmpty = function() {
    return (this._array.length == 0);
}
p.toArray = function(){
    return this._array;
}
///////////////// END ArrayList ////////////////////////






gpcas.geometry.Clip = function(){};
gpcas.geometry.Clip.DEBUG = false;
gpcas.geometry.Clip.GPC_EPSILON = 2.2204460492503131e-016;
gpcas.geometry.Clip.GPC_VERSION = "2.31";
gpcas.geometry.Clip.LEFT = 0;
gpcas.geometry.Clip.RIGHT = 1;
gpcas.geometry.Clip.ABOVE = 0;
gpcas.geometry.Clip.BELOW = 1;
gpcas.geometry.Clip.CLIP = 0;
gpcas.geometry.Clip.SUBJ = 1;
Clip = gpcas.geometry.Clip;



var p = gpcas.geometry.Clip.prototype;
var gpcstatic = gpcas.geometry.Clip;

// ----------------------
// --- gpcstatic Methods ---
// ----------------------

/**
 * Return the intersection of <code>p1</code> and <code>p2</code> where the
 * return type is of <code>polyClass</code>.  See the note in the class description
 * for more on <ocde>polyClass</code>.
 *
 * @param p1        One of the polygons to performt he intersection with
 * @param p2        One of the polygons to performt he intersection with
 * @param polyClass The type of <code>Poly</code> to return
 */

gpcstatic.intersection = function(p1, p2, polyClass) {
    if(polyClass==null || polyClass==undefined) {
        polyClass = "PolyDefault";
    }
    return gpcas.geometry.Clip.clip( gpcas.geometry.OperationType.GPC_INT, p1, p2, polyClass );
};



/**
 * Return the union of <code>p1</code> and <code>p2</code> where the
 * return type is of <code>polyClass</code>.  See the note in the class description
 * for more on <ocde>polyClass</code>.
 *
 * @param p1        One of the polygons to performt he union with
 * @param p2        One of the polygons to performt he union with
 * @param polyClass The type of <code>Poly</code> to return
 */
gpcstatic.union = function(p1, p2, polyClass) {

    if(polyClass==null || polyClass==undefined) {
        polyClass = "PolyDefault";
    }

	return gpcas.geometry.Clip.clip( gpcas.geometry.OperationType.GPC_UNION, p1, p2, polyClass );
};


/**
 * Return the xor of <code>p1</code> and <code>p2</code> where the
 * return type is of <code>polyClass</code>.  See the note in the class description
 * for more on <ocde>polyClass</code>.
 *
 * @param p1        One of the polygons to performt he xor with
 * @param p2        One of the polygons to performt he xor with
 * @param polyClass The type of <code>Poly</code> to return
 */
gpcstatic.xor = function( p1, p2, polyClass) {
    if(polyClass==null || polyClass==undefined) {
        polyClass = "PolyDefault";
    }
    return gpcas.geometry.Clip.clip( gpcas.geometry.OperationType.GPC_XOR, p1, p2, polyClass );
};


/**
 * Return the difference of <code>p1</code> and <code>p2</code> where the
 * return type is of <code>polyClass</code>.  See the note in the class description
 * for more on <ocde>polyClass</code>.
 *
 * @param p1        Polygon from which second polygon will be substracted
 * @param p2        Second polygon
 * @param polyClass The type of <code>Poly</code> to return
 */
gpcstatic.difference = function ( p1, p2, polyClass) {
    if(polyClass==null || polyClass==undefined) {
        polyClass = "PolyDefault";
    }
    return gpcas.geometry.Clip.clip(gpcas.geometry.OperationType.GPC_DIFF, p2, p1, polyClass );
}
gpcstatic.intersection = function( p1, p2) {
	return gpcas.geometry.Clip.clip(gpcas.geometry.OperationType.GPC_INT, p1, p2, "PolyDefault.class" );
}


// -----------------------
// --- Private Methods ---
// -----------------------

/**
 * Create a new <code>Poly</code> type object using <code>polyClass</code>.
 */
gpcstatic.createNewPoly = function ( polyClass) {
    /* TODO :
     try
     {
     return (Poly)polyClass.newInstance();
     }
     catch( var e:Exception)
     {
     throw new RuntimeException(e);
     }*/
    if (polyClass=="PolySimple"){
        return new gpcas.geometry.PolySimple();
    }
    if (polyClass=="PolyDefault"){
        return new gpcas.geometry.PolyDefault();
    }
	if (polyClass=="PolyDefault.class"){
        return new gpcas.geometry.PolyDefault();
    }

    return null;
}

/**
 * <code>clip()</code> is the main method of the clipper algorithm.
 * This is where the conversion from really begins.
 */
gpcstatic.clip = function ( op, subj, clip, polyClass) {
    var result = gpcas.geometry.Clip.createNewPoly( polyClass ) ;

    /* Test for trivial NULL result cases */
    if( (subj.isEmpty() && clip.isEmpty()) ||
        (subj.isEmpty() && ((op == gpcas.geometry.OperationType.GPC_INT) || (op == gpcas.geometry.OperationType.GPC_DIFF))) ||
        (clip.isEmpty() &&  (op == gpcas.geometry.OperationType.GPC_INT)) )
    {
        return result ;
    }



    /* Identify potentialy contributing contours */
    if( ((op == gpcas.geometry.OperationType.GPC_INT) || (op == gpcas.geometry.OperationType.GPC_DIFF)) &&
        !subj.isEmpty() && !clip.isEmpty() )
    {
        gpcas.geometry.Clip.minimax_test(subj, clip, op);
    }

	//console.log("SUBJ " + subj);
    //console.log("CLIP " + clip);



    /* Build LMT */
    var lmt_table = new gpcas.geometry.LmtTable();
    var sbte = new gpcas.geometry.ScanBeamTreeEntries();
    var s_heap= null ;
    var c_heap= null ;



    if (!subj.isEmpty())
    {
        s_heap = gpcas.geometry.Clip.build_lmt(lmt_table, sbte, subj, gpcas.geometry.Clip.SUBJ, op);
    }
    if( gpcas.geometry.Clip.DEBUG )
    {
        //console.log("");
        //console.log(" ------------ After build_lmt for subj ---------");
        lmt_table.print();
    }
    if (!clip.isEmpty())
    {
        c_heap = gpcas.geometry.Clip.build_lmt(lmt_table, sbte, clip, gpcas.geometry.Clip.CLIP, op);
    }
    if( gpcas.geometry.Clip.DEBUG )
    {
        //console.log("");
        //console.log(" ------------ After build_lmt for clip ---------");
        lmt_table.print();
    }

    /* Return a NULL result if no contours contribute */
    if (lmt_table.top_node == null)
    {
        return result;
    }

    /* Build scanbeam table from scanbeam tree */
    var sbt = sbte.build_sbt();



    var parity= [];
    parity[0] = gpcas.geometry.Clip.LEFT ;
    parity[1] = gpcas.geometry.Clip.LEFT ;

    /* Invert clip polygon for difference operation */
    if (op == gpcas.geometry.OperationType.GPC_DIFF)
    {
        parity[Clip.CLIP]= gpcas.geometry.Clip.RIGHT;
    }

    if( gpcas.geometry.Clip.DEBUG )
    {
        //console.log(sbt);
    }

    var local_min = lmt_table.top_node ;

    var out_poly = new TopPolygonNode(); // used to create resulting Poly

    var aet = new AetTree();
    var scanbeam = 0;



    /* Process each scanbeam */
    while( scanbeam < sbt.length )
    {
        /* Set yb and yt to the bottom and top of the scanbeam */
        var yb = sbt[scanbeam++];
        var yt = 0.0;
        var dy = 0.0;
        if( scanbeam < sbt.length )
        {
            yt = sbt[scanbeam];
            dy = yt - yb;
        }



        /* === SCANBEAM BOUNDARY PROCESSING ================================ */

        /* If LMT node corresponding to yb exists */
        if (local_min != null )
        {
            if (local_min.y == yb)
            {
                /* Add edges starting at this local minimum to the AET */
                for( var edge= local_min.first_bound; (edge != null) ; edge= edge.next_bound)
                {
                    gpcas.geometry.Clip.add_edge_to_aet( aet, edge );
                }

                local_min = local_min.next;
            }
        }

        if( gpcas.geometry.Clip.DEBUG )
        {
            aet.print();
        }
        /* Set dummy previous x value */
        var px = -Number.MAX_VALUE;

        /* Create bundles within AET */
        var e0 = aet.top_node ;
        var e1 = aet.top_node ;



        /* Set up bundle fields of first edge */
        aet.top_node.bundle[Clip.ABOVE][ aet.top_node.type ] = (aet.top_node.top.y != yb) ? 1: 0;
        aet.top_node.bundle[Clip.ABOVE][ ((aet.top_node.type==0) ? 1: 0) ] = 0;
        aet.top_node.bstate[Clip.ABOVE] = BundleState.UNBUNDLED;

        for (var next_edge= aet.top_node.next ; (next_edge != null); next_edge = next_edge.next)
        {
            var ne_type= next_edge.type ;
            var ne_type_opp= ((next_edge.type==0) ? 1: 0); //next edge type opposite

            /* Set up bundle fields of next edge */
            next_edge.bundle[Clip.ABOVE][ ne_type     ]= (next_edge.top.y != yb) ? 1: 0;
            next_edge.bundle[Clip.ABOVE][ ne_type_opp ] = 0;
            next_edge.bstate[Clip.ABOVE] = BundleState.UNBUNDLED;

            /* Bundle edges above the scanbeam boundary if they coincide */
            if ( next_edge.bundle[Clip.ABOVE][ne_type] == 1)
            {
                if (Clip.EQ(e0.xb, next_edge.xb) && gpcas.geometry.Clip.EQ(e0.dx, next_edge.dx) && (e0.top.y != yb))
                {
                    next_edge.bundle[Clip.ABOVE][ ne_type     ] ^= e0.bundle[Clip.ABOVE][ ne_type     ];
                    next_edge.bundle[Clip.ABOVE][ ne_type_opp ]  = e0.bundle[Clip.ABOVE][ ne_type_opp ];
                    next_edge.bstate[Clip.ABOVE] = BundleState.BUNDLE_HEAD;
                    e0.bundle[Clip.ABOVE][Clip.CLIP] = 0;
                    e0.bundle[Clip.ABOVE][Clip.SUBJ] = 0;
                    e0.bstate[Clip.ABOVE] = BundleState.BUNDLE_TAIL;
                }
                e0 = next_edge;

            }
        }

        var horiz= [] ;
        horiz[Clip.CLIP]= HState.NH;
        horiz[Clip.SUBJ]= HState.NH;

        var exists= [] ;
        exists[Clip.CLIP] = 0;
        exists[Clip.SUBJ] = 0;

        var cf= null ;

        /* Process each edge at this scanbeam boundary */
        for (var edge= aet.top_node ; (edge != null); edge = edge.next )
        {
            exists[Clip.CLIP] = edge.bundle[Clip.ABOVE][Clip.CLIP] + (edge.bundle[Clip.BELOW][Clip.CLIP] << 1);
            exists[Clip.SUBJ] = edge.bundle[Clip.ABOVE][Clip.SUBJ] + (edge.bundle[Clip.BELOW][Clip.SUBJ] << 1);

            if( (exists[Clip.CLIP] != 0) || (exists[Clip.SUBJ] != 0) )
            {
                /* Set bundle side */
                edge.bside[Clip.CLIP] = parity[Clip.CLIP];
                edge.bside[Clip.SUBJ] = parity[Clip.SUBJ];

                var contributing= false ;
                var br=0;
                var bl=0;
                var tr=0;
                var tl=0;
                /* Determine contributing status and quadrant occupancies */
                if( (op == gpcas.geometry.OperationType.GPC_DIFF) || (op == gpcas.geometry.OperationType.GPC_INT) )
                {
                    contributing= ((exists[Clip.CLIP]!=0) && ((parity[Clip.SUBJ]!=0) || (horiz[Clip.SUBJ]!=0))) ||
                        ((exists[Clip.SUBJ]!=0) && ((parity[Clip.CLIP]!=0) || (horiz[Clip.CLIP]!=0))) ||
                        ((exists[Clip.CLIP]!=0) && (exists[Clip.SUBJ]!=0) && (parity[Clip.CLIP] == parity[Clip.SUBJ]));
                    br = ((parity[Clip.CLIP]!=0) && (parity[Clip.SUBJ]!=0)) ? 1: 0;
                    bl = ( ((parity[Clip.CLIP] ^ edge.bundle[Clip.ABOVE][Clip.CLIP])!=0) &&
                        ((parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ])!=0) ) ? 1: 0;
                    tr = ( ((parity[Clip.CLIP] ^ ((horiz[Clip.CLIP]!=HState.NH)?1:0)) !=0) &&
                        ((parity[Clip.SUBJ] ^ ((horiz[Clip.SUBJ]!=HState.NH)?1:0)) !=0) ) ? 1: 0;
                    tl = (((parity[Clip.CLIP] ^ ((horiz[Clip.CLIP]!=HState.NH)?1:0) ^ edge.bundle[Clip.BELOW][Clip.CLIP])!=0) &&
                        ((parity[Clip.SUBJ] ^ ((horiz[Clip.SUBJ]!=HState.NH)?1:0) ^ edge.bundle[Clip.BELOW][Clip.SUBJ])!=0))?1:0;
                }
                else if( op == gpcas.geometry.OperationType.GPC_XOR )
                {
                    contributing= (exists[Clip.CLIP]!=0) || (exists[Clip.SUBJ]!=0);
                    br= (parity[Clip.CLIP]) ^ (parity[Clip.SUBJ]);
                    bl= (parity[Clip.CLIP] ^ edge.bundle[Clip.ABOVE][Clip.CLIP]) ^ (parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ]);
                    tr= (parity[Clip.CLIP] ^ ((horiz[Clip.CLIP]!=HState.NH)?1:0)) ^ (parity[Clip.SUBJ] ^ ((horiz[Clip.SUBJ]!=HState.NH)?1:0));
                    tl= (parity[Clip.CLIP] ^ ((horiz[Clip.CLIP]!=HState.NH)?1:0) ^ edge.bundle[Clip.BELOW][Clip.CLIP])
                        ^ (parity[Clip.SUBJ] ^ ((horiz[Clip.SUBJ]!=HState.NH)?1:0) ^ edge.bundle[Clip.BELOW][Clip.SUBJ]);
                }
                else if( op == gpcas.geometry.OperationType.GPC_UNION )
                {
                    contributing= ((exists[Clip.CLIP]!=0) && (!(parity[Clip.SUBJ]!=0) || (horiz[Clip.SUBJ]!=0))) ||
                        ((exists[Clip.SUBJ]!=0) && (!(parity[Clip.CLIP]!=0) || (horiz[Clip.CLIP]!=0))) ||
                        ((exists[Clip.CLIP]!=0) && (exists[Clip.SUBJ]!=0) && (parity[Clip.CLIP] == parity[Clip.SUBJ]));
                    br= ((parity[Clip.CLIP]!=0) || (parity[Clip.SUBJ]!=0))?1:0;
                    bl= (((parity[Clip.CLIP] ^ edge.bundle[Clip.ABOVE][Clip.CLIP])!=0) || ((parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ])!=0))?1:0;
                    tr= ( ((parity[Clip.CLIP] ^ ((horiz[Clip.CLIP]!=HState.NH)?1:0))!=0) ||
                        ((parity[Clip.SUBJ] ^ ((horiz[Clip.SUBJ]!=HState.NH)?1:0))!=0) ) ?1:0;
                    tl= ( ((parity[Clip.CLIP] ^ ((horiz[Clip.CLIP]!=HState.NH)?1:0) ^ edge.bundle[Clip.BELOW][Clip.CLIP])!=0) ||
                        ((parity[Clip.SUBJ] ^ ((horiz[Clip.SUBJ]!=HState.NH)?1:0) ^ edge.bundle[Clip.BELOW][Clip.SUBJ])!=0) ) ? 1:0;
                }
                else
                {
                    //console.log("ERROR : Unknown op");
                }

                /* Update parity */
                parity[Clip.CLIP] ^= edge.bundle[Clip.ABOVE][Clip.CLIP];
                parity[Clip.SUBJ] ^= edge.bundle[Clip.ABOVE][Clip.SUBJ];

                /* Update horizontal state */
                if (exists[Clip.CLIP]!=0)
                {
                    horiz[Clip.CLIP] = HState.next_h_state[horiz[Clip.CLIP]][((exists[Clip.CLIP] - 1) << 1) + parity[Clip.CLIP]];
                }
                if( exists[Clip.SUBJ]!=0)
                {
                    horiz[Clip.SUBJ] = HState.next_h_state[horiz[Clip.SUBJ]][((exists[Clip.SUBJ] - 1) << 1) + parity[Clip.SUBJ]];
                }

                if (contributing)
                {
                    var xb= edge.xb;



                    var vclass= VertexType.getType( tr, tl, br, bl );
                    switch (vclass)
                    {
                        case VertexType.EMN:
                        case VertexType.IMN:
                            edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb);
                            px = xb;
                            cf = edge.outp[Clip.ABOVE];
                            break;
                        case VertexType.ERI:
                            if (xb != px)
                            {
                                cf.add_right( xb, yb);
                                px= xb;
                            }
                            edge.outp[Clip.ABOVE]= cf;
                            cf= null;
                            break;
                        case VertexType.ELI:
                            edge.outp[Clip.BELOW].add_left( xb, yb);
                            px= xb;
                            cf= edge.outp[Clip.BELOW];
                            break;
                        case VertexType.EMX:
                            if (xb != px)
                            {
                                cf.add_left( xb, yb);
                                px= xb;
                            }
                            out_poly.merge_right(cf, edge.outp[Clip.BELOW]);
                            cf= null;
                            break;
                        case VertexType.ILI:
                            if (xb != px)
                            {
                                cf.add_left( xb, yb);
                                px= xb;
                            }
                            edge.outp[Clip.ABOVE]= cf;
                            cf= null;
                            break;
                        case VertexType.IRI:
                            edge.outp[Clip.BELOW].add_right( xb, yb );
                            px= xb;
                            cf= edge.outp[Clip.BELOW];
                            edge.outp[Clip.BELOW]= null;
                            break;
                        case VertexType.IMX:
                            if (xb != px)
                            {
                                cf.add_right( xb, yb );
                                px= xb;
                            }
                            out_poly.merge_left(cf, edge.outp[Clip.BELOW]);
                            cf= null;
                            edge.outp[Clip.BELOW]= null;
                            break;
                        case VertexType.IMM:
                            if (xb != px)
                            {
                                cf.add_right( xb, yb);
                                px= xb;
                            }
                            out_poly.merge_left(cf, edge.outp[Clip.BELOW]);
                            edge.outp[Clip.BELOW]= null;
                            edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb);
                            cf= edge.outp[Clip.ABOVE];
                            break;
                        case VertexType.EMM:
                            if (xb != px)
                            {
                                cf.add_left( xb, yb);
                                px= xb;
                            }
                            out_poly.merge_right(cf, edge.outp[Clip.BELOW]);
                            edge.outp[Clip.BELOW]= null;
                            edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb);
                            cf= edge.outp[Clip.ABOVE];
                            break;
                        case VertexType.LED:
                            if (edge.bot.y == yb)
                                edge.outp[Clip.BELOW].add_left( xb, yb);
                            edge.outp[Clip.ABOVE]= edge.outp[Clip.BELOW];
                            px= xb;
                            break;
                        case VertexType.RED:
                            if (edge.bot.y == yb)
                                edge.outp[Clip.BELOW].add_right( xb, yb );
                            edge.outp[Clip.ABOVE]= edge.outp[Clip.BELOW];
                            px= xb;
                            break;
                        default:
                            break;
                    } /* End of switch */
                } /* End of contributing conditional */
            } /* End of edge exists conditional */
            if( gpcas.geometry.Clip.DEBUG )
            {
                out_poly.print();
            }
			out_poly.print();
        } /* End of AET loop */



        /* Delete terminating edges from the AET, otherwise compute xt */
        for (var edge= aet.top_node ; (edge != null); edge = edge.next)
        {
            if (edge.top.y == yb)
            {
                var prev_edge= edge.prev;
                var next_edge= edge.next;

                if (prev_edge != null)
                    prev_edge.next = next_edge;
                else
                    aet.top_node = next_edge;

                if (next_edge != null )
                    next_edge.prev = prev_edge;

                /* Copy bundle head state to the adjacent tail edge if required */
                if ((edge.bstate[Clip.BELOW] == BundleState.BUNDLE_HEAD) && (prev_edge!=null))
                {
                    if (prev_edge.bstate[Clip.BELOW] == BundleState.BUNDLE_TAIL)
                    {
                        prev_edge.outp[Clip.BELOW]= edge.outp[Clip.BELOW];
                        prev_edge.bstate[Clip.BELOW]= BundleState.UNBUNDLED;
                        if ( prev_edge.prev != null)
                        {
                            if (prev_edge.prev.bstate[Clip.BELOW] == BundleState.BUNDLE_TAIL)
                            {
                                prev_edge.bstate[Clip.BELOW] = BundleState.BUNDLE_HEAD;
                            }
                        }
                    }
                }
            }
            else
            {
                if (edge.top.y == yt)
                    edge.xt= edge.top.x;
                else
                    edge.xt= edge.bot.x + edge.dx * (yt - edge.bot.y);
            }
        }

        if (scanbeam < sbte.sbt_entries )
        {
            /* === SCANBEAM INTERIOR PROCESSING ============================== */

            /* Build intersection table for the current scanbeam */
            var it_table= new ItNodeTable();
            it_table.build_intersection_table(aet, dy);



            /* Process each node in the intersection table */

            for (var intersect= it_table.top_node ; (intersect != null); intersect = intersect.next)
            {


				e0= intersect.ie[0];
				e1= intersect.ie[1];

                /* Only generate output for contributing intersections */

                if ( ((e0.bundle[Clip.ABOVE][Clip.CLIP]!=0) || (e0.bundle[Clip.ABOVE][Clip.SUBJ]!=0)) &&
                    ((e1.bundle[Clip.ABOVE][Clip.CLIP]!=0) || (e1.bundle[Clip.ABOVE][Clip.SUBJ]!=0)))
                {
                    var p= e0.outp[Clip.ABOVE];
                    var q= e1.outp[Clip.ABOVE];
                    var ix= intersect.point.x;
                    var iy= intersect.point.y + yb;

                    var in_clip= ( ( (e0.bundle[Clip.ABOVE][Clip.CLIP]!=0) && !(e0.bside[Clip.CLIP]!=0)) ||
                    ( (e1.bundle[Clip.ABOVE][Clip.CLIP]!=0) &&  (e1.bside[Clip.CLIP]!=0)) ||
                    (!(e0.bundle[Clip.ABOVE][Clip.CLIP]!=0) && !(e1.bundle[Clip.ABOVE][Clip.CLIP]!=0) &&
                        (e0.bside[Clip.CLIP]!=0) && (e1.bside[Clip.CLIP]!=0) ) ) ? 1: 0;

                    var in_subj= ( ( (e0.bundle[Clip.ABOVE][Clip.SUBJ]!=0) && !(e0.bside[Clip.SUBJ]!=0)) ||
                    ( (e1.bundle[Clip.ABOVE][Clip.SUBJ]!=0) &&  (e1.bside[Clip.SUBJ]!=0)) ||
                    (!(e0.bundle[Clip.ABOVE][Clip.SUBJ]!=0) && !(e1.bundle[Clip.ABOVE][Clip.SUBJ]!=0) &&
                        (e0.bside[Clip.SUBJ]!=0) && (e1.bside[Clip.SUBJ]!=0) ) ) ? 1: 0;

                    var tr=0
                    var tl=0;
                    var br=0;
                    var bl=0;
                    /* Determine quadrant occupancies */
                    if( (op == gpcas.geometry.OperationType.GPC_DIFF) || (op == gpcas.geometry.OperationType.GPC_INT) )
                    {
                        tr= ((in_clip!=0) && (in_subj!=0)) ? 1: 0;
                        tl= (((in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP])!=0) && ((in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ])!=0))?1:0;
                        br= (((in_clip ^ e0.bundle[Clip.ABOVE][Clip.CLIP])!=0) && ((in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ])!=0))?1:0;
                        bl= (((in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP] ^ e0.bundle[Clip.ABOVE][Clip.CLIP])!=0) &&
                            ((in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ] ^ e0.bundle[Clip.ABOVE][Clip.SUBJ])!=0) ) ? 1:0;
                    }
                    else if( op == gpcas.geometry.OperationType.GPC_XOR )
                    {
                        tr= in_clip^ in_subj;
                        tl= (in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP]) ^ (in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ]);
                        br= (in_clip ^ e0.bundle[Clip.ABOVE][Clip.CLIP]) ^ (in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ]);
                        bl= (in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP] ^ e0.bundle[Clip.ABOVE][Clip.CLIP])
                            ^ (in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ] ^ e0.bundle[Clip.ABOVE][Clip.SUBJ]);
                    }
                    else if( op == gpcas.geometry.OperationType.GPC_UNION )
                    {
                        tr= ((in_clip!=0) || (in_subj!=0)) ? 1: 0;
                        tl= (((in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP])!=0) || ((in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ])!=0)) ? 1: 0;
                        br= (((in_clip ^ e0.bundle[Clip.ABOVE][Clip.CLIP])!=0) || ((in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ])!=0)) ? 1: 0;
                        bl= (((in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP] ^ e0.bundle[Clip.ABOVE][Clip.CLIP])!=0) ||
                            ((in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ] ^ e0.bundle[Clip.ABOVE][Clip.SUBJ])!=0)) ? 1: 0;
                    }
                    else
                    {
                        //console.log("ERROR : Unknown op type, "+op);
                    }

                    var vclass = VertexType.getType( tr, tl, br, bl );
                    switch (vclass)
                    {
                        case VertexType.EMN:
                            e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy);
                            e1.outp[Clip.ABOVE] = e0.outp[Clip.ABOVE];
                            break;
                        case VertexType.ERI:
                            if (p != null)
                            {
                                p.add_right(ix, iy);
                                e1.outp[Clip.ABOVE]= p;
                                e0.outp[Clip.ABOVE]= null;
                            }
                            break;
                        case VertexType.ELI:
                            if (q != null)
                            {
                                q.add_left(ix, iy);
                                e0.outp[Clip.ABOVE]= q;
                                e1.outp[Clip.ABOVE]= null;
                            }
                            break;
                        case VertexType.EMX:
                            if ((p!=null) && (q!=null))
                            {
                                p.add_left( ix, iy);
                                out_poly.merge_right(p, q);
                                e0.outp[Clip.ABOVE]= null;
                                e1.outp[Clip.ABOVE]= null;
                            }
                            break;
                        case VertexType.IMN:
                            e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy);
                            e1.outp[Clip.ABOVE]= e0.outp[Clip.ABOVE];
                            break;
                        case VertexType.ILI:
                            if (p != null)
                            {
                                p.add_left(ix, iy);
                                e1.outp[Clip.ABOVE]= p;
                                e0.outp[Clip.ABOVE]= null;
                            }
                            break;
                        case VertexType.IRI:
                            if (q!=null)
                            {
                                q.add_right(ix, iy);
                                e0.outp[Clip.ABOVE]= q;
                                e1.outp[Clip.ABOVE]= null;
                            }
                            break;
                        case VertexType.IMX:
                            if ((p!=null) && (q!=null))
                            {
                                p.add_right(ix, iy);
                                out_poly.merge_left(p, q);
                                e0.outp[Clip.ABOVE]= null;
                                e1.outp[Clip.ABOVE]= null;
                            }
                            break;
                        case VertexType.IMM:
                            if ((p!=null) && (q!=null))
                            {
                                p.add_right(ix, iy);
                                out_poly.merge_left(p, q);
                                e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy);
                                e1.outp[Clip.ABOVE]= e0.outp[Clip.ABOVE];
                            }
                            break;
                        case VertexType.EMM:
                            if ((p!=null) && (q!=null))
                            {
                                p.add_left(ix, iy);
                                out_poly.merge_right(p, q);
                                e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy);
                                e1.outp[Clip.ABOVE] = e0.outp[Clip.ABOVE];
                            }
                            break;
                        default:
                            break;
                    } /* End of switch */
                } /* End of contributing intersection conditional */

                /* Swap bundle sides in response to edge crossing */
                if (e0.bundle[Clip.ABOVE][Clip.CLIP]!=0)
                    e1.bside[Clip.CLIP] = (e1.bside[Clip.CLIP]==0)?1:0;
                if (e1.bundle[Clip.ABOVE][Clip.CLIP]!=0)
                    e0.bside[Clip.CLIP]= (e0.bside[Clip.CLIP]==0)?1:0;
                if (e0.bundle[Clip.ABOVE][Clip.SUBJ]!=0)
                    e1.bside[Clip.SUBJ]= (e1.bside[Clip.SUBJ]==0)?1:0;
                if (e1.bundle[Clip.ABOVE][Clip.SUBJ]!=0)
                    e0.bside[Clip.SUBJ]= (e0.bside[Clip.SUBJ]==0)?1:0;

                /* Swap e0 and e1 bundles in the AET */
                var prev_edge= e0.prev;
                var next_edge= e1.next;
                if (next_edge != null)
                {
                    next_edge.prev = e0;
                }

                if (e0.bstate[Clip.ABOVE] == BundleState.BUNDLE_HEAD)
                {
                    var search= true;
                    while (search)
                    {
                        prev_edge= prev_edge.prev;
                        if (prev_edge != null)
                        {
                            if (prev_edge.bstate[Clip.ABOVE] != BundleState.BUNDLE_TAIL)
                            {
                                search= false;
                            }
                        }
                        else
                        {
                            search= false;
                        }
                    }
                }
                if (prev_edge == null)
                {
                    aet.top_node.prev = e1;
                    e1.next           = aet.top_node;
                    aet.top_node      = e0.next;
                }
                else
                {
                    prev_edge.next.prev = e1;
                    e1.next             = prev_edge.next;
                    prev_edge.next      = e0.next;
                }
                e0.next.prev = prev_edge;
                e1.next.prev = e1;
                e0.next      = next_edge;
                if( gpcas.geometry.Clip.DEBUG )
                {
                    out_poly.print();
                }
            } /* End of IT loop*/

            /* Prepare for next scanbeam */
            for ( var edge= aet.top_node; (edge != null); edge = edge.next)
            {
                var next_edge= edge.next;
                var succ_edge= edge.succ;
                if ((edge.top.y == yt) && (succ_edge!=null))
                {
                    /* Replace AET edge by its successor */
                    succ_edge.outp[Clip.BELOW]= edge.outp[Clip.ABOVE];
                    succ_edge.bstate[Clip.BELOW]= edge.bstate[Clip.ABOVE];
                    succ_edge.bundle[Clip.BELOW][Clip.CLIP]= edge.bundle[Clip.ABOVE][Clip.CLIP];
                    succ_edge.bundle[Clip.BELOW][Clip.SUBJ]= edge.bundle[Clip.ABOVE][Clip.SUBJ];
                    var prev_edge= edge.prev;
                    if ( prev_edge != null )
                        prev_edge.next = succ_edge;
                    else
                        aet.top_node = succ_edge;
                    if (next_edge != null)
                        next_edge.prev= succ_edge;
                    succ_edge.prev = prev_edge;
                    succ_edge.next = next_edge;
                }
                else
                {
                    /* Update this edge */
                    edge.outp[Clip.BELOW]= edge.outp[Clip.ABOVE];
                    edge.bstate[Clip.BELOW]= edge.bstate[Clip.ABOVE];
                    edge.bundle[Clip.BELOW][Clip.CLIP]= edge.bundle[Clip.ABOVE][Clip.CLIP];
                    edge.bundle[Clip.BELOW][Clip.SUBJ]= edge.bundle[Clip.ABOVE][Clip.SUBJ];
                    edge.xb= edge.xt;
                }
                edge.outp[Clip.ABOVE]= null;
            }
        }
    } /* === END OF SCANBEAM PROCESSING ================================== */

    /* Generate result polygon from out_poly */
    result = out_poly.getResult(polyClass);
	//console.log("result = "+result);

    return result ;
}

gpcstatic.EQ = function(a, b) {
    return (Math.abs(a - b) <= gpcas.geometry.Clip.GPC_EPSILON);
}

gpcstatic.PREV_INDEX = function( i, n) {
    return ((i - 1+ n) % n);
}

gpcstatic.NEXT_INDEX = function(i, n) {
    return ((i + 1) % n);
}

gpcstatic.OPTIMAL = function ( p, i) {
    return (p.getY(gpcas.geometry.Clip.PREV_INDEX (i, p.getNumPoints())) != p.getY(i)) ||
        (p.getY(gpcas.geometry.Clip.NEXT_INDEX(i, p.getNumPoints())) != p.getY(i)) ;
}

gpcstatic.create_contour_bboxes = function (p)
{
    var box= [] ;

    /* Construct contour bounding boxes */
    for ( var c= 0; c < p.getNumInnerPoly(); c++)
    {
        var inner_poly= p.getInnerPoly(c);
        box[c] = inner_poly.getBounds();
    }
    return box;
}

gpcstatic.minimax_test = function ( subj, clip, op){
    var s_bbox= gpcas.geometry.Clip.create_contour_bboxes(subj);
	var c_bbox= gpcas.geometry.Clip.create_contour_bboxes(clip);

	var subj_num_poly= subj.getNumInnerPoly();
	var clip_num_poly= clip.getNumInnerPoly();
	var o_table = ArrayHelper.create2DArray(subj_num_poly,clip_num_poly);

	/* Check all subject contour bounding boxes against clip boxes */
	for( var s= 0; s < subj_num_poly; s++ )
	{
	    for( var c= 0; c < clip_num_poly ; c++ )
	    {
	        o_table[s][c] =
	            (!((s_bbox[s].getMaxX() < c_bbox[c].getMinX()) ||
	                (s_bbox[s].getMinX() > c_bbox[c].getMaxX()))) &&
	                (!((s_bbox[s].getMaxY() < c_bbox[c].getMinY()) ||
	                    (s_bbox[s].getMinY() > c_bbox[c].getMaxY())));
	    }
	}

	/* For each clip contour, search for any subject contour overlaps */
	for( var c= 0; c < clip_num_poly; c++ )
	{
	    var overlap= false;
	    for( var s= 0; !overlap && (s < subj_num_poly) ; s++)
	    {
	        overlap = o_table[s][c];
	    }
	    if (!overlap)
	    {
	        clip.setContributing( c, false ); // Flag non contributing status
	    }
	}

	if (op == gpcas.geometry.OperationType.GPC_INT)
	{
	    /* For each subject contour, search for any clip contour overlaps */
	    for ( var s= 0; s < subj_num_poly; s++)
	    {
	        var overlap= false;
	        for ( var c= 0; !overlap && (c < clip_num_poly); c++)
	        {
	            overlap = o_table[s][c];
	        }
	        if (!overlap)
	        {
	            subj.setContributing( s, false ); // Flag non contributing status
	        }
	    }
	}
}

gpcstatic.bound_list = function( lmt_table, y) {
    if( lmt_table.top_node == null )
    {
        lmt_table.top_node = new LmtNode(y);
        return lmt_table.top_node ;
    }
    else
    {
        var prev= null ;
        var node= lmt_table.top_node ;
        var done= false ;
        while( !done )
        {
            if( y < node.y )
            {
                /* Insert a new LMT node before the current node */
                var existing_node= node ;
                node = new LmtNode(y);
                node.next = existing_node ;
                if( prev == null )
                {
                    lmt_table.top_node = node ;
                }
                else
                {
                    prev.next = node ;
                }
                //               if( existing_node == lmt_table.top_node )
                //               {
                //                  lmt_table.top_node = node ;
                //               }
                done = true ;
            }
            else if ( y > node.y )
            {
                /* Head further up the LMT */
                if( node.next == null )
                {
                    node.next = new LmtNode(y);
                    node = node.next ;
                    done = true ;
                }
                else
                {
                    prev = node ;
                    node = node.next ;
                }
            }
            else
            {
                /* Use this existing LMT node */
                done = true ;
            }
        }
        return node ;
    }
}

gpcstatic.insert_bound = function ( lmt_node, e) {
    if( lmt_node.first_bound == null )
{
    /* Link node e to the tail of the list */
    lmt_node.first_bound = e ;
}
else
{
    var done= false ;
    var prev_bound= null ;
    var current_bound= lmt_node.first_bound ;
    while( !done )
    {
        /* Do primary sort on the x field */
        if (e.bot.x <  current_bound.bot.x)
        {
            /* Insert a new node mid-list */
            if( prev_bound == null )
            {
                lmt_node.first_bound = e ;
            }
            else
            {
                prev_bound.next_bound = e ;
            }
            e.next_bound = current_bound ;

            //               EdgeNode existing_bound = current_bound ;
            //               current_bound = e ;
            //               current_bound.next_bound = existing_bound ;
            //               if( lmt_node.first_bound == existing_bound )
            //               {
            //                  lmt_node.first_bound = current_bound ;
            //               }
            done = true ;
        }
        else if (e.bot.x == current_bound.bot.x)
        {
            /* Do secondary sort on the dx field */
            if (e.dx < current_bound.dx)
            {
                /* Insert a new node mid-list */
                if( prev_bound == null )
                {
                    lmt_node.first_bound = e ;
                }
                else
                {
                    prev_bound.next_bound = e ;
                }
                e.next_bound = current_bound ;
                //                  EdgeNode existing_bound = current_bound ;
                //                  current_bound = e ;
                //                  current_bound.next_bound = existing_bound ;
                //                  if( lmt_node.first_bound == existing_bound )
                //                  {
                //                     lmt_node.first_bound = current_bound ;
                //                  }
                done = true ;
            }
            else
            {
                /* Head further down the list */
                if( current_bound.next_bound == null )
                {
                    current_bound.next_bound = e ;
                    done = true ;
                }
                else
                {
                    prev_bound = current_bound ;
                    current_bound = current_bound.next_bound ;
                }
            }
        }
        else
        {
            /* Head further down the list */
            if( current_bound.next_bound == null )
            {
                current_bound.next_bound = e ;
                done = true ;
            }
            else
            {
                prev_bound = current_bound ;
                current_bound = current_bound.next_bound ;
            }
        }
    }
}
}

gpcstatic.add_edge_to_aet = function ( aet, edge) {
    if ( aet.top_node == null )
{
    /* Append edge onto the tail end of the AET */
    aet.top_node = edge;
    edge.prev = null ;
    edge.next= null;
}
else
{
    var current_edge= aet.top_node ;
    var prev= null ;
    var done= false ;
    while( !done )
    {
        /* Do primary sort on the xb field */
        if (edge.xb < current_edge.xb)
        {
            /* Insert edge here (before the AET edge) */
            edge.prev= prev;
            edge.next= current_edge ;
            current_edge.prev = edge ;
            if( prev == null )
            {
                aet.top_node = edge ;
            }
            else
            {
                prev.next = edge ;
            }
            //               if( current_edge == aet.top_node )
            //               {
            //                  aet.top_node = edge ;
            //               }
            //               current_edge = edge ;
            done = true;
        }
        else if (edge.xb == current_edge.xb)
        {
            /* Do secondary sort on the dx field */
            if (edge.dx < current_edge.dx)
            {
                /* Insert edge here (before the AET edge) */
                edge.prev= prev;
                edge.next= current_edge ;
                current_edge.prev = edge ;
                if( prev == null )
                {
                    aet.top_node = edge ;
                }
                else
                {
                    prev.next = edge ;
                }
                //                  if( current_edge == aet.top_node )
                //                  {
                //                     aet.top_node = edge ;
                //                  }
                //                  current_edge = edge ;
                done = true;
            }
            else
            {
                /* Head further into the AET */
                prev = current_edge ;
                if( current_edge.next == null )
                {
                    current_edge.next = edge ;
                    edge.prev = current_edge ;
                    edge.next = null ;
                    done = true ;
                }
                else
                {
                    current_edge = current_edge.next ;
                }
            }
        }
        else
        {
            /* Head further into the AET */
            prev = current_edge ;
            if( current_edge.next == null )
            {
                current_edge.next = edge ;
                edge.prev = current_edge ;
                edge.next = null ;
                done = true ;
            }
            else
            {
                current_edge = current_edge.next ;
            }
        }
    }
}
}

gpcstatic.add_to_sbtree = function ( sbte, y) {
    if( sbte.sb_tree == null )
		{
		    /* Add a new tree node here */
		    sbte.sb_tree = new gpcas.geometry.ScanBeamTree( y );
		    sbte.sbt_entries++ ;
		    return ;
		}
	var tree_node= sbte.sb_tree ;
	var done= false ;
	while( !done )
	{
	    if ( tree_node.y > y)
	    {
	        if( tree_node.less == null )
	        {
	            tree_node.less = new gpcas.geometry.ScanBeamTree(y);
	            sbte.sbt_entries++ ;
	            done = true ;
	        }
	        else
	        {
	            tree_node = tree_node.less ;
	        }
	    }
	    else if ( tree_node.y < y)
	    {
	        if( tree_node.more == null )
	        {
	            tree_node.more = new gpcas.geometry.ScanBeamTree(y);
	            sbte.sbt_entries++ ;
	            done = true ;
	        }
	        else
	        {
	            tree_node = tree_node.more ;
	        }
	    }
	    else
	    {
	        done = true ;
	    }
	}
}


gpcstatic.build_lmt = function( lmt_table,
							sbte,
							p,
							type, //poly type SUBJ/Clip.CLIP
							op) {
			/* Create the entire input polygon edge table in one go */
			var edge_table= new gpcas.geometry.EdgeTable();

			for ( var c= 0; c < p.getNumInnerPoly(); c++)
			{
				var ip= p.getInnerPoly(c);
				if( !ip.isContributing(0) )
				{
					/* Ignore the non-contributing contour */
					ip.setContributing(0, true);
				}
				else
				{


					/* Perform contour optimisation */
					var num_vertices= 0;
					var e_index= 0;
					edge_table = new gpcas.geometry.EdgeTable();
					for ( var i= 0; i < ip.getNumPoints(); i++)
					{
						if( gpcas.geometry.Clip.OPTIMAL(ip, i) )
						{
							var x= ip.getX(i);
							var y= ip.getY(i);
							edge_table.addNode( x, y );

							/* Record vertex in the scanbeam table */
                            gpcas.geometry.Clip.add_to_sbtree( sbte, ip.getY(i) );

							num_vertices++;
						}
					}

					/* Do the contour forward pass */

					for ( var min= 0; min < num_vertices; min++)
					{
						/* If a forward local minimum... */
						if( edge_table.FWD_MIN( min ) )
						{
							/* Search for the next local maximum... */
							var num_edges= 1;
							var max= gpcas.geometry.Clip.NEXT_INDEX( min, num_vertices );
							while( edge_table.NOT_FMAX( max ) )
							{
								num_edges++;
								max = gpcas.geometry.Clip.NEXT_INDEX( max, num_vertices );
							}

							/* Build the next edge list */
							var v= min;
							var e= edge_table.getNode( e_index );
							e.bstate[gpcas.geometry.Clip.BELOW] = gpcas.geometry.BundleState.UNBUNDLED;
							e.bundle[gpcas.geometry.Clip.BELOW][Clip.CLIP] = 0;
							e.bundle[gpcas.geometry.Clip.BELOW][Clip.SUBJ] = 0;

							for ( var i= 0; i < num_edges; i++)
							{
								var ei= edge_table.getNode( e_index+i );
								var ev= edge_table.getNode( v );

								ei.xb    = ev.vertex.x;
								ei.bot.x = ev.vertex.x;
								ei.bot.y = ev.vertex.y;

								v = gpcas.geometry.Clip.NEXT_INDEX(v, num_vertices);
								ev = edge_table.getNode( v );

								ei.top.x= ev.vertex.x;
								ei.top.y= ev.vertex.y;
								ei.dx= (ev.vertex.x - ei.bot.x) / (ei.top.y - ei.bot.y);
								ei.type = type;
								ei.outp[gpcas.geometry.Clip.ABOVE] = null ;
								ei.outp[gpcas.geometry.Clip.BELOW] = null;
								ei.next = null;
								ei.prev = null;
								ei.succ = ((num_edges > 1) && (i < (num_edges - 1))) ? edge_table.getNode(e_index+i+1) : null;
								ei.pred = ((num_edges > 1) && (i > 0)) ? edge_table.getNode(e_index+i-1) : null ;
								ei.next_bound = null ;
								ei.bside[gpcas.geometry.Clip.CLIP] = (op == gpcas.geometry.OperationType.GPC_DIFF) ? gpcas.geometry.Clip.RIGHT : gpcas.geometry.Clip.LEFT;
								ei.bside[gpcas.geometry.Clip.SUBJ] = gpcas.geometry.Clip.LEFT ;
							}
							Clip.insert_bound( gpcas.geometry.Clip.bound_list(lmt_table, edge_table.getNode(min).vertex.y), e);
							if( gpcas.geometry.Clip.DEBUG )
							{
								//console.log("fwd");
								lmt_table.print();
							}
							e_index += num_edges;
						}
					}

					/* Do the contour reverse pass */
					for ( var min= 0; min < num_vertices; min++)
					{
						/* If a reverse local minimum... */
						if ( edge_table.REV_MIN( min ) )
						{
							/* Search for the previous local maximum... */
							var num_edges= 1;
							var max= gpcas.geometry.Clip.PREV_INDEX(min, num_vertices);
							while( edge_table.NOT_RMAX( max ) )
							{
								num_edges++;
								max = gpcas.geometry.Clip.PREV_INDEX(max, num_vertices);
							}

							/* Build the previous edge list */
							var v= min;
							var e= edge_table.getNode( e_index );
							e.bstate[gpcas.geometry.Clip.BELOW] = BundleState.UNBUNDLED;
							e.bundle[gpcas.geometry.Clip.BELOW][gpcas.geometry.Clip.CLIP] = 0;
							e.bundle[gpcas.geometry.Clip.BELOW][gpcas.geometry.Clip.SUBJ] = 0;

							for (var i= 0; i < num_edges; i++)
							{
								var ei= edge_table.getNode( e_index+i );
								var ev= edge_table.getNode( v );

								ei.xb    = ev.vertex.x;
								ei.bot.x = ev.vertex.x;
								ei.bot.y = ev.vertex.y;

								v= gpcas.geometry.Clip.PREV_INDEX(v, num_vertices);
								ev = edge_table.getNode( v );

								ei.top.x = ev.vertex.x;
								ei.top.y = ev.vertex.y;
								ei.dx = (ev.vertex.x - ei.bot.x) / (ei.top.y - ei.bot.y);
								ei.type = type;
								ei.outp[gpcas.geometry.Clip.ABOVE] = null;
								ei.outp[gpcas.geometry.Clip.BELOW] = null;
								ei.next = null ;
								ei.prev = null;
								ei.succ = ((num_edges > 1) && (i < (num_edges - 1))) ? edge_table.getNode(e_index+i+1) : null;
								ei.pred = ((num_edges > 1) && (i > 0)) ? edge_table.getNode(e_index+i-1) : null ;
								ei.next_bound = null ;
								ei.bside[gpcas.geometry.Clip.CLIP] = (op == gpcas.geometry.OperationType.GPC_DIFF) ? gpcas.geometry.Clip.RIGHT : gpcas.geometry.Clip.LEFT;
								ei.bside[gpcas.geometry.Clip.SUBJ] = gpcas.geometry.Clip.LEFT;
							}
							Clip.insert_bound( gpcas.geometry.Clip.bound_list(lmt_table, edge_table.getNode(min).vertex.y), e);
							if( gpcas.geometry.Clip.DEBUG )
							{
								//console.log("rev");
								lmt_table.print();
							}
							e_index+= num_edges;
						}
					}
				}
			}
			return edge_table;
		}


gpcstatic.add_st_edge = function( st, it, edge, dy) {
    if (st == null)
    {
        /* Append edge onto the tail end of the ST */
        st = new gpcas.geometry.StNode( edge, null );
    }
    else
    {
        var den= (st.xt - st.xb) - (edge.xt - edge.xb);

        /* If new edge and ST edge don't cross */
        if( (edge.xt >= st.xt) || (edge.dx == st.dx) || (Math.abs(den) <= gpcas.geometry.Clip.GPC_EPSILON))
        {
            /* No intersection - insert edge here (before the ST edge) */
            var existing_node= st;
            st = new StNode( edge, existing_node );
        }
        else
        {
            /* Compute intersection between new edge and ST edge */
            var r= (edge.xb - st.xb) / den;
            var x= st.xb + r * (st.xt - st.xb);
            var y= r * dy;

            /* Insert the edge pointers and the intersection point in the IT */
            it.top_node = gpcas.geometry.Clip.add_intersection(it.top_node, st.edge, edge, x, y);

            /* Head further into the ST */
            st.prev = gpcas.geometry.Clip.add_st_edge(st.prev, it, edge, dy);
        }
    }
    return st ;
}



gpcstatic.add_intersection = function ( it_node,
    edge0,
    edge1,
    x,
    y) {
    if (it_node == null)
    {
        /* Append a new node to the tail of the list */
        it_node = new gpcas.geometry.ItNode( edge0, edge1, x, y, null );
    }
    else
    {
        if ( it_node.point.y > y)
        {
            /* Insert a new node mid-list */
            var existing_node= it_node ;
            it_node = new gpcas.geometry.ItNode( edge0, edge1, x, y, existing_node );
        }
        else
        {
            /* Head further down the list */
            it_node.next = gpcas.geometry.Clip.add_intersection( it_node.next, edge0, edge1, x, y);
        }
    }
    return it_node ;
}


/////////// AetTree ////////////////////////////////////
gpcas.geometry.AetTree = function(){
    this.top_node = null; //EdgeNode
};
AetTree = gpcas.geometry.AetTree;
gpcas.geometry.AetTree.prototype.print = function() {
    //console.log("aet");
    for( var edge= this.top_node ; (edge != null) ; edge = edge.next ) {
        //console.log("edge.vertex.x="+edge.vertex.x+"  edge.vertex.y="+edge.vertex.y);
    }
}


///////////////  BundleState  //////////////////////////////
gpcas.geometry.BundleState = function(state){
    this.m_State = state ; //String
};
gpcas.geometry.BundleState.UNBUNDLED = new gpcas.geometry.BundleState("UNBUNDLED");
gpcas.geometry.BundleState.BUNDLE_HEAD = new gpcas.geometry.BundleState("BUNDLE_HEAD");
gpcas.geometry.BundleState.BUNDLE_TAIL = new gpcas.geometry.BundleState("BUNDLE_TAIL");
gpcas.geometry.BundleState.prototype.toString = function() {
    return this.m_State;
};
BundleState = gpcas.geometry.BundleState;

/////////////// EdgeNode ////////////////////////////
gpcas.geometry.EdgeNode = function(){
	this.vertex= new Point(); /* Piggy-backed contour vertex data  */
	this.bot= new Point(); /* Edge lower (x, y) coordinate      */
	this.top= new Point(); /* Edge upper (x, y) coordinate      */
	this.xb;           /* Scanbeam bottom x coordinate      */
	this.xt;           /* Scanbeam top x coordinate         */
	this.dx;           /* Change in x for a unit y increase */
	this.type;         /* Clip / subject edge flag          */
	this.bundle = ArrayHelper.create2DArray(2,2);      /* Bundle edge flags                 */
	this.bside= [];         /* Bundle left / right indicators    */
	this.bstate= []; /* Edge bundle state                 */
	this.outp= []; /* Output polygon / tristrip pointer */
	this.prev;         /* Previous edge in the AET          */
	this.next;         /* Next edge in the AET              */
	this.pred;         /* Edge connected at the lower end   */
	this.succ;         /* Edge connected at the upper end   */
	this.next_bound;   /* Pointer to next bound in LMT      */
};



////////////////   EdgeTable /////////////////////////////////////////


gpcas.geometry.EdgeTable = function() {
	this.m_List = new gpcas.util.ArrayList();
};
gpcas.geometry.EdgeTable.prototype.addNode = function(x,y){
	var node= new gpcas.geometry.EdgeNode();
    node.vertex.x = x ;
    node.vertex.y = y ;
    this.m_List.add( node );

}
gpcas.geometry.EdgeTable.prototype.getNode = function (index) {
	return this.m_List.get(index);
}
gpcas.geometry.EdgeTable.prototype.FWD_MIN = function(i) {
	var m_List = this.m_List;

    var prev= (m_List.get(Clip.PREV_INDEX(i, m_List.size())));
    var next= (m_List.get(Clip.NEXT_INDEX(i, m_List.size())));
    var ith= (m_List.get(i));

    return ((prev.vertex.y >= ith.vertex.y) &&
                 (next.vertex.y >  ith.vertex.y));
}
gpcas.geometry.EdgeTable.prototype.NOT_FMAX = function ( i) {
	var m_List = this.m_List;

    var next= (m_List.get(Clip.NEXT_INDEX(i, m_List.size())));
    var ith= (m_List.get(i));
    return(next.vertex.y > ith.vertex.y);
}
gpcas.geometry.EdgeTable.prototype.REV_MIN = function ( i) {
	var m_List = this.m_List;

    var prev= (m_List.get(Clip.PREV_INDEX(i, m_List.size())));
    var next= (m_List.get(Clip.NEXT_INDEX(i, m_List.size())));
    var ith= (m_List.get(i));
    return ((prev.vertex.y >  ith.vertex.y) && (next.vertex.y >= ith.vertex.y));
}
gpcas.geometry.EdgeTable.prototype.NOT_RMAX = function (i) {
	var m_List = this.m_List;

    var prev= (m_List.get(Clip.PREV_INDEX(i, m_List.size())));
    var ith= (m_List.get(i));
    return (prev.vertex.y > ith.vertex.y) ;
}


/////////////////////   HState   //////////////////////////////////////
gpcas.geometry.HState = function(){};
gpcas.geometry.HState.NH = 0; /* No horizontal edge                */
gpcas.geometry.HState.BH = 1; /* Bottom horizontal edge            */
gpcas.geometry.HState.TH = 2; /* Top horizontal edge               */

HState = gpcas.geometry.HState;

var NH = gpcas.geometry.HState.NH;
var BH = gpcas.geometry.HState.BH;
var TH = gpcas.geometry.HState.TH;

/* Horizontal edge state transitions within scanbeam boundary */
gpcas.geometry.HState.next_h_state =
      [
      /*        ABOVE     BELOW     CROSS */
      /*        L   R     L   R     L   R */
      /* NH */ [BH, TH,   TH, BH,   NH, NH],
      /* BH */ [NH, NH,   NH, NH,   TH, TH],
      /* TH */ [NH, NH,   NH, NH,   BH, BH]
      ];



///////////////////////    	  IntersectionPoint /////////////////////////////
gpcas.geometry.IntersectionPoint = function(p1,p2,p3){
	this.polygonPoint1 = p1; /* of Point */;
	this.polygonPoint2 = p2;  /* of Point */;
	this.intersectionPoint = p3 ;
};
gpcas.geometry.IntersectionPoint.prototype.toString = function (){
	return "P1 :"+polygonPoint1.toString()+" P2:"+polygonPoint2.toString()+" IP:"+intersectionPoint.toString();
}


///////////////////////////    ItNode   ///////////////
gpcas.geometry.ItNode = function(edge0, edge1, x, y, next){
	this.ie= [];     /* Intersecting edge (bundle) pair   */
	this.point= new Point(x,y); /* Point of intersection             */
	this.next=next;                         /* The next intersection table node  */

	this.ie[0] = edge0 ;
    this.ie[1] = edge1 ;

};


///////////////////////////    ItNodeTable   ///////////////
gpcas.geometry.ItNodeTable = function(){
	this.top_node;
}
ItNodeTable = gpcas.geometry.ItNodeTable;

gpcas.geometry.ItNodeTable.prototype.build_intersection_table = function (aet, dy) {
    var st= null ;

    /* Process each AET edge */
    for (var edge= aet.top_node ; (edge != null); edge = edge.next)
    {
        if( (edge.bstate[Clip.ABOVE] == BundleState.BUNDLE_HEAD) ||
                (edge.bundle[Clip.ABOVE][Clip.CLIP] != 0) ||
                (edge.bundle[Clip.ABOVE][Clip.SUBJ] != 0) )
        {
            st = gpcas.geometry.Clip.add_st_edge(st, this, edge, dy);
        }


    }
}

////////////// Line //////////////////////////
gpcas.geometry.Line = function(){
	this.start;
	this.end;
}

////////////   LineHelper /////////////////////

gpcas.geometry.LineHelper = function(){};
gpcas.geometry.LineHelper.equalPoint = function (p1,p2){
	return ((p1[0]==p2[0])&&(p1[1]==p2[1]));
}
gpcas.geometry.LineHelper.equalVertex = function(s1,e1,s2,e2) {
	return (
		((gpcas.geometry.LineHelper.equalPoint(s1,s2))&&(gpcas.geometry.LineHelper.equalPoint(e1,e2)))
		||
		((gpcas.geometry.LineHelper.equalPoint(s1,e2))&&(gpcas.geometry.LineHelper.equalPoint(e1,s2)))
		);
}
gpcas.geometry.LineHelper.distancePoints = function(p1, p2){
	return Math.sqrt((p2[0]-p1[0])*(p2[0]-p1[0]) + (p2[1]-p1[1])*(p2[1]-p1[1]));
}
gpcas.geometry.LineHelper.clonePoint = function(p){
	return [p[0],p[1]];
}
gpcas.geometry.LineHelper.cloneLine = function(line){
	var res  = [];
	for (var i = 0; i<line.length; i++){
		res[i]=[line[i][0],line[i][1]];
	}
	return res;
}
gpcas.geometry.LineHelper.addLineToLine = function(line1,line2) {
	for (var i = 0; i<line2.length; i++){
		line1.push(clonePoint(line2[i]));
	}
}
gpcas.geometry.LineHelper.roundPoint = function(p) {
	p[0]=Math.round(p[0]);
	p[1]=Math.round(p[1]);
}
//---------------------------------------------------------------
//Checks for intersection of Segment if as_seg is true.
//Checks for intersection of Line if as_seg is false.
//Return intersection of Segment "AB" and Segment "EF" as a Point
//Return null if there is no intersection
//---------------------------------------------------------------
gpcas.geometry.LineHelper.lineIntersectLine = function(A,B,E,F,as_seg)
{
	if(as_seg == null) as_seg = true;
	var ip;
	var a1;
	var a2;
	var b1;
	var b2;
	var c1;
	var c2;

	a1= B.y-A.y;
	b1= A.x-B.x;
	c1= B.x*A.y - A.x*B.y;
	a2= F.y-E.y;
	b2= E.x-F.x;
	c2= F.x*E.y - E.x*F.y;

	var denom=a1*b2 - a2*b1;
	if(denom == 0){
		return null;
	}
	ip=new Point();
	ip.x=(b1*c2 - b2*c1)/denom;
	ip.y=(a2*c1 - a1*c2)/denom;

	//---------------------------------------------------
	//Do checks to see if intersection to endpoints
	//distance is longer than actual Segments.
	//Return null if it is with any.
	//---------------------------------------------------
	if(as_seg){
		if(Math.pow((ip.x - B.x) + (ip.y - B.y), 2) > Math.pow((A.x - B.x) + (A.y - B.y), 2)){
			return null;
		}
		if(Math.pow((ip.x - A.x) + (ip.y - A.y), 2) > Math.pow((A.x - B.x) + (A.y - B.y), 2)){
			return null;
		}

		if(Math.pow((ip.x - F.x) + (ip.y - F.y), 2) > Math.pow((E.x - F.x) + (E.y - F.y), 2)){
			return null;
		}
		if(Math.pow((ip.x - E.x) + (ip.y - E.y), 2) > Math.pow((E.x - F.x) + (E.y - F.y), 2)){
			return null;
		}
	}
	return new Point(Math.round(ip.x),Math.round(ip.y));
}


//////////////  LineIntersection  ///////////////////////
gpcas.geometry.LineIntersection = function(){};
gpcas.geometry.LineIntersection.iteratePoints = function(points, s1, s2,e1,e2) {
	var direction=true;
	var pl = points.length;
	var s1Ind = points.indexOf(s1);
	var s2Ind = points.indexOf(s2);
	var start = s1Ind;

	if (s2Ind>s1Ind) direction=false;
	var newPoints  = [];
	var point  ;

	if (direction){
		for (var i =0; i<pl; i++){
			point=(i+start<pl)?points[i+start]:points[i+start-pl];
			newPoints.push(point);
			if ((equals(point, e1))||(equals(point, e2))){
				break;
			}
		}
	} else {
		for (var i =pl; i>=0; i--){
			point=(i+start<pl)?points[i+start]:points[i+start-pl];
			newPoints.push(point);
			if ((equals(point, e1))||(equals(point, e2))){
				break;
			}
		}
	}

	return newPoints;
}

gpcas.geometry.LineIntersection.intersectPoly = function(poly, line /* of Points */){
	var res = [];
	var numPoints = poly.getNumPoints();

	//points
	var ip ;
	var p1 ;
	var p2 ;
	var p3 ;
	var p4 ;
	var firstIntersection  = null;
	var lastIntersection   = null;
	var firstIntersectionLineIndex=-1;
	var lastIntersectionLineIndex=-1;
	var firstFound  = false;

	for (var i  = 1; i<line.length; i++){
		p1=line[i-1];
		p2=line[i];
		var maxDist  = 0;
		var minDist	 = Number.MAX_VALUE;
		var dist  = -1;
		for (var j  = 0; j<numPoints; j++){
			p3=poly.getPoint(j==0?numPoints-1:j-1);
			p4=poly.getPoint(j);
			if ((ip=LineHelper.lineIntersectLine(p1,p2,p3,p4))!=null){
				dist=Point.distance(ip,p2);

				if ((dist>maxDist)&&(!firstFound)){
					maxDist=dist;
					firstIntersection=new IntersectionPoint(p3,p4,ip);
					firstIntersectionLineIndex=i;
				}
				if (dist<minDist){
					minDist=dist;
					lastIntersection=new IntersectionPoint(p3,p4,ip);
					lastIntersectionLineIndex=i-1;
				}
			}
		}
		firstFound=(firstIntersection!=null);
	}
			/*
			Alert.show(firstIntersection.toString());
			Alert.show(lastIntersection.toString());*/
	if ((firstIntersection!=null)&&(lastIntersection!=null)){
		var newLine /* of Point */ = [];
		newLine[0]=firstIntersection.intersectionPoint;
		var j  = 1;
		for (var i = firstIntersectionLineIndex; i<=lastIntersectionLineIndex; i++){
			newLine[j++] = line[i];
		}
		newLine[newLine.length-1]=lastIntersection.intersectionPoint;
		if (
			(
				(equals(firstIntersection.polygonPoint1, lastIntersection.polygonPoint1))&&
				(equals(firstIntersection.polygonPoint2, lastIntersection.polygonPoint2))
			)||
			(
				(equals(firstIntersection.polygonPoint1, lastIntersection.polygonPoint2))&&
				(equals(firstIntersection.polygonPoint2, lastIntersection.polygonPoint1))
				)
		){
				var poly1 = new gpcas.geometry.PolySimple();
				poly1.add(newLine);
				var finPoly1  = poly.intersection(poly1);
				var finPoly2  = poly.xor(poly1);
				if ((checkPoly(finPoly1))&&(checkPoly(finPoly2))){
					return [finPoly1,finPoly2];
				}
		} else {
			var points1 = iteratePoints(poly.getPoints(),firstIntersection.polygonPoint1,firstIntersection.polygonPoint2, lastIntersection.polygonPoint1, lastIntersection.polygonPoint2);
			points1=points1.concat(newLine.reverse());
			var points2 = iteratePoints(poly.getPoints(),firstIntersection.polygonPoint2,firstIntersection.polygonPoint1, lastIntersection.polygonPoint1, lastIntersection.polygonPoint2);
			points2=points2.concat(newLine);
			var poly1  = new gpcas.geometry.PolySimple();
			poly1.add(points1);
			var poly2  = new gpcas.geometry.PolySimple();
			poly2.add(points2);
			var finPoly1  = poly.intersection(poly1);
			var finPoly2  = poly.intersection(poly2);

			if ((checkPoly(finPoly1))&&(checkPoly(finPoly2))){
					return [finPoly1,finPoly2];
				}
			}
		}
		return null;
}
gpcas.geometry.LineIntersection.checkPoly = function(poly) {
	var noHoles =0;
	for (var i  = 0; i<poly.getNumInnerPoly(); i++){
		var innerPoly  = poly.getInnerPoly(i);
		if (innerPoly.isHole()){
			return false;
		} else {
			noHoles++;
		}
		if (noHoles>1) return false;
	}
	return true;
}


///////////  LmtNode //////////////////////////

gpcas.geometry.LmtNode = function(yvalue) {
	this.y = yvalue;            /* Y coordinate at local minimum     */
	this.first_bound;  /* Pointer to bound list             */
	this.next;         /* Pointer to next local minimum     */
};
LmtNode = gpcas.geometry.LmtNode;

////////////// LmtTable ///////////////

gpcas.geometry.LmtTable = function(){
	this.top_node;
};
gpcas.geometry.LmtTable.prototype.print = function() {
    var n= 0;
    var lmt= this.top_node ;
    while( lmt != null )
    {
		//console.log("lmt("+n+")");
		for( var edge= lmt.first_bound ; (edge != null) ; edge = edge.next_bound )
		{
		   //console.log("edge.vertex.x="+edge.vertex.x+"  edge.vertex.y="+edge.vertex.y);
		}
		n++ ;
		lmt = lmt.next ;
    }
}

/////////////   OperationType //////////////////////////////////
gpcas.geometry.OperationType = function(type){
	this.m_Type = type;
}
gpcas.geometry.OperationType.GPC_DIFF= new gpcas.geometry.OperationType( "Difference" );
gpcas.geometry.OperationType.GPC_INT= new gpcas.geometry.OperationType( "Intersection" );
gpcas.geometry.OperationType.GPC_XOR= new gpcas.geometry.OperationType( "Exclusive or" );
gpcas.geometry.OperationType.GPC_UNION= new gpcas.geometry.OperationType( "Union" );

//////////// Poly  /////////////////////
// ---> an interface


/////////////// PolyDefault  /////////////////////
/**
 * <code>PolyDefault</code> is a default <code>Poly</code> implementation.
 * It provides support for both complex and simple polygons.  A <i>complex polygon</i>
 * is a polygon that consists of more than one polygon.  A <i>simple polygon</i> is a
 * more traditional polygon that contains of one inner polygon and is just a
 * collection of points.
 * <p>
 * <b>Implementation Note:</b> If a point is added to an empty <code>PolyDefault</code>
 * object, it will create an inner polygon of type <code>PolySimple</code>.
 *
 * @see PolySimple
 *
 * @author  Dan Bridenbecker, Solution Engineering, Inc.
 */
gpcas.geometry.PolyDefault = function(isHole) {
	if(isHole == null) isHole = false;

	   /**
    * Only applies to the first poly and can only be used with a poly that contains one poly
    */
	this.m_IsHole= isHole ;
    this.m_List= new gpcas.util.ArrayList();
}
 /**
    * Return true if the given object is equal to this one.
    */
gpcas.geometry.PolyDefault.prototype.equals = function ( obj) {
    if(!(obj instanceof PolyDefault)){
		return false;
    }
    var that = obj;

    if( this.m_IsHole != that.m_IsHole ) return false ;
    if( !equals(this.m_List, that.m_List ) ) return false ;

    return true ;
}
   /**
    * Return the hashCode of the object.
    *
    * @return an integer value that is the same for two objects
    * whenever their internal representation is the same (equals() is true)
    **/
gpcas.geometry.PolyDefault.prototype.hashCode = function () {
	var m_List = this.m_List;

    var result= 17;
    result = 37*result + m_List.hashCode();
    return result;
}
   /**
    * Remove all of the points.  Creates an empty polygon.
    */
gpcas.geometry.PolyDefault.prototype.clear = function() {
    this.m_List.clear();
}

gpcas.geometry.PolyDefault.prototype.add = function(arg0,arg1) {
	var args = [];

	args[0] = arg0;
	if(arg1) {
		args[1] = arg1;
	}
	if (args.length==2){
		this.addPointXY(args[0], args[1]);
   	} else if (args.length==1){
   		if (args[0] instanceof Point){
   			this.addPoint(args[0]);
   		} else if (args[0] instanceof gpcas.geometry.PolySimple){
   			this.addPoly(args[0]);
   		} else if (args[0] instanceof Array){
   			var arr  = args[0];
   			if ((arr.length==2)&&(arr[0] instanceof Number)&&(arr[1] instanceof Number)){
   				this.add(arr[0] ,arr[1] )
   			} else {
   				for(var i=0; i<args[0].length ; i++) {
					this.add(args[0][i]);
				}
   			}
   		}
   	}
}
   /**
    * Add a point to the first inner polygon.
    * <p>
    * <b>Implementation Note:</b> If a point is added to an empty PolyDefault object,
    * it will create an inner polygon of type <code>PolySimple</code>.
    */
gpcas.geometry.PolyDefault.prototype.addPointXY = function(x, y) {
    this.addPoint(new Point( x, y ));
}
   /**
    * Add a point to the first inner polygon.
    * <p>
    * <b>Implementation Note:</b> If a point is added to an empty PolyDefault object,
    * it will create an inner polygon of type <code>PolySimple</code>.
    */
gpcas.geometry.PolyDefault.prototype.addPoint = function( p) {


	var m_List = this.m_List;

    if( m_List.size() == 0)
    {
        m_List.add(new gpcas.geometry.PolySimple());
    }
    (m_List.get(0)).addPoint(p);
}
 /**
    * Add an inner polygon to this polygon - assumes that adding polygon does not
    * have any inner polygons.
    *
    * @throws IllegalStateException if the number of inner polygons is greater than
    * zero and this polygon was designated a hole.  This would break the assumption
    * that only simple polygons can be holes.
    */
gpcas.geometry.PolyDefault.prototype.addPoly = function( p) {

	var m_IsHole = this.m_IsHole;
	var m_List = this.m_List;

    if( (m_List.size() > 0) && m_IsHole )
      {
         alert("ERROR : Cannot add polys to something designated as a hole.");
      }
    m_List.add( p );
}
   /**
    * Return true if the polygon is empty
    */
gpcas.geometry.PolyDefault.prototype.isEmpty = function() {
    return this.m_List.isEmpty();
}
 /**
    * Returns the bounding rectangle of this polygon.
    * <strong>WARNING</strong> Not supported on complex polygons.
    */
gpcas.geometry.PolyDefault.prototype.getBounds = function () {
	var m_List = this.m_List;
    if( m_List.size() == 0)
    {
        return new Rectangle();
    }
    else if( m_List.size() == 1)
    {
         var ip= this.getInnerPoly(0);
         return ip.getBounds();
    }
    else
    {
         console.log("getBounds not supported on complex poly.");
    }
}
   /**
    * Returns the polygon at this index.
    */
gpcas.geometry.PolyDefault.prototype.getInnerPoly = function(polyIndex) {
      return this.m_List.get(polyIndex);
}
   /**
    * Returns the number of inner polygons - inner polygons are assumed to return one here.
    */
gpcas.geometry.PolyDefault.prototype.getNumInnerPoly = function() {
	var m_List = this.m_List;
      return m_List.size();
}
   /**
    * Return the number points of the first inner polygon
    */
gpcas.geometry.PolyDefault.prototype.getNumPoints = function () {
    return (this.m_List.get(0)).getNumPoints() ;
}

   /**
    * Return the X value of the point at the index in the first inner polygon
    */
gpcas.geometry.PolyDefault.prototype.getX = function(index) {
      return (this.m_List.get(0)).getX(index) ;
}
gpcas.geometry.PolyDefault.prototype.getPoint = function(index){
		return (this.m_List.get(0)).getPoint(index) ;
}

gpcas.geometry.PolyDefault.prototype.getPoints = function(){
	return (this.m_List.get(0)).getPoints();
}


gpcas.geometry.PolyDefault.prototype.isPointInside = function (point) {
	var m_List = this.m_List;
   	if (!(m_List.get(0)).isPointInside(point)) return false;

	for (var i  = 0; i<m_List.size(); i++){
   		var poly  = m_List.get(i);
   			if ((poly.isHole())&&(poly.isPointInside(point))) return false;
   		}
   		return true;
}
     /**
    * Return the Y value of the point at the index in the first inner polygon
    */
gpcas.geometry.PolyDefault.prototype.getY = function (index) {
	var m_List = this.m_List;
      return (m_List.get(0)).getY(index) ;
}

   /**
    * Return true if this polygon is a hole.  Holes are assumed to be inner polygons of
    * a more complex polygon.
    *
    * @throws IllegalStateException if called on a complex polygon.
    */
gpcas.geometry.PolyDefault.prototype.isHole = function () {
	var m_List = this.m_List;
	var m_IsHole = this.m_IsHole;

      if( m_List.size() > 1)
      {
         alert( "Cannot call on a poly made up of more than one poly." );
      }
      return m_IsHole ;
}

   /**
    * Set whether or not this polygon is a hole.  Cannot be called on a complex polygon.
    *
    * @throws IllegalStateException if called on a complex polygon.
    */
gpcas.geometry.PolyDefault.prototype.setIsHole = function(isHole) {
    var m_List = this.m_List;
	if( m_List.size() > 1)
      {
         alert( "Cannot call on a poly made up of more than one poly." );
      }
    this.m_IsHole = isHole ;
}

   /**
    * Return true if the given inner polygon is contributing to the set operation.
    * This method should NOT be used outside the Clip algorithm.
    */
gpcas.geometry.PolyDefault.prototype.isContributing = function( polyIndex) {
      var m_List = this.m_List;
	  return (m_List.get(polyIndex)).isContributing(0);
}

    /**
    * Set whether or not this inner polygon is constributing to the set operation.
    * This method should NOT be used outside the Clip algorithm.
    *
    * @throws IllegalStateException if called on a complex polygon
    */
gpcas.geometry.PolyDefault.prototype.setContributing = function( polyIndex, contributes) {
    var m_List = this.m_List;
	if( m_List.size() != 1)
      {
        alert( "Only applies to polys of size 1" );
      }
     (m_List.get(polyIndex)).setContributing( 0, contributes );
}

   /**
    * Return a Poly that is the intersection of this polygon with the given polygon.
    * The returned polygon could be complex.
    *
    * @return the returned Poly will be an instance of PolyDefault.
    */
gpcas.geometry.PolyDefault.prototype.intersection = function(p) {
    return gpcas.geometry.Clip.intersection( p, this, "PolyDefault");
}

   /**
    * Return a Poly that is the union of this polygon with the given polygon.
    * The returned polygon could be complex.
    *
    * @return the returned Poly will be an instance of PolyDefault.
    */
gpcas.geometry.PolyDefault.prototype.union = function(p) {
	return gpcas.geometry.Clip.union( p, this, "PolyDefault");
}

   /**
    * Return a Poly that is the exclusive-or of this polygon with the given polygon.
    * The returned polygon could be complex.
    *
    * @return the returned Poly will be an instance of PolyDefault.
    */
gpcas.geometry.PolyDefault.prototype.xor = function(p) {
    return gpcas.geometry.Clip.xor( p, this, "PolyDefault" );
}

   /**
	* Return a Poly that is the difference of this polygon with the given polygon.
	* The returned polygon could be complex.
	*
	* @return the returned Poly will be an instance of PolyDefault.
	*/
gpcas.geometry.PolyDefault.prototype.difference = function(p){
	return gpcas.geometry.Clip.difference(p,this,"PolyDefault");
}

   /**
    * Return the area of the polygon in square units.
    */
gpcas.geometry.PolyDefault.prototype.getArea = function() {
      var area= 0.0;
      for( var i= 0; i < getNumInnerPoly() ; i++ )
      {
         var p= getInnerPoly(i);
         var tarea = p.getArea() * (p.isHole() ? -1.0: 1.0);
         area += tarea ;
      }
      return area ;
}

   // -----------------------
   // --- Package Methods ---
   // -----------------------
gpcas.geometry.PolyDefault.prototype.toString = function() {
    var res  = "";
	var m_List = this.m_List;
    for( var i= 0; i < m_List.size() ; i++ )
    {
         var p = this.getInnerPoly(i);
         res+=("InnerPoly("+i+").hole="+p.isHole());
         var points = [];
         for( var j= 0; j < p.getNumPoints() ; j++ )
         {
         	points.push(new Point(p.getX(j),p.getY(j)));
         }
         points = ArrayHelper.sortPointsClockwise(points) ;

		 for(var k =0 ; k< points.length ; k++) {
			res+=points[k].toString();
		 }

      }
      return res;
   }

///////////////  Polygon   /////////////////////////////////
gpcas.geometry.Polygon = function(){
	this.maxTop ;
	this.maxBottom ;
	this.maxLeft ;
	this.maxRight ;
	this.vertices  /* of Point */;
};
gpcas.geometry.Polygon.prototype.fromArray = function(v) {
	this.vertices = [];

	for(var i=0 ; i<v.length ; i++) {
		var pointArr = v[i];
		this.vertices.push(new Point(pointArr[0],pointArr[1]));
	}
}

		/*Normalize vertices in polygon to be ordered clockwise from most left point*/
gpcas.geometry.Polygon.prototype.normalize = function() {
	var maxLeftIndex ;
	var vertices = this.vertices;
	var newVertices = this.vertices;

	for (var i  = 0; i<vertices.length; i++){
		var vertex  = vertices[i];

		if ((maxTop==null)||(maxTop.y>vertex.y)||((maxTop.y==vertex.y)&&(vertex.x<maxTop.x))){
			maxTop=vertex;
		}
		if ((maxBottom==null)||(maxBottom.y<vertex.y)||((maxBottom.y==vertex.y)&&(vertex.x>maxBottom.x))){
			maxBottom=vertex;
		}
 		if ((maxLeft==null)||(maxLeft.x>vertex.x)||((maxLeft.x==vertex.x)&&(vertex.y>maxLeft.y))){
			maxLeft=vertex;
			maxLeftIndex=i;
		}
		if ((maxRight==null)||(maxRight.x<vertex.x)||((maxRight.x==vertex.x)&&(vertex.y<maxRight.y))){
			maxRight=vertex;
		}
	}

	if (maxLeftIndex>0){
		newVertices = [];
		var j = 0;
		for (var i=maxLeftIndex; i<vertices.length;i++){
			newVertices[j++]=this.vertices[i];
		}
		for (var i=0; i<maxLeftIndex; i++){
			newVertices[j++]=this.vertices[i];
		}
		vertices=newVertices;
	}
	var reverse   = false;
	for(var k=0; k<this.vertices.length ; k++) {
		var vertex  =  this.vertices[k];
	    if (equals(vertex, maxBottom)){
			reverse=true;
			break;
		} else if (equals(vertex, maxTop)){
			break;
		}
	}
	if (reverse){
		newVertices= [];
		newVertices[0]=vertices[0];
		var j =1;
		for (var i=vertices.length-1; i>0; i--){
			newVertices[j++]=this.vertices[i];
		}
		vertices=newVertices;
	}
}
gpcas.geometry.Polygon.prototype.getVertexIndex = function(vertex){
	for (var i=0; i<this.vertices.length; i++){
		if (equals(vertices[i], vertex)){
			return i;
		}
	}
	return -1;
}
gpcas.geometry.Polygon.prototype.insertVertex = function(vertex1,vertex2, newVertex){
	var vertex1Index  = getVertexIndex(vertex1);
	var vertex2Index  = getVertexIndex(vertex2);
	if ((vertex1Index==-1)||(vertex2Index==-1)){
		return false;
	}

	if (vertex2Index<vertex1Index){
		var i  = vertex1Index;
		vertex1Index=vertex2Index;
		vertex2Index=i;
	}
	if (vertex2Index==vertex1Index+1){
		var newVertices  = [];
		for (var i =0; i<=vertex1Index; i++){
			newVertices[i]=this.vertices[i];
		}
		newVertices[vertex2Index]=newVertex;
		for (var i =vertex2Index; i<this.vertices.length; i++){
			newVertices[i+1]=this.vertices[i];
		}
		this.vertices=newVertices;
	} else if ((vertex2Index==vertices.length-1)&&(vertex1Index==0)){
		this.vertices.push(newVertex);
	}
	return true;
}
gpcas.geometry.Polygon.prototype.clone = function() {
	var res = new gpcas.geometry.Polygon();
	res.vertices=vertices.slice(this.vertices.length-1);
	return res;
}
gpcas.geometry.Polygon.prototype.toString = function() {
	var vertices = this.vertices;
	var res  = "[";
	for (var i  =0; i<vertices.length; i++){
		var vertex  = vertices[i];
		res+=(i>0?",":"")+"["+vertex.x+","+vertex.y+"]";
	}
	res+="]";
	return res;
}


////////////////////  PolygonNode ///////////////////////////
gpcas.geometry.PolygonNode = function(next, x, y) {


	this.active;                 /* Active flag / vertex count        */
	this.hole;                /* Hole / external contour flag      */
	this.v= [] ; /* Left and right vertex list ptrs   */
	this.next;                   /* Pointer to next polygon contour   */
	this.proxy;                  /* Pointer to actual structure used  */

	/* Make v[Clip.LEFT] and v[Clip.RIGHT] point to new vertex */
	var vn= new VertexNode( x, y );

	this.v[Clip.LEFT ] = vn ;
	this.v[Clip.RIGHT] = vn ;

	this.next = next ;
	this.proxy = this ; /* Initialise proxy to point to p itself */
	this.active = 1; //TRUE
}
gpcas.geometry.PolygonNode.prototype.add_right = function( x, y) {
	var nv= new VertexNode( x, y );

	 /* Add vertex nv to the right end of the polygon's vertex list */
	 this.proxy.v[Clip.RIGHT].next= nv;

	 /* Update proxy->v[Clip.RIGHT] to point to nv */
	 this.proxy.v[Clip.RIGHT]= nv;
}
gpcas.geometry.PolygonNode.prototype.add_left = function( x, y) {
	 var proxy = this.proxy;

	 var nv= new VertexNode( x, y );

	 /* Add vertex nv to the left end of the polygon's vertex list */
	 nv.next= proxy.v[Clip.LEFT];

	 /* Update proxy->[Clip.LEFT] to point to nv */
	 proxy.v[Clip.LEFT]= nv;
}


//////////////////   PolySimple ////////////////

/**
 * <code>PolySimple</code> is a simple polygon - contains only one inner polygon.
 * <p>
 * <strong>WARNING:</strong> This type of <code>Poly</code> cannot be used for an
 * inner polygon that is a hole.
 *
 * @author  Dan Bridenbecker, Solution Engineering, Inc.
 */
gpcas.geometry.PolySimple = function(){
	/**
    * The list of Point objects in the polygon.
    */
   this.m_List= new gpcas.util.ArrayList();

   /** Flag used by the Clip algorithm */
   this.m_Contributes= true ;
};

   /**
    * Return true if the given object is equal to this one.
    * <p>
    * <strong>WARNING:</strong> This method failse if the first point
    * appears more than once in the list.
    */
gpcas.geometry.PolySimple.prototype.equals = function(obj) {
  if( !(obj instanceof PolySimple) )
  {
	 return false;
  }

  var that= obj;

  var this_num= this.m_List.size();
  var that_num= that.m_List.size();
  if( this_num != that_num ) return false ;


  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // !!! WARNING: This is not the greatest algorithm.  It fails if !!!
  // !!! the first point in "this" poly appears more than once.    !!!
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  if( this_num > 0)
  {
	 var this_x= this.getX(0);
	 var this_y= this.getY(0);
	 var that_first_index = -1;
	 for( var that_index= 0; (that_first_index == -1) && (that_index < that_num) ; that_index++ )
	 {
		var that_x= that.getX(that_index);
		var that_y= that.getY(that_index);
		if( (this_x == that_x) && (this_y == that_y) )
		{
		   that_first_index = that_index ;
		}
	 }
	 if( that_first_index == -1) return false ;
	 var that_index= that_first_index ;
	 for( var this_index= 0; this_index < this_num ; this_index++ )
	 {
		this_x = this.getX(this_index);
		this_y = this.getY(this_index);
		var that_x= that.getX(that_index);
		var that_y= that.getY(that_index);

		if( (this_x != that_x) || (this_y != that_y) ) return false;

		that_index++ ;
		if( that_index >= that_num )
		{
		   that_index = 0;
		}
	 }
  }
  return true ;
}

   /**
    * Return the hashCode of the object.
    * <p>
    * <strong>WARNING:</strong>Hash and Equals break contract.
    *
    * @return an integer value that is the same for two objects
    * whenever their internal representation is the same (equals() is true)
    */
gpcas.geometry.PolySimple.prototype.hashCode = function() {
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // !!! WARNING:  This hash and equals break the contract. !!!
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  var result= 17;
  result = 37*result + this.m_List.hashCode();
  return result;
}

   /**
    * Return a string briefly describing the polygon.
    */
gpcas.geometry.PolySimple.prototype.toString = function() {
    return "PolySimple: num_points="+getNumPoints();
}

   // --------------------
   // --- Poly Methods ---
   // --------------------
   /**
    * Remove all of the points.  Creates an empty polygon.
    */
gpcas.geometry.PolySimple.prototype.clear = function() {
      this.m_List.clear();
}


gpcas.geometry.PolySimple.prototype.add = function(arg0,arg1) {
	var args = [];
	args[0] = arg0;
	if(arg1) {
		args[1] = arg1;
	}

   	if (args.length==2){
		this.addPointXY(args[0] , args[1] );
   	} else if (args.length==1){
   		if (args[0] instanceof Point){
               this.addPoint(args[0]);
   		} else if (args[0] instanceof Poly){
               this.addPoly(args[0]);
   		} else if (args[0] instanceof Array){
			for(var k=0 ; k<args[0].length ; k++) {
				var val = args[0][k];
                this.add(val);
			}
   		}
   	}
}


   /**
    * Add a point to the first inner polygon.
    */
gpcas.geometry.PolySimple.prototype.addPointXY = function(x, y) {
    this.addPoint( new Point( x, y ) );
}

   /**
    * Add a point to the first inner polygon.
    */
gpcas.geometry.PolySimple.prototype.addPoint = function(p) {
      this.m_List.add( p );
}

   /**
    * Throws IllegalStateexception if called
    */
gpcas.geometry.PolySimple.prototype.addPoly = function(p) {
    alert("Cannot add poly to a simple poly.");
}

   /**
    * Return true if the polygon is empty
    */
gpcas.geometry.PolySimple.prototype.isEmpty = function() {
      return this.m_List.isEmpty();
}

   /**
    * Returns the bounding rectangle of this polygon.
    */
gpcas.geometry.PolySimple.prototype.getBounds = function() {
	  var xmin=  Number.MAX_VALUE ;
	  var ymin=  Number.MAX_VALUE ;
	  var xmax= -Number.MAX_VALUE ;
	  var ymax= -Number.MAX_VALUE ;

      for( var i= 0; i < this.m_List.size() ; i++ )
      {
         var x= this.getX(i);
         var y= this.getY(i);
         if( x < xmin ) xmin = x;
         if( x > xmax ) xmax = x;
         if( y < ymin ) ymin = y;
         if( y > ymax ) ymax = y;
      }

      return new Rectangle( xmin, ymin, (xmax-xmin), (ymax-ymin) );
   }

   /**
    * Returns <code>this</code> if <code>polyIndex = 0</code>, else it throws
    * IllegalStateException.
    */
gpcas.geometry.PolySimple.prototype.getInnerPoly = function(polyIndex) {
  if( polyIndex != 0)
  {
	 alert("PolySimple only has one poly");
  }
  return this ;
}

   /**
    * Always returns 1.
    */
gpcas.geometry.PolySimple.prototype.getNumInnerPoly = function() {
    return 1;
}

   /**
    * Return the number points of the first inner polygon
    */
gpcas.geometry.PolySimple.prototype.getNumPoints = function() {
      return this.m_List.size();
}

   /**
    * Return the X value of the point at the index in the first inner polygon
    */
gpcas.geometry.PolySimple.prototype.getX = function(index) {
    return (this.m_List.get(index)).x;
}

   /**
    * Return the Y value of the point at the index in the first inner polygon
    */
gpcas.geometry.PolySimple.prototype.getY = function(index) {
    return (this.m_List.get(index)).y;
}

gpcas.geometry.PolySimple.prototype.getPoint = function(index){
	return (this.m_List.get(index));
}

gpcas.geometry.PolySimple.prototype.getPoints = function() {
	return this.m_List.toArray();
}

gpcas.geometry.PolySimple.prototype.isPointInside = function(point) {
	 var points  = this.getPoints();
	 var j  = points.length - 1;
	 var oddNodes = false;

	 for (var i  = 0; i < points.length; i++)
	 {
		 if (points[i].y < point.y && points[j].y >= point.y ||
			 points[j].y < point.y && points[i].y >= point.y)
		 {
			 if (points[i].x +
				 (point.y - points[i].y)/(points[j].y - points[i].y)*(points[j].x - points[i].x) < point.x)
			 {
				 oddNodes = !oddNodes;
			}
		 }
		 j = i;
	 }
	 return oddNodes;
}


   /**
    * Always returns false since PolySimples cannot be holes.
    */
gpcas.geometry.PolySimple.prototype.isHole = function() {
      return false ;
}

   /**
    * Throws IllegalStateException if called.
    */
gpcas.geometry.PolySimple.prototype.setIsHole =function(isHole) {
    alert("PolySimple cannot be a hole");
}

   /**
    * Return true if the given inner polygon is contributing to the set operation.
    * This method should NOT be used outside the Clip algorithm.
    *
    * @throws IllegalStateException if <code>polyIndex != 0</code>
    */
gpcas.geometry.PolySimple.prototype.isContributing = function(polyIndex) {
  if( polyIndex != 0)
  {
	 alert("PolySimple only has one poly");
  }
  return this.m_Contributes ;
}

   /**
    * Set whether or not this inner polygon is constributing to the set operation.
    * This method should NOT be used outside the Clip algorithm.
    *
    * @throws IllegalStateException if <code>polyIndex != 0</code>
    */
gpcas.geometry.PolySimple.prototype.setContributing = function( polyIndex, contributes) {
      if( polyIndex != 0)
      {
         alert("PolySimple only has one poly");
      }
      this.m_Contributes = contributes ;
   }

   /**
    * Return a Poly that is the intersection of this polygon with the given polygon.
    * The returned polygon is simple.
    *
    * @return The returned Poly is of type PolySimple
    */
gpcas.geometry.PolySimple.prototype.intersection = function(p) {
    return gpcas.geometry.Clip.intersection( this, p,"PolySimple");
}

   /**
    * Return a Poly that is the union of this polygon with the given polygon.
    * The returned polygon is simple.
    *
    * @return The returned Poly is of type PolySimple
    */
gpcas.geometry.PolySimple.prototype.union = function(p) {
      return gpcas.geometry.Clip.union( this, p, "PolySimple");
}

   /**
    * Return a Poly that is the exclusive-or of this polygon with the given polygon.
    * The returned polygon is simple.
    *
    * @return The returned Poly is of type PolySimple
    */
gpcas.geometry.PolySimple.prototype.xor = function(p) {
    return gpcas.geometry.Clip.xor( p, this, "PolySimple");
}

   /**
	* Return a Poly that is the difference of this polygon with the given polygon.
	* The returned polygon could be complex.
	*
	* @return the returned Poly will be an instance of PolyDefault.
	*/
gpcas.geometry.PolySimple.prototype.difference = function(p){
	return gpcas.geometry.Clip.difference(p,this,"PolySimple");
}

   /**
    * Returns the area of the polygon.
    * <p>
    * The algorithm for the area of a complex polygon was take from
    * code by Joseph O'Rourke author of " Computational Geometry in C".
    */
gpcas.geometry.PolySimple.prototype.getArea = function() {
      if( this.getNumPoints() < 3)
      {
         return 0.0;
      }
      var ax= this.getX(0);
      var ay= this.getY(0);

      var area= 0.0;
      for( var i= 1; i < (this.getNumPoints()-1) ; i++ )
      {
         var bx= this.getX(i);
         var by= this.getY(i);
         var cx= this.getX(i+1);
         var cy= this.getY(i+1);
         var tarea= ((cx - bx)*(ay - by)) - ((ax - bx)*(cy - by));
         area += tarea ;
      }
      area = 0.5*Math.abs(area);
      return area ;
   }

  /////////////////////// Rectangle  ///////////////////
gpcas.geometry.Rectangle = function(_x, _y, _w, _h) {
	this.x = _x;
	this.y = _y;
	this.w = _w;
	this.h = _h;
}
gpcas.geometry.Rectangle.prototype.getMaxY = function(){
	return this.y+this.h;
}
gpcas.geometry.Rectangle.prototype.getMinY = function(){
	return this.y;
}
gpcas.geometry.Rectangle.prototype.getMaxX = function() {
	return this.x+this.w;
}
gpcas.geometry.Rectangle.prototype.getMinX = function(){
	return this.x;
}
gpcas.geometry.Rectangle.prototype.toString = function(){
	return "["+x.toString()+" "+y.toString()+" "+w.toString()+" "+h.toString()+"]";
}

/////////////////// ScanBeamTree //////////////////////
gpcas.geometry.ScanBeamTree = function(yvalue) {
	this.y = yvalue;         /* Scanbeam node y value             */
	this.less;         /* Pointer to nodes with lower y     */
	this.more;         /* Pointer to nodes with higher y    */
}

///////////////////////// ScanBeamTreeEntries /////////////////
gpcas.geometry.ScanBeamTreeEntries = function(){
	this.sbt_entries=0;
	this.sb_tree;
};
gpcas.geometry.ScanBeamTreeEntries.prototype.build_sbt = function() {
	var sbt= [];

	var entries= 0;
	entries = this.inner_build_sbt( entries, sbt, this.sb_tree );

	//console.log("SBT = "+this.sbt_entries);

	if( entries != this.sbt_entries )
	{
	//console.log("Something went wrong buildign sbt from tree.");
	}
	return sbt ;
}
gpcas.geometry.ScanBeamTreeEntries.prototype.inner_build_sbt = function( entries, sbt, sbt_node) {
	if( sbt_node.less != null )
	 {
		entries = this.inner_build_sbt(entries, sbt, sbt_node.less);
	 }
	 sbt[entries]= sbt_node.y;
	 entries++;
	 if( sbt_node.more != null )
	 {
		entries = this.inner_build_sbt(entries, sbt, sbt_node.more );
	 }
	 return entries ;
}

///////////////////////////  StNode
StNode = gpcas.geometry.StNode = function( edge, prev) {
	this.edge;         /* Pointer to AET edge               */
	this.xb;           /* Scanbeam bottom x coordinate      */
	this.xt;           /* Scanbeam top x coordinate         */
	this.dx;           /* Change in x for a unit y increase */
	this.prev;         /* Previous edge in sorted list      */

	this.edge = edge ;
	 this.xb = edge.xb ;
	 this.xt = edge.xt ;
	 this.dx = edge.dx ;
	 this.prev = prev ;
}

/////////////////////   TopPolygonNode /////////////////
gpcas.geometry.TopPolygonNode = function(){
	this.top_node;
};
TopPolygonNode = gpcas.geometry.TopPolygonNode;

gpcas.geometry.TopPolygonNode.prototype.add_local_min = function( x, y) {
	 var existing_min= this.top_node;
	 this.top_node = new gpcas.geometry.PolygonNode( existing_min, x, y );
	 return this.top_node ;
}
gpcas.geometry.TopPolygonNode.prototype.merge_left = function( p, q) {
 /* Label contour as a hole */
 q.proxy.hole = true ;
 var top_node = this.top_node;

 if (p.proxy != q.proxy) {
	/* Assign p's vertex list to the left end of q's list */
	p.proxy.v[Clip.RIGHT].next= q.proxy.v[Clip.LEFT];
	q.proxy.v[Clip.LEFT]= p.proxy.v[Clip.LEFT];

	/* Redirect any p.proxy references to q.proxy */
	var target= p.proxy ;
	for(var node= top_node; (node != null); node = node.next)
	{
	   if (node.proxy == target)
	   {
		  node.active= 0;
		  node.proxy= q.proxy;
	   }
	}
 }
}
gpcas.geometry.TopPolygonNode.prototype.merge_right = function( p, q) {
	 var top_node = this.top_node;
	 /* Label contour as external */
	 q.proxy.hole = false ;

	 if (p.proxy != q.proxy)
	 {
		/* Assign p's vertex list to the right end of q's list */
		q.proxy.v[Clip.RIGHT].next= p.proxy.v[Clip.LEFT];
		q.proxy.v[Clip.RIGHT]= p.proxy.v[Clip.RIGHT];

		/* Redirect any p->proxy references to q->proxy */
		var target= p.proxy ;
		for (var node = top_node ; (node != null ); node = node.next)
		{
		   if (node.proxy == target)
		   {
			  node.active = 0;
			  node.proxy= q.proxy;
		   }
		}
	 }
  }
gpcas.geometry.TopPolygonNode.prototype.count_contours = function() {
var nc= 0;

for ( var polygon= this.top_node; (polygon != null) ; polygon = polygon.next)
	 {
		if (polygon.active != 0)
		{
		   /* Count the vertices in the current contour */
		   var nv= 0;
		   for (var v= polygon.proxy.v[Clip.LEFT]; (v != null); v = v.next)
		   {
			  nv++;
		   }

		   /* Record valid vertex counts in the active field */
		   if (nv > 2)
		   {
			  polygon.active = nv;
			  nc++;
		   }
		   else
		   {
			  /* Invalid contour: just free the heap */
//                  VertexNode nextv = null ;
//                  for (VertexNode v= polygon.proxy.v[Clip.LEFT]; (v != null); v = nextv)
//                  {
//                     nextv= v.next;
//                     v = null ;
//                  }
			  polygon.active= 0;
		   }
		}
	 }
	 return nc;
  }
gpcas.geometry.TopPolygonNode.prototype.getResult = function(polyClass) {

var top_node = this.top_node;
var result= gpcas.geometry.Clip.createNewPoly( polyClass );
//console.log(polyClass);


var num_contours = this.count_contours();

if (num_contours > 0)
	 {
		var c= 0;
		var npoly_node= null ;
		for (var poly_node= top_node; (poly_node != null); poly_node = npoly_node)
		{
		   npoly_node = poly_node.next;
		   if (poly_node.active != 0)
		   {

			  var poly = result ;


			  if( num_contours > 1)
			  {
				 poly = gpcas.geometry.Clip.createNewPoly( polyClass );
			  }
			  if( poly_node.proxy.hole )
			  {
				 poly.setIsHole( poly_node.proxy.hole );
			  }

			  // ------------------------------------------------------------------------
			  // --- This algorithm puts the verticies into the poly in reverse order ---
			  // ------------------------------------------------------------------------
			  for (var vtx= poly_node.proxy.v[Clip.LEFT]; (vtx != null) ; vtx = vtx.next )
			  {
				 poly.add( vtx.x, vtx.y );
			  }
			  if( num_contours > 1)
			  {
				 result.addPoly( poly );
			  }
			  c++;
		   }
		}

		// -----------------------------------------
		// --- Sort holes to the end of the list ---
		// -----------------------------------------
		var orig= result ;
		result = gpcas.geometry.Clip.createNewPoly( polyClass );
		for( var i= 0; i < orig.getNumInnerPoly() ; i++ )
		{
		   var inner= orig.getInnerPoly(i);
		   if( !inner.isHole() )
		   {
			  result.addPoly(inner);
		   }
		}
		for( var i= 0; i < orig.getNumInnerPoly() ; i++ )
		{
		   var inner= orig.getInnerPoly(i);
		   if( inner.isHole() )
		   {
			  result.addPoly(inner);
		   }
		}
	 }
	 return result ;
  }
gpcas.geometry.TopPolygonNode.prototype.print = function() {
    //console.log("---- out_poly ----");
	var top_node = this.top_node;
    var c= 0;
    var npoly_node= null ;
	for (var poly_node= top_node; (poly_node != null); poly_node = npoly_node)
	 {
		//console.log("contour="+c+"  active="+poly_node.active+"  hole="+poly_node.proxy.hole);
		npoly_node = poly_node.next;
		if (poly_node.active != 0)
		{
		   var v=0;
		   for (var vtx= poly_node.proxy.v[Clip.LEFT]; (vtx != null) ; vtx = vtx.next )
		   {
			  //console.log("v="+v+"  vtx.x="+vtx.x+"  vtx.y="+vtx.y);
		   }
		   c++;
		}
	 }
}

  ///////////    VertexNode  ///////////////
gpcas.geometry.VertexNode = function( x, y) {
	this.x;    // X coordinate component
	this.y;    // Y coordinate component
	this.next; // Pointer to next vertex in list

	this.x = x ;
    this.y = y ;
    this.next = null ;
}
VertexNode = gpcas.geometry.VertexNode;

/////////////   VertexType   /////////////
gpcas.geometry.VertexType = function(){};
gpcas.geometry.VertexType.NUL=  0; /* Empty non-intersection            */
gpcas.geometry.VertexType.EMX=  1; /* External maximum                  */
gpcas.geometry.VertexType.ELI=  2; /* External left intermediate        */
gpcas.geometry.VertexType.TED=  3; /* Top edge                          */
gpcas.geometry.VertexType.ERI=  4; /* External right intermediate       */
gpcas.geometry.VertexType.RED=  5; /* Right edge                        */
gpcas.geometry.VertexType.IMM=  6; /* Internal maximum and minimum      */
gpcas.geometry.VertexType.IMN=  7; /* Internal minimum                  */
gpcas.geometry.VertexType.EMN=  8; /* External minimum                  */
gpcas.geometry.VertexType.EMM=  9; /* External maximum and minimum      */
gpcas.geometry.VertexType.LED= 10; /* Left edge                         */
gpcas.geometry.VertexType.ILI= 11; /* Internal left intermediate        */
gpcas.geometry.VertexType.BED= 12; /* Bottom edge                       */
gpcas.geometry.VertexType.IRI= 13; /* Internal right intermediate       */
gpcas.geometry.VertexType.IMX= 14; /* Internal maximum                  */
gpcas.geometry.VertexType.FUL= 15; /* Full non-intersection             */
gpcas.geometry.VertexType.getType = function( tr, tl ,br ,bl) {
    return tr + (tl << 1) + (br << 2) + (bl << 3);
}

VertexType = gpcas.geometry.VertexType;

////////////////// WeilerAtherton  /////////////
gpcas.geometry.WeilerAtherton = function(){};

gpcas.geometry.WeilerAtherton.prototype.merge = function(p1,p2) {
	p1=p1.clone();
	p2=p2.clone();
}

},{}],6:[function(require,module,exports){
'use strict';

/*jshint -W072 */
var intersect = function (a10, a11, a20, a21, b10, b11, b20, b21) {
    var ua_t = (b20 - b10) * (a11 - b11) - (b21 - b11) * (a10 - b10);
    var ub_t = (a20 - a10) * (a11 - b11) - (a21 - a11) * (a10 - b10);
    var u_b = (b21 - b11) * (a20 - a10) - (b20 - b10) * (a21 - a11);
    if (u_b !== 0) {
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;
        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return true;
        }
    }
    return false;
};


function Cell(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.items = [];
}

Cell.prototype.insert = function(item) {
    if (
        (item.fromX >= this.x && item.fromY >= this.y && item.toX <= this.x + this.width && item.toY <= this.y + this.height) ||
        intersect(item.fromX, item.fromY, item.toX, item.toY, this.x, this.y, this.x+this.width, this.y) ||
        intersect(item.fromX, item.fromY, item.toX, item.toY, this.x, this.y, this.x, this.y+this.height) ||
        intersect(item.fromX, item.fromY, item.toX, item.toY, this.x+this.width, this.y, this.x+this.width, this.y+this.height) ||
        intersect(item.fromX, item.fromY, item.toX, item.toY, this.x, this.y+this.height, this.x+this.width, this.y+this.height)
    ) {
        this.items.push(item);
    }
};

exports = module.exports = Cell;

},{}],7:[function(require,module,exports){
'use strict';

var Cell = require('./cell');
var DoublyLinkedList = require('../../linkedlist/doublylinkedlist');

function Grid(bounds, rows, cols) {
    this.bounds = bounds;
    this.rows = rows;
    this.cols = cols;
    this.cellX = this.bounds.width / this.cols;
    this.cellY = this.bounds.height / this.rows;
    this.cells = [];
    this.out = new DoublyLinkedList();
    for( var col = 0;col<this.cols;col++) {
        this.cells[col] = [];
        for ( var row=0;row<this.rows;row++) {
            this.cells[col][row] = new Cell(col*this.cellX, row*this.cellY, this.cellX, this.cellY);
        }
    }
}

Grid.prototype.insert = function(item) {
    if (item instanceof Array) {
        var i = 0,
            n = item.length;
            while (i<n) {
                this.insert(item);
                i++;
            }
    } else {
        for( var col = 0;col<this.cols;col++) {
            for ( var row=0;row<this.rows;row++) {
                this.cells[col][row].insert(item);
            }
        }
    }
};

Grid.prototype.addOut = function(items) {
    var i = 0,
        n = items.length;
    while (i<n) {
        this.out.add(items[i]);
        i++;
    }
};

Grid.prototype.retrieve = function(item) {
    // figure out cells
    var nx = ((item.x%this.cellX) + item.width) > this.cellX ? true : false,
        ny = ((item.y%this.cellY) + item.height) > this.cellY ? true : false,
        x = Math.floor(item.x / this.cellX),
        y = Math.floor(item.y / this.cellY);
    this.out.clear();

    this.addOut(this.cells[x][y].items);
    if (nx) {
        this.addOut(this.cells[x+1][y].items);
    }
    if (ny) {
        this.addOut(this.cells[x][y+1].items);
    }
    if (nx && ny) {
        this.addOut(this.cells[x+1][y+1].items);
    }
    return this.out;
};

exports = module.exports = Grid;

},{"../../linkedlist/doublylinkedlist":24,"./cell":6}],8:[function(require,module,exports){
module.exports = {
  Grid: require('./grid'),
  Cell: require('./cell')
};

},{"./cell":6,"./grid":7}],9:[function(require,module,exports){
module.exports = {
  Vector2: require('./vector2'),
  LineSegment2: require('./linesegment2'),
  Triangle2: require('./triangle2'),
  Polygon2: require('./polygon2'),
  RegularPolygon2: require('./regularpolygon2'),
  gpc: require('./gpc'),
  VisibilityPolygon: require('./visibilitypolygon'),

  Grid: require('./grid'),
  QuadTree: require('./quadtree')
};

},{"./gpc":5,"./grid":8,"./linesegment2":10,"./polygon2":11,"./quadtree":13,"./regularpolygon2":16,"./triangle2":17,"./vector2":18,"./visibilitypolygon":19}],10:[function(require,module,exports){
'use strict';

/* jshint -W064 */

var Vector2 = require('./vector2');

exports = module.exports = LineSegment2;

var cache = [];
var created = 0;

function LineSegment2 (start, end) {
	if (!(this instanceof LineSegment2)) {
		var l = cache.pop();
		if (!l) {
			l = new LineSegment2(start, end);
			created++;
		} else {
			l.start.free();
			l.end.free();
			l.set(start, end);
		}
		return l;
	}
	this.start = start || Vector2();
	this.end = end || Vector2();
}

LineSegment2.getStats = function() {
	return [cache.length, created];
};

LineSegment2.prototype.set = function (start, end) {
	this.start = start || Vector2();
	this.end = end || Vector2();
	return this;
};

LineSegment2.prototype.free = function () {
	cache.push(this);
};

LineSegment2.prototype.lengthSq = function () {
	return this.start.distanceSq(this.end);
};

LineSegment2.prototype.length = function() {
	return this.start.distance(this.end);
};

LineSegment2.prototype.closestPoint = function (point, full) {
	var l2 = this.lengthSq();
	if (l2 === 0) {
		return this.start.clone();
	}
	var t = ((point.x - this.start.x) * (this.end.x - this.start.x) + (point.y - this.start.y)*(this.end.y - this.start.y)) / l2;
	if (!full) {
		if (t < 0) {
			return this.start.clone();
		}
		if (t > 1) {
			return this.end.clone();
		}
	}
	return Vector2(this.start.x + t * (this.end.x-this.start.x), this.start.y + t * (this.end.y - this.start.y));
};

LineSegment2.prototype.distanceSq = function (point, full) {
	var c = this.closestPoint(point, full);
	var d = point.distanceSq(c);
	c.free();
	return d;
};

LineSegment2.prototype.distance = function (point, full) {
	return Math.sqrt(this.distanceSq(point, full));
};

LineSegment2.prototype.intersect = function (l, full) {
	var u_b = (l.end.y - l.start.y) * (this.end.x - this.start.x) - (l.end.x - l.start.x) * (this.end.y - this.start.y);
	if (u_b !== 0) {
		var ua_t = (l.end.x - l.start.x) * (this.start.y - l.start.y) - (l.end.y - l.start.y) * (this.start.x - l.start.x);
		var ub_t = (this.end.x - this.start.x) * (this.start.y - l.start.y) - (this.end.y - this.start.y) * (this.start.x - l.start.x);
		var ua = ua_t / u_b;
		var ub = ub_t / u_b;
		if (full || (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1)) {
			return Vector2(this.start.x - ua * (this.start.x - this.end.x), this.start.y - ua * (this.start.y - this.end.y));
		}
	} else {
		return null; // perpendicular
	}
	return false;
};

LineSegment2.prototype.intersectCircle = function (point, radius, full) {
	var r2 = radius*radius;
	var closest = this.closestPoint(point, full);
	var dist_v = point.clone().subtract(closest);
	var len2 = dist_v.distanceSq();
	dist_v.free();
	if (len2 < r2) {
		return closest;
	} else {
		closest.free();
		return false;
	}
};

LineSegment2.prototype.equals = function(other) {
	return (this.start === other.start && this.end === other.end);
};

LineSegment2.prototype.inverse = function() {
	return LineSegment2(this.end.clone(), this.start.clone());
};

/* jshint +W064 */

},{"./vector2":18}],11:[function(require,module,exports){
'use strict';

/* jshint -W064 */

var Vector2 = require('./vector2');
var LineSegment2 = require('./linesegment2');
var epsilon = 0.0000001;

exports = module.exports = Polygon2;

var cache = [];
var created = 0;

function Polygon2 (points) {
    if (!(this instanceof Polygon2)) {
        var p = cache.pop();
        if (!p) {
            p = new Polygon2(points);
            created++;
        } else {
            p.freePoints();
            p.set(points);
        }
        return p;
    }
    this.points = points || [];
}

Polygon2.fromArray = function (points)
{
    var p = Polygon2();
    for (var i = 0;i<points.length; i++) {
        p.add(Vector2.fromArray(points[i]));
    }
    return p;
};

Polygon2.getStats = function() {
    return [cache.length, created];
};

Polygon2.prototype.free = function ()
{
    this.freePoints();
    cache.push(this);
};

Polygon2.prototype.freePoints = function ()
{
    var p = this.points.pop();
    while (p) {
        p.free();
        p = this.points.pop();
    }
    return this;
};

Polygon2.prototype.set = function (points)
{
    this.points = points || [];
    return this;
};

Polygon2.prototype.add = function (point)
{
    this.points.push(point);
    return this;
};

Polygon2.prototype.translate = function (vec)
{
    for ( var i = 0; i<this.points.length;i++) {
        this.points[i].add(vec);
    }
    return this;
};

Polygon2.prototype.rotate = function (angle, origin)
{
    for (var i = 0; i<this.points.length;i++) {
        this.points[i].rotate(angle, origin);
    }
    return this;
};

Polygon2.prototype.containsPoint = function (point)
{
    var inside = false;
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var xi = this.points[i].x, yi = this.points[i].y;
        var xj = this.points[j].x, yj = this.points[j].y;

        var intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
};

Polygon2.prototype.intersectsLine = function (line, ignorePoints)
{
    var tempLine = LineSegment2();

    var intersect = false;
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var xi = this.points[i].x, yi = this.points[i].y;
        var xj = this.points[j].x, yj = this.points[j].y;
        tempLine.start.set(xi, yi);
        tempLine.end.set(xj, yj);
        var is = tempLine.intersect(line);
        if (is) {
            if (ignorePoints && (this.points[i].isEqualEpsilon(is) || this.points[j].isEqualEpsilon(is) || line.start.isEqualEpsilon(is) || line.end.isEqualEpsilon(is) )) {
                // special perpendicular test
                var a = this.points[i].clone().subtract(this.points[j]).normalize();
                var aa = a.angle();
                a.copy(line.start).subtract(line.end).normalize();
                var bb = a.angle();
                a.free();
                is.free();
                if (Math.abs(aa - bb) < epsilon) {
                    intersect = true;
                    break;
                }
                continue;
            }
            is.free();
            intersect = true;
            break;
        }
    }
    tempLine.free();
    return intersect;
};


Polygon2.prototype.intersectsTriangle = function (triangle, ignorePoints)
{
    var tempLine = LineSegment2();

    tempLine.start.copy(triangle.v0);
    tempLine.end.copy(triangle.v1);

    if (this.intersectsLine(tempLine, ignorePoints)) {
        tempLine.free();
        return true;
    }

    tempLine.start.copy(triangle.v1);
    tempLine.end.copy(triangle.v2);

    if (this.intersectsLine(tempLine, ignorePoints)) {
        tempLine.free();
        return true;
    }

    tempLine.start.copy(triangle.v2);
    tempLine.end.copy(triangle.v0);

    if (this.intersectsLine(tempLine, ignorePoints)) {
        tempLine.free();
        return true;
    }
    return false;
};

Polygon2.prototype.AABB = function()
{
    var min = this.points[0].clone();
    var max = this.points[0].clone();

    for (var i = 1; i< this.points.length; i++) {
        var p = this.points[i];
        if ( p.x < min.x ) {
            min.x = p.x;
        } else if ( p.x > max.x ) {
            max.x = p.x;
        }
        if ( p.y < min.y ) {
            min.y = p.y;
        } else if ( p.y > max.y ) {
            max.y = p.y;
        }
    }
    return [min, max];
};

// negative = CCW
Polygon2.prototype.winding = function() {
    return this.area() > 0;
};

Polygon2.prototype.rewind = function(cw) {
    cw = !!cw;
    var winding = this.winding();
    if (winding !== cw) {
        this.points.reverse();
    }
    return this;
};

Polygon2.prototype.area = function() {
    var area = 0;
    var first = this.points[0];
    var p1 = Vector2();
    var p2 = Vector2();
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        p1.copy(first).subtract(this.points[i]);
        p2.copy(first).subtract(this.points[j]);
        area += p1.cross(p2);
    }
    p1.free();
    p2.free();
    return area/2;
};

Polygon2.prototype.clean = function(distance)
{
    var p1 = Vector2();
    var newpoints = [];
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var length = p1.copy(this.points[i]).subtract(this.points[j]).length();
        if (length > distance) {
            newpoints.push(this.points[i]);
        } else {
            this.points[i].free();
        }
    }
    this.points = newpoints;
};

Polygon2.prototype.toArray = function ()
{
    var ret = [];
    for (var i = 0; i< this.points.length; i++) {
        ret.push(this.points[i].toArray());
    }
    return ret;
};


/* jshint +W064 */

},{"./linesegment2":10,"./vector2":18}],12:[function(require,module,exports){
'use strict';

var PointNode = require('./pointnode');

function BoundsNode(bounds, depth, maxChildren, maxDepth) {
    PointNode.call(this, bounds, depth, maxChildren, maxDepth);
    this._stuckChildren = [];
}

BoundsNode.prototype = new PointNode();
BoundsNode.prototype._classConstructor = BoundsNode;
BoundsNode.prototype._stuckChildren = null;

//we use this to collect and conctenate items being retrieved. This way
//we dont have to continuously create new Array instances.
//Note, when returned from QuadTree.retrieve, we then copy the array
BoundsNode.prototype._out = [];

BoundsNode.prototype.insert = function (item) {
    if (this.nodes.length) {
        var index = this._findIndex(item);
        var node = this.nodes[index];

        //todo: make _bounds bounds
        if (item.x >= node._bounds.x &&
                item.x + item.width <= node._bounds.x + node._bounds.width &&
                item.y >= node._bounds.y &&
                item.y + item.height <= node._bounds.y + node._bounds.height) {

            this.nodes[index].insert(item);

        } else {
            this._stuckChildren.push(item);
        }

        return;
    }

    this.children.push(item);

    var len = this.children.length;

    if (this._depth < this._maxDepth &&
            len > this._maxChildren) {

        this.subdivide();

        var i;
        for (i = 0; i < len; i++) {
            this.insert(this.children[i]);
        }

        this.children.length = 0;
    }
};

BoundsNode.prototype.getChildren = function () {
    return this.children.concat(this._stuckChildren);
};

BoundsNode.prototype.retrieve = function (item) {
    var out = this._out;
    out.length = 0;
    if (this.nodes.length) {
        var index = this._findIndex(item);
        var node = this.nodes[index];

        if (item.x >= node._bounds.x &&
                item.x + item.width <= node._bounds.x + node._bounds.width &&
                item.y >= node._bounds.y &&
                item.y + item.height <= node._bounds.y + node._bounds.height) {

            out.push.apply(out, this.nodes[index].retrieve(item));
        } else {
            //Part of the item are overlapping multiple child nodes. For each of the overlapping nodes, return all containing objects.

            if (item.x <= this.nodes[PointNode.TOP_RIGHT]._bounds.x) {
                if (item.y <= this.nodes[PointNode.BOTTOM_LEFT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.TOP_LEFT].retrieve(item));
                }

                if (item.y + item.height > this.nodes[PointNode.BOTTOM_LEFT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.BOTTOM_LEFT].retrieve(item));
                }
            }

            if (item.x + item.width > this.nodes[PointNode.TOP_RIGHT]._bounds.x) {//position+width bigger than middle x
                if (item.y <= this.nodes[PointNode.BOTTOM_RIGHT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.TOP_RIGHT].retrieve(item));
                }

                if (item.y + item.height > this.nodes[PointNode.BOTTOM_RIGHT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.BOTTOM_RIGHT].retrieve(item));
                }
            }
        }
    }

    out.push.apply(out, this._stuckChildren);
    out.push.apply(out, this.children);

    return out;
};

//Returns all contents of node.
BoundsNode.prototype.getAllContent = function () {
    var out = this._out;
    if (this.nodes.length) {

        var i;
        for (i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllContent();
        }
    }
    out.push.apply(out, this._stuckChildren);
    out.push.apply(out, this.children);
    return out;
};

BoundsNode.prototype.clear = function () {

    this._stuckChildren.length = 0;

    //array
    this.children.length = 0;

    var len = this.nodes.length;

    if (!len) {
        return;
    }

    var i;
    for (i = 0; i < len; i++) {
        this.nodes[i].clear();
    }

    //array
    this.nodes.length = 0;

    //we could call the super clear function but for now, im just going to inline it
    //call the hidden super.clear, and make sure its called with this = this instance
    //Object.getPrototypeOf(BoundsNode.prototype).clear.call(this);
};

exports = module.exports = BoundsNode;

},{"./pointnode":14}],13:[function(require,module,exports){
module.exports = {
  QuadTree: require('./quadtree'),
  PointNode: require('./pointnode'),
  BoundsNode: require('./boundsnode')  
};

},{"./boundsnode":12,"./pointnode":14,"./quadtree":15}],14:[function(require,module,exports){
'use strict';

function PointNode(bounds, depth, maxDepth, maxChildren) {
    this._bounds = bounds;
    this.children = [];
    this.nodes = [];

    if (maxChildren) {
        this._maxChildren = maxChildren;
    }

    if (maxDepth) {
        this._maxDepth = maxDepth;
    }

    if (depth) {
        this._depth = depth;
    }
}

//subnodes
PointNode.prototype.nodes = null;
PointNode.prototype._classConstructor = PointNode;

//children contained directly in the node
PointNode.prototype.children = null;
PointNode.prototype._bounds = null;

//read only
PointNode.prototype._depth = 0;

PointNode.prototype._maxChildren = 4;
PointNode.prototype._maxDepth = 4;

PointNode.TOP_LEFT = 0;
PointNode.TOP_RIGHT = 1;
PointNode.BOTTOM_LEFT = 2;
PointNode.BOTTOM_RIGHT = 3;


PointNode.prototype.insert = function (item) {
    if (this.nodes.length) {
        var index = this._findIndex(item);

        this.nodes[index].insert(item);

        return;
    }

    this.children.push(item);

    var len = this.children.length;
    if (this._depth < this._maxDepth &&
            len > this._maxChildren) {

        this.subdivide();

        var i;
        for (i = 0; i < len; i++) {
            this.insert(this.children[i]);
        }

        this.children.length = 0;
    }
};

PointNode.prototype.retrieve = function (item) {
    if (this.nodes.length) {
        var index = this._findIndex(item);

        return this.nodes[index].retrieve(item);
    }

    return this.children;
};

PointNode.prototype._findIndex = function (item) {
    var b = this._bounds;
    var left = (item.x > b.x + b.width / 2) ? false : true;
    var top = (item.y > b.y + b.height / 2) ? false : true;

    //top left
    var index = PointNode.TOP_LEFT;
    if (left) {
        //left side
        if (!top) {
            //bottom left
            index = PointNode.BOTTOM_LEFT;
        }
    } else {
        //right side
        if (top) {
            //top right
            index = PointNode.TOP_RIGHT;
        } else {
            //bottom right
            index = PointNode.BOTTOM_RIGHT;
        }
    }

    return index;
};


PointNode.prototype.subdivide = function () {
    var depth = this._depth + 1;

    var bx = this._bounds.x;
    var by = this._bounds.y;

    //floor the values
    var b_w_h = (this._bounds.width / 2) | 0; //todo: Math.floor?
    var b_h_h = (this._bounds.height / 2) | 0;
    var bx_b_w_h = bx + b_w_h;
    var by_b_h_h = by + b_h_h;

    //top left
    this.nodes[PointNode.TOP_LEFT] = new this._classConstructor({
        x: bx,
        y: by,
        width: b_w_h,
        height: b_h_h
    },
        depth, this._maxDepth, this._maxChildren);

    //top right
    this.nodes[PointNode.TOP_RIGHT] = new this._classConstructor({
        x: bx_b_w_h,
        y: by,
        width: b_w_h,
        height: b_h_h
    },
        depth, this._maxDepth, this._maxChildren);

    //bottom left
    this.nodes[PointNode.BOTTOM_LEFT] = new this._classConstructor({
        x: bx,
        y: by_b_h_h,
        width: b_w_h,
        height: b_h_h
    },
        depth, this._maxDepth, this._maxChildren);


    //bottom right
    this.nodes[PointNode.BOTTOM_RIGHT] = new this._classConstructor({
        x: bx_b_w_h,
        y: by_b_h_h,
        width: b_w_h,
        height: b_h_h
    },
        depth, this._maxDepth, this._maxChildren);
};

PointNode.prototype.clear = function () {
    this.children.length = 0;

    var len = this.nodes.length;

    var i;
    for (i = 0; i < len; i++) {
        this.nodes[i].clear();
    }

    this.nodes.length = 0;
};


exports = module.exports = PointNode;

},{}],15:[function(require,module,exports){
'use strict';

var PointNode = require('./pointnode'),
    BoundsNode = require('./boundsnode');

/**
* QuadTree data structure.
* @class QuadTree
* @constructor
* @param {Object} An object representing the bounds of the top level of the QuadTree. The object
* should contain the following properties : x, y, width, height
* @param {Boolean} pointQuad Whether the QuadTree will contain points (true), or items with bounds
* (width / height)(false). Default value is false.
* @param {Number} maxDepth The maximum number of levels that the quadtree will create. Default is 4.
* @param {Number} maxChildren The maximum number of children that a node can contain before it is split into sub-nodes.
**/
function QuadTree(bounds, pointQuad, maxDepth, maxChildren) {
    var node;
    if (pointQuad) {
        node = new PointNode(bounds, 0, maxDepth, maxChildren);
    } else {
        node = new BoundsNode(bounds, 0, maxDepth, maxChildren);
    }

    this.root = node;
}

/**
* The root node of the QuadTree which covers the entire area being segmented.
* @property root
* @type Node
**/
QuadTree.prototype.root = null;


/**
* Inserts an item into the QuadTree.
* @method insert
* @param {Object|Array} item The item or Array of items to be inserted into the QuadTree. The item should expose x, y
* properties that represents its position in 2D space.
**/
QuadTree.prototype.insert = function (item) {
    if (item instanceof Array) {
        var i = 0,
            len = item.length;
        while (i<len) {
            this.root.insert(item[i]);
            i++;
        }
    } else {
        this.root.insert(item);
    }
};

/**
* Clears all nodes and children from the QuadTree
* @method clear
**/
QuadTree.prototype.clear = function () {
    this.root.clear();
};

/**
* Retrieves all items / points in the same node as the specified item / point. If the specified item
* overlaps the bounds of a node, then all children in both nodes will be returned.
* @method retrieve
* @param {Object} item An object representing a 2D coordinate point (with x, y properties), or a shape
* with dimensions (x, y, width, height) properties.
**/
QuadTree.prototype.retrieve = function (item) {
    //get a copy of the array of items
    return this.root.retrieve(item);
    // var out = this.root.retrieve(item).slice(0);
    // return out;
};

exports = module.exports = QuadTree;

},{"./boundsnode":12,"./pointnode":14}],16:[function(require,module,exports){
'use strict';

/* jshint -W064 */

var Vector2 = require('./vector2'),
    Polygon2 = require('./polygon2');

exports = module.exports = RegularPolygon2;

function RegularPolygon2 (radius,sides, center)
{
    center = center || Vector2();

    if (!sides || sides < 2) {
        sides = 3;
    }
    if (!radius || radius <= 0) {
        radius = 1;
    }

    var p = Polygon2();
    for ( var i = 0; i < sides; i++) {
        p.add(Vector2( center.x + radius * Math.cos( (i * 2 * Math.PI / sides) + 0.25*Math.PI), center.y + radius * Math.sin((i * 2 * Math.PI / sides) + 0.25*Math.PI)));
    }
    return p;
}
/* jshint +W064 */

},{"./polygon2":11,"./vector2":18}],17:[function(require,module,exports){
'use strict';

/* jshint -W064 */

exports = module.exports = Triangle2;

var epsilon = 0.0000001;
var cache = [];
var created = 0;

function Triangle2 (v0, v1, v2) {
    if (!(this instanceof Triangle2)) {
        var v = cache.pop();
        if (!v) {
            v = new Triangle2(v0, v1, v2);
            created++;
        } else {
            v.set(v0, v1, v2);
            //v.calcCircumcircle();
        }
        return v;
    }
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    /*
    this.center = Vector2();
    this.radius = 0;
    this.radius_squared = 0;

    this.calcCircumcircle();
    */
}

Triangle2.getStats = function() {
    return [cache.length, created];
};

Triangle2.prototype.free = function ()
{
    cache.push(this);
};


Triangle2.prototype.set = function (v0, v1, v2)
{
    this.v0.free();
    this.v1.free();
    this.v2.free();

    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    return this;
};

Triangle2.prototype.translate = function (vec)
{
    this.v0.add(vec);
    this.v1.add(vec);
    this.v2.add(vec);
    return this;
};

Triangle2.prototype.calcCircumcircle = function() {
    // From: http://www.exaflop.org/docs/cgafaq/cga1.html

    var A = this.v1.x - this.v0.x;
    var B = this.v1.y - this.v0.y;
    var C = this.v2.x - this.v0.x;
    var D = this.v2.y - this.v0.y;

    var E = A * (this.v0.x + this.v1.x) + B * (this.v0.y + this.v1.y);
    var F = C * (this.v0.x + this.v2.x) + D * (this.v0.y + this.v2.y);

    var G = 2.0 * (A * (this.v2.y - this.v1.y) - B * (this.v2.x - this.v1.x));

    var dx, dy;

    if (Math.abs(G) < epsilon) {
        // Collinear - find extremes and use the midpoint

        var minx = Math.min(this.v0.x, this.v1.x, this.v2.x);
        var miny = Math.min(this.v0.y, this.v1.y, this.v2.y);
        var maxx = Math.max(this.v0.x, this.v1.x, this.v2.x);
        var maxy = Math.max(this.v0.y, this.v1.y, this.v2.y);

        this.center.set((minx + maxx) / 2, (miny + maxy) / 2);

        dx = this.center.x - minx;
        dy = this.center.y - miny;
    } else {
        var cx = (D * E - B * F) / G;
        var cy = (A * F - C * E) / G;

        this.center.set(cx, cy);

        dx = this.center.x - this.v0.x;
        dy = this.center.y - this.v0.y;
    }

    this.radius_squared = dx * dx + dy * dy;
    this.radius = Math.sqrt(this.radius_squared);
};

Triangle2.prototype.inCircumcircle = function(v) {
    var dx = this.center.x - v.x;
    var dy = this.center.y - v.y;
    var dist_squared = dx * dx + dy * dy;

    return (dist_squared <= this.radius_squared);
};
/* jshint +W064 */

},{}],18:[function(require,module,exports){
'use strict';
/* jshint -W064 */

exports = module.exports = Vector2;

var epsilon = 0.0000001;
var degrees = 180 / Math.PI;

var cache = [];
var created = 0;

function Vector2 (x, y) {
    if (!(this instanceof Vector2)) {
        var v = cache.pop();
        if (!v) {
            v = new Vector2(x || 0, y || 0);
            created++;
        } else {
            v.set(x, y);
        }
        return v;
    }
    this.x = x || 0;
    this.y = y || 0;
}

Vector2.getStats = function() {
    return [cache.length, created];
};

Vector2.fromArray = function (arr) {
    return Vector2(arr[0] || 0, arr[1] || 0);
};

Vector2.fromObject = function (obj) {
    return Vector2(obj.x || 0, obj.y || 0);
};

Vector2.prototype.set = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
    return this;
};

Vector2.prototype.free = function () {
    cache.push(this);
};

Vector2.prototype.add = function (vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
};

Vector2.prototype.addScalar = function (scalar) {
    this.x += scalar;
    this.y += scalar;
    return this;
};


Vector2.prototype.subtract = function (vec) {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
};

Vector2.prototype.subtractScalar = function (scalar) {
    this.x -= scalar;
    this.y -= scalar;
    return this;
};


Vector2.prototype.divide = function (vec) {
    this.x /= vec.x;
    this.y /= vec.y;
    return this;
};

Vector2.prototype.multiply = function (vec) {
    this.x *= vec.x;
    this.y *= vec.y;
    return this;
};

Vector2.prototype.multiplyScalar = function (scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
};

Vector2.prototype.normalize = function () {
    var length = this.length();

    if (length === 0) {
        this.x = 0;
        this.y = 0;
    } else {
        this.x /= length;
        this.y /= length;
    }
    return this;
};

Vector2.prototype.clone = function () {
    return Vector2(this.x, this.y);
};

Vector2.prototype.copy = function (vec) {
    this.x = vec.x;
    this.y = vec.y;
    return this;
};

Vector2.prototype.zero = function () {
    this.x = this.y = 0;
    return this;
};

Vector2.prototype.dot = function (vec) {
    return this.x * vec.x + this.y * vec.y;
};

Vector2.prototype.cross = function (vec) {
    return (this.x * vec.y ) - (this.y * vec.x );
};

Vector2.prototype.projectOnto = function (vec) {
    var coeff = ( (this.x * vec.x)+(this.y * vec.y) ) / ((vec.x*vec.x)+(vec.y*vec.y));
    this.x = coeff * vec.x;
    this.y = coeff * vec.y;
    return this;
};


Vector2.prototype.horizontalAngle = function () {
    return Math.atan2(this.y, this.x);
};

Vector2.prototype.horizontalAngleDeg = function () {
    return radian2degrees(this.horizontalAngle());
};

Vector2.prototype.verticalAngle = function () {
    return Math.atan2(this.x, this.y);
};

Vector2.prototype.verticalAngleDeg = function () {
    return radian2degrees(this.verticalAngle());
};

Vector2.prototype.angle = Vector2.prototype.horizontalAngle;
Vector2.prototype.angleDeg = Vector2.prototype.horizontalAngleDeg;
Vector2.prototype.direction = Vector2.prototype.horizontalAngle;

Vector2.prototype.rotate = function (angle, origin) {
    var ox = 0,
        oy = 0;
    if (origin) {
        ox = origin.x || 0;
        oy = origin.y || 0;
    }

    var nx = ox + (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
    var ny = oy + (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

    this.x = nx;
    this.y = ny;

    return this;
};

Vector2.prototype.rotateDeg = function (angle) {
    angle = degrees2radian(angle);
    return this.rotate(angle);
};

Vector2.prototype.rotateBy = function (rotation) {
    var angle = this.angle() + rotation;
    return this.rotate(angle);
};

Vector2.prototype.rotateByDeg = function (rotation) {
    rotation = degrees2radian(rotation);
    return this.rotateBy(rotation);
};

Vector2.prototype.distance = function (vec) {
    return Math.sqrt(this.distanceSq(vec));
};

Vector2.prototype.distanceSq = function (vec) {
    var dx = this.x - vec.x,
    dy = this.y - vec.y;
    return dx * dx + dy * dy;
};

Vector2.prototype.length = function () {
    return Math.sqrt(this.lengthSq());
};

Vector2.prototype.lengthSq = function () {
    return this.x * this.x + this.y * this.y;
};

Vector2.prototype.magnitude = Vector2.prototype.length;

Vector2.prototype.isZero = function() {
    return this.x === 0 && this.y === 0;
};
Vector2.prototype.isEqualTo = function(vec) {
    return this.x === vec.x && this.y === vec.y;
};

Vector2.prototype.isEqualEpsilon = function(vec) {
    return Math.abs(this.x - vec.x) < epsilon && Math.abs(this.y - vec.y) < epsilon;
};

Vector2.prototype.toString = function () {
    return 'x:' + this.x + ', y:' + this.y;
};

Vector2.prototype.toArray = function () {
    return [ this.x, this.y ];
};

Vector2.prototype.toObject = function () {
    return { x: this.x, y: this.y };
};

function radian2degrees (rad) {
    return rad * degrees;
}

function degrees2radian (deg) {
    return deg / degrees;
}
/* jshint +W064 */

},{}],19:[function(require,module,exports){
'use strict';
/* jshint -W064 */

/*
    Based upon https://code.google.com/p/visibility-polygon-js/
    Made by Byron Knoll in 2013/2014.
*/

var Polygon2 = require('./polygon2'),
    Vector2 = require('./vector2'),
    LineSegment2 = require('./linesegment2');

var PI = Math.PI;
var PI2 = PI*2;
var PImin = -1*PI;
var epsilon = 0.0000001;

var segmentIter = ['start', 'end'];
function pointsorter(a,b) {
    return a[2] - b[2];
}

function VisibilityPolygon(segments)
{
    this.polygon = Polygon2();
    this.segments = segments;
    this.heap = [];
    this.map = new Array(this.segments.length);
    this.points = new Array(this.segments.length * 2);
    this.position = Vector2();
}

VisibilityPolygon.prototype.angle = function (p1, p2)
{
    var p = p2.clone().subtract(p1);
    var a = p.angle();
    p.free();
    return a;
};

VisibilityPolygon.prototype.angle2 = function (a, b, c) {
    var a1 = this.angle(a, b);
    var a2 = this.angle(b, c);
    var a3 = a1 - a2;
    if (a3 < 0) { a3 += PI2; }
    if (a3 > PI2) { a3 -= PI2; }
    return a3;
};


VisibilityPolygon.prototype.compute = function (position)
{
    this.position.copy(position);
    this.reset();
    this.sortPoints();

    var start = this.position.clone();
    start.x +=1; // why?

    var i = 0,
        n = this.segments.length;
    while (i < n) {
        var a1 = this.angle(this.segments[i].start, this.position);
        var a2 = this.angle(this.segments[i].end, this.position);
        if (
            ( a1 > PImin && a1 <= 0 && a2 <= PI && a2 >= 0 && a2 - a1 > PI) ||
            (a2 > PImin && a2 <= 0 && a1 <= PI && a1 >= 0 && a1 - a2 > PI)
        ) {
            this.insert(i, start);
        }
        i += 1;
    }
    i = 0;
    n = this.segments.length*2;
    while (i < n) {
        var extend = false;
        var shorten = false;
        var orig = i;
        var vertex = this.segments[this.points[i][0]][this.points[i][1]];
        var old_segment = this.heap[0];
        do {
            if (this.map[this.points[i][0]] !== -1) {
                if (this.points[i][0] === old_segment) {
                    extend = true;
                    vertex = this.segments[this.points[i][0]][this.points[i][1]];
                }
                this.remove(this.map[this.points[i][0]], vertex);
            } else {
                this.insert(this.points[i][0], vertex);
                if (this.heap[0] !== old_segment) {
                    shorten = true;
                }
            }
            ++i;
            if (i === n) { break; }
        } while (this.points[i][2] < this.points[orig][2] + epsilon);

        var l = LineSegment2(position.clone(), vertex.clone());
        if (extend) {
            this.polygon.add(vertex.clone());
            var cur = this.segments[this.heap[0]].intersect(l, true);
            if (cur ) {
                if (!cur.isEqualEpsilon(vertex)) {
                    this.polygon.add(cur);
                } else {
                    cur.free();
                }
            }
        } else if (shorten) {
            this.polygon.add(this.segments[old_segment].intersect(l, true));
            this.polygon.add(this.segments[this.heap[0]].intersect(l, true));
        }
    }
    return this.polygon;
};


VisibilityPolygon.prototype.insert = function (index, destination) {
    var l = LineSegment2(this.position.clone(), destination.clone());
    var intersect = this.segments[index].intersect(l, true);
    if (intersect === false) {
        l.free();
        return;
    }
    intersect.free();

    var cur = this.heap.length;
    this.heap.push(index);
    this.map[index] = cur;
    while (cur > 0) {
        var parent = this.parent(cur);
        if (!this.lessThan(this.heap[cur], this.heap[parent], destination)) {
            break;
        }
        this.map[this.heap[parent]] = cur;
        this.map[this.heap[cur]] = parent;
        var temp = this.heap[cur];
        this.heap[cur] = this.heap[parent];
        this.heap[parent] = temp;
        cur = parent;
    }
};

VisibilityPolygon.prototype.remove = function (index, destination) {
    this.map[this.heap[index]] = -1;
    if (index === this.heap.length - 1) {
        this.heap.pop();
        return;
    }
    this.heap[index] = this.heap.pop();
    this.map[this.heap[index]] = index;
    var cur = index;
    var parent = this.parent(cur);
    if (cur !== 0 && this.lessThan(this.heap[cur], this.heap[parent], destination)) {
        while (cur > 0) {
            parent = this.parent(cur);
            if (!this.lessThan(this.heap[cur], this.heap[parent], destination)) {
                break;
            }
            this.swap(cur, parent);
            cur = parent;
        }
    } else {
        while (true) {
            var left = this.child(cur);
            var right = left + 1;
            if (left < this.heap.length && this.lessThan(this.heap[left], this.heap[cur], destination) &&
                (right === this.heap.length || this.lessThan(this.heap[left], this.heap[right], destination))) {
                    this.swap(cur, left);
                    cur = left;
                } else if (right < this.heap.length && this.lessThan(this.heap[right], this.heap[cur], destination)) {
                    this.swap(cur, right);
                    cur = right;
                } else {
                    break;
                }
            }
        }
    };



VisibilityPolygon.prototype.lessThan = function (index1, index2, destination) {
    var l = LineSegment2(this.position.clone(), destination.clone());
    var inter1 = this.segments[index1].intersect(l, true);
    var inter2 = this.segments[index2].intersect(l, true);
    if (!inter1.isEqualEpsilon(inter2)) {
        var d1 = inter1.distanceSq(this.position);
        var d2 = inter2.distanceSq(this.position);
        inter1.free();
        inter2.free();
        l.free();
        return d1 < d2;
    }
    var end1 = this.segments[index1].start;
    if (inter1.isEqualEpsilon(this.segments[index1].start)) {
        end1 = this.segments[index1].end;
    }
    var end2 = this.segments[index2].start;
    if (inter2.isEqualEpsiolon(this.segments[index2].start)) {
        end2 = this.segments[index2].end;
    }
    var a1 = this.angle2(end1, inter1, this.position);
    var a2 = this.angle2(end2, inter2, this.position);
    inter1.free();
    inter2.free();
    if (a1 < PI) {
        if (a2 > PI) {
            return true;
        }
        return a2 < a1;
    }
    return a1 < a2;
};

VisibilityPolygon.prototype.parent = function (index) {
    return Math.floor((index - 1) / 2);
};

VisibilityPolygon.prototype.child = function (index) {
    return 2 * index + 1;
};

VisibilityPolygon.prototype.swap = function (c, l) {
    this.map[this.heap[l]] = c;
    this.map[this.heap[c]] = l;
    var temp = this.heap[l];
    this.heap[l] = this.heap[c];
    this.heap[c] = temp;
};


VisibilityPolygon.prototype.sortPoints = function ()
{
    var i = 0,
    n = this.segments.length,
    p = null,
    pp = Vector2();
    while (i < n) {
        for (var j = 0; j < 2; ++j) {
            if (j === 0) {
                p = this.segments[i][segmentIter[j]];
            } else {
                p = this.segments[i][segmentIter[j]];
            }
            pp.copy(this.position).subtract(p);
            var nr = 2 * i + j;
            if (this.points[nr]) {
                this.points[nr][0] = i;
                this.points[nr][1] = segmentIter[j];
                this.points[nr][2] = pp.angle();
            } else {
                this.points[nr] = [i, segmentIter[j], pp.angle()];
            }
        }
        i += 1;
    }
    pp.free();
    this.points = this.points.sort(pointsorter);
};

VisibilityPolygon.prototype.reset = function ()
{
    this.polygon.freePoints();
    var i = 0,
    n = this.map.length;
    while (i < n) {
        this.map[i] = -1;
        i += 1;
    }
    while (this.heap.length > 0) {
        this.heap.pop();
    }
};
/* jshint +W064 */

},{"./linesegment2":10,"./polygon2":11,"./vector2":18}],20:[function(require,module,exports){
(function (global){
var core = {};


core.geometry = require('./geometry');
core.linkedlist = require('./linkedlist');
core.procedural = require('./procedural');
core.timer = require('./timer');
core.input = require('./input');

module.exports = core;

global.ULTRON = core;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./geometry":9,"./input":21,"./linkedlist":25,"./procedural":28,"./timer":30}],21:[function(require,module,exports){
module.exports = {
  Unified: require('./unified')
};

},{"./unified":23}],22:[function(require,module,exports){
//Adapted from here: https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel?redirectlocale=en-US&redirectslug=DOM%2FMozilla_event_reference%2Fwheel

// taken from game-shell

var prefix = "", _addEventListener, onwheel, support;

// detect event model
if ( window.addEventListener ) {
  _addEventListener = "addEventListener";
} else {
  _addEventListener = "attachEvent";
  prefix = "on";
}

// detect available wheel event
support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
          document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
          "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

function _addWheelListener( elem, eventName, callback, useCapture ) {
  elem[ _addEventListener ]( prefix + eventName, support === "wheel" ? callback : function( originalEvent ) {
    !originalEvent && ( originalEvent = window.event );

    // create a normalized event object
    var event = {
      // keep a ref to the original event object
      originalEvent: originalEvent,
      target: originalEvent.target || originalEvent.srcElement,
      type: "wheel",
      deltaMode: originalEvent.type === "MozMousePixelScroll" ? 0 : 1,
      deltaX: 0,
      delatZ: 0,
      preventDefault: function() {
        originalEvent.preventDefault ?
          originalEvent.preventDefault() :
          originalEvent.returnValue = false;
      }
    };

    // calculate deltaY (and deltaX) according to the event
    if ( support === "mousewheel" ) {
      event.deltaY = - 1/40 * originalEvent.wheelDelta;
      // Webkit also support wheelDeltaX
      originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
    } else {
      event.deltaY = originalEvent.detail;
    }

    // it's time to fire the callback
    return callback( event );
  }, useCapture || false );
}

module.exports = function( elem, callback, useCapture ) {
  _addWheelListener( elem, support, callback, useCapture );

  // handle MozMousePixelScroll in older Firefox
  if( support === "DOMMouseScroll" ) {
    _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
  }
};

},{}],23:[function(require,module,exports){
'use strict';

// taken from https://github.com/andyhall/game-inputs

var vkey = require('vkey');
var requestFrame = require('request-frame');
var request = requestFrame('request');
var cancel = requestFrame('cancel');
var EventEmitter = require('eventemitter3');
// mousewheel polyfill borrowed directly from game-shell
var addMouseWheel = require('./mousewheel-polyfill');

module.exports = function(domElement, options) {
  return new Inputs(domElement, options);
};

// map button index to name
var gamepadButtonNames = [
    'a',
    'b',
    'x',
    'y',
    'left-shoulder',
    'right-shoulder',
    'left-trigger',
    'right-trigger',
    'select',
    'start',
    'left-stick',
    'right-stick',
    'dpad-up',
    'dpad-down',
    'dpad-left',
    'dpad-right'
];
var gamepadAxesNames = [
    'left-stick-x',
    'left-stick-y',
    'right-stick-x',
    'right-stick-y'
];
var hasGamepadEvents = 'GamepadEvent' in window;



/*
 *   Simple inputs manager to abstract key/mouse inputs.
 *        Inspired by (and where applicable stealing code from)
 *        game-shell: https://github.com/mikolalysenko/game-shell
 *
 *  inputs.bind( 'move-right', 'D', '<right>' )
 *  inputs.bind( 'move-left',  'A' )
 *  inputs.unbind( 'move-left' )
 *
 *  inputs.down.on( 'move-right',  function( binding, event ) {})
 *  inputs.up.on(   'move-right',  function( binding, event ) {})
 *
 *  inputs.state['move-right']  // true when corresponding keys are down
 *  inputs.state.dx             // mouse x movement since tick() was last called
 *  inputs.getBindings()        // [ 'move-right', 'move-left', ... ]
*/


function Inputs(element, opts) {

  // settings
  this.element = element || document;
  opts = opts || {};
  this.preventDefaults = !!opts.preventDefaults;
  this.stopPropagation = !!opts.stopPropagation;

  // emitters
  this.down = new EventEmitter();
  this.up = new EventEmitter();
  this.gamepadconnected = new EventEmitter();
  this.gamepaddisconnected = new EventEmitter();

  // state object to be queried
  this.state = {
    dx: 0, dy: 0,
    scrollx: 0, scrolly: 0, scrollz: 0
  };

  // internal state
  this._keybindmap = {};       // { 'vkeycode' : [ 'binding', 'binding2' ] }
  this._keyStates = {};        // { 'vkeycode' : boolean }
  this._bindPressCounts = {};  // { 'binding' : int }
  this._gamepads = {}; // { 'index' : gamepad }
  this._gamepadButtonStates = {}; // { 'vcode' : int }

  // raf handle
  this._gamepadRaf = false;

  // register for dom events
  this.initEvents();
}


/*
 *
 *   PUBLIC API
 *
*/

Inputs.prototype.initEvents = function() {
  // keys
  window.addEventListener( 'keydown', onKeyEvent.bind(undefined,this,true), false );
  window.addEventListener( 'keyup', onKeyEvent.bind(undefined,this,false), false );
  // mouse buttons
  this.element.addEventListener('mousedown', onMouseEvent.bind(undefined,this,true), false);
  this.element.addEventListener('mouseup', onMouseEvent.bind(undefined,this,false), false);
  this.element.oncontextmenu = onContextMenu.bind(undefined,this);
  // mouse other
  this.element.addEventListener('mousemove', onMouseMove.bind(undefined,this), false);
  addMouseWheel(this.element, onMouseWheel.bind(undefined,this), false);

  // gamepads
  if ( hasGamepadEvents ) {
      window.addEventListener('gamepadconnected', onGamepadConnected.bind(undefined,this), false);
      window.addEventListener('gamepaddisconnected', onGamepadDisconnected.bind(undefined,this), false);
  } else {
      window.setInterval(scanGamepads.bind(undefined, this), 500);
  }
};


// Usage:  bind( bindingName, vkeyCode, vkeyCode.. )
//    Note that inputs._keybindmap maps vkey codes to binding names
//    e.g. this._keybindmap['a'] = 'move-left'
Inputs.prototype.bind = function(binding) {
  for (var i=1; i<arguments.length; ++i) {
    var vkeyCode = arguments[i];
    var arr = this._keybindmap[vkeyCode] || [];
    if (arr.indexOf(binding) === -1) {
      arr.push(binding);
    }
    this._keybindmap[vkeyCode] = arr;
  }
  this.state[binding] = !!this.state[binding];
};

// search out and remove all keycodes bound to a given binding
Inputs.prototype.unbind = function(binding) {
  for (var b in this._keybindmap) {
    var arr = this._keybindmap[b];
    var i = arr.indexOf(binding);
    if (i>-1) { arr.splice(i,1); }
  }
};

// tick function - clears out cumulative mouse movement state variables
Inputs.prototype.tick = function() {
  this.state['mouse-dx'] = this.state['mouse-dy'] = 0;
  this.state['mouse-scrollx'] = this.state['mouse-scrolly'] = this.state['mouse-scrollz'] = 0;
};



Inputs.prototype.getBoundKeys = function() {
  var arr = [];
  for (var b in this._keybindmap) { arr.push(b); }
  return arr;
};


/*
 *   INTERNALS - DOM EVENT HANDLERS
*/

function onKeyEvent(inputs, wasDown, ev) {
  handleKeyEvent( ev.keyCode, vkey[ev.keyCode], wasDown, inputs, ev );
}

function onMouseEvent(inputs, wasDown, ev) {
  // simulate a code out of range of vkey
  var keycode = -1 - ev.button;
  var vkeycode = '<mouse '+ (ev.button+1) +'>';
  handleKeyEvent( keycode, vkeycode, wasDown, inputs, ev );
  return false;
}

function onContextMenu(inputs) {
  // cancel context menu if there's a binding for right mousebutton
  var arr = inputs._keybindmap['<mouse 3>'];
  if (arr) { return false; }
}

function onMouseMove(inputs, ev) {
  // for now, just populate the state object with mouse movement
  var dx = ev.movementX || ev.mozMovementX || ev.webkitMovementX || 0,
      dy = ev.movementY || ev.mozMovementY || ev.webkitMovementY || 0;
  inputs.state['mouse-dx'] += dx;
  inputs.state['mouse-dy'] += dy;
  // TODO: verify if this is working/useful during pointerlock?
}

function onMouseWheel(inputs, ev) {
  // basically borrowed from game-shell
  var scale = 1;
  switch(ev.deltaMode) {
    case 0: scale=1;   break;  // Pixel
    case 1: scale=12;  break;  // Line
    case 2:  // page
      // TODO: investigagte when this happens, what correct handling is
      scale = inputs.element.clientHeight || window.innerHeight;
      break;
  }
  // accumulate state
  inputs.state['mouse-scrollx'] += ev.deltaX * scale;
  inputs.state['mouse-scrolly'] += ev.deltaY * scale;
  inputs.state['mouse-scrollz'] += (ev.deltaZ * scale) || 0;
  return false;
}


/*
 *   KEY BIND HANDLING
*/


function handleKeyEvent(keycode, vcode, wasDown, inputs, ev) {
  var arr = inputs._keybindmap[vcode];
  // don't prevent defaults if there's no binding
  if (!arr) { return; }
  if (inputs.preventDefaults) { ev.preventDefault(); }
  if (inputs.stopPropagation) { ev.stopPropagation(); }

  // if the key's state has changed, handle an event for all bindings
  var currstate = inputs._keyStates[keycode];
  if ( XOR(currstate, wasDown) ) {
    // for each binding: emit an event, and update cached state information
    for (var i=0; i<arr.length; ++i) {
      handleBindingEvent( arr[i], wasDown, inputs, ev );
    }
  }
  inputs._keyStates[keycode] = wasDown;
}


function handleBindingEvent(binding, wasDown, inputs, ev) {
  // keep count of presses mapped by binding
  // (to handle two keys with the same binding pressed at once)
  var ct = inputs._bindPressCounts[binding] || 0;
  ct += wasDown ? 1 : -1;
  if (ct<0) { ct = 0; } // shouldn't happen
  inputs._bindPressCounts[binding] = ct;

  // emit event if binding's state has changed
  var currstate = inputs.state[binding];
  if ( XOR(currstate, ct) ) {
    var emitter = wasDown ? inputs.down : inputs.up;
    emitter.emit( binding, ev );
  }
  inputs.state[binding] = !!ct;
}

/**
Gamepad HANDLERS
*/

function handleGamePadButtonEvent(val, vcode, inputs) {
    var arr = inputs._keybindmap[vcode];
    if (!arr) { return; }

    var pressed = val === 1.0;
    var isPerc = false;
    if (typeof(val) === 'object') {
        pressed = val.pressed;
        val = val.value;
        isPerc = true;
        inputs.state[vcode] = val;
    } else {
        var currstate = inputs._buttonStates[vcode];
        if (XOR(currstate, val)) {
            var i = 0;
            for (i=0; i<arr.length; ++i) {
                handleBindingEvent( arr[i], pressed, inputs, null); // pass null as fake event
            }
        }
    }
}

function updateGamepads(inputs) {
    var found = scanGamepads(inputs);
    if (!found) {
        if (inputs._gamepadRaf) {
            cancel(inputs._gamepadRaf);
            inputs._gamepadRaf = false;
        }
        return;
    }

    var vcode = '';
    for (var j in inputs._gamepads) {
        var gamepad = inputs._gamepads[j];

        for (var i=0;i<gamepad.buttons.length;i++) {
            vcode = '<gamepad-' + j + '-' + gamepadButtonNames[i] + '>';
            handleGamePadButtonEvent(gamepad.buttons[i], vcode, inputs);
        }

        for (i=0;i<gamepad.axes.length;i++) {
            vcode = '<gamepad-' + j + '-' + gamepadAxesNames[i] + '>';
            inputs.state[vcode] = gamepad.axes[i];
        }
    }
    inputs._gamepadRaf = request(updateGamepads);
}

function onGamepadConnected(inputs, ev) {
    addGamepad(inputs, ev.gamepad);
}

function onGamepadDisconnected(inputs, ev) {
    removeGamepad(inputs, ev.gamepad);
}


function addGamepad(inputs, gamepad) {
    inputs._gamepads[gamepad.index] = gamepad;
    inputs.gamepadconnected.emit(gamepad);
    if (!inputs._gamepadRaf) {
        inputs._gamepadRaf = request(updateGamepads);
    }
}

function removeGamepad(inputs, gamepad) {
    delete inputs._gamepads[gamepad.index];
    inputs.gamepaddisconnected.emit(gamepad);
    for (var j in inputs._gamepads) {
        if (inputs._gamepads.hasOwnProperty(j)) {
            return;
        }
    }
    if (inputs._gamepadRaf) {
        cancel(inputs._gamepadRaf);
        inputs._gamepadRaf = false;
    }
}


function scanGamepads(inputs) {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    var found = false;
    for (var i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            found = true;
            if (!(gamepads[i].index in inputs._gamepads)) {
                addGamepad(inputs, gamepads[i]);
            } else {
                inputs._gamepads[gamepads[i].index] = gamepads[i];
            }
        }
    }
    return found;
}

/*
 *    HELPERS
 *
*/


// how is this not part of Javascript?
function XOR(a,b) {
  return a ? !b : b;
}

},{"./mousewheel-polyfill":22,"eventemitter3":2,"request-frame":3,"vkey":4}],24:[function(require,module,exports){
/*
 * Doubly Linked List implementation in JavaScript
 * Copyright (c) 2009 Nicholas C. Zakas
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

 /*
  * Optimizations and data reuse by Wouter Commandeur
 */

'use strict';

/**
 * A linked list implementation in JavaScript.
 * @class DoublyLinkedList
 * @constructor
 */
function DoublyLinkedList() {

    /**
     * Pointer to first item in the list.
     * @property _head
     * @type Object
     * @private
     */
    this._head = null;

    /**
     * Pointer to last item in the list.
     * @property _tail
     * @type Object
     * @private
     */
    this._tail = null;

    /**
     * The number of items in the list.
     * @property _length
     * @type int
     * @private
     */
    this._length = 0;

    this._nodeCache = [];

}

DoublyLinkedList.prototype = {

    //restore constructor
    constructor: DoublyLinkedList,

    /**
     * Appends some data to the end of the list. This method traverses
     * the existing list and places the value at the end in a new item.
     * @param {variant} data The data to add to the list.
     * @return {Void}
     * @method add
     */
    add: function (data) {
        //create a new item object, place data in
        var node = this._allocate(data);

        //special case: no items in the list yet
        if (this._length === 0) {
            this._head = node;
            this._tail = node;
        } else {
            //attach to the tail node
            this._tail.next = node;
            node.prev = this._tail;
            this._tail = node;
        }

        //don't forget to update the count
        this._length++;

    },


    set: function(index, data) {
        // update data at index
        //check for out-of-bounds values
        if (index > -1 && index < this._length){
            var current, i;
            if (index > this._length / 2) {
                current = this._tail;
                i = this._length - 1;
                while(i-- > index) {
                    current = current.prev;
                }
            } else {
                current = this._head;
                i = 0;
                while(i++ < index){
                    current = current.next;
                }
            }
            current.data = data;
        }
    },


    /**
     * Retrieves the data in the given position in the list.
     * @param {int} index The zero-based index of the item whose value
     *      should be returned.
     * @return {variant} The value in the "data" portion of the given item
     *      or null if the item doesn't exist.
     * @method item
     */
    item: function(index){

        //check for out-of-bounds values
        if (index > -1 && index < this._length){
            var current, i;
            if (index > this._length / 2) {
                current = this._tail;
                i = this._length - 1;
                while(i-- > index) {
                    current = current.prev;
                }
            } else {
                current = this._head;
                i = 0;
                while(i++ < index){
                    current = current.next;
                }
            }
            return current.data;
        } else {
            return null;
        }
    },

    pop: function() {
        return this.remove(this._length -1);
    },

    /**
     * Removes the item from the given location in the list.
     * @param {int} index The zero-based index of the item to remove.
     * @return {variant} The data in the given position in the list or null if
     *      the item doesn't exist.
     * @method remove
     */
    remove: function(index){
        //check for out-of-bounds values
        if (index > -1 && index < this._length){

            var current = this._head,
                i = 0;

            //special case: removing first item
            if (index === 0){
                this._head = current.next;

                /*
                 * If there's only one item in the list and you remove it,
                 * then this._head will be null. In that case, you should
                 * also set this._tail to be null to effectively destroy
                 * the list. Otherwise, set the previous pointer on the new
                 * this._head to be null.
                 */
                if (!this._head){
                    this._tail = null;
                } else {
                    this._head.prev = null;
                }

            //special case: removing last item
            } else if (index === this._length -1){
                current = this._tail;
                this._tail = current.prev;
                this._tail.next = null;
            } else {

                //find the right location
                while(i++ < index){
                    current = current.next;
                }

                //skip over the item to remove
                current.prev.next = current.next;
            }

            //decrement the length
            this._length--;

            // release into object pool
            this._free(current);

            //return the value
            return current.data;

        } else {
            return null;
        }
    },

    clear: function() {
        while (this._length > 0) {
            this.remove(0);
        }
    },

   /**
     * Returns the number of items in the list.
     * @return {int} The number of items in the list.
     * @method size
     */
    size: function(){
        return this._length;
    },

    /**
     * Converts the list into an array.
     * @return {Array} An array containing all of the data in the list.
     * @method toArray
     */
    toArray: function(){
        var result = [],
            current = this._head;

        while(current){
            result.push(current.data);
            current = current.next;
        }

        return result;
    },

    /**
     * Converts the list into a string representation.
     * @return {String} A string representation of the list.
     * @method toString
     */
    toString: function(){
        return this.toArray().toString();
    },

    _free: function(node) {
        this._nodeCache.push(node);
    },

    _allocate: function(data) {
        var node = this._nodeCache.pop();
        if (!node) {
            node = {};
        }
        node.data = data;
        node.prev = null;
        node.next = null;
        return node;
    }
};

exports = module.exports = DoublyLinkedList;

},{}],25:[function(require,module,exports){
module.exports = {
  DoublyLinkedList: require('./doublylinkedlist')
};

},{"./doublylinkedlist":24}],26:[function(require,module,exports){
'use strict';

/* jshint -W064 */
var RegularPolygon2 = require('../geometry/regularpolygon2');
var Polygon2 = require('../geometry/polygon2');
var Vector2 = require('../geometry/vector2');
var LineSegment2 = require('../geometry/linesegment2');
var gpc = require('../geometry/gpc');
var Delaunay = require('delaunay-fast');
var Graph = require('./graph');

exports = module.exports = Building;

var createPoly = function(points) {
	var res  = new gpc.geometry.PolyDefault();
	for(var i=0 ; i < points.length ; i++) {
		res.addPoint(new gpc.geometry.Point(points[i][0],points[i][1]));
	}
	return res;
};

var getPolygonVertices = function(poly) {
	var vertices=[];
	var numPoints = poly.getNumPoints();
	var i;

	for(i=0;i<numPoints;i++) {
		vertices.push([poly.getX(i) , poly.getY(i)]);
	}
	return vertices;
};

function Building( chance, iterations, minRadius, maxRadius, maxSides, noRotate)
{
	var end, l;
	this.centers = [];
	iterations = iterations || 1;
//	if ( iterations < 3 ) {
//		iterations = 3;
//	}
	maxSides = maxSides || 6;
	if ( maxSides < 4 ) {
		maxSides = 4;
	}
	var sidesChanceObj = { min: 4, max: maxSides };
	var radiusChanceObj = { min: minRadius, max: maxRadius };

	var sides = chance.integer(sidesChanceObj);
	var polygon = RegularPolygon2(chance.floating(radiusChanceObj), sides);
	var gpcPoly = createPoly(polygon.toArray());
	polygon.free();
	var vec, gpcPoly2, num;
	this.centers.push(Vector2());

	for (var i = 1; i < iterations;i++) {
		// new random polygon
		sides = chance.integer(sidesChanceObj);
		polygon = RegularPolygon2(chance.floating(radiusChanceObj), sides);

		// rotate random
		if (!noRotate) {
			polygon.rotate(chance.floating({min: 0, max: 2 * Math.PI / sides}));
		}

		// random point on prev poly
		num = chance.integer({min: 0, max:gpcPoly.getNumPoints()-1});
		vec = Vector2(gpcPoly.getX(num), gpcPoly.getY(num));
		this.centers.push(vec);

		// center the polygon on a random point of the previous polygon
		polygon.translate(vec);
		gpcPoly2 = createPoly(polygon.toArray());
		gpcPoly = gpcPoly.union(gpcPoly2);

		// free our stuff for reuse
		polygon.free();
	}
	var arr = getPolygonVertices(gpcPoly);

	// generate final polygon
	polygon = Polygon2.fromArray(arr);
	this.polygon = polygon;

	// this.polygon.clean(30);

	// add outer doors
	var nrdoors = Math.ceil(iterations/2);
	this.doors = [];

	var nr;
	var dooredges = {};
	for ( i=0;i<nrdoors;i++) {
		nr = chance.integer({min: 0, max: this.polygon.points.length -1});
		while (dooredges[nr]) {
			nr = chance.integer({min: 0, max: this.polygon.points.length -1});
		}
		dooredges[nr] = true;
		end = nr + 1;
		if (end === this.polygon.points.length) {
			end = 0;
		}
		l = LineSegment2(this.polygon.points[nr].clone(), this.polygon.points[end].clone());
		var p2 = l.end.clone();
		var p1 = l.start.clone();
		var length = l.length(); // p2.subtract(l.start).length();
		p2.subtract(l.start).normalize().multiplyScalar(length/2);
		p1.add(p2);
		// this.centers.push(p1);
		this.doors.push(p1);
		p2.free();
		l.free();
	}



	var c = [];
	for (i = 0; i < this.centers.length; i++) {
		c.push(this.centers[i].toArray());
	}

	this.graph = new Graph();
	this.delaunay_used = {};

	// delaunay the centers
	this.delaunay = Delaunay.triangulate(c);

	for (i = 0; i < this.delaunay.length; i += 1) {
		if (!this.delaunay_used[this.delaunay[i]]) {
			this.graph.addNode(this.delaunay[i]);
			this.delaunay_used[this.delaunay[i]] = true;
		}
	}


	this.delaunay_exists = {};

	this.delaunay_triangles = [];
	this.delaunay_lines = [];
	for (i = 0; i < this.delaunay.length; i += 3) {
		// line 1
		this.addDelaunayLine(i, i+1);
		this.addDelaunayLine(i+1, i+2);
		this.addDelaunayLine(i+2, i);
	}

	// connect the doors;
	nr = this.centers.length;
	for (i = 0; i < this.doors.length; i++) {
		this.connectDoor(this.doors[i], nr);
	}



	// calculate the minimal spanning tree
	var edges = this.graph.prim(); // Prim(this.graph);
	// console.log(edges);
	this.mst_lines = [];

	for (i = 0; i < edges.length; i ++) {
		var start = edges[i].source;
		end = edges[i].sink;
		l = LineSegment2(this.centers[start].clone(), this.centers[end].clone());
		this.mst_lines.push(l);
		//var l = LineSegment2()
	}


	this.outside = this.polygon.AABB();

	this.outside[0].subtractScalar(50);
	this.outside[1].addScalar(50);

}

Building.prototype.connectDoor = function(door, nr)
{
	var min = 9999999;
	var l,d;
	var point = false;
	for (var i= 0;i<nr;i++) {
		l = LineSegment2(this.centers[i].clone(), door.clone());
		if (!this.polygon.intersectsLine(l, true)) {
			d = l.length();
			if ( d < min ) {
				min = d;
				point = i;
			}
		}
		l.free();
	}
	if (point !== false) {
		this.centers.push(door.clone());
		this.graph.addNode(this.centers.length - 1);
		this.graph.addEdge(point, this.centers.length - 1, min);
		this.delaunay_lines.push(LineSegment2(this.centers[point].clone(), door.clone()));
	} else {
		l.free();
	}

};

Building.prototype.addDelaunayLine = function(start, end)
{
	var key1 = start + ':' + end;
	var key2 = end + ':' + start;
	if (this.delaunay_exists[key1] || this.delaunay_exists[key2]) {
		return;
	}
	this.delaunay_exists[key1] = true;
	this.delaunay_exists[key2] = true;
	var l = LineSegment2(this.centers[this.delaunay[start]].clone(), this.centers[this.delaunay[end]].clone());
	if (this.polygon.intersectsLine(l)) {
		l.free();
	} else {
		this.graph.addEdge(this.delaunay[start], this.delaunay[end], l.length());
		this.delaunay_lines.push(l);
	}
};


Building.prototype.translate = function (vec)
{
	this.polygon.translate(vec);
	for (var i=0;i<this.centers.length;i++) {
		this.centers[i].add(vec);
	}
	for (i =0;i<this.delaunay_triangles.length;i++) {
		this.delaunay_triangles[i].translate(vec);
	}
	return this;
};


/* jshint +W064 */

},{"../geometry/gpc":5,"../geometry/linesegment2":10,"../geometry/polygon2":11,"../geometry/regularpolygon2":16,"../geometry/vector2":18,"./graph":27,"delaunay-fast":1}],27:[function(require,module,exports){
'use strict';



// Represents an edge from source to sink with capacity
var Edge = function(source, sink, capacity) {
    this.source = source;
    this.sink = sink;
    this.capacity = capacity;
};

// Main class to manage the network
var Graph = function() {
    this.edges = {};
    this.nodes = [];
    this.nodeMap = {};

    // Add a node to the graph
    this.addNode = function(node) {
        this.nodes.push(node);
        this.nodeMap[node] = this.nodes.length-1;
        this.edges[node] = [];
    };

    // Add an edge from source to sink with capacity
    this.addEdge = function(source, sink, capacity) {
        // Create the two edges = one being the reverse of the other
        this.edges[source].push(new Edge(source, sink, capacity));
        this.edges[sink].push(new Edge(sink, source, capacity));
    };

    // Does edge from source to sink exist?
    this.edgeExists = function(source, sink) {
        if(this.edges[source] !== undefined) {
            for(var i=0;i<this.edges[source].length;i++) {
                if(this.edges[source][i].sink === sink) {
                    return this.edges[source][i];
                }
            }
        }
        return null;
    };


    this.prim = function() {
        var result = [];
        var resultEdges = [];
        var usedNodes = {};

        function findMin(g) {
            var min = [999999,null];
            for(var i=0;i<result.length;i++) {
                for(var n=0;n<g.edges[result[i]].length;n++) {
                    if(g.edges[result[i]][n].capacity < min[0] && usedNodes[g.edges[result[i]][n].sink] === undefined) {
                        min = [g.edges[result[i]][n].capacity, g.edges[result[i]][n]];
                    }
                }
            }
            return min;
        }

        // Pick random start point
        var node = this.nodes[Math.round(Math.random()*(this.nodes.length-1))];
        result.push(node);
        usedNodes[node] = true;

        var min = findMin(this);
        while(min[1] !== null) {
            resultEdges.push(min[1]);
            result.push(min[1].sink);
            usedNodes[min[1].sink] = true;
            min = findMin(this);
        }

        return resultEdges;
    };

};

module.exports = Graph;

},{}],28:[function(require,module,exports){
module.exports = {
  Graph: require('./graph'),
  Building: require('./building')
};

},{"./building":26,"./graph":27}],29:[function(require,module,exports){
'use strict';

var requestFrame = require('request-frame');
var request = requestFrame('request');
var cancel = requestFrame('cancel');

var NOOP = function(){};

exports = module.exports = GameLoop;

function GameLoop () {
  this.simulationTimestep = 1000 / 60;
  this.frameDelta = 0;
  this.lastFrameTimeMs = 0;
  this.fps = 60;
  this.lastFpsUpdate = 0;
  this.framesThisSecond = 0;
  this.numUpdateSteps = 0;
  this.minFrameDelay = 0;
  this.running = false;
  this.started = false;
  this.panic = false;
  this.rafHandle = false;
  this.boundAnimate = this.animate.bind(this);
}

GameLoop.prototype.begin = NOOP;
GameLoop.prototype.update = NOOP;
GameLoop.prototype.render = NOOP;
GameLoop.prototype.end = NOOP;

GameLoop.prototype.getSimulationTimestep = function() {
  return this.simulationTimestep;
};

GameLoop.prototype.setSimulationTimestep = function(timestep) {
  this.simulationTimestep = timestep;
  return this;
};

GameLoop.prototype.getFPS = function () {
  return this.fps;
};

GameLoop.prototype.getMaxAllowedFPS = function() {
  return 1000 / this.minFrameDelay;
};

GameLoop.prototype.setMaxAllowedFPS =  function(fps) {
  if (typeof fps === 'undefined') {
    fps = Infinity;
  }
  if (fps === 0) {
    this.stop();
  }
  else {
    // Dividing by Infinity returns zero.
    this.minFrameDelay = 1000 / fps;
  }
  return this;
};

GameLoop.prototype.resetFrameDelta = function() {
  var oldFrameDelta = this.frameDelta;
  this.frameDelta = 0;
  return oldFrameDelta;
};

GameLoop.prototype.setBegin = function(fun) {
  this.begin = fun || this.begin;
  return this;
};

GameLoop.prototype.setUpdate = function(fun) {
  this.update = fun || this.update;
  return this;
};

GameLoop.prototype.setRender = function(fun) {
  this.render = fun || this.render;
  return this;
};

GameLoop.prototype.setEnd = function(fun) {
  this.end = fun || this.end;
  return this;
};

GameLoop.prototype.start = function() {
  if (!this.started) {
    this.started = true;
    this.rafHandle = request(function(timestamp) {
      this.render(1);
      this.running = true;
      this.lastFrameTimeMs = timestamp;
      this.lastFpsUpdate = timestamp;
      this.framesThisSecond = 0;
      this.rafHandle = request(this.animate.bind(this));
    });
  }
  return this;
};

GameLoop.prototype.stop = function() {
  this.running = false;
  this.started = false;
  cancel(this.rafHandle);
  return this;
};

GameLoop.prototype.isRunning = function() {
  return this.running;
};

GameLoop.prototype.animate = function animate(timestamp) {

    if (timestamp < this.lastFrameTimeMs + this.minFrameDelay) {
        this.rafHandle = request(this.boundAnimate);
        return;
    }

    this.frameDelta += timestamp - this.lastFrameTimeMs;
    this.lastFrameTimeMs = timestamp;

    this.begin(timestamp, this.frameDelta);

    if (timestamp > this.lastFpsUpdate + 1000) {
        this.fps = 0.25 * this.framesThisSecond + 0.75 * this.fps;
        this.lastFpsUpdate = timestamp;
        this.framesThisSecond = 0;
    }
    this.framesThisSecond++;

     /* - http://gameprogrammingpatterns.com/game-loop.html
     * - http://gafferongames.com/game-physics/fix-your-timestep/
     * - https://gamealchemist.wordpress.com/2013/03/16/thoughts-on-the-javascript-game-loop/
     * - https://developer.mozilla.org/en-US/docs/Games/Anatomy
     */
    this.numUpdateSteps = 0;
    while (this.frameDelta >= this.simulationTimestep) {
        this.update(this.simulationTimestep);
        this.frameDelta -= this.simulationTimestep;

        if (++this.numUpdateSteps >= 240) {
            this.panic = true;
            break;
        }
    }

    this.render(this.frameDelta / this.simulationTimestep);

    this.end(this.fps, this.panic);

    this.panic = false;

    this.rafHandle = request(this.boundAnimate);
};

},{"request-frame":3}],30:[function(require,module,exports){
module.exports = {
  GameLoop: require('./gameloop')
};

},{"./gameloop":29}]},{},[20])(20)
});


//# sourceMappingURL=ultron.js.map
