import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';

import PutWindowUtils from './utils.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

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
class MoveWindow {
  constructor(settings) {
    this._settings = settings;

    // private variables
    this._bindings = [];

    this._primary = 0;

    this._screens = [];
    this._init(settings);
  }

  /**
   * Get global.screen_width and global.screen_height and
   * bind the keys
   *
   * @param {Extension.Settings] }settings
   **/
  _init(settings) {
    // read configuration and init the windowTracker
    this._utils = new PutWindowUtils(settings);
    this._windowTracker = Shell.WindowTracker.get_default();

    this._loadScreenData();

    this._screenListener = this._utils.getMonitorManager()
      .connect('monitors-changed', this._loadScreenData.bind(this));

    this._workareasChangedListener = this._utils.getScreen()
      .connect('workareas-changed', this._loadScreenData.bind(this));

    this._bindings = [];

    // move to n, e, s an w
    let directions = ['n', 'e', 's', 'w'];
    for (let i = 0; i < directions.length; i++) {
      this._addKeyBinding(`put-to-side-${directions[i]}`, settings, this.moveFocused.bind(this, directions[i]));
    }

    // move to  nw, se, sw, nw
    directions = ['ne', 'se', 'sw', 'nw'];
    for (let i = 0; i < directions.length; i++) {
      this._addKeyBinding(`put-to-corner-${directions[i]}`, settings, this.moveFocused.bind(this, directions[i]));
    }

    directions = ['left', 'right', 'previous', 'next'];
    for (let i = 0; i < directions.length; i++) {
      this._addKeyBinding(`put-to-${directions[i]}-screen`, settings, this.moveToScreen.bind(this, directions[i]));
    }

    // move to center. fix 2 screen setup and resize to 50% 50%
    this._addKeyBinding('put-to-center', settings,
      () => {
        this.moveFocused('c');
      }
    );

    // this._moveFocusPlugin = new MoveFocus.MoveFocus(this._utils, this._screens);
  }

