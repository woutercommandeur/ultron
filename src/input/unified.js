'use strict';

// taken from https://github.com/andyhall/game-inputs

var vkey = require('vkey');
var requestFrame = require('request-frame');
var request = requestFrame('request');
var cancel = requestFrame('cancel');
var EventEmitter = require('eventemitter3');
// mousewheel polyfill borrowed directly from game-shell
var addMouseWheel = require('./mousewheel-polyfill');

module.exports = Inputs;

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
// var hasGamepadEvents = 'GamepadEvent' in window;
var hasGamepadEvents = !!navigator.webkitGetGamepads || !!navigator.webkitGamepads || (navigator.userAgent.indexOf('Firefox/') !== -1) || !!navigator.getGamepads;

function XOR(a, b) {
    return a ? !b : b;
}



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

Inputs.prototype.initEvents = function () {
    // keys
    window.addEventListener('keydown', this._onKeyEvent.bind(this, true), false);
    window.addEventListener('keyup', this._onKeyEvent.bind(this, false), false);
    // mouse buttons
    this.element.addEventListener('mousedown', this._onMouseEvent.bind(this, true), false);
    this.element.addEventListener('mouseup', this._onMouseEvent.bind(this, false), false);
    this.element.oncontextmenu = this._onContextMenu.bind(this);
    // mouse other
    this.element.addEventListener('mousemove', this._onMouseMove.bind(this), false);
    // mousewheel polyfill shizzle
    addMouseWheel(this.element, this._onMouseWheel.bind(this), false);

    // gamepads
    if (hasGamepadEvents) {
        window.addEventListener('gamepadconnected', this._onGamepadConnected.bind(this), false);
        window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected.bind(this), false);
    }
    this._scanGamepads();
};


