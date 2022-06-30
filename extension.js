
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Extension.imports.utils;
const MoveFocus = Extension.imports.moveFocus;

// disabled for now
// TODO - fix moveWorkspace
// const MoveWorkspace = Extension.imports.moveWorkspace;

let _moveWindow = null;

/**
 * Thanks to:
 * gcampax for auto-move-window extension and
 * vibou_ for gtile and his getInner/OuterPadding that is used in nearly every
 *        extension that moves windows around
 * 73 for fixing overlapping windows issue and the idea and help for the
 *    "Move Focus" feature.
 *
 * Believe in the force! Read the source!
 **/
function MoveWindow() {
  this._init();
}

MoveWindow.prototype = {

  _utils: {},

  // private variables
  _bindings: [],
  _padding: 2,

  _primary: 0,

  _screens: [],

  focusListener: null,

  /**
   * Helper functions to set custom handler for keybindings
   */
  _addKeyBinding: function(key, handler) {
    this._bindings.push(key);

    if (Main.wm.addKeybinding && Shell.ActionMode){ // introduced in 3.16
      Main.wm.addKeybinding(key,
        this._utils.getSettingsObject(), Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        handler
      );
    } else if (Main.wm.addKeybinding && Shell.KeyBindingMode) { // introduced in 3.7.5
      // Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY,
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

  _getTopPanelHeight: function() {
    if (this._utils.getBoolean(this._utils.IGNORE_TOP_PANEL, false)) {
      return 0;
    }
    // 0 means hidden, 255 is visible
    let opacity;
    if (Main.panel.get_paint_opacity) {
      opacity = Main.panel.get_paint_opacity();
    } else {
      let opacity = Main.panel.actor.get_paint_opacity();
    }

    if (opacity == 0) {
      return 0;
    }

    if (!Main.layoutManager.panelBox.visible) {
      return 0;
    }

    if (Main.panel.get_y) {
      return Main.panel.get_y() + Main.panel.get_height();
    } else {
      return Main.panel.actor.y + Main.panel.actor.height;
    }
  },

  _recalculateSizes: function(s) {

    let topPanelHeight = s.primary ? this._getTopPanelHeight() : 0;
    if (Math.abs(topPanelHeight) <= 2) {
      topPanelHeight = 0;
    }
    if (s.geomY != topPanelHeight) {
      s.y = s.geomY + topPanelHeight;
    } else {
      s.y = s.geomY;
    }
    
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
    let absoluteHeight = s.totalHeight + topPanelHeight;

    s.north = [];
    for ( i=0; i < heights.length; i++) {
      s.north[i] = {
        height: absoluteHeight * heights[i] - topPanelHeight * heights[i],
        y: s.y
      };
    }

    heights = this._utils.getSouthHeights();
    s.south = [];
    for (i=0; i < heights.length; i++) {
      let h = absoluteHeight * heights[i] - topPanelHeight * heights[i];
      s.south[i] = {
        height: h,
        y: absoluteHeight - h + s.geomY
      };
    }

    return s;
  },

    /**
   * Checks the _screens array, and returns the index of the screen, the
   * given window (win) is on
   */
  _getCurrentScreenIndex: function(win) {

    // left edge is sometimes -1px...
    let pos = win.get_frame_rect();
    pos.x = pos.x < 0 ? 0 : pos.x;

    let sl = this._screens.length;

    for (let i=0; i < sl; i++) {
      let s = this._screens[i];

      if ((s.x <= pos.x && (s.x + s.totalWidth) > pos.x ) && ((s.y - this._getTopPanelHeight()) <= pos.y && (s.y + s.totalHeight) > pos.y )) {
        return i;
      }
    }

    return this._primary;
  },

  moveToScreen: function(direction) {
    if (this._utils.getBoolean("put-to-" + direction +"-screen-enabled", true)) {
      this._moveToScreen(direction);
    }
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
    let targetIndex = screenIndex;
    let s = null;
    let old = {
      primary: this._screens[screenIndex].primary,
      x: this._screens[screenIndex].x,
      y: this._screens[screenIndex].y,
      totalWidth: this._screens[screenIndex].totalWidth,
      totalHeight: this._screens[screenIndex].totalHeight
    };

    if ((direction == "right" || direction == "e") && screenIndex < (this._screens.length - 1)) {
      s = this._screens[screenIndex + 1];
      s = this._recalculateSizes(s);
    }

    if ((direction == "left" || direction == "w") && screenIndex > 0) {
      s = this._screens[screenIndex - 1];
      s = this._recalculateSizes(s);
    }

    if (s == null) {
      return false;
    }

    let wasMaximizeFlags = 0;
    if (win.maximized_horizontally) {
      wasMaximizeFlags = wasMaximizeFlags | Meta.MaximizeFlags.HORIZONTAL;
    }

    if (win.maximized_vertically) {
      wasMaximizeFlags = wasMaximizeFlags | Meta.MaximizeFlags.VERTICAL;
    }

    if (wasMaximizeFlags != 0) {
      win.unmaximize(wasMaximizeFlags);
    }

    let position = win.get_frame_rect();

    let xRatio = s.totalWidth / old.totalWidth;
    let x = s.x + (position.x - old.x) * xRatio;
    let width = position.width * xRatio;
    if (width >= s.totalWidth) {
      wasMaximizeFlags = wasMaximizeFlags | Meta.MaximizeFlags.HORIZONTAL;
    }

    let yRatio = s.totalHeight / old.totalHeight;

    let height = position.height;
    // we are moving away from the primary screen and topPanel is visible,
    // e.g. height was max but is smaller then the totalHeight because of topPanel height
    if (old.primary) {
      height += this._getTopPanelHeight();
    }
    height *= yRatio;
    if (s.primary) {
      height -= this._getTopPanelHeight();
    }

    if (height >= s.totalHeight) {
      wasMaximizeFlags = wasMaximizeFlags | Meta.MaximizeFlags.VERTICAL;
    }

    let y = s.y + (position.y - old.y) * yRatio;
    // add/remove the top panel offset to the y position
    if (old.primary) {
      y -= this._getTopPanelHeight();
    }
    if (s.primary) {
      y += this._getTopPanelHeight();
    }
    if (y < 0) {
      y = 0;
    }

    this._resize(win, x, y, width, height);

    if (wasMaximizeFlags != 0) {
      win.maximize(wasMaximizeFlags);
    }
    return true;
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
    let pos = win.get_frame_rect();
    let sizes = direction == "e" ? s.east : s.west;


    if (win.maximized_horizontally && !win.maximized_vertically && this._utils.getBoolean(this._utils.INTELLIGENT_CORNER_MOVEMENT, false)) {
      // currently at the left side (WEST)
      if (pos.y == s.y) {
        this._moveToCorner(win, screenIndex, "n" + direction, false, true, true);
      } else {
        this._moveToCorner(win, screenIndex, "s" + direction, false, true, true);
      }
      return;
    }

    let useIndex = 0;
    let moveToOtherScreen = false;
    let minDistance = false;
    let dist;
    for ( let i=0; i < sizes.length; i++) {
      if (!this._samePoint(pos.x, sizes[i].x)) {
        continue;
      }

      if (this._samePoint(pos.width, sizes[i].width)) {
        useIndex = i + 1;
        if (useIndex >= sizes.length) {
          moveToOtherScreen = true;
          useIndex =  0;
        }
        break;
      }
      dist = Math.abs((pos.width - sizes[i].width));

      if (!minDistance || minDistance > dist) {
        minDistance = dist;
        useIndex = i+1;

      }
    }
    if (useIndex >= sizes.length) {
      moveToOtherScreen = true;
      useIndex = 0;
    }

    let otherDirection = "e";
    let canMoveScreen = screenIndex > 0;
    if (direction == "e") {
      otherDirection = "w";
      canMoveScreen = !this._isVerticalScreenSetup && screenIndex < (this._screens.length - 1);
    }

    if (moveToOtherScreen && canMoveScreen && !this._utils.getBoolean(this._utils.ALWAYS_USE_WIDTHS)) {
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

    if (this._utils.getBoolean(this._utils.ALWAYS_KEEP_HEIGHT, false)) {
      this._resize(win, sizes[useIndex].x, pos.y, sizes[useIndex].width, pos.height);
    } else {
      this._resize(win, sizes[useIndex].x, s.y, sizes[useIndex].width, s.totalHeight * -1);
    }
  },

  _moveNorthSouth: function(win, screenIndex, direction) {
    let s = this._screens[screenIndex];
    let pos = win.get_frame_rect();
    let sizes = direction == "n" ? s.north : s.south;

    if ( win.maximized_vertically && !win.maximized_horizontally && this._utils.getBoolean(this._utils.INTELLIGENT_CORNER_MOVEMENT, false)) {
      // currently at the left side (WEST)
      if (pos.x == s.x) {
        this._moveToCorner(win, screenIndex, "w" + direction, true, false, true);
      } else {
        this._moveToCorner(win, screenIndex, "e" + direction, true, false, true);
      }
      return;
    }

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

    let canMoveScreen = screenIndex > 0;
    let screenMoveDirection = direction == "s" ? "e" : "w";
    if (direction == "s") {
      canMoveScreen = this._isVerticalScreenSetup && screenIndex < (this._screens.length - 1);
    }

    if (useIndex > 0 && canMoveScreen && !this._utils.getBoolean(this._utils.ALWAYS_USE_WIDTHS)) {
      // moved in this direction more then once, if a screen exists, move the window there
      if (useIndex > 1) {
        // the window was moved here from an other screen, just resize it
        useIndex = 0;
      } else {
        // moving to other screen is possible, move to screen and resize afterwards
        this._moveToScreen(screenMoveDirection);
        this._moveFocused(direction == "s" ? "n" : "s");
        return;
      }
    }

    if ((this._utils.getBoolean(this._utils.CENTER_KEEP_WIDTH, false) && this._isCenterWidth(screenIndex, pos)) ||
        this._utils.getBoolean(this._utils.ALWAYS_KEEP_WIDTH, false)) {
      this._resize(win, pos.x, sizes[useIndex].y, pos.width, sizes[useIndex].height);
    } else {
      this._resize(win, s.x, sizes[useIndex].y, s.totalWidth * -1, sizes[useIndex].height);
    }
  },

  _isCenterWidth: function(screenIndex, pos) {

    let s = this._screens[screenIndex];
    let w = s.totalWidth * (this._utils.getNumber(this._utils.CENTER_WIDTH_0, 50) / 100),
      h = s.totalHeight * (this._utils.getNumber(this._utils.CENTER_HEIGHT_0, 50) / 100),
      x = s.x + (s.totalWidth - w) / 2,
      y = s.y + (s.totalHeight - h) / 2;

    return this._samePoint(w, pos.width) && this._samePoint(x, pos.x);
  },

  _moveToCorner: function(win, screenIndex, direction, keepWidth, keepHeight, ignoreCornerSettings) {

    ignoreCornerSettings = ignoreCornerSettings || false;
    keepWidth = keepWidth || false;
    keepHeight = keepHeight || false;

    let s = this._screens[screenIndex];
    let pos = win.get_frame_rect();
    let sameWidth = false;
    let sameHeight = false;

    if (this._utils.changeCornerNever()) {
      this._moveToCornerKeepSize(win, screenIndex, direction);
      return;
    }

    let useWidth = 0;
    let widths = (direction.indexOf("e") == -1) ? s.west : s.east;
    let add = this._utils.changeCornerWidth() ? 1 : 0;
    if (keepWidth) {
      add = 0;
    }

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
    if (keepHeight) {
      add = 0;
    }

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
    if (!keepHeight && this._utils.changeCornerHeight() && this._samePoint(pos.height, s.totalHeight)) {
      sameHeight = true;
      useHeight = 0;
    }

    // currently at north/south and now moved to corner
    if (!keepWidth && this._utils.changeCornerWidth() && this._samePoint(pos.width, s.totalWidth)) {
      sameWidth = true;
      useWidth = 0;
    }


    // no special handling for first time move
    if (ignoreCornerSettings) { // || !this._utils.changeCornerFirstTime()) {
      // window was moved to an other corner
      if ((!keepHeight && !keepWidth) && (!sameWidth || !sameHeight)) {
        useWidth = 0;
        useHeight = 0;
      }

      this._resize(win, widths[useWidth].x, heights[useHeight].y, widths[useWidth].width, heights[useHeight].height);
      return;
    }

    // moveToCornerKeepSize returns true, if the window must be moved (not already in the given corner)
    if (this._moveToCornerKeepSize(win, screenIndex, direction) && !this._utils.changeCornerFirstTime()) {
      return;
    }

    if (this._utils.changeCornerBoth()) {
      useWidth = useHeight = Math.min(useWidth, useHeight);
    }

    let x, y, width, height;
    if (this._utils.changeCornerWidth()) {
      x = widths[useWidth].x;
      width = widths[useWidth].width;
    } else {
      width = pos.width;
      if (direction.indexOf("w") == -1) {
        x = s.x + (s.totalWidth - pos.width);
      } else {
        x = s.x;
      }
    }

    if (this._utils.changeCornerHeight()) {
      y = heights[useHeight].y;
      height = heights[useHeight].height;
    } else {
      height = pos.height;
      if (direction.indexOf("s") == -1) {
        y = s.y;
      } else {
        y = (s.totalHeight - pos.height);
      }
    }
    this._resize(win, x, y, width, height);
  },

  _moveToCornerKeepSize: function(win, screenIndex, direction) {
    let s = this._screens[screenIndex];
    let pos = win.get_frame_rect();

    let x,y;

    if (direction.indexOf("s") == -1) {
      y = s.y;
    } else {
      y = s.y + (s.totalHeight - pos.height);
    }

    if (direction.indexOf("w") == -1) {
      x = s.x + (s.totalWidth - pos.width);
    } else {
      x = s.x;
    }

    // window is already in the given corner
    if (this._samePoint(pos.x, x) && this._samePoint(pos.y, y)) {
      return false;
    }

    win.move_frame(true, x, y);
    return true;
  },


  /**
   * _moveFocused is called internal when for example moving between screens.
   * The -enabled flag should only be checked, if the method is called because of the keybinding. 
   * e.g. Internal calls should not check the config.
   */
  moveFocused: function(where) {

    if ("e,s,w,n".indexOf(where) != -1) {
      if (!this._utils.getBoolean("put-to-side-" + where + "-enabled", true)) {
        return;
      }
    } else if ("ne,se,sw,nw".indexOf(where) != -1) {
     if (!this._utils.getBoolean("put-to-corner-" + where + "-enabled", true)) {
        return;
      } 
    } else if ("c" == where) {
      if (!this._utils.getBoolean("put-to-center-enabled", true)) {
        return;
      }
    }

    this._moveFocused(where);

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

      if (this._utils.toggleMaximizeOnMoveCenter()) {
        var flags = Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL;
        if (win.maximized_horizontally && win.maximized_vertically) {
          win.unmaximize(flags);
        } else {
          win.maximize(flags);
        }
        return;
      }

      let pos = win.get_frame_rect(),
        centerWidths = [],
        centerHeights = [];

      centerWidths.push(this._utils.getNumber(this._utils.CENTER_WIDTH_0, 50));
      centerWidths.push(this._utils.getNumber(this._utils.CENTER_WIDTH_1, 100));
      centerWidths.push(this._utils.getNumber(this._utils.CENTER_WIDTH_2, 100));

      centerHeights.push(this._utils.getNumber(this._utils.CENTER_HEIGHT_0, 50));
      centerHeights.push(this._utils.getNumber(this._utils.CENTER_HEIGHT_1, 100));
      centerHeights.push(this._utils.getNumber(this._utils.CENTER_HEIGHT_2, 100));

      if (centerWidths[1] == centerWidths[2] && centerHeights[1] == centerHeights[2]) {
        centerWidths.pop();
        centerHeights.pop();
      }

      let ws = [],
        hs = [],
        xs = [],
        ys = [],
        sameHeights = [];

      for (let i = 0; i < centerWidths.length; ++i) {
        ws.push(s.totalWidth * (centerWidths[i] / 100));
        hs.push(s.totalHeight * (centerHeights[i] / 100));
        xs.push(s.x + (s.totalWidth - ws[i]) / 2);
        ys.push(s.y + (s.totalHeight - hs[i]) / 2);
        sameHeights.push(this._samePoint(hs[i], pos.height));

        if (centerWidths[i] == 100 && centerHeights[i] == 100) {
          ws[i] *= -1;
          hs[i] *= -1;
        }
      }

      if (this._utils.getBoolean(this._utils.MOVE_CENTER_ONLY_TOGGLES, false)) {
        if (win.maximized_horizontally && win.maximized_vertically) {
          this._resize(win, xs[0], ys[0], ws[0], hs[0]);
        } else {
          this._resize(win, s.x, s.y, s.totalWidth * -1, s.totalHeight * -1);
        }
      } else {
        // do not check window.width. until i find get_size_hint(), or min_width..
        // windows that have a min_width < our width will not be maximized (evolution for example)
        let next_i;
        for (next_i = 0; next_i < centerWidths.length; ++next_i) {
          if (this._samePoint(xs[next_i], pos.x) && this._samePoint(ys[next_i], pos.y) && sameHeights[next_i]) {
            ++next_i;
            break;
          }
        }
        // next window size is i (first if we didn't match any)
        next_i %= centerWidths.length;
        this._resize(win, xs[next_i], ys[next_i], ws[next_i], hs[next_i]); // YYY
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

    if (win.skip_taskbar) {
      return;
    }

    let app = this._windowTracker.get_window_app(win);

    if (!app) {
      if (!noRecurse) {
        // window is not tracked yet
        Mainloop.idle_add(() => {
          this._moveConfiguredWhenCreated(display, win, true);
          return;
        });
      }
      return;
    }
    app = win.get_wm_class();
    // move the window if a location is configured and autoMove is set to true
    let appPath = "locations." + app;

    var configExists = this._utils.getParameter(appPath, false);
    if (!configExists) {
      // check if there is a config for "all"
      appPath = "locations.All";
      configExists = this._utils.getParameter(appPath, false);
    }

    // config exists and autoMove is enabled
    if (configExists && this._utils.getBoolean(appPath + ".autoMove", false)) {
      this.focusListener = win.connect("focus",
        () => {
          this._moveToConfiguredLocation(win, app);
        }
      );
    }
  },

  moveToConfiguredLocation: function(win, appName) {
    if (this._utils.getBoolean("put-to-location-enabled", true)) {
      this._moveToConfiguredLocation(win, appName);
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

    if (this.focusListener != null) {
      win.disconnect(this.focusListener);
      this.focusListener = null;
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
    if (config.lastPosition == undefined) {
      config.lastPosition= 0;
    }

    let pos = config.positions[config.lastPosition];
    if (!pos) {
      pos = config.positions[0];
      config.lastPosition = 0;
      // undefined on first load
      if (pos.screen) {
        pos.screen = 0;
      }
      this._utils.setParameter("locations." + appName + ".lastPosition", 1);
    } else {
      config.lastPosition++;
    }

    if (config.lastPosition >= config.positions.length) {
      this._utils.setParameter("locations." + appName + ".lastPosition", 0);
    }

    // config may be for 2 screens but currently only 1 is connected
    let targetScreenIndex =  (this._screens.length > pos.screen) ? pos.screen : 0;
    let s = this._screens[targetScreenIndex];

    let disableResize = !!pos.disableResize;
    let disableMove = !!pos.disableMove;        

    let x = (pos.x == "0.0") ? s.x : s.x + (s.totalWidth * pos.x/100);
    let y = (pos.y == "0.0") ? s.y : s.totalHeight - (s.totalHeight * (1-pos.y/100));

    // _resize will maximize the window if width/height is -1
    let maximize = (pos.width == 100 && pos.height == 100);
    let width = maximize ? -1 * pos.width : s.totalWidth * pos.width/100;
    let height = maximize ? -1 * pos.height : s.totalHeight * pos.height/100;

    if (disableResize) {
      let r = win.get_frame_rect();
      width = r.width;
      height = r.height;

    }
    if (disableMove) {
      let r = win.get_frame_rect();
      x = r.x;
      y = r.y;

      let screenIndex = this._getCurrentScreenIndex(win);
      if (targetScreenIndex != screenIndex) {
        let oldScreen = this._screens[screenIndex];

        x = s.x + Math.abs(r.x - oldScreen.x);
        y = s.y + Math.abs(r.y - oldScreen.y);
      }
    }  

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
    let maximizeFlags = 0;
    let unMaximizeFlags = 0;
    if (height < 0) {
      maximizeFlags = maximizeFlags | Meta.MaximizeFlags.VERTICAL;
      height = 400; // dont resize to width, -1
    } else {
      unMaximizeFlags = unMaximizeFlags | Meta.MaximizeFlags.VERTICAL;
    }

    if (width < 0) {
      maximizeFlags = maximizeFlags | Meta.MaximizeFlags.HORIZONTAL;
      width = 400;  // dont resize to height, -1
    } else {
      unMaximizeFlags = unMaximizeFlags | Meta.MaximizeFlags.HORIZONTAL;
    }

    if (maximizeFlags != 0) {
      win.maximize(maximizeFlags);
    }
    if (unMaximizeFlags != 0) {
      win.unmaximize(unMaximizeFlags)
    }

    if (width == 0 && height == 0) {
      win.move_frame(false, x, y);
      return;
    }

    let targetRectangle = this._getRectangle(win, x, y, width, height);

    // user_operation, width, height, force
    win.move_resize_frame(false, 
      targetRectangle.x,
      targetRectangle.y,
      targetRectangle.width, 
      targetRectangle.height);
  },

  // the difference between input and outer rect as object.
  _getRectangle: function(win, x, y, width, height) {
    let rect = new Meta.Rectangle();
    rect.width = width;
    rect.height = height;
    rect.x = x;
    rect.y = y;

    // mutter already works with frame_rect, no need to calculate padding
    if (win.client_rect_to_frame_rect) {
      return rect;
    }


    let outer = win.get_frame_rect();
    if (win.get_outer_rect) {
      outer = win.get_outer_rect();
    }

    let inner = win.get_frame_rect();
    if (win.get_rect) {
      inner = win.get_rect();
    }

    rect.width =  rect.width - (outer.width - inner.width);
    rect.height = rect.height - (outer.height - inner.height)
    
    return rect;
  },

  counter: 0,

  _loadScreenData: function() {
    // get monitor(s) geometry
    this._primary = this._utils.getScreen().get_primary_monitor();
    let numMonitors = this._utils.getScreen().get_n_monitors();

    this._screens = [];
    // only tested with 2 screen setup
    let sumX = 0,sumY = 0;

    for (let i=0; i < numMonitors; i++) {

      let geom;
      if (Main.layoutManager.getWorkAreaForMonitor) {
        geom = Main.layoutManager.getWorkAreaForMonitor(i);
      } else {
        geom = this._utils.getScreen().get_monitor_geometry(i)
      }

      let primary = (i == this._primary);
      sumX += geom.x;
      sumY += geom.y;

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

    this._isVerticalScreenSetup = sumX < sumY;

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

    this._screenListener = this._utils.getMonitorManager()
        .connect("monitors-changed", this._loadScreenData.bind(this));

    this._workareasChangedListener = this._utils.getScreen()
        .connect("workareas-changed", this._loadScreenData.bind(this));

    // this._windowCreatedListener = global.screen.get_display().connect_after('window-created',
    this._windowCreatedListener = global.display
        .connect_after('window-created', this._moveConfiguredWhenCreated.bind(this));

    this._bindings = [];
    // move to n, e, s an w
    this._addKeyBinding("put-to-side-n",
        () => { this.moveFocused("n");}
    );
    this._addKeyBinding("put-to-side-e",
        () => { this.moveFocused("e");}
    );
    this._addKeyBinding("put-to-side-s",
        () => { this.moveFocused("s");}
    );
    this._addKeyBinding("put-to-side-w",
        () => { this.moveFocused("w");}
    );

    // move to  nw, se, sw, nw
    this._addKeyBinding("put-to-corner-ne",
        () => { this.moveFocused("ne");}
    );
    this._addKeyBinding("put-to-corner-se",
        () => { this.moveFocused("se");}
    );
    this._addKeyBinding("put-to-corner-sw",
        () => { this.moveFocused("sw");}
    );
    this._addKeyBinding("put-to-corner-nw",
        () => { this.moveFocused("nw");}
    );

    // move to center. fix 2 screen setup and resize to 50% 50%
    this._addKeyBinding("put-to-center",
        () => { this.moveFocused("c");}
    );

    this._addKeyBinding("put-to-location",
        () => { this.moveToConfiguredLocation();} 
    );

    this._addKeyBinding("put-to-left-screen",
        () => { this.moveToScreen("left");} 
    );

    this._addKeyBinding("put-to-right-screen",
        () => { this.moveToScreen("right");} 
    );

    this._moveFocusPlugin = new MoveFocus.MoveFocus(this._utils, this._screens);
    // TODO - fix moveWorkspace
    // new MoveWorkspace.MoveWorkspace(this._utils);
    this._moveWorkspacePlugin = false;
  },

  /**
   * disconnect all keyboard bindings that were added with _addKeyBinding
   **/
  destroy: function() {

    if (this._windowCreatedListener) {
      global.display.disconnect(this._windowCreatedListener);
      this._windowCreatedListener = false;
    }

    if (this._screenListener) {
      this._utils.getScreen().disconnect(this._screenListener);
      this._screenListener = false;
    }

    if (this._workareasChangedListener) {
      this._utils.getScreen().disconnect(this._workareasChangedListener);
      this._workareasChangedListener = false;
    }

    let size = this._bindings.length;

    for(let i = 0; i<size; i++) {
      if (Main.wm.removeKeybinding) {// introduced in 3.7.2
        Main.wm.removeKeybinding(this._bindings[i]);
      } else {
        global.display.remove_keybinding(this._bindings[i]);
      }
    }
    this._bindings = [];

    this._utils.destroy();
    if (this._moveFocusPlugin) {
      this._moveFocusPlugin.destroy();
    }

    if (this._moveWorkspacePlugin) {
      this._moveWorkspacePlugin.destroy();
    }
  }
};

function init(meta) {
}

function enable() {
  this.original_get_center = Meta.Window.prototype.get_center;
  
  if ((typeof Meta.Window.prototype.get_frame_rect) == "undefined") {
    this.original_get_frame_rect = Meta.Window.prototype.get_frame_rect;
    Meta.Window.prototype.get_frame_rect = function() {
      return this.get_outer_rect();
    }
  }

  //Meta.Window.get_center()
  Meta.Window.prototype.get_center = function(){
    let rect = this.get_frame_rect();
    return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
  };
  _moveWindow = new MoveWindow();
}

function disable() {  
  // remove monkey patch, get_center
  Meta.Window.prototype.get_center = this.original_get_center;

  if (this.original_get_frame_rect) { 
    Meta.Window.prototype.get_frame_rect = this.original_get_frame_rect;
  }
  
  
  _moveWindow.destroy();
  _moveWindow = null;
}
