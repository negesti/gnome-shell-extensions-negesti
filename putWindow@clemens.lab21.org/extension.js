const Gettext = imports.gettext;
const Lang = imports.lang;
const Meta = imports.gi.Meta;


/**
 * load the moveWindow.js file
 *
 * const Extension = imports.ui.extensionSystem.extensions["putWindow@clemens.lab21.org"];
 * const MoveWindow = Extension.moveWindow;
 **/

/**
 * Handles all keybinding stuff and moving windows.
 * Binds following keyboard shortcuts:
 *  - run_command_1 to "Open SimpleMenu"
 *  - move_to_side_n/e/s/w move and resize windows
 *  - move_to_corner_ne/se/sw/nw move an resize to the corners
 *
 **/
function MoveWindow() {
  this._init();
};

MoveWindow.prototype = {

  // private variables
  _keyBindingHandlers: [],
  _bindings: [],
  _shellwm: global.window_manager,

  _topBarHeight: 55,
  _width: 0,
  _height: 0,


  /**
   * Helper functions to takeover binding when enabled and release them
   * on disbale.
   * TODO. find "_shellwm.release_keybinding" to restore normal keybindig
   * after disable. (currently only disables the new binding.
   */
  _addKeyBinding: function(keybinding, handler) {
    if (this._keyBindingHandlers[keybinding])
      this._shellwm.disconnect(this._keyBindingHandlers[keybinding]);
    else {
      this._shellwm.takeover_keybinding(keybinding);
      this._bindings[this._bindings.length] = keybinding;
    }

    this._keyBindingHandlers[keybinding] =
        this._shellwm.connect('keybinding::' + keybinding, handler);
  },

  /**
   * pass width or height = -1 to maximize in this direction
   */
  _moveFocused: function(x, y, width, height) {
    let win = global.display.focus_window;
    if (win==null) {
        log("no window focused");
        return;
    }

    if (height == -1) {
      win.maximize(Meta.MaximizeFlags.VERTICAL);
      height = 400; // dont resize to width, -1
    } else {
      win.unmaximize(Meta.MaximizeFlags.VERTICAL);
    }

    if (width == -1) {
      win.maximize(Meta.MaximizeFlags.HORIZONTAL);
      width = 400;  // dont resize to height, -1
    } else {
      win.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
    }

    // snap, widht, height, force
    win.resize(true, width, height, true);
    // snap, x, y
    win.move(true, x, y);
  },

  /**
   * Get global.screen_width and global.screen_height and
   * bind the keys
   **/
  _init: function() {
    this._width = (global.screen_width/2);
    let totalH = global.screen_height;
    this._height = (totalH / 2) - this._topBarHeight + 10;
    this._sy = totalH - this._height;

    // move to n, e, s an w
    this._addKeyBinding("move_to_side_n",
      Lang.bind(this, function(){ this._moveFocused(0, this._topBarHeight, -1, this._height); })
    );
    this._addKeyBinding("move_to_side_e",
      Lang.bind(this, function(){ this._moveFocused(this._width, this._topBarHeight, this._width, -1);})
    );
    this._addKeyBinding("move_to_side_s",
      Lang.bind(this, function(){ this._moveFocused(0, this._sy, -1, this._height);})
    );
    this._addKeyBinding("move_to_side_w",
      Lang.bind(this, function(){ this._moveFocused(0, this._topBarHeight, this._width, -1);})
    );

    // move to  nw, se, sw, nw
    this._addKeyBinding("move_to_corner_ne",
      Lang.bind(this, function(){ this._moveFocused(this._width, this._topBarHeight, this._width, this._height);})
    );
    this._addKeyBinding("move_to_corner_se",
      Lang.bind(this, function(){ this._moveFocused(this._width, this._sy, this._width, this._height);})
    );
    this._addKeyBinding("move_to_corner_sw",
      Lang.bind(this, function(){ this._moveFocused(0, this._sy, this._width, this._height);})
    );
    this._addKeyBinding("move_to_corner_nw",
      Lang.bind(this, function(){ this._moveFocused(0, this._topBarHeight, this._width, this._height);})
    );
  },

  /**
   * disconnect all keyboard bindings that were added with _addKeyBinding
   **/
  destroy: function() {
    var size = this._bindings.length;
    for(let i = 0; i<size; i++) {
        this._shellwm.disconnect(this._keyBindingHandlers[this._bindings[i]]);
    }
  }
}

function init(meta) {
  let userExtensionLocalePath = meta.path + '/locale';
  Gettext.bindtextdomain("putWindow", userExtensionLocalePath);
  Gettext.textdomain("putWindow");
};

function enable() {
  this._moveWindow = new MoveWindow();
};

function disable(){
  this._moveWindow.destroy();
};