  /**
   * Disconnect all keyboard bindings that were added with _addKeyBinding
   **/
  destroy() {
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

    const size = this._bindings.length;

    for (let i = 0; i < size; i++) {
      if (Main.wm.removeKeybinding) { // introduced in 3.7.2
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
  }

  /**
   * Helper functions to set custom handler for keybindings
   *
   * @param {Extension.Settings} key
   * @param {Sring} settings
   * @param {Function} handler
   */
  _addKeyBinding(key, settings, handler) {
    this._bindings.push(key);

    const mode = Shell.hasOwnProperty('ActionMode') ? Shell.ActionMode : Shell.KeyBindingMode;

    Main.wm.addKeybinding(key,
      settings,
      Meta.KeyBindingFlags.NONE,
      mode.ALL,
      handler
    );
  }

  _getTopPanelHeight() {
    if (this._utils.getBoolean(PutWindowUtils.IGNORE_TOP_PANEL, false)) {
      return 0;
    }
    // 0 means hidden, 255 is visible
    let opacity;
    if (Main.panel.get_paint_opacity) {
      opacity = Main.panel.get_paint_opacity();
    } else {
      opacity = Main.panel.actor.get_paint_opacity();
    }

    if (opacity === 0) {
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
  }

  _recalculateSizes(s) {
    let topPanelHeight = s.primary ? this._getTopPanelHeight() : 0;
    if (Math.abs(topPanelHeight) <= 2) {
      topPanelHeight = 0;
    }
    if (s.geomY !== topPanelHeight) {
      s.y = s.geomY + topPanelHeight;
    } else {
      s.y = s.geomY;
    }

    let i = 0;
    let widths  = this._utils.getWestWidths();
    s.west = [];
    for (i = 0; i < widths.length; i++) {
      s.west[i] = {
        width: s.totalWidth * widths[i],
        x: s.x,
      };
    }


    widths = this._utils.getEastWidths();
    s.east = [];
    for (i = 0; i < widths.length; i++) {
      s.east[i] = {
        width: s.totalWidth * widths[i],
        x: s.geomX + (s.totalWidth * (1 - widths[i])),
      };
    }

    let heights = this._utils.getNorthHeights();
    const absoluteHeight = s.totalHeight + topPanelHeight;

    s.north = [];
    for (i = 0; i < heights.length; i++) {
      s.north[i] = {
        height: absoluteHeight * heights[i] - topPanelHeight * heights[i],
        y: s.y,
      };
    }

    heights = this._utils.getSouthHeights();
    s.south = [];
    for (i = 0; i < heights.length; i++) {
      const h = absoluteHeight * heights[i] - topPanelHeight * heights[i];
      s.south[i] = {
        height: h,
        y: absoluteHeight - h + s.geomY,
      };
    }

    return s;
  }

  /**
   * Checks the _screens array, and returns the index of the screen, the
   * given window (win) is on
   *
   * @param {Meta.Window} win
   */
  _getCurrentScreenIndex(win) {
    // left edge is sometimes -1px...
    const pos = win.get_frame_rect();
    pos.x = pos.x < 0 ? 0 : pos.x;

    const sl = this._screens.length;

    for (let i = 0; i < sl; i++) {
      const s = this._screens[i];

      if ((s.x <= pos.x && (s.x + s.totalWidth) > pos.x) &&
          ((s.y - this._getTopPanelHeight()) <= pos.y && (s.y + s.totalHeight) > pos.y)) {
        return i;
      }
    }

    return this._primary;
  }

  moveToScreen(direction) {
    if (this._utils.getBoolean(`put-to-${direction}-screen-enabled`, true)) {
      this._moveToScreen(direction);
    }
  }

  /**
   * Move the focused window to the screen on the "direction" side
   *
   * @param {string} direction left, e, right and w are supported
   * @returns true, if it was possible to move the focused window in the given direction
   */
  _moveToScreen(direction) {
    const win = global.display.focus_window;
    if (win === null) {
      return false;
    }

    const screenIndex = this._getCurrentScreenIndex(win);
    let s = null;
    const old = {
      primary: this._screens[screenIndex].primary,
      x: this._screens[screenIndex].x,
      y: this._screens[screenIndex].y,
      totalWidth: this._screens[screenIndex].totalWidth,
      totalHeight: this._screens[screenIndex].totalHeight,
    };

    if ((direction === 'right' || direction === 'e') && screenIndex < (this._screens.length - 1)) {
      s = this._screens[screenIndex + 1];
      s = this._recalculateSizes(s);
    }

    if ((direction === 'left' || direction === 'w') && screenIndex > 0) {
      s = this._screens[screenIndex - 1];
      s = this._recalculateSizes(s);
    }
    if (direction === 'next') {
      if (screenIndex === this._screens.length - 1) {
        s = this._screens[0];
      } else {
        s = this._screens[screenIndex + 1];
        s = this._recalculateSizes(s);
      }
    }
    if (direction === 'previous') {
      if (screenIndex === 0) {
        s = this._screens[this._screens.length - 1];
      } else {
        s = this._screens[screenIndex - 1];
        s = this._recalculateSizes(s);
      }
    }
    if (s === null) {
      return false;
    }

    let wasMaximizeFlags = 0;
    if (win.maximized_horizontally) {
      wasMaximizeFlags |= Meta.MaximizeFlags.HORIZONTAL;
    }

    if (win.maximized_vertically) {
      wasMaximizeFlags |= Meta.MaximizeFlags.VERTICAL;
    }

    if (wasMaximizeFlags !== 0) {
      win.unmaximize(wasMaximizeFlags);
    }

    const position = win.get_frame_rect();

    const xRatio = s.totalWidth / old.totalWidth;
    const x = s.x + (position.x - old.x) * xRatio;
    const width = position.width * xRatio;
    if (width >= s.totalWidth) {
      wasMaximizeFlags |= Meta.MaximizeFlags.HORIZONTAL;
    }

    const yRatio = s.totalHeight / old.totalHeight;

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
      wasMaximizeFlags |= Meta.MaximizeFlags.VERTICAL;
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

    if (wasMaximizeFlags !== 0) {
      win.maximize(wasMaximizeFlags);
    }
    return true;
  }


  /**
   * Moves win, that is currently on screen[screenIndex] in the given direction.
   * Depending on ALWAYS_USE_WIDTHS config and screen setup, the window is either
   * moved to other screen or only resized.
   *
   * @param {Meta.Window} win The window that must be moved
   * @param {string} screenIndex The screen the window belongs to (this._screens)
   * @param {string} direction The two available sides e/w (i.e. east/west)
   */
  _moveToSide(win, screenIndex, direction) {
    const s = this._screens[screenIndex];
    const pos = win.get_frame_rect();
    const sizes = direction === 'e' ? s.east : s.west;


    if (win.maximized_horizontally &&
        !win.maximized_vertically &&
        this._utils.getBoolean(PutWindowUtils.INTELLIGENT_CORNER_MOVEMENT, false)) {
      // currently at the left side (WEST)
      if (pos.y === s.y) {
        this._moveToCorner(win, screenIndex, `n${direction}`, false, true, true);
      } else {
        this._moveToCorner(win, screenIndex, `s${direction}`, false, true, true);
      }
      return;
    }

    let useIndex = 0;
    let moveToOtherScreen = false;
    let minDistance = false;
    let dist;
    for (let i = 0; i < sizes.length; i++) {
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
      dist = Math.abs(pos.width - sizes[i].width);

      if (!minDistance || minDistance > dist) {
        minDistance = dist;
        useIndex = i + 1;
      }
    }
    if (useIndex >= sizes.length) {
      moveToOtherScreen = true;
      useIndex = 0;
    }

    let otherDirection = 'e';
    let canMoveScreen = screenIndex > 0;
    if (direction === 'e') {
      otherDirection = 'w';
      canMoveScreen = !this._isVerticalScreenSetup && screenIndex < (this._screens.length - 1);
    }

    if (moveToOtherScreen && canMoveScreen && !this._utils.getBoolean(PutWindowUtils.ALWAYS_USE_WIDTHS)) {
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

    if (this._utils.getBoolean(PutWindowUtils.ALWAYS_KEEP_HEIGHT, false)) {
      this._resize(win, sizes[useIndex].x, pos.y, sizes[useIndex].width, pos.height);
    } else {
      this._resize(win, sizes[useIndex].x, s.y, sizes[useIndex].width, s.totalHeight * -1);
    }
  }

  _moveNorthSouth(win, screenIndex, direction) {
    const s = this._screens[screenIndex];

    const pos = win.get_frame_rect();
    const sizes = direction === 'n' ? s.north : s.south;

    if (win.maximized_vertically &&
        !win.maximized_horizontally &&
        this._utils.getBoolean(PutWindowUtils.INTELLIGENT_CORNER_MOVEMENT, false)) {
      // currently at the left side (WEST)
      if (pos.x === s.x) {
        this._moveToCorner(win, screenIndex, `w${direction}`, true, false, true);
      } else {
        this._moveToCorner(win, screenIndex, `e${direction}`, true, false, true);
      }
      return;
    }

    let useIndex = 0;
    for (let i = 0; i < sizes.length; i++) {
      if (this._samePoint(pos.height, sizes[i].height) && this._samePoint(pos.y, sizes[i].y)) {
        useIndex = i + 1;
        if (useIndex >= sizes.length) {
          useIndex =  0;
        }
        break;
      }
    }

    let canMoveScreen = screenIndex > 0;
    const screenMoveDirection = direction === 's' ? 'e' : 'w';
    if (direction === 's') {
      canMoveScreen = this._isVerticalScreenSetup && screenIndex < (this._screens.length - 1);
    }

    if (useIndex > 0 && canMoveScreen && !this._utils.getBoolean(PutWindowUtils.ALWAYS_USE_WIDTHS)) {
      // moved in this direction more then once, if a screen exists, move the window there
      if (useIndex > 1) {
        // the window was moved here from an other screen, just resize it
        useIndex = 0;
      } else {
        // moving to other screen is possible, move to screen and resize afterwards
        this._moveToScreen(screenMoveDirection);
        this._moveFocused(direction === 's' ? 'n' : 's');
        return;
      }
    }

    if ((this._utils.getBoolean(PutWindowUtils.CENTER_KEEP_WIDTH, false) && this._isCenterWidth(screenIndex, pos)) ||
        this._utils.getBoolean(PutWindowUtils.ALWAYS_KEEP_WIDTH, false)) {
      this._resize(win, pos.x, sizes[useIndex].y, pos.width, sizes[useIndex].height);
    } else {
      this._resize(win, s.x, sizes[useIndex].y, s.totalWidth * -1, sizes[useIndex].height);
    }
  }

  _isCenterWidth(screenIndex, pos) {
    const s = this._screens[screenIndex];
    const w = s.totalWidth * (this._utils.getNumber(PutWindowUtils.CENTER_WIDTH_0, 50) / 100),
      x = s.x + (s.totalWidth - w) / 2;

    return this._samePoint(w, pos.width) && this._samePoint(x, pos.x);
  }

  _moveToCorner(win, screenIndex, direction, keepWidth, keepHeight, ignoreCornerSettings) {
    ignoreCornerSettings = ignoreCornerSettings || false;
    keepWidth = keepWidth || false;
    keepHeight = keepHeight || false;

    const s = this._screens[screenIndex];
    const pos = win.get_frame_rect();
    let sameWidth = false;
    let sameHeight = false;

    if (this._utils.changeCornerNever()) {
      this._moveToCornerKeepSize(win, screenIndex, direction);
      return;
    }

    let useWidth = 0;
    const widths = direction.indexOf('e') === -1 ? s.west : s.east;
    let add = this._utils.changeCornerWidth() ? 1 : 0;
    if (keepWidth) {
      add = 0;
    }

    for (let i = 0; i < widths.length; i++) {
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
    const heights = direction.indexOf('n') === -1 ? s.south : s.north;
    add = this._utils.changeCornerHeight() ? 1 : 0;
    if (keepHeight) {
      add = 0;
    }

    for (let i = 0; i < heights.length; i++) {
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
      if (direction.indexOf('w') === -1) {
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
      if (direction.indexOf('s') === -1) {
        y = s.y;
      } else {
        y = s.totalHeight - pos.height;
      }
    }
    this._resize(win, x, y, width, height);
  }

  _moveToCornerKeepSize(win, screenIndex, direction) {
    const s = this._screens[screenIndex];
    const pos = win.get_frame_rect();

    let x, y;

    if (direction.indexOf('s') === -1) {
      y = s.y;
    } else {
      y = s.y + (s.totalHeight - pos.height);
    }

    if (direction.indexOf('w') === -1) {
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
  }

  _moveToCenter(win, screenIndex) {
    const screenSize = this._screens[screenIndex];

    if (this._utils.toggleMaximizeOnMoveCenter()) {
      var flags = Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL;
      if (win.maximized_horizontally && win.maximized_vertically) {
        win.unmaximize(flags);
      } else {
        win.maximize(flags);
      }
      return;
    }

    const pos = win.get_frame_rect(),
      centerWidths = [],
      centerHeights = [];

    centerWidths.push(this._utils.getNumber(PutWindowUtils.CENTER_WIDTH_0, 50));
    centerWidths.push(this._utils.getNumber(PutWindowUtils.CENTER_WIDTH_1, 100));
    centerWidths.push(this._utils.getNumber(PutWindowUtils.CENTER_WIDTH_2, 100));

    centerHeights.push(this._utils.getNumber(PutWindowUtils.CENTER_HEIGHT_0, 50));
    centerHeights.push(this._utils.getNumber(PutWindowUtils.CENTER_HEIGHT_1, 100));
    centerHeights.push(this._utils.getNumber(PutWindowUtils.CENTER_HEIGHT_2, 100));

    if (centerWidths[1] === centerWidths[2] && centerHeights[1] === centerHeights[2]) {
      centerWidths.pop();
      centerHeights.pop();
    }

    const ws = [],
      hs = [],
      xs = [],
      ys = [],
      sameHeights = [];

    for (let i = 0; i < centerWidths.length; ++i) {
      ws.push(screenSize.totalWidth * (centerWidths[i] / 100));
      hs.push(screenSize.totalHeight * (centerHeights[i] / 100));
      xs.push(screenSize.x + (screenSize.totalWidth - ws[i]) / 2);
      ys.push(screenSize.y + (screenSize.totalHeight - hs[i]) / 2);
      sameHeights.push(this._samePoint(hs[i], pos.height));

      if (centerWidths[i] === 100 && centerHeights[i] === 100) {
        ws[i] *= -1;
        hs[i] *= -1;
      }
    }

    if (this._utils.getBoolean(PutWindowUtils.MOVE_CENTER_ONLY_TOGGLES, false)) {
      if (win.maximized_horizontally && win.maximized_vertically) {
        this._resize(win, xs[0], ys[0], ws[0], hs[0]);
      } else {
        this._resize(win, screenSize.x, screenSize.y, screenSize.totalWidth * -1, screenSize.totalHeight * -1);
      }
    } else {
      // do not check window.width. until i find get_size_hint(), or min_width..
      // windows that have a min_width < our width will not be maximized (evolution for example)
      let index;
      for (index = 0; index < centerWidths.length; ++index) {
        if (this._samePoint(xs[index], pos.x) && this._samePoint(ys[index], pos.y) && sameHeights[index]) {
          ++index;
          break;
        }
      }
      // next window size is i (first if we didn't match any)
      index %= centerWidths.length;
      this._resize(win, xs[index], ys[index], ws[index], hs[index]); // YYY
    }
  }

  /**
   * _moveFocused is called internal when for example moving between screens.
   * The -enabled flag should only be checked, if the method is called because of the keybinding.
   * e.g. Internal calls should not check the config.
   *
   * @param {string} where
   */
  moveFocused(where) {
    if ('e,s,w,n'.indexOf(where) !== -1) {
      if (!this._utils.getBoolean(`put-to-side-${where}-enabled`, true)) {
        return;
      }
    } else if ('ne,se,sw,nw'.indexOf(where) !== -1) {
      if (!this._utils.getBoolean(`put-to-corner-${where}-enabled`, true)) {
        return;
      }
    } else if (where === 'c') {
      if (!this._utils.getBoolean('put-to-center-enabled', true)) {
        return;
      }
    }

    this._moveFocused(where);
  }

  /**
   * move the current focused window into the given direction (c, n,e,s,w, ne, nw, sw, so)
   *
   * @param {string} where
   */
  _moveFocused(where) {
    console.log(`_moveFocused ${where}`);
    const win = global.display.focus_window;
    if (win === null) {
      return;
    }

    const screenIndex = this._getCurrentScreenIndex(win);

    this._recalculateSizes(this._screens[screenIndex]);

    if (where === 'c') {
      this._moveToCenter(win, screenIndex);
    } else if (where === 'n' || where === 's') {
      this._moveNorthSouth(win, screenIndex, where);
    } else if (where === 'e' || where === 'w') {
      this._moveToSide(win, screenIndex, where);
    } else {
      this._moveToCorner(win, screenIndex, where);
    }
  }

  // On large screens the values used for moving/resizing windows, and the resulting
  // window.rect are may not be not equal (==)
  // --> Assume points are equal, if the difference is <= 40px
  // @return true, if the difference between p1 and p2 is less then 41
  _samePoint(p1, p2) {
    return Math.abs(p1 - p2) <= 40;
  }

  // actual resizing
  _resize(win, x, y, width, height) {
    let maximizeFlags = 0;
    let unMaximizeFlags = 0;
    if (height < 0) {
      maximizeFlags |= Meta.MaximizeFlags.VERTICAL;
      height = 400; // dont resize to width, -1
    } else {
      unMaximizeFlags |= Meta.MaximizeFlags.VERTICAL;
    }

    if (width < 0) {
      maximizeFlags |= Meta.MaximizeFlags.HORIZONTAL;
      width = 400;  // dont resize to height, -1
    } else {
      unMaximizeFlags |= Meta.MaximizeFlags.HORIZONTAL;
    }

    if (maximizeFlags !== 0) {
      win.maximize(maximizeFlags);
    }
    if (unMaximizeFlags !== 0) {
      win.unmaximize(unMaximizeFlags);
    }

    if (width === 0 && height === 0) {
      win.move_frame(false, x, y);
      return;
    }

    const targetRectangle = this._getRectangle(win, x, y, width, height);

    // user_operation, width, height, force
    win.move_resize_frame(false,
      targetRectangle.x,
      targetRectangle.y,
      targetRectangle.width,
      targetRectangle.height);
  }

  // the difference between input and outer rect as object.
  _getRectangle(win, x, y, width, height) {
    const rect = new Mtk.Rectangle();
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

    rect.width -= outer.width - inner.width;
    rect.height -= outer.height - inner.height;

    return rect;
  }


  _loadScreenData() {
    // get monitor(s) geometry
    this._primary = this._utils.getScreen().get_primary_monitor();
    const numMonitors = this._utils.getScreen().get_n_monitors();

    this._screens = [];
    // only tested with 2 screen setup
    let sumX = 0, sumY = 0;

    for (let i = 0; i < numMonitors; i++) {
      let geom;
      if (Main.layoutManager.getWorkAreaForMonitor) {
        geom = Main.layoutManager.getWorkAreaForMonitor(i);
      } else {
        geom = this._utils.getScreen().get_monitor_geometry(i);
      }

      const primary = i === this._primary;
      sumX += geom.x;
      sumY += geom.y;

      this._screens[i] =  {
        primary,
        y: geom.y,
        x: geom.x,
        geomX: geom.x,
        geomY: geom.y,
        totalWidth: geom.width,
        totalHeight: geom.height,
        east: [],
        west: [],
        north: [],
        south: [],
      };
    }

    this._isVerticalScreenSetup = sumX < sumY;

    // sort by x position. makes it easier to find the correct screen
    this._screens.sort((s1, s2) => {
      return s1.x - s2.x;
    });
  }
}


export default class PutWindowExtension extends Extension {
  enable() {
    this._moveWindow = new MoveWindow(this.getSettings());
  }

  disable() {
    this._moveWindow?.destroy();
    this._moveWindow = null;
  }
}


