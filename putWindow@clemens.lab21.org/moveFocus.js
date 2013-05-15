const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;

function MoveFocus(utils) {
  this._init(utils);
};

MoveFocus.prototype = {

  _bindings: [],
  _settingsChangedListener: {},

  _init: function(utils) {
    this._utils = utils;

    this._settingObject = this._utils.getSettingsObject();
    this._settingsChangedListener = {
      name: this._utils.MOVE_FOCUS_ENABLED,
      fn: Lang.bind(this, function() {
        var enabled = this._utils.getBoolean(this._utils.MOVE_FOCUS_ENABLED, false);
        if (enabled) {
          this._enable();
        } else {
          this._disable();
        }
      })
    };

    this._settingsChangedListener.handlerId = this._settingObject.connect(
      'changed::' + this._utils.MOVE_FOCUS_ENABLED,
      this._settingsChangedListener.fn
    );

    var enabled = this._utils.getBoolean(this._utils.MOVE_FOCUS_ENABLED, false);
    if (enabled) {
      this._enable();
    }
  },

  /**
   * Helper functions to set custom handler for keybindings
   */
  _addKeyBinding: function(key, handler) {
    this._bindings.push(key);
    if (Main.wm.addKeybinding && Shell.KeyBindingMode) { // introduced in 3.7.5
      Main.wm.addKeybinding(key,
        this._utils.getSettingsObject(), Meta.KeyBindingFlags.NONE,
        Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY,
        handler
      );
    } else if (Main.wm.addKeybinding && Main.KeybindingMode) { // introduced in 3.7.2
      Main.wm.addKeybinding(key,
        this._utils.getSettingsObject(), Meta.KeyBindingFlags.NONE,
        Main.KeybindingMode.NORMAL | Main.KeybindingMode.MESSAGE_TRAY,
        handler
      );
    } else {
      global.display.add_keybinding(
        key,
        this._utils.getSettingsObject(),
        Meta.KeyBindingFlags.NONE,
        handler
      );
    }
  },

  destroy: function() {
    this._disable();

    if (this._settingsChangedListener) {
      this._settingObject.disconnect(this._settingsChangedListener.handlerId);
    }
  },

  _enable: function() {
    this._addKeyBinding("move-focus-north",
      Lang.bind(this, function() { this._moveFocus("n"); })
    );
    this._addKeyBinding("move-focus-east",
      Lang.bind(this, function() { this._moveFocus("e"); })
    );
    this._addKeyBinding("move-focus-south",
      Lang.bind(this, function() { this._moveFocus("s"); })
    );
    this._addKeyBinding("move-focus-west",
      Lang.bind(this, function() { this._moveFocus("w"); })
    );
  },

  _disable: function() {

    let size = this._bindings.length;

    for(let i = 0; i<size; i++) {
      if (Main.wm.removeKeybinding) {// introduced in 3.7.2
        Main.wm.removeKeybinding(this._bindings[i]);
      } else {
        global.display.remove_keybinding(this._bindings[i]);
      }
    }
    this._bindings = [];
  },

  _getDistance: function(focusWin, candidateWin){
    let focus = this._getCenter(focusWin.get_outer_rect());
    let candidate = this._getCenter(candidateWin.get_outer_rect());

    let dx = focus.x - candidate.x;
    let dy = focus.y - candidate.y;

    return Math.sqrt(dx * dx + dy *dy);

  },

  _getCenter: function(rect){
  	return {x: rect.x - rect.width / 2, y: rect.y + rect.height / 2};
  },

  _isCandidate: function(focusWin, candidateWin, direction){

  	let diff = 20;

  	let focus = this._getCenter(focusWin.get_outer_rect());
  	let candidate = this._getCenter(candidateWin.get_outer_rect());

		switch (direction){
			case "n":
				if (focus.y < candidate.y)
					return false;
				if (Math.abs(focus.y - candidate.y)+diff < Math.abs(focus.x - candidate.x))
					return false;
				return true;
			case "e":
				if (focus.x > candidate.x)
					return false;
				if (Math.abs(focus.y - candidate.y) > Math.abs(focus.x - candidate.x)+diff)
					return false;
				return true;
			case "s":
				if (focus.y > candidate.y)
					return false;
				if (Math.abs(focus.y - candidate.y)+diff < Math.abs(focus.x - candidate.x))
					return false;
				return true;
			case "w":
				if (focus.x < candidate.x)
					return false;
				if (Math.abs(focus.y - candidate.y) > Math.abs(focus.x - candidate.x)+diff)
					return false;
				return true;
			default:
				// in case of doubt: mumble
				return true;
		}


  },

  _moveFocus: function(direction) {
    let win = global.display.focus_window;
    if (win == null) {
      return;
    }

    let screen = global.screen;
    let display = screen.get_display();
    let windows = display.get_tab_list(Meta.TabList.NORMAL_ALL, screen, screen.get_active_workspace());

    // only one windows --> already focused
    let winLength = windows.length;
    if (winLength == 1)
      return;


    let candidates = [];

    for (let i=0; i < windows.length; i++) {

      if (windows[i].has_focus())
      	continue;

      if (this._isCandidate(win, windows[i],direction)){
      	candidates.push({
      		window: windows[i],
      		index: i,
      		dist: this._getDistance(win, windows[i])
      	});
      }
    } // end for windows


		if (candidates.length == 0)
			return;

		candidates.sort(function(a, b){
			return a.dist - b.dist;
		});

		candidates[0].window.activate(global.get_current_time());

  },

};
