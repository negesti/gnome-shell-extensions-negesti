
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function Utils() {
  this._init();
}

Utils.prototype = {

  _filename: "",
  _settingsObject: { },
  _settings: "",

  CENTER_WIDTH: "centerWidth",
  CENTER_HEIGHT: "centerHeight",
  SIDE_WIDTH: "sideWidth",
  SIDE_HEIGHT: "sideHeight",

  START_CONFIG: {
    autoMove: false,
    positions: [{
      x: 0,
      y: 0,
      width: 50,
      height: 50
    }]
  },

  _init: function() {
    this.loadSettings();
  },

  getSettingsObject: function() {
    return this._settingsObject;
  },

  loadSettings: function() {
    global.log("loadSettings");
    let schema = Me.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    let schemaDir = Me.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null)) {
      schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
    } else {
      schemaSource = GioSSS.get_default();
    }

    let schema = schemaSource.lookup(schema, true);
    if (!schema) {
        throw new Error('Schema ' + schema + ' could not be found for extension '
                        + Me.metadata.uuid + '. Please check your installation.');
    }

    this._settingsObject = new Gio.Settings({ settings_schema: schema });
    this._settings = {
      centerWidth: this._settingsObject.get_int("center-width"),
      centerHeight: this._settingsObject.get_int("center-height"),
      sideWidth: this._settingsObject.get_int("side-width"),
      sideHeight: this._settingsObject.get_int("side-height"),
      locations: JSON.parse(this._settingsObject.get_string("locations"))
    };
  },

  saveSettings: function() {
    try {
      this._settingsObject.set_int("center-width", this.getParameter(this.CENTER_WIDTH));
      this._settingsObject.set_int("center-height", this.getParameter(this.CENTER_HEIGHT));
      this._settingsObject.set_int("side-width", this.getParameter(this.SIDE_WIDTH));
      this._settingsObject.set_int("side-height", this.getParameter(this.SIDE_HEIGHT));
      this._settingsObject.set_string("locations", JSON.stringify(this._settings.locations));
      this.showMessage("Success!", "Changes successfully saved");
    } catch (e) {
      this.showErrorMessage("Error saving settings ", e);
    }
  },

  getBoolean: function(name, defaultValue) {
    let ret = this.getParameter(name, defaultValue);
    return ret == "true" || ret == "1";
  },

  getNumber: function(name, defaultValue) {
    return this._toNumber(this.getParameter(name, defaultValue), defaultValue);
  },

  get_strv: function(name) {
    return this._settingsObject.get_strv(name);
  },

  set_strv: function(name, value) {
    this._settingsObject.set_strv(name, value);
  },

  getParameter: function(name, defaultValue) {
    try {
      let path = name.split("."),
      value = this._settings[path[0]],
      pathLength = path.length;

      for (let i=1; i < pathLength; i++) {
          value = value[path[i]];
      }

      return value;
    } catch (e) {
      this.showErrorMessage("Error getting parameter!", "Can not get config by name " + name + " defaulting to " + defaultValue + "'" + e.message);
      return defaultValue;
    }
  },

  unsetParameter: function(name) {
    let path = name.split("."),
      conf = this._settings[path[0]],
      pathLength = path.length - 1;

    for (let i=1; i < pathLength; i++) {
      conf = conf[path[i]];
    }

    if (isNaN(path[pathLength])) {
      // normal object
      delete conf[ path[pathLength] ];
    } else {

      // an array
      conf.pop(path[pathLength]);
    }
  },

  setParameter: function(name, value) {
    try {
      let path = name.split("."),
        conf = this._settings,
        pathLength = path.length - 1;

      for (let i=0; i < pathLength; i++) {
        if (!conf[path[i]]) {
          conf[path[i]] = {};
        }
        conf = conf[path[i]];
      }

      conf[ path[pathLength] ] = value;

    } catch (e) {
      this.showErrorMessage("Error setting parameter!", "Can not set config parameter " + name);
    }
  },

  _toNumber: function(value, defaultValue) {
    let valueType = typeof(value);

    if (valueType == "undefined") {
      return defaultValue;
    }

    if (isNaN(defaultValue)) {
      defaultValue = 0;
    }

    return !isNaN(value)
      ? new Number(value)
      : defaultValue;
  },

  showMessage: function(title, message) {
    var md = new Gtk.MessageDialog({
      modal:true,
      message_type: Gtk.MessageType.INFO,
      buttons:Gtk. ButtonsType.OK,
      title: title,
      text: " " + message
    });

    md.run();
    md.destroy();
  },

  showErrorMessage: function(title, message) {
    global.log("ERROR: " + title + " " + message);
  }
};
