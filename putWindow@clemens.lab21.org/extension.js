const Gettext = imports.gettext;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Extension.imports.utils;
const MoveFocus = Extension.imports.moveFocus;

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
    let tbHeight = (Main.panel.actor.is_visible && s.primary) ? Main.panel.actor.height : 0;
    if (tbHeight == 1) {
      tbHeight = 0;
    }
    s.y = s.geomY + tbHeight;

    let i = 0;
    let widths  = this._utils.getWestWidths();
    s.west = [];
    for ( i=0; i < widths.length; i++) {
      s.west[i] = {
        width: s.totalWidth * widths[i],
        x: s.x
      }
    }


    widths = this._utils.getEastWidths();
    s.east = [];
    for ( i=0; i < widths.length; i++) {
      s.east[i] = {
        width: s.totalWidth * widths[i],
        x: s.geomX + (s.totalWidth * (1 - widths[i]))
      }
    }

    let heights = this._utils.getNorthHeights();
    s.north = [];
    for ( i=0; i < heights.length; i++) {
      s.north[i] = {
        height: s.totalHeight * heights[i] - tbHeight,
        y: s.y
      }
    }

    heights = this._utils.getSouthHeights();
    s.south = [];
    for (i=0; i < heights.length; i++) {
      let h = s.totalHeight * heights[i] - tbHeight;
      s.south[i] = {
        height: h,
        y: s.totalHeight - h + s.geomY
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
   * @param direction left, e, right and w are supported
   * @return true, if it was possible to move the focused window in the given direction
   */
  _moveToScreen: function(direction) {
    let win = global.display.focus_window;
    if (win == null) {
      return false;
    }

    let screenIndex = this._getCurrentScreenIndex(win);

    let s = null;
    let old = {
      primary: this._screens[screenIndex].primary,
      x: this._screens[screenIndex].x,
      totalWidth: this._screens[screenIndex].totalWidth,
      totalHeight: this._screens[screenIndex].totalHeight
    };

    if ((direction == "right" || direction == "e") && screenIndex < (this._screens.length - 1)) {
      s = this._screens[screenIndex + 1];
      s = this._recalculateSizes(s);
    }

    if ((direction == "left" || direction == "w") && screenIndex > 0) {
      s = this._screens[screenIndex -1];
      s = this._recalculateSizes(s);
    }

    if (s != null) {
      let position = win.get_outer_rect();

      let xRatio = s.totalWidth / old.totalWidth;
      let x = s.x + (position.x - old.x) * xRatio;

      let width = position.width * xRatio;
      if (width >= s.totalWidth) {
        width = -1;
      }

      let yRatio = s.totalHeight / old.totalHeight;

      let height = position.height;
      // we are moving away from the primary screen and topPanel is visible,
      // e.g. height was max but is smaller then the totalHeight because of topPanel height
      if (old.primary) {
        height += Main.panel.actor.height;
      }

      height = height * yRatio;
      if (height >= s.totalHeight) {
        height = -1;
      }

      let y = position.y;
      // add/remove the top panel offset to the y position
      if (old.primary) {
        y = y - Main.panel.actor.height;
      } else {
        y = y + Main.panel.actor.height;
      }
      if (y < 0) {
        y = 0;
      }

      this._resize(win, x, (y * yRatio), width, height);
      return true;
    }
    return false;
  },


  /**
   * Moves win, that is currently on screen[screenIndex] in the given direction.
   * Depending on ALWAYS_USE_WIDTHS config and screen setup, the window is either
   * moved to other screen or only resized.
   *
   * @param win The window that must be moved
   * @param screenIndex The screen the window belongs to (this._screens)
   * @param direction The two available sides e/w (i.e. east/west)
   */
  _moveToSide: function(win, screenIndex, direction) {

    let s = this._screens[screenIndex];
    let pos = win.get_outer_rect();
    let sizes = direction == "e" ? s.east : s.west;

    let useIndex = 0;
    for ( let i=0; i < sizes.length; i++) {
      if (this._samePoint(pos.width, sizes[i].width) && this._samePoint(pos.x, sizes[i].x)) {
        useIndex = i + 1;
        if (useIndex >= sizes.length) {
          useIndex =  0;
        }
        break;
      }
    }

    let otherDirection = "e";
    let canMoveScreen = screenIndex > 0;
    if (direction == "e") {
      otherDirection = "w";
      canMoveScreen = screenIndex < (this._screens.length - 1);
    }

    if (useIndex > 0 && canMoveScreen && !this._utils.getBoolean(this._utils.ALWAYS_USE_WIDTHS)) {
      // moved in this direction more then once, if a screen exists, move the window there
      if (useIndex > 1) {
        // the window was moved here from an other screen, just resize it
        useIndex = 0;
      } else {
        // moving to other screen is possible, move to screen and resize afterwards
        this._moveToScreen(direction);
        this._moveFocused(otherDirection);
        return;
      }
    }

    this._resize(win, sizes[useIndex].x, s.y, sizes[useIndex].width, s.totalHeight * -1);
  },

  _moveNorthSouth: function(win, screenIndex, direction) {
    let s = this._screens[screenIndex];
    let pos = win.get_outer_rect();
    let sizes = direction == "n" ? s.north : s.south;

    let useIndex = 0;
    for ( let i=0; i < sizes.length; i++) {
      if (this._samePoint(pos.height, sizes[i].height) && this._samePoint(pos.y, sizes[i].y)) {
        useIndex = i + 1;
        if (useIndex >= sizes.length) {
          useIndex =  0;
        }
        break;
      }
    }

    this._resize(win, s.x, sizes[useIndex].y, s.totalWidth * -1, sizes[useIndex].height);
  },

  _moveToCorner: function(win, screenIndex, direction) {
    let s = this._screens[screenIndex];
    let pos = win.get_outer_rect();
    let sameWidth = false;
    let sameHeight = false;

    let useWidth = 0;
    let widths = (direction.indexOf("e") == -1) ? s.west : s.east;
    let add = this._utils.changeCornerWidth() ? 1 : 0;

    for (let i=0; i < widths.length; i++) {
      if (this._samePoint(pos.width, widths[i].width) && this._samePoint(pos.x, widths[i].x)) {
        sameWidth = true;
        useWidth = i + add;
        if (useWidth >= widths.length) {
          useWidth =  0;
        }
        break;
      }
    }

    let useHeight = 0;
    let heights = (direction.indexOf("n") == -1) ? s.south : s.north;
    add = this._utils.changeCornerHeight() ? 1 : 0;

    for (let i=0; i < heights.length; i++) {
      if (this._samePoint(pos.height, heights[i].height) && this._samePoint(pos.y, heights[i].y)) {
        sameHeight = true;
        useHeight = i + add;
        if (useHeight >= heights.length) {
          useHeight =  0;
        }
        break;
      }
    }

    // currently at the east/west and, now moved to corner
    if (this._utils.changeCornerHeight() && this._samePoint(pos.height, s.totalHeight)) {
      sameHeight = true;
      useHeight = 0;
    }
    // currently at north/south and now moved to corner
    if (this._utils.changeCornerWidth() && this._samePoint(pos.width, s.totalWidth)) {
      sameWidth = true;
      useWidth = 0;
    }
    // window was moved to an other corner
    if (!sameWidth || !sameHeight) {
      useWidth = 0;
      useHeight = 0;
    }

    this._resize(win, widths[useWidth].x, heights[useHeight].y, widths[useWidth].width, heights[useHeight].height);
  },

  /**
   * move the current focused window into the given direction (c, n,e,s,w, ne, nw, sw, so)
   */
  _moveFocused: function(where) {
    let win = global.display.focus_window;
    if (win == null) {
      return;
    }

    let screenIndex = this._getCurrentScreenIndex(win);
    let s = this._screens[screenIndex];
    // check if we are on primary screen and if the main panel is visible
    s = this._recalculateSizes(s);

    if (where == "c") {
      let pos = win.get_outer_rect();
      let w = s.totalWidth * (this._utils.getNumber(this._utils.CENTER_WIDTH, 50) / 100),
        h = s.totalHeight * (this._utils.getNumber(this._utils.CENTER_HEIGHT, 50) / 100),
        x = s.x + (s.totalWidth - w) / 2,
        y = s.y + (s.totalHeight - h) / 2,
        sameHeight = this._samePoint(h, pos.height);

      if (this._utils.getBoolean(this._utils.REVERSE_MOVE_CENTER, false)) {
        if (win.maximized_horizontally && win.maximized_vertically) {
          this._resize(win, x, y, w, h);
        } else {
          this._resize(win, s.x, s.y, s.totalWidth * -1, s.totalHeight * -1);
        }
      } else {
        // do not check window.width. until i find get_size_hint(), or min_width..
        // windows that have a min_width < our width will not be maximized (evolution for example)
        if (this._samePoint(x, pos.x) && this._samePoint(y, pos.y) && sameHeight) {
          // the window is alread centered -> maximize
          this._resize(win, s.x, s.y, s.totalWidth * -1, s.totalHeight * -1);
        } else {
          // the window is not centered -> resize
          this._resize(win, x, y, w, h);
        }
      }
    } else if (where == "n" || where == "s") {
      this._moveNorthSouth(win, screenIndex, where);
    } else if (where == "e" || where == "w") {
      this._moveToSide(win, screenIndex, where);
    } else {
      this._moveToCorner(win, screenIndex, where);
    }
  },

  _moveConfiguredWhenCreated: function(display, win, noRecurse) {
    if (!this._windowTracker.is_window_interesting(win)) {
      return false;
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
      return false;
    }
    app = win.get_wm_class();
    // move the window if a location is configured and autoMove is set to true
    let appPath = "locations." + app;

    if (this._utils.getParameter(appPath, false)) {
      if (this._utils.getBoolean(appPath + ".autoMove", false)) {
        this._moveToConfiguredLocation(win, app);
        return true;
      }
    }
    return false;
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
    let dy = padding.height - padding.y / 2;
    // we are moving north -> substract the whole padding from  height
    if (y > 50) {
      y -= dy;
    } else {
      dy = padding.height; // 2 * dy;
    }

    // snap, x, y
    if (win.decorated) {
      win.move_frame(true, x, y);
    } else {
      win.move(true, x, y);
    }

    // snap, width, height, force
    win.resize(true, width - this._padding, height - dy);
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

  counter: 0,

  _loadScreenData: function() {
    // get monotor(s) geometry
    this._primary = global.screen.get_primary_monitor();
    let numMonitors = global.screen.get_n_monitors();

    this._screens = [];
    // only tested with 2 screen setup
    for (let i=0; i<numMonitors; i++) {
      let geom = global.screen.get_monitor_geometry(i);
      let primary = (i == this._primary);

      this._screens[i] =  {
        primary: primary,
        y: geom.y,
        x : geom.x,
        geomX: geom.x,
        geomY: geom.y,
        totalWidth: geom.width,
        totalHeight: geom.height,
        east: [],
        west: [],
        north: [],
        south: []
      };
    }
    // sort by x position. makes it easier to find the correct screen
    this._screens.sort(function(s1, s2) {
        return s1.x - s2.x;
    });
  },

  /**
   * Get global.screen_width and global.screen_height and
   * bind the keys
   **/
  _init: function() {
    // read configuration and init the windowTracker
    this._utils = new Utils.Utils();
    this._windowTracker = Shell.WindowTracker.get_default();

    this._loadScreenData();

    this._screenListener = global.screen.connect("monitors-changed",
      Lang.bind(this, this._loadScreenData));

    this._windowCreatedListener = global.screen.get_display().connect_after('window-created',
      Lang.bind(this, this._moveConfiguredWhenCreated)
    );

    this._bindings = [];
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

    this._moveFocusPlugin = new MoveFocus.MoveFocus(this._utils);
  },

  /**
   * disconnect all keyboard bindings that were added with _addKeyBinding
   **/
  destroy: function() {

    if (this._windowCreatedListener) {
      global.screen.get_display().disconnect(this._windowCreatedListener);
      this._windowCreatedListener = false;
    }

    if (this._screenListener) {
      global.screen.disconnect(this._screenListener);
      this._screenListener = false;
    }

    let size = this._bindings.length;
    for(let i = 0; i<size; i++) {
      global.display.remove_keybinding(this._bindings[i]);
    }
    this._bindings = [];

    this._utils.destroy();
    if (this._moveFocusPlugin) {
      this._moveFocusPlugin.destroy();
    }
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
