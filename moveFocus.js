const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;

const Clutter = imports.gi.Clutter;
const Lightbox = imports.ui.lightbox;
const Tweener = imports.ui.tweener;

function MoveFocus(utils, screens) {
  this._init(utils, screens);
};

const FLASHSPOT_ANIMATION_OUT_TIME = 2; // seconds

const Flashspot = new Lang.Class({
  Name: 'Flashspot',
  Extends: Lightbox.Lightbox,
  _init: function(area, windowMeta) {
    this.parent(Main.uiGroup, { inhibitEvents: false,
                                width: area.width,
                                height: area.height });
    this.actor.style_class = 'focusflash';
    this.actor.set_position(area.x, area.y);
    this.pactor = windowMeta.get_compositor_private();
    if (this.actor.set_pivot_point) {
      this.actor.set_pivot_point(0.5, 0.5);  
    } else {
      this.actor.scale_center_x =  0.5;
      this.actor.scale_center_y =  0.5;
    }
    let constraint = Clutter.BindConstraint.new(this.pactor, Clutter.BindCoordinate.X, 0.0);
    this.actor.add_constraint_with_name("x-bind", constraint);
    constraint = Clutter.BindConstraint.new(this.pactor, Clutter.BindCoordinate.Y, 0.0);
    this.actor.add_constraint_with_name("y-bind", constraint);
    constraint = Clutter.BindConstraint.new(this.pactor, Clutter.BindCoordinate.SIZE, 0.0);
    this.actor.add_constraint_with_name("size-bind", constraint);
    Tweener.addTween(this.actor, {
     opacity: 0,
     time: 3*FLASHSPOT_ANIMATION_OUT_TIME,
     onComplete: function() {
       this.destroy();
     },
    });

    this.actor.background_color = new Clutter.Color({red: 255, green: 255, blue: 255, alpha: 128})
  },
  fire: function() {
    this.actor.show();
    this.actor.opacity = 255;
  }
});

MoveFocus.prototype = {

	_angle_correction: 20,
  _distance_correction: 10,

  _bindings: [],
  _animationEnabled: true,
  _settingsChangedListener: {},
  _animationSettingListener: {},

  _init: function(utils, screens) {
    this._utils = utils;
    this._screens = screens;


    // quite dirty
    let version = imports.misc.config.PACKAGE_VERSION;
    version = version.split(".");
    version = new Number(version[1]);
    this._isVersion14 = version >= 14;

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

    this._animationSettingListener = {
      name: this._utils.MOVE_FOCUS_ANIMATION,
      fn: Lang.bind(this, function() {
        this._animationEnabled = this._utils.getBoolean(this._utils.MOVE_FOCUS_ANIMATION, true);
      })
    };
    this._animationSettingListener.handlerId = this._settingObject.connect(
      'changed::' + this._utils.MOVE_FOCUS_ANIMATION,
      this._animationSettingListener.fn
    );
    this._animationEnabled = this._utils.getBoolean(this._utils.MOVE_FOCUS_ANIMATION, true);

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
    if (Main.wm.addKeybinding && Shell.ActionMode){ // introduced in 3.16
    	Main.wm.addKeybinding(key,
        this._utils.getSettingsObject(), Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        handler
      );
    } else if (Main.wm.addKeybinding && Shell.KeyBindingMode) { // introduced in 3.7.5
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
    if (this._animationSettingListener) {
      this._settingObject.disconnect(this._animationSettingListener.handlerId);
    }
  },
  
  _flashWindow: function(window){
    let actor = window.get_compositor_private();
    let dimension = window.get_frame_rect();
    let flashspot = new Flashspot(dimension, window);
    flashspot.fire();
    if (actor.set_pivot_point) {
      actor.set_pivot_point(0.5, 0.5);
    }
    Tweener.addTween(actor, {opacity: 255, time: 1});
  },
  
  _activateWindow: function(window) {
    if (this._animationEnabled) {
      this._flashWindow(window);
    }
    window.activate(global.get_current_time());
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

    let focus = focusWin.get_center();
    let candidate = candidateWin.get_center();

    let dx = focus.x - candidate.x;
    let dy = focus.y - candidate.y;

    return Math.sqrt(dx * dx + dy *dy);

  },

  _isCandidate: function(focusWin, candidateWin, direction){

  	let focus = focusWin.get_center();
    let focusRect = focusWin.get_frame_rect();

  	let candidate = candidateWin.get_center();
    let candidateRect = candidateWin.get_frame_rect();

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
				if (focusRect.y <= candidateRect.y + this._distance_correction){
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
				if (focusRect.x + focusRect.width + this._distance_correction >= candidateRect.x + candidateRect.width){
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
				if (focusRect.y + focusRect.height + this._distance_correction >= candidateRect.y + candidateRect.height){
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
				if (focusRect.x <= candidateRect.x){
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
    if (focusWin == null) {
      return;
    }

		let screen = global.screen;
    let display = screen.get_display();

    let allWin;
     if (this._isVersion14) {
      allWin = display.sort_windows_by_stacking(display.get_tab_list(Meta.TabList.NORMAL_ALL, screen.get_active_workspace()));
    } else {
      allWin = display.sort_windows_by_stacking(display.get_tab_list(Meta.TabList.NORMAL_ALL, screen, screen.get_active_workspace()));
    }

		focusWin.lower();
		let focusRect = focusWin.get_frame_rect();

		for (let i=(allWin.length-1); i>=0; i--) {
      if (allWin[i] == focusWin || allWin[i].is_hidden()) {
        continue;
      }
			if (focusRect.overlap(allWin[i].get_frame_rect())){
			  this._activateWindow(allWin[i]);
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

    let currentScreenIndex = this._getCurrentScreenIndex(focusWindow);
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
      let windowScreen = this._getCurrentScreenIndex(windows[i]);
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

  _getCurrentScreenIndex: function(win) {
    if (global.screen.get_monitor_index_for_rect) {
      return global.screen.get_monitor_index_for_rect(win.get_frame_rect());
    }

    let screenLen = this._screens.length;
    let winRect = win.get_frame_rect();

    for (let i=0; i < screenLen; i++) {
      let s = this._screens[i];

      if (s.x < winRect.x && (s.x + s.totalWidth) > winRect.x) {
        return i;
      }
    }
    return 0;
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
    if (this._isVersion14) {
      return display.get_tab_list(Meta.TabList.NORMAL_ALL, global.screen.get_active_workspace());
    } else {
      return display.get_tab_list(Meta.TabList.NORMAL_ALL, global.screen, global.screen.get_active_workspace());
    }
  },

  _focusNearesCandidate: function(candidates) {
    if (candidates.length == 0)
      return;

    let distance_correction = this._distance_correction;

    candidates.sort(function(a, b) {
      // if the difference between distances is within the distance correction
      // value we will make our decision based on recend usage
      return (Math.abs(a.dist-b.dist) <= distance_correction) ? -1 : a.dist - b.dist;

    });

    this._activateWindow(candidates[0].window);
  }
};
