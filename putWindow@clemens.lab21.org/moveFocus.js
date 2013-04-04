const Lang = imports.lang;
const Meta = imports.gi.Meta;



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

    global.display.add_keybinding(
      key,
      this._utils.getSettingsObject(),
      Meta.KeyBindingFlags.NONE,
      handler
    );
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
      global.display.remove_keybinding(this._bindings[i]);
    }
    this._bindings = [];
  },

  _getDistanceX: function(focus, pos, direction) {
    // if we want to move to the east, calculate the
    // the distance between focus(x+width) and other.x
    if (direction.indexOf("e") != -1) {
      return pos.x - focus.x;
    }

    return focus.x - pos.x;
  },

  _getDistanceY: function(focus, pos, direction) {
    if (direction.indexOf("s") != -1) {
      return pos.y - focus.y;
    }

    return focus.y - pos.y;
  },

  _moveFocus: function(direction) {
    let win = global.display.focus_window;
    if (win == null) {
      return;
    }

    let focusWindow = win.get_outer_rect();

    let screen = global.screen;
    let display = screen.get_display();
    let windows = display.get_tab_list(Meta.TabList.NORMAL_ALL, screen, screen.get_active_workspace());

    // only one windows --> already focused
    let winLength = windows.length;
    if (winLength == 1) {
      return;
    }

    let candidates = [];

    for (let i=0; i < windows.length; i++) {
      let pos = windows[i].get_outer_rect();
      
      if (windows[i].has_focus())
      	continue;

      candidates.push({
        window: windows[i],
        index: i,
        rect: pos,
        distX: this._getDistanceX(focusWindow, pos, direction),
        distY: this._getDistanceY(focusWindow, pos, direction)
      });
    } // end for windows

    this._focusNearestWindow(candidates, direction);

  },

  _focusNearestWindow: function(candidates, direction) {

    let length = candidates.length;

    let sortedX = candidates.slice().sort(function(a, b) {
      let ret = a.distX - b.distX;
      if (ret != 0) {
        return ret;
      }
      return a.distY - b.distY;
    });

    let sortedY = candidates.sort(function(a, b) {
      let ret = a.distY - b.distY;
      if (ret != 0) {
        return ret;
      }
      return a.distX - b.distX;
    });

    if (direction == "e" || direction == "w") {

      // the sorted array may contain windows with -distx (wrong direction)
      let index
        , zeroIndex = -1;

      for (index =0; index < sortedX.length; index++) {
        if (sortedX[index].distX == 0) {
          zeroIndex = index;
        }
        if (sortedX[index].distX > 0) {
          break;
        }
      }
      if (index >= length) {
        if (zeroIndex == -1) {
          return;
        }
        index = zeroIndex;
      }
    	sortedX[index].window.activate(global.get_current_time());
    
    } else if (direction == "n" || direction == "s") {
       let index
        , zeroIndex = -1;
      for (index =0; index < sortedY.length; index++) {
        if (sortedY[index].distY == 0) {
          zeroIndex = index;
        }
        if (sortedY[index].distY > 0) {
          break;
        }
      }
      if (index >= length) {
        if (zeroIndex == -1) {
          return;
        }
        index = zeroIndex;
      }
     sortedY[index].window.activate(global.get_current_time());
    }
  }
};
