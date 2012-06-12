const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function Utils() {
  this._init();
}

Utils.prototype = {

  _filename: "",
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
    this.readFile();
  },

  readFile: function() {
    try {
      let file = Me.dir.get_child("putWindow.json");

      if(file.query_exists(null)) {
        [flag, data] = file.load_contents(null);
        if(flag) {
          this._settings = JSON.parse(data);
        } else {
          this.showErrorMessage("Error loading settings!", "Can not read file");
        }
      }
    } catch (e) {
      this.showErrorMessage("Error loading settings!", e.Message);
      this._settings = {};
    }
  },

  saveFile: function() {
    try {
      let file = Me.dir.get_child("putWindow.json");
      file.replace_contents(JSON.stringify(this._settings, null, 2), null, false, 0, null);
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
