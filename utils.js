export default class PutWindowUtils {
  static CENTER_WIDTH_0 = 'center-width';
  static CENTER_WIDTH_1 = 'center-width-1';
  static CENTER_WIDTH_2 = 'center-width-2';
  static CENTER_HEIGHT_0 = 'center-height';
  static CENTER_HEIGHT_1 = 'center-height-1';
  static CENTER_HEIGHT_2 = 'center-height-2';
  static CENTER_KEEP_WIDTH = 'center-keep-width';
  static ALWAYS_USE_WIDTHS = 'always-use-widths';
  static CORNER_CHANGE = 'corner-changes';
  static IGNORE_TOP_PANEL = 'ignore-top-panel';
  static MOVE_CENTER_ONLY_TOGGLES = 'move-center-only-toggles';
  static ALWAYS_KEEP_WIDTH = 'always-keep-width';
  static ALWAYS_KEEP_HEIGHT = 'always-keep-height';
  static INTELLIGENT_CORNER_MOVEMENT = 'intelligent-corner-movement';

  constructor(settingsObject) {
    this._changeEventListeners = [];
    this._gnomeBindings = null;

    this._settingsObject = settingsObject;
  }

  getMainSettings() {
    return [
      PutWindowUtils.ALWAYS_USE_WIDTHS,
      PutWindowUtils.ALWAYS_KEEP_WIDTH,
      PutWindowUtils.ALWAYS_KEEP_HEIGHT,
      PutWindowUtils.IGNORE_TOP_PANEL,
      PutWindowUtils.INTELLIGENT_CORNER_MOVEMENT,
    ];
  }

  destroy() {
    for (let i = 0; i < this._changeEventListeners.length; i++) {
      this._settingsObject.disconnect(this._changeEventListeners[i].handlerId);
    }
  }

  getSettingsObject() {
    return this._settingsObject;
  }

  toggleMaximizeOnMoveCenter() {
    return this.getBoolean('move-center-only-toggles', false);
  }

  /**
   * ["0", "Both"],
   * ["1", "Only height"],
   * ["2", "Only width"],
   * ["3", "Never change size"]
   * ["4", "Nothing on first move, both on second"],
   * ["5", "Nothing on first move, Only height on second"],
   * ["6", "Nothing on first move, Only width on second"]["4", "Keep size on first move"],
   *
   * @returns {boolean}
   */
  changeCornerHeight() {
    const val = this.getNumber(PutWindowUtils.CORNER_CHANGE, 1);
    return val === 0 || val === 1 || val === 4 || val === 5;
  }

  changeCornerWidth() {
    const val = this.getNumber(PutWindowUtils.CORNER_CHANGE, 2);
    return val === 0 || val === 2 || val === 4 || val === 6;
  }

  changeCornerFirstTime() {
    const val = this.getNumber(PutWindowUtils.CORNER_CHANGE, 0);
    return val < 4;
  }

  changeCornerNever() {
    return this.getNumber(PutWindowUtils.CORNER_CHANGE, 0) === 3;
  }

  changeCornerBoth() {
    const val = this.getNumber(PutWindowUtils.CORNER_CHANGE, 0);
    return val === 0 || val === 4;
  }

  getNorthHeights() {
    let ret = this._addToArray([], this.getNumber('north-height-0', 50) / 100);
    ret = this._addToArray(ret, this.getNumber('north-height-1', 66) / 100);
    ret = this._addToArray(ret, this.getNumber('north-height-2', 34) / 100);
    return ret;
  }

  getSouthHeights() {
    let ret = this._addToArray([], this.getNumber('south-height-0', 50) / 100);
    ret = this._addToArray(ret, this.getNumber('south-height-1', 34) / 100);
    ret = this._addToArray(ret, this.getNumber('south-height-2', 66) / 100);
    return ret;
  }

  getWestWidths() {
    let ret = this._addToArray([], this.getNumber('left-side-widths-0', 50) / 100);
    ret = this._addToArray(ret, this.getNumber('left-side-widths-1', 34) / 100);
    ret = this._addToArray(ret, this.getNumber('left-side-widths-2', 66) / 100);
    return ret;
  }

  getEastWidths() {
    let ret = this._addToArray([], this.getNumber('right-side-widths-0', 50) / 100);
    ret = this._addToArray(ret, this.getNumber('right-side-widths-1', 66) / 100);
    ret = this._addToArray(ret, this.getNumber('right-side-widths-2', 34) / 100);
    return ret;
  }

  _addToArray(array, value) {
    if (array.indexOf(value) === -1) {
      array.push(value);
    }
    return array;
  }

  getBoolean(name, defaultValue) {
    let ret = defaultValue;
    ret = this._settingsObject.get_boolean(name);
    if (ret === undefined || ret === null) {
      ret = defaultValue;
    }
    return ret === true || ret === 'true' ||  ret === '1' || ret === 1;
  }

  getNumber(name, defaultValue) {
    const ret = this._settingsObject.get_int(name);
    return isNaN(ret) ? defaultValue : ret;
  }

  get_strv(name) {
    return this._settingsObject.get_strv(name);
  }

  set_strv(name, value) {
    this._settingsObject.set_strv(name, value);
  }

  setParameter(name, value) {
    try {
      if (typeof value === 'boolean') {
        this._settingsObject.set_boolean(name, value);
      } else if (isNaN(value)) {
        this._settingsObject.set_string(name, value);
      } else {
        this._settingsObject.set_int(name, value);
      }
    } catch (e) {
      console.log('ERROR: Error setting parameter!', `Can not set config parameter ${name} ${e.message}`);
    }
  }

  getScreen() {
    return global.screen || global.display;
  }

  getWorkspaceManager() {
    return global.screen || global.workspace_manager;
  }

  getMonitorManager() {
    // imported here since prefs.js cannot import Meta
    const Meta = imports.gi.Meta;

    if (global.screen) {
      return global.screen;
    }
    if (Meta.MonitorManager.get) {
      return Meta.MonitorManager.get();
    }
    return global.backend.get_monitor_manager();
  }
}
