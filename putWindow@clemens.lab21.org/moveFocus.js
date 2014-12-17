const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;

function MoveFocus(utils) {
  this._init(utils);
};

MoveFocus.prototype = {

	_angle_correction: 20,
  _distance_correction: 10,

  _bindings: [],
  _settingsChangedListener: {},

  _init: function(utils) {
    this._utils = utils;

    this._settingObject = this._utils.getSettingsObject();
    this._settingsChangedListener = {
      name: this._utils.MOVE_FOCUS_ENABLED,
      fn: Lang.bind(this, function() {
        let enabled = this._utils.getBoolean(this._utils.MOVE_FOCUS_ENABLED, false);
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

    let enabled = this._utils.getBoolean(this._utils.MOVE_FOCUS_ENABLED, false);
    if (enabled) {
      this._enable();
    }
  },

  /**
   * Helper functions to set custom handler for keybindings
   */
  _addKeyBinding: function(key, handler) {
    this._bindings.push(key);
    // Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY,
    if (Main.wm.addKeybinding && Shell.KeyBindingMode) { // introduced in 3.7.5
      Main.wm.addKeybinding(key,
        this._utils.getSettingsObject(), Meta.KeyBindingFlags.NONE,
        Shell.KeyBindingMode.NORMAL,
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
    this._addKeyBinding("move-focus-left-screen",
      Lang.bind(this, function() { this._moveFocusToScreen("l"); })
    );
    this._addKeyBinding("move-focus-right-screen",
      Lang.bind(this, function() { this._moveFocusToScreen("r"); })
    );

    this._addKeyBinding("move-focus-cycle",
      Lang.bind(this, function() { this._cycle(); })
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
  	return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
  },

  _isCandidate: function(focusWin, candidateWin, direction){

  	let focus = this._getCenter(focusWin.get_outer_rect());
  	let candidate = this._getCenter(candidateWin.get_outer_rect());

		// a window is candidate if:
		// 1. the center of the candidate window is further in the direction you want
		//	to change to then the center of the focused window
		// 2. the endge of the candidate window is further in the direction you want
		//	to change to then the edge of the focused window
		// 3. the center of the candidate ist in a 90-ish° angle to the direction
		//	you want to change to from the center of the focussed window

		switch (direction){
			case "n":
				if (focus.y <= candidate.y){
					return false;
				}
				if (focusWin.get_outer_rect().y <= candidateWin.get_outer_rect().y + this._distance_correction){
					return false;
				}
				if (Math.abs(focus.y - candidate.y)+this._angle_correction < Math.abs(focus.x - candidate.x)){
					return false;
				}
				return true;
			case "e":
				if (focus.x >= candidate.x){
					return false;
				}
				if (focusWin.get_outer_rect().x + focusWin.get_outer_rect().width + this._distance_correction >= candidateWin.get_outer_rect().x + candidateWin.get_outer_rect().width){
					return false;
				}
				if (Math.abs(focus.y - candidate.y) > Math.abs(focus.x - candidate.x)+this._angle_correction){
					return false;
				}
				return true;
			case "s":
				if (focus.y >= candidate.y){
					return false;
				}
				if (focusWin.get_outer_rect().y + focusWin.get_outer_rect().height + this._distance_correction >= candidateWin.get_outer_rect().y + candidateWin.get_outer_rect().height){
					return false;
				}
				if (Math.abs(focus.y - candidate.y)+this._angle_correction < Math.abs(focus.x - candidate.x)){
					return false;
				}
				return true;
			case "w":
				if (focus.x <= candidate.x + this._distance_correction){
					return false;
				}
				if (focusWin.get_outer_rect().x <= candidateWin.get_outer_rect().x){
					return false;
				}
				if (Math.abs(focus.y - candidate.y) > Math.abs(focus.x - candidate.x)+this._angle_correction){
					return false;
				}
				return true;
			default:
				// in case of doubt: mumble
				return true;
		}
  },

  _cycle: function() {
    if (!this._moveToIsEnabled("cycle")) {
      return;
    }

		let focusWin = global.display.focus_window;
		let screen = global.screen;
    let display = screen.get_display();
    let allWin = display.sort_windows_by_stacking(display.get_tab_list(Meta.TabList.NORMAL_ALL, screen.get_active_workspace()));
		focusWin.lower();
		let focusRect = focusWin.get_outer_rect();
		for (let i=(allWin.length-1); i>=0; i--) {
      if (allWin[i] == focusWin || allWin[i].is_hidden()) {
        continue;
      }
			if (focusRect.overlap(allWin[i].get_outer_rect())){
				allWin[i].activate(global.get_current_time());
				break;
			}
		}
  },

  _moveToIsEnabled: function(direction) {
    if (direction == "n") {
      return this._utils.getBoolean("move-focus-north-enabled", true);
    }

    if (direction == "e") {
      return this._utils.getBoolean("move-focus-east-enabled", true);
    }

    if (direction == "s") {
      return this._utils.getBoolean("move-focus-south-enabled", true);
    }

    if (direction == "w") {
      return this._utils.getBoolean("move-focus-west-enabled", true);
    }

    if (direction == "l") {
      return this._utils.getBoolean("move-focus-left-screen-enabled", true);
    }

    if (direction == "r") {
     return this._utils.getBoolean("move-focus-right-screen-enabled", true); 
    }

    if (direction == "cycle") {
      return this._utils.getBoolean("move-focus-cycle-enabled", true);
    }

    return true;
  },

  _moveFocusToScreen: function(direction) {

    if ( !this._moveToIsEnabled(direction)) {
      return;
    }

    let focusWindow = global.display.focus_window;
    if (focusWindow == null) {
      return;
    }

    let windows = this._getWindowList();

    let winLength = windows.length;
    if (winLength == 1) {
      return;
    }

    let currentScreenIndex = global.screen.get_monitor_index_for_rect(focusWindow.get_outer_rect());
    let currentScreen = global.screen.get_monitor_geometry(currentScreenIndex);
    // we can not move left
    if (direction == "l" && currentScreen.x == 0) {
      return;
    }

    let candidates = [];

    for (let i=0; i < windows.length; i++) {
      if (windows[i].is_hidden()) {
        continue;
      }
      let windowScreen = global.screen.get_monitor_index_for_rect(windows[i].get_outer_rect());
      if (currentScreenIndex != windowScreen) {
        candidates.push({
          window: windows[i],
          index: i,
          dist: this._getDistance(focusWindow, windows[i])
        });
      }
    }

    this._focusNearesCandidate(candidates);
  },

  _moveFocus: function(direction) {

    if ( !this._moveToIsEnabled(direction)) {
      return;
    }

    let win = global.display.focus_window;
    if (win == null) {
      return;
    }

    let windows = this._getWindowList();

    // only one windows --> already focused
    let winLength = windows.length;
    if (winLength == 1) {
      return;
    }

    let candidates = [];

    for (let i=0; i<windows.length; i++){

      if (windows[i].has_focus()) {
        continue;
      }

      if (this._isCandidate(win, windows[i],direction)){
        if (windows[i].is_hidden()) {
          continue;
        }
      	candidates.push({
      		window: windows[i],
      		index: i,
      		dist: this._getDistance(win, windows[i])
      	});
      }
    } // end for windows
    this._focusNearesCandidate(candidates);
  },

  _getWindowList: function() {
    let display = global.screen.get_display();
    return global.display.get_tab_list(Meta.TabList.NORMAL_ALL, global.screen.get_active_workspace());
  },

  _focusNearesCandidate: function(candidates) {
    if (candidates.length == 0)
      return;

    let distance_correction = this._distance_correction;

    candidates.sort(function(a, b) {
      /*
       global.log(a.window.get_title()+" "+b.window.get_title());
       global.log(a.dist+" "+b.dist);
       global.log(distance_correction);
      */
      // if the difference between distances is within the distance correction
      // value we will make our decision based on recend usage
      return (Math.abs(a.dist-b.dist) <= distance_correction) ? -1 : a.dist - b.dist;

    });

    candidates[0].window.activate(global.get_current_time());
  }
};
