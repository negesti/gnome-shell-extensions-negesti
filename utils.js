import Gio from 'gi://Gio';

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
  static ENABLE_MOVE_WORKSPACE = 'enable-move-workspace';
  static INTELLIGENT_CORNER_MOVEMENT = 'intelligent-corner-movement';

  static MOVE_FOCUS_ENABLED = 'move-focus-enabled';
  static MOVE_FOCUS_ANIMATION = 'move-focus-animation';
  
  constructor(settingsObject) {
    this._changeEventListeners = [];
    this._gnomeBindings = null;

    this.loadSettings(settingsObject);


    // locations is a json strings stored in the gschema. -> reload it after the user saved his changes
    this._changeEventListeners.push({
      name: 'locations',
      fn: this.loadSettings.bind(this),
    });

    for (let i = 0; i < this._changeEventListeners.length; i++) {
      this._changeEventListeners[i].handlerId = this._settingsObject.connect(
          `changed::${this._changeEventListeners[i].name}`,
          this._changeEventListeners[i].fn
      );
    }
  }

  getMainSettings() {
    return [
      PutWindowUtils.ALWAYS_USE_WIDTHS,
      PutWindowUtils.ALWAYS_KEEP_WIDTH,
      PutWindowUtils.ALWAYS_KEEP_HEIGHT,
      PutWindowUtils.ENABLE_MOVE_WORKSPACE,
      PutWindowUtils.IGNORE_TOP_PANEL,
      PutWindowUtils.INTELLIGENT_CORNER_MOVEMENT
    ]
  }

  getMoveFocusSettings() {
    return [
      PutWindowUtils.MOVE_FOCUS_ENABLED,
      PutWindowUtils.MOVE_FOCUS_ANIMATION
    ]
  }

  destroy() {
    for (let i = 0; i < this._changeEventListeners.length; i++) {
      this._settingsObject.disconnect(this._changeEventListeners[i].handlerId);
    }
  }

  getSettingsObject() {
    return this._settingsObject;
  }

  loadSettings(settingsObject) {
    this._settingsObject = settingsObject;
    this._settings = {
      locations: JSON.parse(this._settingsObject.get_string('locations')),
    };
  }

  _loadGlobalBindings() {
    this._gnomeBindings = new Gio.Settings({
      settings_schema: Gio.SettingsSchemaSource.get_default().lookup('org.gnome.desktop.wm.keybindings', false),
    });
    this._mutterBindings = new Gio.Settings({
      settings_schema: Gio.SettingsSchemaSource.get_default().lookup('org.gnome.mutter.keybindings', false),
    });
  }

  keyboardBindingExists(key, value) {
    if (this._gnomeBindings == null) {
      this._loadGlobalBindings();
    }

    let bindingSource = 'PutWindow: ';
    // compare with other extension settings
    let keys = this._settingsObject.list_keys();
    for (let i = 0; i < keys.length; i++) {
      // dont compare with our self
      if (keys[i] === key) {
        continue;
      }

      if (keys[i].indexOf('move-') !== 0 && keys[i].indexOf('put-') !== 0) {
        continue;
      }

      if (keys[i].length > 7 && keys[i].substring(-7) === 'enabled') {
        continue;
      }

      if (value === this.get_strv(keys[i])) {
        return bindingSource + keys[i];
      }
    }

    bindingSource = 'GNOME Shell: ';
    keys = this._gnomeBindings.list_keys();
    for (let i = 0; i < keys.length; i++) {
      if (value === this._gnomeBindings.get_strv(keys[i])) {
        return bindingSource + keys[i];
      }
    }

    bindingSource = 'Mutter: ';
    keys = this._mutterBindings.list_keys();
    for (let i = 0; i < keys.length; i++) {
      if (value === this._mutterBindings.get_strv(keys[i])) {
        return bindingSource + keys[i];
      }
    }

    return false;
  }

  saveSettings() {
    try {
      this._settingsObject.set_string('locations', JSON.stringify(this._settings.locations));
    } catch (e) {
      this.logErrorMessage('Error saving settings ', e);
    }
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
    if (name.indexOf('locations') === -1) {
      ret = this._settingsObject.get_boolean(name);
    } else {
      ret = this.getParameter(name);
    }

    return ret === 'true' || ret === true || ret === '1' || ret === 1;
  }

  getNumber(name, defaultValue) {
    if (name.indexOf('locations') === -1) {
      return this._settingsObject.get_int(name);
    }

    return this._toNumber(this.getParameter(name, defaultValue), defaultValue);
  }

  get_strv(name) {
    return this._settingsObject.get_strv(name);
  }

  set_strv(name, value) {
    this._settingsObject.set_strv(name, value);
  }

  getParameter(name, defaultValue) {
    const path = name.split('.');
    const pathLength = path.length;
    let value = this._settings[path[0]];
    try {
      for (let i = 1; i < pathLength; i++) {
        value = value[path[i]];
      }

      return value;
    } catch (e) {
      this.logErrorMessage('Error getting parameter!', `Can not get config by name ${name} defaulting to ${defaultValue}'${e.message}`);
      return defaultValue;
    }
  }

  unsetParameter(name) {
    const path = name.split('.');
    const pathLength = path.length - 1;
    let conf = this._settings[path[0]];

    for (let i = 1; i < pathLength; i++) {
      conf = conf[path[i]];
    }

    if (isNaN(path[pathLength])) {
      // normal object
      delete conf[path[pathLength]];
    } else {
      // an array
      conf.pop(path[pathLength]);
    }
  }

  setParameter(name, value) {
    try {
      if (name.indexOf('locations') === -1) {
        if (isNaN(value)) {
          this._settingsObject.set_string(name, value);
        } else {
          this._settingsObject.set_int(name, value);
        }
        return;
      }

      const path = name.split('.');
      const pathLength = path.length - 1;

      let conf = this._settings;

      for (let i = 0; i < pathLength; i++) {
        if (!conf[path[i]]) {
          conf[path[i]] = {};
        }
        conf = conf[path[i]];
      }

      conf[path[pathLength]] = value;
    } catch (e) {
      this.logErrorMessage('Error setting parameter!', `Can not set config parameter ${name} ${e.message}`);
    }
  }

  _toNumber(value, defaultValue) {
    const valueType = typeof value;

    if (valueType === 'undefined') {
      return defaultValue;
    }

    if (isNaN(defaultValue)) {
      defaultValue = 0;
    }

    return !isNaN(value)
        ? Number(value)
        : defaultValue;
  }

  logErrorMessage(title, message) {
    console.log(`ERROR: ${title} ${message}`);
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
