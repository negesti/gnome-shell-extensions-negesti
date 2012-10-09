const Gettext = imports.gettext;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Extension.imports.utils;

/**
 * Thanks to:
 * gcampax for auto-move-window extension and
 * vibou_ for gtile and his getInner/OuterPadding that is used in nearly every
 *        extension that moves windows around
 *
 * Believe in the force! Read the source!
 **/
function MoveWindow() {
  this._init();
};

MoveWindow.prototype = {

  _utils: {},

  // private variables
  _bindings: [],
  _padding: 2,

  _primary: 0,

  _screens: [],
  _westWidths: [ 0.5, 0.33, 0.66 ],
  _eastWidths: [ 0.5, 0.66, 0.33 ],

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

  _recalculateSizes: function(s) {

    let tbHeight = s.primary ? Main.panel.actor.height : 0;
    if (tbHeight == 1) {
      tbHeight = 0;
    }
    s.y = s.geomY + tbHeight;
    s.height = s.totalHeight * this._getSideHeight() - Math.floor(tbHeight/2);
    s.width = s.totalWidth * this._getSideWidth();

    s.sy = (s.totalHeight - s.height) + s.geomY;

    let i = 0;
    for ( i=0; i< this._westWidths.length; i++) {
      s.west[i] = {
        width: s.totalWidth * this._westWidths[i],
        x: s.x
      }
    }

    for ( i=0; i< this._eastWidths.length; i++) {
      s.east[i] = {
        width: s.totalWidth * this._eastWidths[i],
        x: s.geomX + (s.totalWidth * (1 - this._eastWidths[i]))
      }
    }

    return s;
  },

    /**
   * Checks the _screens array, and returns the index of the screen, the
   * given window (win) is on
   */
  _getCurrentScreenIndex: function(win) {

    // left edge is sometimes -1px...
    let pos = win.get_outer_rect();
    pos.x = pos.x < 0 ? 0 : pos.x;

    let sl = this._screens.length;
    for (let i=0; i<sl; i++) {
      if (i == sl-1) {
        return i;
      }
      if (this._screens[i].x <= pos.x && this._screens[(i+1)].x > pos.x) {
        return i;
      }
    }
    return this._primary;
  },

  /**
   * Move the focused window to the screen on the "direction" side
   * @param direction left and right is supported
   */
  _moveToScreen: function(direction) {
    let win = global.display.focus_window;
    let screenIndex = this._getCurrentScreenIndex(win);

    let s = null;
    let old = {
      x: this._screens[screenIndex].x,
      totalWidth: this._screens[screenIndex].totalWidth,
      totalHeight: this._screens[screenIndex].totalHeight
    };

    if (direction == "right" && screenIndex < (this._screens.length - 1)) {
      s = this._screens[screenIndex + 1];
      s = this._recalculateSizes(s);
    }
    if (direction == "left" && screenIndex > 0) {
      s = this._screens[screenIndex -1];
      s = this._recalculateSizes(s);
    }

    if (s != null) {
      let position = win.get_outer_rect();
      let x = s.x + (position.x - old.x);
      let xRatio = s.totalWidth / old.totalWidth;
      let yRatio = s.totalHeight / old.totalHeight;

      let width = position.width * xRatio;
      if (width >= s.totalWidth) {
        width = -1;
      }
      let height = position.height * yRatio;
      if (height >= s.totalHeight) {
        height = -1;
      }
      this._resize(win, (x * xRatio), (position.y * yRatio), width, height);
    }
  },

  /**
   * move the current focues window into the given direction (n,e,s,w, ne, nw, sw, so, c)
   */
  _moveFocused: function(where) {
    let win = global.display.focus_window;
    if (win==null) {
        return;
    }

    let s = this._screens[this._getCurrentScreenIndex(win)];
    // check if we are on primary screen and if the main panel is visible
    s = this._recalculateSizes(s);
    var pos = win.get_outer_rect();

    let diff = null,
      sameWidth = this._samePoint(pos.width, s.width);

    let maxH = (pos.height >= s.totalHeight) || this._samePoint(pos.height, s.totalHeight);

    if (where=="n") {
      this._resize(win, s.x, s.y, s.totalWidth * -1, s.height);
    } else if (where == "s") {
      this._resize(win, s.x, s.sy, s.totalWidth * -1, s.height);
    } else if (where == "e") {
      let width = s.width;
      let useIndex = 0;

      for ( let i=0; i < s.east.length; i++) {
        if (this._samePoint(pos.width, s.east[i].width) && this._samePoint(pos.x, s.east[i].x)) {
          useIndex = i + 1;
          if (useIndex >= s.east.length) {
            useIndex = 0;
          }
          break;
        }
      }

      this._resize(win, s.east[useIndex].x, s.y, s.east[useIndex].width, s.totalHeight * -1); //(s.x + s.width)
    }  else if (where == "w") {
       let useIndex = 0;

      for ( let i=0; i < s.west.length; i++) {
        if (this._samePoint(pos.width, s.west[i].width) && this._samePoint(pos.x, s.west[i].x)) {
          useIndex = i + 1;
          if (useIndex >= s.west.length) {
            useIndex = 0;
          }
          break;
        }
      }

      this._resize(win, s.west[useIndex].x, s.y, s.west[useIndex].width, s.totalHeight * -1);
    }

    if (where == "ne") {
      this._resize(win, s.east[0].x, s.y, s.width, s.height)
    } else if (where == "se") {
      this._resize(win, s.east[0].x, s.sy, s.width, s.height)
    } else if (where == "sw") {
      this._resize(win, s.x, s.sy, s.width, s.height)
    } else if (where == "nw") {
      this._resize(win, s.x, s.y, s.width, s.height)
    }

    // calculate the center position and check if the window is already there
    if (where == "c") {
      let w = s.totalWidth * (this._utils.getNumber(this._utils.CENTER_WIDTH, 50) / 100),
        h = s.totalHeight * (this._utils.getNumber(this._utils.CENTER_HEIGHT, 50) / 100),
        x = s.x + (s.totalWidth - w) / 2,
        y = s.y + (s.totalHeight - h) / 2,
        sameHeight = this._samePoint(h, pos.height);

      // do not check window.width. until i find get_size_hint(), or min_width..
      // windows that have a min_width < our width it will not work (evolution for example)
      if (this._samePoint(x, pos.x) && this._samePoint(y, pos.y) && sameHeight) {
        // the window is alread centered -> maximize
        this._resize(win, s.x, s.y, s.totalWidth * -1, s.totalHeight * -1);
      } else {
        // the window is not centered -> resize
        this._resize(win, x, y, w, h);
      }
    }
  },

  _moveConfiguredWhenCreated: function(display, win, noResurce) {
    if (!this._windowTracker.is_window_interesting(win)) {
      return;
    }

    let app = this._windowTracker.get_window_app(win);

    if (!app) {
      if (!noRecurse) {
        // window is not tracked yet
        Mainloop.idle_add(Lang.bind(this, function() {
          this._moveConfiguredWhenCreated(display, win, true);
          return false;
        }));
      }
      return;
    }
    app = win.get_wm_class();
    // move the window if a location is configured and autoMove is set to true
    let appPath = "locations." + app;

    if (this._utils.getParameter(appPath, false)) {
      if (this._utils.getBoolean(appPath + ".autoMove", false)) {
        this._moveToConfiguredLocation(win, app);
      }
    }
  },

  /**
   * check if the current focus window has a configured location. If so move it there ;)
   */
  _moveToConfiguredLocation: function(win, appName) {

    if (!win || !appName) {
      win = global.display.focus_window;
      if (win==null) {
          return;
      }

      appName = win.get_wm_class();
    }
    let config = this._utils.getParameter("locations." + appName, false);

    // no config for appName. maybe we have a config for "all"
    if (!config) {
      config = this._utils.getParameter("locations.All", false);
      // no config for "all"
      if (!config) {
        return;
      }
      appName = "All";
    }
    if (!config.lastPosition) {
      config.lastPositions = 0;
    }

    let pos = config.positions[config.lastPosition];
    if (!pos) {
      pos = config.positions[0];
      config.lastPosition = 0;
      this._utils.setParameter("locations." + appName + ".lastPosition", 1);
    } else {
      config.lastPosition++;
    }

    if (config.lastPosition >= config.positions.length) {
      this._utils.setParameter("locations." + appName + ".lastPosition", 0);
    }

    // config may be for 2 screens but currenty only 1 is connected
    let s = (this._screens.length > pos.screen) ? this._screens[pos.screen] : this._screens[0];

    let x = (pos.x=="0.0") ? s.x : s.x + (s.totalWidth * pos.x/100);
    let y = (pos.y=="0.0") ? s.y : s.totalHeight - (s.totalHeight * (1-pos.y/100));

    // _resize will maximize the window if width/height is -1
    let width = (pos.width == 100) ? -1 : s.totalWidth * pos.width/100;
    let height = (pos.height == 100) ? -1 : s.totalHeight * pos.height/100;

    this._resize(win, x, y, width, height);
  },

  // On large screens the values used for moving/resizing windows, and the resulting
  // window.rect are may not be not equal (==)
  // --> Assume points are equal, if the difference is <= 40px
  // @return true, if the difference between p1 and p2 is less then 41
  _samePoint: function(p1, p2) {
    return (Math.abs(p1-p2) <= 40);
  },

  // actual resizing
  _resize: function(win, x, y, width, height) {

    if (height < 0) {
      win.maximize(Meta.MaximizeFlags.VERTICAL);
      height = 400; // dont resize to width, -1
    } else {
      win.unmaximize(Meta.MaximizeFlags.VERTICAL);
    }

    if (width < 0) {
      win.maximize(Meta.MaximizeFlags.HORIZONTAL);
      width = 400;  // dont resize to height, -1
    } else {
      win.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
    }

    let padding = this._getPadding(win);
    // snap, x, y
    if (win.decorated) {
      win.move_frame(true, x, y);
    } else {
      win.move(true, x, y);
    }

    // snap, width, height, force
    win.resize(true, width - this._padding, height - padding.height - padding.y);
  },

  // the difference between input and outer rect as object.
  _getPadding: function(win) {
    let outer = win.get_outer_rect(),
      inner = win.get_input_rect();
    return {
      x: outer.x - inner.x,
      y: (outer.y - inner.y),
      width: (inner.width - outer.width), // 2
      height: (inner.height - outer.height)
    };
  },

  _checkSize: function(p) {
    if (!p || p < 0 || p > 100) {
      return 50;
    }

    return p;
  },

  _getSideWidth: function() {
    return this._utils.getNumber(this._utils.SIDE_WIDTH, 50) / 100;
  },

  _getSideHeight: function() {
    return this._utils.getNumber(this._utils.SIDE_HEIGHT, 50) / 100;
  },

  /**
   * Get global.screen_width and global.screen_height and
   * bind the keys
   **/
  _init: function() {
    // read configuration and init the windowTracker
    this._utils = new Utils.Utils();
    this._windowTracker = Shell.WindowTracker.get_default();

    let display = global.screen.get_display();
    this._windowCreatedListener = display.connect_after('window-created', Lang.bind(this, this._moveConfiguredWhenCreated));

    // get monotor(s) geometry
    this._primary = global.screen.get_primary_monitor();
    let numMonitors = global.screen.get_n_monitors();

    // only tested with 2 screen setup
    for (let i=0; i<numMonitors; i++) {
      let geom = global.screen.get_monitor_geometry(i);

      this._screens[i] =  {
        y: geom.y, // (i==this._primary) ? geom.y + this._topBarHeight : geom.y,
        x : geom.x,
        geomX: geom.x,
        geomY: geom.y,
        totalWidth: geom.width,
        totalHeight: geom.height,
        width: geom.width * this._getSideWidth(),
        east: [],
        west: []
      };

      this._screens[i].primary = (i==this._primary)
    }

    // sort by x position. makes it easier to find the correct screen
    this._screens.sort(function(s1, s2) {
        return s1.x - s2.x;
    });

    // move to n, e, s an w
    this._addKeyBinding("put-to-side-n",
      Lang.bind(this, function(){ this._moveFocused("n");})
    );
    this._addKeyBinding("put-to-side-e",
      Lang.bind(this, function(){ this._moveFocused("e");})
    );
    this._addKeyBinding("put-to-side-s",
      Lang.bind(this, function(){ this._moveFocused("s");})
    );
    this._addKeyBinding("put-to-side-w",
      Lang.bind(this, function(){ this._moveFocused("w");})
    );

    // move to  nw, se, sw, nw
    this._addKeyBinding("put-to-corner-ne",
      Lang.bind(this, function(){ this._moveFocused("ne");})
    );
    this._addKeyBinding("put-to-corner-se",
      Lang.bind(this, function(){ this._moveFocused("se");})
    );
    this._addKeyBinding("put-to-corner-sw",
      Lang.bind(this, function(){ this._moveFocused("sw");})
    );
    this._addKeyBinding("put-to-corner-nw",
      Lang.bind(this, function(){ this._moveFocused("nw");})
    );

    // move to center. fix 2 screen setup and resize to 50% 50%
    this._addKeyBinding("put-to-center",
      Lang.bind(this, function(){ this._moveFocused("c");})
    );

    this._addKeyBinding("put-to-location",
      Lang.bind(this, function() { this._moveToConfiguredLocation();} )
    );

    this._addKeyBinding("put-to-left-screen",
      Lang.bind(this, function() { this._moveToScreen("left");} )
    );

    this._addKeyBinding("put-to-right-screen",
      Lang.bind(this, function() { this._moveToScreen("right");} )
    );
  },

  /**
   * disconnect all keyboard bindings that were added with _addKeyBinding
   **/
  destroy: function() {

    if (this._windowCreatedListener) {
      global.screen.get_display().disconnect(this._windowCreatedListener);
      this._windowCreatedListener = 0;
    }

    let size = this._bindings.length;
    // TODO: remove handlers added by keybindings_set_custom_handler
    for(let i = 0; i<size; i++) {
      global.display.remove_keybinding(this._bindings[i]);
    }
    this._utils.destroy()
  }
}

function init(meta) {
};

function enable() {
  this._moveWindow = new MoveWindow();
};

function disable(){
  this._moveWindow.destroy();
};
