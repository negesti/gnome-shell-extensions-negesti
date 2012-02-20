
const Gettext = imports.gettext;
const _ = Gettext.gettext;

const Lang = imports.lang;

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Params = imports.misc.params;

const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray
const ModalDialog = imports.ui.modalDialog;

function SettingsWindow(fileName) {
  this._init(fileName);
}

SettingsWindow.prototype = {
  __proto__: ModalDialog.ModalDialog.prototype,

  _isOpen: false,

  _startConfig: {
    autoMove: false,
    positions: [{
      x: 0,
      y: 0,
      width: 50,
      height: 50
    }]
  },

  _screenItems: [[0, "Screen 1"], [1, "Screen 2"]],

  _init: function(fileName) {
    this._fileName = fileName;
    this._settings = this._readFile();

    this._dock = {};
    this._primary = true;

    ModalDialog.ModalDialog.prototype._init.call(this, {styleClass: "put-window-settings-dialog", shellReactive: true});

    this._mainBox = new St.BoxLayout({
      style_class: "put-window-main-layout",
      vertical: true
    });
    this.contentLayout.add(this._mainBox, {
      x_fill: true,
      y_fill: true
    });

    let headline = new St.Label({
      style_class: "put-window-headline",
      text: _("PutWindow Configuration")
    });

    this._mainBox.add(headline, {
      y_align: St.Align.START,
      y_fill: true,
      x_fill: true
    });

    this._initMenu();

    this.setButtons([{
        label: _("Save"),
        action: Lang.bind(this, function() {
          this._saveFile(this._settings);
        })
      }, {
        label: _("Close"),
        action: Lang.bind(this, function() {
          this._isOpen = false;
          this.close();
        })
      }, {
        label: _("Cancel"),
        key: Clutter.Escape,
        action: Lang.bind(this, function() {
          // restore the old config
          this._settings = this._readFile();
          this._recreateMenu();
          this._isOpen = false;
          this.close();
        })
      }
    ]);
  },

  _initMenu: function() {
    this._menu = new PopupMenu.PopupMenu(this._mainBox);
    // menuItems are drawn outside of the border if .popup-menu-boxpointer is used
    this._menu.actor.style_class = "put-window-menu-container";

    this._menu.addMenuItem(this._createAddButton());
    this._menu.addMenuItem(this._createDeleteButton());
    this._menu.addMenuItem(this._mainSettings());

    this._appSection = new PopupMenu.PopupMenuSection();
    if (typeof(this._settings["locations"]) != "undefined") {
      let apps = Object.getOwnPropertyNames(this.getParameter("locations")),
        appsLength = apps.length;
      for(let i=0; i< appsLength; i++) {
        this._appSection.addMenuItem(this._createAppSetting(apps[i], this._settings["locations"][apps[i]]));
      }
    }
    this._menu.addMenuItem(this._appSection);
    this._mainBox.add(this._menu.actor, {span: 1, expand: true, align: St.Align.START});
  },

  // after the user clicked cancel, remove the PopupMenu (not the header) from the mainBox and recreate them
  _recreateMenu: function() {
    this._mainBox.remove_actor(this._menu.actor);
    this._menu.destroy();
    this._initMenu();
  },

  toggle: function() {
    this._updateAddButtonCombo();

    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
    this._isOpen = !this._isOpen;
  },

  _readFile: function() {
    let ret = {};

    try {
      let file = Gio.file_new_for_path(this._fileName);

      if(file.query_exists(null)) {
        [flag, data] = file.load_contents(null);
        if(flag) {
          ret = JSON.parse(data);
        } else {
          Main.notifyError("Error loading settings");
        }
      }
    } catch (e) {
      Main.notifyError("Error loading settings " + e);
      ret = {};
    }

    return ret;
  },

  _saveFile: function(data) {
    try {
      let file = Gio.file_new_for_path(this._fileName);
      file.replace_contents(JSON.stringify(data), null, false, 0, null);
      Main.notify(_("Saved!"), _("Your changes have been successfully saved"));
    } catch (e) {
      Main.notifyError("Error saving settings " + e);
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
      global.log("PutWindow.getParameter: Error getting config "+ name + " defaulting to " + defaultValue + "'" + e.message);
      return defaultValue;
    }
  },

  _unsetParameter: function(name) {
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
      global.log("PutWindow.setParameter: " + e.message);
      Main.notifyError(_("Error setting config '%s'").format(name), e.message);
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

  _createSlider: function(configName, txt, min, max) {
    min = this._toNumber(min, 0);
    max = this._toNumber(max, 100);

    let value = this.getNumber(configName, (max-min)/2);

    let getDisplayValue = function(realValue, min, max) {
      if (realValue < min) {
        return min;
      } else if (realValue > max) {
        return max;
      }

      return Math.round(realValue);
    };

    let valueLabel = new St.Label({ text: "" + value, style_class: "popup-menu-item" });

    let slider = new PopupMenu.PopupSliderMenuItem( (value/100) );
    slider.actor.add_style_class_name("padding-5");
    slider.connect("value-changed",
      Lang.bind(this, function(slider, newValue) {
        value = getDisplayValue((newValue*100));
        valueLabel.set_text(("" + value));
      })
    );

    slider.connect("drag-end",
      Lang.bind(this, function() {
        this.setParameter(configName, value);
      })
    );

    let section = new PopupMenu.PopupMenuSection({reactive: false}),
      box = new St.BoxLayout({ vertical: false, style_class: "padding-horizontal-5" });

    let label = new St.Label({ text: txt, reactive: false, style_class: "popup-menu-item" });

    box.add(label, {span: 3, expand: true});
    box.add(valueLabel, {span: 1});
    box.add(slider.actor, {span: 3, align: St.Align.END});
    section.addActor(box);

    return section;
  },

  _createSwitch: function(configName, txt) {
    let active = this.getBoolean(configName, false);
    let btn = new PopupMenu.PopupSwitchMenuItem(txt, active);
    btn.connect('activate',
      Lang.bind(this, function(){
        this.setParameter(configName, btn.state)
      })
    );

    let section = new PopupMenu.PopupMenuSection({reactive: false}),
      box = new St.BoxLayout({ vertical: false, style_class: "padding-horizontal-5" });
    box.add(btn.actor, {expand: true, align: St.Align.END});
    section.addActor(box);

    return section;
  },

  _createCombo: function(configName, txt, items) {
    let value = this.getNumber(configName, 0);

    let combo = new PopupMenu.PopupComboBoxMenuItem({});

    items.forEach(function(opt) {
      let item = new PopupMenu.PopupMenuItem(""+opt[1]);
      combo.addMenuItem(item, opt[0]);
    });
    combo.setActiveItem(value);
    combo.connect("active-item-changed",
      Lang.bind(this, function(menuItem, id) {
        log("combo changed "+ configName + "id: "+ id);
        this.setParameter(configName, id);
      })
    );

    let section = new PopupMenu.PopupMenuSection(),
       box = new St.BoxLayout({ vertical: false, style_class: "padding-horizontal-5" }),
       label = new St.Label({ text:txt, reactive: true, style_class: "popup-menu-item"});

    box.add(label, {span: 4, expand: true});
    box.add(combo.actor, {span: 3, align: St.Align.END});
    section.addActor(box);

    return section;
  },

  _getConfiguredApps: function() {
    return Object.getOwnPropertyNames(this.getParameter("locations"));
  },

  _getRunningApps: function(exclude) {
    if (!this._appSystem) {
      this._appSystem = Shell.AppSystem.get_default();
    }

    let exludeLength = exclude.length;
    let apps = this._appSystem.get_running();
    let ret = [];

    for (let i=0; i < apps.length; i++) {
      let wm =  apps[i].get_windows()[0].get_wm_class(),
        found = false;
      // dont add excluded entries to the returned value
      for (let j=0; j < exludeLength; j++) {
        if (exclude[j] == wm) {
          found = true;
          break;
        }
      }

      if (!found) {
        ret.push( [ret.length, wm]);
      }
    }
    return ret;
  },

  _updateAddButtonCombo: function() {
    let items = this._getRunningApps(this._getConfiguredApps());
    for (let i=0; i<items.length; i++) {
      this._addApplicationItem.addComboItem(items[i]);
    }
    this._addApplicationItem.setSelectedItem('All');
  },

  _createAddButton: function() {
    //AppSystem has no running apps at startup -> only add "All")
    let items = []
    if (!this.getParameter("locations.All")) {
      items.push([0, "All"]);
    }

    let fn = Lang.bind(this,
      function() {
        let item = this._addApplicationItem.getSelectedItem(),
          configPath = "locations." + item[1];
        log(item)
        this.setParameter(configPath, this._startConfig);
        let newApp = this._createAppSetting(item[1], this.getParameter(configPath));
        this._appSection.addMenuItem(newApp);
        newApp.openAccordion(true);

        this._addApplicationItem.setSelectedItem('All');
        this._deleteApplicationItem.addComboItem(item);
        this._deleteApplicationItem.setSelectedItem(item);
        this._addApplicationItem.removeComboItem(item);
      }
    );

    this._addApplicationItem = new ComboButtonItem(_("Add Application"), { items: items, selectedValue: 'All', buttonClicked: fn} );

    return this._addApplicationItem;
  },

  _getAppMenuByName: function(name) {
    let menus = this._appSection._getMenuItems(),
      menuLength = menus.length;

    for (let i=0; i< menuLength; i++) {
      if (menus[i].name == name) {
        return menus[i];
      }
    }
    return null;
  },

  _createDeleteButton: function() {

    let apps = this._getConfiguredApps();
    let items = [ [0, 'Select'] ];

    for (let i = 1; i <= apps.length; i++) {
      items[i] = [i, apps[ (i-1) ] ];
    }

    let fn = Lang.bind(this,
      function() {
        let item = this._deleteApplicationItem.getSelectedItem();
        if (item == "Select" || item[1] == "Select") {
          return;
        }

        let menu = this._getAppMenuByName(item[1]);

        if (menu!=null) {
          this._unsetParameter("locations."+item[1]);
          menu.closeAccordion(false);
          this._appSection.actor.remove_actor(menu.actor);
          this._deleteApplicationItem.setSelectedItem('Select');
          this._deleteApplicationItem.removeComboItem(item);
          this._addApplicationItem.addComboItem(item);
          this._addApplicationItem.setSelectedItem(item);
        }else {
          Main.notifyError("Error removing Application config for "+ item[1]);
        }
      }
    );

    this._deleteApplicationItem =  new ComboButtonItem(_("Delete Application"), { items: items, selectedValue: 'Select', buttonClicked: fn} );

    return this._deleteApplicationItem;
  },

  _mainSettings: function() {

    let menu = new Accordion("Common Settings");
    let items = [ [0, _("Usermenu")], [1, _("Panel")] ];

    menu.menu.addMenuItem(this._createCombo("panelButtonPosition", _("Settings Button"), items));
    menu.menu.addMenuItem(this._createSlider("centerWidth", _("Center width"), 0, 100));
    menu.menu.addMenuItem(this._createSlider("centerHeight", _("Center height"), 0, 100));
    menu.menu.addMenuItem(this._createSlider("sideWidth", _("Side/Corner width"), 0, 100));
    menu.menu.addMenuItem(this._createSlider("sideHeight", _("Side/Corner height"), 0, 100));
    return menu;
  },

  _createAppSetting: function(name, config) {
    let menu = new Accordion(name);

    let prefix = "locations." + name + ".";
    menu.menu.addMenuItem(this._createSwitch(prefix + "autoMove", _("Move on create")));

    let positions = this.getParameter(prefix + "positions");
    for (let i=0; i< positions.length; i++) {
      let section = this._createPositionSection(name, prefix, i);
      menu.menu.addMenuItem(section);
    }
    return menu;
  },

  _createPositionSection: function(appName, configLocation, index) {
    let header = new PopupMenu.PopupMenuItem((index+1) + ". Position", {reactive: false});

    let buttonContainer = new St.BoxLayout();

    // first location may not be deleted
    if (index > 0) {
      let deleteBtn = new St.Button ({ label: _('-'), style_class: 'put-window-button' });
      deleteBtn.add_style_class_name("put-window-add-button");
      deleteBtn.connect("clicked",
        Lang.bind(this, function() {
          section.actor.get_parent().remove_actor(section.actor);
          let deleteMe = configLocation + "positions." + index;
          this._unsetParameter(deleteMe);

        })
      );
      buttonContainer.add(deleteBtn, {x_align: St.Align.END})
    }

    let addBtn = new St.Button ({ label: _('+'), style_class: 'put-window-button' });
    addBtn.add_style_class_name("put-window-add-button");
    addBtn.connect("clicked",
      Lang.bind(this, function() {
        let parent = this._getAppMenuByName(appName),
          length = this.getParameter(configLocation + "positions", []).length;

        // ensure the new location is writen to the config
        let newApp = configLocation + "positions." + length;
        this.setParameter(newApp, this._startConfig.positions[0]);

        parent.menu.addMenuItem(this._createPositionSection(appName, configLocation, length));
      })
    );
    buttonContainer.add(addBtn, {x_align: St.Align.END})
    header.addActor(buttonContainer, {expand: true, span: -1, align: St.Align.END});

    let section = new PopupMenu.PopupMenuSection(),
      loc =  configLocation + "positions." + index +".";

    section.addMenuItem(header);
    section.addMenuItem(this._createCombo(loc+ "screen", _("Screen"), this._screenItems));
    section.addMenuItem(this._createSlider(loc + "width", _("Width"), 0, 100));
    section.addMenuItem(this._createSlider(loc + "height", _("Height"), 0, 100));
    section.addMenuItem(this._createSlider(loc + "x", _("X-Postion"), 0, 100));
    section.addMenuItem(this._createSlider(loc + "y", _("Y-Position"), 0, 100));
    return section;
  }
};

function ComboButtonItem() {
  this._init.apply(this, arguments);
}

ComboButtonItem.prototype = {
  __proto__: PopupMenu.PopupBaseMenuItem.prototype,

  _init: function(text, params) {

    // fill with fallback params
    params = Params.parse(params, {
      reactive: false,
      activate: true,
      hover: true,
      sensitive: true,
      style_class: null,
      items: [[0, "nothing defined"]],
      selectedValue: 0,
      buttonClicked: function(btn) {}
    });

    // delete params PopupBaseMenuItem can not handle
    this._items = params.items;
    delete params.items;

    let buttonClicked = params.buttonClicked;
    delete params.buttonClicked;

    let selectedValue = params.selectedValue;
    delete params.selectedValue;

    // call _init on BaseMenuItem
    PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

    this._combo = new PopupMenu.PopupComboBoxMenuItem( {} );

    for (let i = 0; i<this._items.length; i++) {
      this._combo.addMenuItem(new PopupMenu.PopupMenuItem( this._items[i][1] ), this._items[i][0]);
    }

    this.setSelectedItem(selectedValue);

    this._combo.connect("active-item-changed",
      Lang.bind(this, function(menuItem, id) {
        this._selectedItem = this._items[id];
      })
    );

    this.addActor(this._combo.actor, {span: 6, expand: true, align: St.Align.START} );

    let button = new St.Button ({ label: text, style_class: 'put-window-button' });
    button.connect("clicked", Lang.bind(this, buttonClicked));
    this.addActor(button, {span: -1, expand: true, align: St.Align.END} );
  },

  removeComboItem: function(value) {
    let hideIndex = this.getValueIndex(value[1]);
    this._combo.setItemVisible(hideIndex, false);
  },

  addComboItem: function(value) {
    let alreadExistsIndex = this.getValueIndex(value[1]);
    if (alreadExistsIndex>-1) {
      this._combo.setItemVisible(alreadExistsIndex, true);
    } else {
      value[0] = this._items.length;
      this._items.push(value);
      let newItem = new PopupMenu.PopupMenuItem(value[1]);
      this._combo.addMenuItem(newItem, value[0]);
      this._combo.setActiveItem(value[0]);
    }
  },

  getSelectedItem: function() {
    return this._selectedItem;
  },

  getValueIndex: function(value) {
    for (let i=0; i<this._items.length; i++) {
      if (this._items[i][1] == value) {
        return i;
      }
    }
    return -1;
  },

  setSelectedItem: function(value) {
    this._selectedItem = value;
    this._combo.setActiveItem(this.getValueIndex(value));
  }
};

// A PopupSubMenuItem that only open/close when the label is clicked e.g. overwrite
// the keyPressEvents with empty function and replace the label with a button
// TODO: style
function Accordion() {
   this._init.apply(this, arguments);
}

Accordion.prototype = {
  __proto__: PopupMenu.PopupSubMenuMenuItem.prototype,

  _init: function(text) {
    PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {reactive: true, activate:true, style_class: "popup-sub-menu"});
    this.name = text;

    this.label = new St.Label({text: text});

    this.addActor(this.label);
    this._triangle = new St.Label({ text: '\u25B8' });
    this.addActor(this._triangle, { align: St.Align.END });

    this.menu = new AccordionContent(this.actor, this._triangle);
  },

  openAccordion: function(animate) {
    this.menu.openAccordion(animate);
  },

  closeAccordion: function(animate) {
    this.menu.closeAccordion(animate);
  },

  //do nothing
  close: function(animate) { },

  open: function(animate) { },

  // toggle AccordionContent
  _onButtonReleaseEvent: function(actor, event) {
    this.menu.toggle();
  },

  // call open/close Accordion not the normal open/close
  _onKeyPressEvent: function(actor, event) {
    let symbol = event.get_key_symbol();
    if (symbol == Clutter.KEY_Right) {
        this.menu.openAccordion(true);
        this.menu.actor.navigate_focus(null, Gtk.DirectionType.DOWN, false);
        return true;
    } else if (symbol == Clutter.KEY_Left && this.menu.isOpen) {
        this.menu.closeAccordion(true);
        return true;
    }

    return PopupMenu.PopupBaseMenuItem.prototype._onKeyPressEvent.call(this, actor, event);
  }
} // Accordion


// a PopupSubMenu that open/close if the header is clicked,
// clicking the content has no effect
function AccordionContent() {
  this._init.apply(this, arguments);
}

AccordionContent.prototype = {
  __proto__: PopupMenu.PopupSubMenu.prototype,

  toggle: function() {
    if (this.isOpen) {
      this.closeAccordion(true);
    } else {
      this.openAccordion(true);
    }
  },

  openAccordion: function(animate) {
    PopupMenu.PopupSubMenu.prototype.open.call(this, animate);
  },

  closeAccordion: function(animate) {
    PopupMenu.PopupSubMenu.prototype.close.call(this, animate);
  },

  // called by Parent and would open on content click.
  open: function(animate) { },

  // called by Parent and would close on content click.
  close: function(animate) { },

  _onKeyPressEvent: function(actor, event) {
    return true;
  }
} // AccordionContent