// Usage:  bind( bindingName, vkeyCode, vkeyCode.. )
//    Note that inputs._keybindmap maps vkey codes to binding names
//    e.g. this._keybindmap['a'] = 'move-left'
Inputs.prototype.bind = function (binding) {
    for (var i = 1; i < arguments.length; ++i) {
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
Inputs.prototype.unbind = function (binding) {
    for (var b in this._keybindmap) {
        var arr = this._keybindmap[b];
        var i = arr.indexOf(binding);
        if (i > -1) {
            arr.splice(i, 1);
        }
    }
};

// tick function - clears out cumulative mouse movement state variables
Inputs.prototype.tick = function () {
    this.state['mouse-dx'] = this.state['mouse-dy'] = 0;
    this.state['mouse-scrollx'] = this.state['mouse-scrolly'] = this.state['mouse-scrollz'] = 0;
};


Inputs.prototype.getBoundKeys = function () {
    var arr = [];
    for (var b in this._keybindmap) {
        arr.push(b);
    }
    return arr;
};


/*
 *   INTERNALS - DOM EVENT HANDLERS KEYBOARD AND MOUSE
 */


Inputs.prototype._onKeyEvent = function(wasDown, ev) {
    this._handleKeyEvent(ev.keyCode, vkey[ev.keyCode], wasDown, ev)
};

Inputs.prototype._handleKeyEvent = function(keycode, vcode, wasDown, ev) {
    var arr = this._keybindmap[vcode];
    // don't prevent defaults if there's no binding
    if (!arr) {
        return;
    }
    if (this.preventDefaults) {
        ev.preventDefault();
    }
    if (this.stopPropagation) {
        ev.stopPropagation();
    }

    // if the key's state has changed, handle an event for all bindings
    var currstate = this._keyStates[keycode];
    if (XOR(currstate, wasDown)) {
        // for each binding: emit an event, and update cached state information
        for (var i = 0; i < arr.length; ++i) {
            this._handleBindingEvent(arr[i], wasDown, ev);
        }
    }
    this._keyStates[keycode] = wasDown;
};

Inputs.prototype._handleBindingEvent = function(binding, wasDown, ev) {
    // keep count of presses mapped by binding
    // (to handle two keys with the same binding pressed at once)
    var ct = this._bindPressCounts[binding] || 0;
    ct += wasDown ? 1 : -1;
    if (ct < 0) {
        ct = 0;
    } // shouldn't happen
    this._bindPressCounts[binding] = ct;

    // emit event if binding's state has changed
    var currstate = this.state[binding];
    if (XOR(currstate, ct)) {
        var emitter = wasDown ? this.down : this.up;
        emitter.emit(binding, binding, ev);
    }
    this.state[binding] = !!ct;
};



Inputs.prototype._onMouseEvent = function(wasDown, ev) {
    // simulate a code out of range of vkey
    var keycode = -1 - ev.button;
    var vkeycode = '<mouse ' + (ev.button + 1) + '>';
    this._handleKeyEvent(keycode, vkeycode, wasDown, ev);
    return false;
};

Inputs.prototype._onContextMenu = function() {
    // cancel context menu if there's a binding for right mousebutton
    var arr = this._keybindmap['<mouse 3>'];
    if (arr) {
        return false;
    }
};

Inputs.prototype._onMouseMove = function(ev) {
    // for now, just populate the state object with mouse movement
    this.state['mouse-dx'] += ev.movementX || ev.mozMovementX || ev.webkitMovementX || 0;
    this.state['mouse-dy'] += ev.movementY || ev.mozMovementY || ev.webkitMovementY || 0;
    // TODO: verify if this is working/useful during pointerlock?
};

Inputs.prototype._onMouseWheel = function(ev) {
    // basically borrowed from game-shell
    var scale = 1;
    switch (ev.deltaMode) {
        case 0:
            scale = 1;
            break;  // Pixel
        case 1:
            scale = 12;
            break;  // Line
        case 2:  // page
            // TODO: investigagte when this happens, what correct handling is
            scale = this.element.clientHeight || window.innerHeight;
            break;
    }
    // accumulate state
    this.state['mouse-scrollx'] += ev.deltaX * scale;
    this.state['mouse-scrolly'] += ev.deltaY * scale;
    this.state['mouse-scrollz'] += (ev.deltaZ * scale) || 0;
    return false;
};


/**
 Gamepad HANDLERS
 */

Inputs.prototype._handleGamePadButtonEvent = function(val, vcode) {
    var arr = this._keybindmap[vcode];
    if (!arr) {
        return;
    }
    console.log(vcode, val.pressed, val.value);

    var pressed = val === 1.0;
    var isPerc = false;
    if (typeof(val) === 'object') {
        pressed = val.pressed;
        val = val.value;
        isPerc = true;
        this.state[vcode] = val;
    } else {
        var currstate = this._buttonStates[vcode];
        if (XOR(currstate, val)) {
            var i = 0;
            for (i = 0; i < arr.length; ++i) {
              console.log(arr[i],pressed);
                this._handleBindingEvent(arr[i], pressed, null); // pass null as fake event
            }
        }
    }
};

Inputs.prototype._updateGamepads = function() {
    var found = this._scanGamepads();
    if (!found) {
        if (this._gamepadRaf) {
            cancel(this._gamepadRaf);
            this._gamepadRaf = false;
        }
        return;
    }

    var vcode = '';
    for (var j in this._gamepads) {
        var gamepad = this._gamepads[j];

        for (var i = 0; i < gamepad.buttons.length; i++) {
            vcode = '<gamepad-' + j + '-' + gamepadButtonNames[i] + '>';
            this._handleGamePadButtonEvent(gamepad.buttons[i], vcode);
        }

        for (i = 0; i < gamepad.axes.length; i++) {
            vcode = '<gamepad-' + j + '-' + gamepadAxesNames[i] + '>';
            this.state[vcode] = gamepad.axes[i];
        }
    }
    if (!this._gamepadRaf) {
        var self = this;
        this._gamepadRaf = request(function () {
            self._updateGamepads();
        });
    }
};

Inputs.prototype._onGamepadConnected = function(ev) {
    this._addGamepad(ev.gamepad);
};

Inputs.prototype._onGamepadDisconnected = function(ev) {
    this._removeGamepad(ev.gamepad);
};


Inputs.prototype._addGamepad = function(gamepad) {
    this._gamepads[gamepad.index] = gamepad;
    this.gamepadconnected.emit(gamepad);
    if (!this._gamepadRaf) {
        var self = this;
        this._gamepadRaf = request( function() { self._updateGamepads(); } );
    }
};

Inputs.prototype._removeGamepad = function(gamepad) {
    delete this._gamepads[gamepad.index];
    this.gamepaddisconnected.emit(gamepad);
    for (var j in this._gamepads) {
        if (this._gamepads.hasOwnProperty(j)) {
            return;
        }
    }
    if (this._gamepadRaf) {
        cancel(this._gamepadRaf);
        this._gamepadRaf = false;
    }
};


Inputs.prototype._scanGamepads = function() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : (navigator.webkitGamePads ? navigator.webkitGamepads() : []));
    var found = false;
    for (var i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            found = true;
            if (!this._gamepads[gamepads[i].index]) {
                this._addGamepad(gamepads[i]);
            } else {
                this._gamepads[gamepads[i].index] = gamepads[i];
            }
        }
    }
    return found;
};

