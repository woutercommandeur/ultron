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

Inputs.prototype.initEvents = function () {
    // keys
    window.addEventListener('keydown', onKeyEvent.bind(undefined, this, true), false);
    window.addEventListener('keyup', onKeyEvent.bind(undefined, this, false), false);
    // mouse buttons
    this.element.addEventListener('mousedown', onMouseEvent.bind(undefined, this, true), false);
    this.element.addEventListener('mouseup', onMouseEvent.bind(undefined, this, false), false);
    this.element.oncontextmenu = onContextMenu.bind(undefined, this);
    // mouse other
    this.element.addEventListener('mousemove', onMouseMove.bind(undefined, this), false);
    addMouseWheel(this.element, onMouseWheel.bind(undefined, this), false);

    // gamepads
    if (hasGamepadEvents) {
        window.addEventListener('gamepadconnected', onGamepadConnected.bind(undefined, this), false);
        window.addEventListener('gamepaddisconnected', onGamepadDisconnected.bind(undefined, this), false);
        scanGamepads(this);
    } else {
        window.setInterval(scanGamepads.bind(undefined, this), 500);
    }
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
 *   INTERNALS - DOM EVENT HANDLERS
 */

function onKeyEvent(inputs, wasDown, ev) {
    handleKeyEvent(ev.keyCode, vkey[ev.keyCode], wasDown, inputs, ev);
}

function onMouseEvent(inputs, wasDown, ev) {
    // simulate a code out of range of vkey
    var keycode = -1 - ev.button;
    var vkeycode = '<mouse ' + (ev.button + 1) + '>';
    handleKeyEvent(keycode, vkeycode, wasDown, inputs, ev);
    return false;
}

function onContextMenu(inputs) {
    // cancel context menu if there's a binding for right mousebutton
    var arr = inputs._keybindmap['<mouse 3>'];
    if (arr) {
        return false;
    }
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
    switch (ev.deltaMode) {
        case 0:
            scale = 1;
            break;  // Pixel
        case 1:
            scale = 12;
            break;  // Line
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
    if (!arr) {
        return;
    }
    if (inputs.preventDefaults) {
        ev.preventDefault();
    }
    if (inputs.stopPropagation) {
        ev.stopPropagation();
    }

    // if the key's state has changed, handle an event for all bindings
    var currstate = inputs._keyStates[keycode];
    if (XOR(currstate, wasDown)) {
        // for each binding: emit an event, and update cached state information
        for (var i = 0; i < arr.length; ++i) {
            handleBindingEvent(arr[i], wasDown, inputs, ev);
        }
    }
    inputs._keyStates[keycode] = wasDown;
}


function handleBindingEvent(binding, wasDown, inputs, ev) {
    // keep count of presses mapped by binding
    // (to handle two keys with the same binding pressed at once)
    var ct = inputs._bindPressCounts[binding] || 0;
    ct += wasDown ? 1 : -1;
    if (ct < 0) {
        ct = 0;
    } // shouldn't happen
    inputs._bindPressCounts[binding] = ct;

    // emit event if binding's state has changed
    var currstate = inputs.state[binding];
    if (XOR(currstate, ct)) {
        var emitter = wasDown ? inputs.down : inputs.up;
        emitter.emit(binding, binding, ev);
    }
    inputs.state[binding] = !!ct;
}

/**
 Gamepad HANDLERS
 */

function handleGamePadButtonEvent(val, vcode, inputs) {
    var arr = inputs._keybindmap[vcode];
    if (!arr) {
        return;
    }
    console.log(vcode);

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
            for (i = 0; i < arr.length; ++i) {
                handleBindingEvent(arr[i], pressed, inputs, null); // pass null as fake event
            }
        }
    }
}

function updateGamepads(inputs, extra, foo) {
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

        for (var i = 0; i < gamepad.buttons.length; i++) {
            vcode = '<gamepad-' + j + '-' + gamepadButtonNames[i] + '>';
            handleGamePadButtonEvent(gamepad.buttons[i], vcode, inputs);
        }

        for (i = 0; i < gamepad.axes.length; i++) {
            vcode = '<gamepad-' + j + '-' + gamepadAxesNames[i] + '>';
            inputs.state[vcode] = gamepad.axes[i];
        }
    }
    inputs._gamepadRaf = request( function() { updateGamepads(inputs); } );
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
        inputs._gamepadRaf = request( function() { updateGamepads(inputs); } );
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
            if (!inputs._gamepads[gamepads[i].index]) {
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
function XOR(a, b) {
    return a ? !b : b;
}
