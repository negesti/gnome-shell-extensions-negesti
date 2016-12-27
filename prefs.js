const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = new Me.imports.utils.Utils();
const PutWindowLocationWidget = Me.imports.locationWidget.PutWindowLocationWidget;

const Lang = imports.lang;
const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const PutWindowSettingsWidget = new GObject.Class({
  Name: 'PutWindow.Prefs.PutWindowSettingsWidget',
  GTypeName: 'PutWindowSettingsWidget',
  Extends: Gtk.Notebook,

  _init : function(params) {
    this.parent(params);
    this.orientation = Gtk.Orientation.VERTICAL;
    this.hexpand = true;
    this.tab_pos = Gtk.PositionType.LEFT;

    this.append_page(this._generateMainSettings(), new Gtk.Label({label: "<b>Main</b>",
      halign:Gtk.Align.START, margin_top: 0, use_markup: true}));

    this.append_page(this._createPositionSettings(), new Gtk.Label({label: "<b>Width &amp; Height</b>",
      halign:Gtk.Align.START, use_markup: true}));

    this.append_page(this._createKeyboardConfig(), new Gtk.Label({label: "<b>Keyboard Shortcuts</b>",
     halign:Gtk.Align.START, use_markup: true}));

    this.append_page(this._createMoveFocusConfig(), new Gtk.Label({label: "<b>Move Focus</b>",
     halign:Gtk.Align.START, use_markup: true}));

    this.append_page(new PutWindowLocationWidget(), new Gtk.Label({label: "<b>Applications</b>",
     halign:Gtk.Align.START, use_markup: true}));
  },

  _createCornerChangesCombo: function() {
    this._model = new Gtk.ListStore();
    this._model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

    let combo = new Gtk.ComboBox({ model: this._model, halign: Gtk.Align.END});

    let currentValue = Utils.getNumber(Utils.CORNER_CHANGE, 0);

    let values = [
      ["0", "Both"],
      ["1", "Only height"],
      ["2", "Only width"],
      ["3", "Never change size"],
      ["4", "Nothing on first move, both on second"],
      ["5", "Nothing on first move, Only height on second"],
      ["6", "Nothing on first move, Only width on second"]
    ];
    let selectMe = null;
    for (let i=0; i< values.length; i++) {
      let iter = this._model.append();
      this._model.set(iter, [0, 1], values[i]);
      if (values[i][0] == currentValue) {
        selectMe = iter;
      }
    }

    if (selectMe != null) {
      combo.set_active_iter(selectMe);
    }

    let renderer = new Gtk.CellRendererText();
    combo.pack_start(renderer, true);
    combo.add_attribute(renderer, 'text', 1);
    combo.connect("changed", Lang.bind(this,
      function(obj) {
        let[success, iter] = obj.get_active_iter();
        if (!success) {
          return;
        }
        Utils.setParameter(Utils.CORNER_CHANGE, this._model.get_value(iter, 0));
      })
    );
    return combo;
  },

  _addSliders: function(grid, row, labels, configName) {
    for (let i=0; i < labels.length; i++) {
      row++;
      grid.attach(new Gtk.Label({label: labels[i], halign:Gtk.Align.START, margin_left: 15 }), 0, row, 1, 1);
      grid.attach(Utils.createSlider(configName + "-" + i), 1, row, 5, 1);
    }
    return row;
  },

  _generateMainSettings: function() {

    let row = 0;
    let ret = new Gtk.Grid();
    ret.column_homogeneous = true;

    ret.attach(new Gtk.Label({label: "<b>Main settings</b>", halign:Gtk.Align.START, margin_left: 4, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 5, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: "Always use multiple widths/heights:",
      tooltip_text:"Disable this option to move to other screen if possible",
    }), 0, row, 4, 1);

    let alwaysSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    alwaysSwitch.set_active(Utils.getBoolean(Utils.ALWAYS_USE_WIDTHS, false));
    alwaysSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ALWAYS_USE_WIDTHS, obj.get_active()); });    

    ret.attach(alwaysSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: "Enable move to workspace:"
    }), 0, row, 4, 1);

    let workspaceSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    workspaceSwitch.set_active(Utils.getBoolean(Utils.ENABLE_MOVE_WORKSPACE, false));
    workspaceSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ENABLE_MOVE_WORKSPACE, obj.get_active()); });

    ret.attach(workspaceSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: "First maximize then move to center:",
      tooltip_text: "'Move to center' maximizes the current window, and centers maximized windows",
    }), 0, row, 4, 1);

    let centerSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    centerSwitch.set_active(Utils.getBoolean(Utils.REVERSE_MOVE_CENTER, false));
    centerSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.REVERSE_MOVE_CENTER, obj.get_active()); });
    ret.attach(centerSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: "Intelligent corner movement:",
      tooltip_text: "Quite difficult to describe. Enable it and move a window from S to E, ",
    }), 0, row, 4, 1);

    let intelligenCornerSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    intelligenCornerSwitch.set_active(Utils.getBoolean(Utils.INTELLIGENT_CORNER_MOVEMENT, false));
    intelligenCornerSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.INTELLIGENT_CORNER_MOVEMENT, obj.get_active()); });
    ret.attach(intelligenCornerSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: "Keep width when moving north/south:",
      tooltip_text: "Windows will not change their width when moved north or south",
    }), 0, row, 4, 1);

    let intelligenCornerSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    intelligenCornerSwitch.set_active(Utils.getBoolean(Utils.ALWAYS_KEEP_WIDTH, false));
    intelligenCornerSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ALWAYS_KEEP_WIDTH, obj.get_active()); });
    ret.attach(intelligenCornerSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: "Keep height when moving east/west:",
      tooltip_text: "Windows will not change their height when moved east or west",
    }), 0, row, 4, 1);

    let intelligenCornerSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    intelligenCornerSwitch.set_active(Utils.getBoolean(Utils.ALWAYS_KEEP_HEIGHT, false));
    intelligenCornerSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ALWAYS_KEEP_HEIGHT, obj.get_active()); });
    ret.attach(intelligenCornerSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      label: "Moving to corner:",
      margin_left: 10,
      tooltip_text:"Adjust window width and height when moved to corner?",
      halign: Gtk.Align.START
    }), 0, row, 2, 1);

    let combo = this._createCornerChangesCombo();
    ret.attach(combo, 2, row++, 3, 1);

    // ------------------------------------- center ----------------------------------------
    ret.attach(new Gtk.Label({label: "<b>Center Width &amp; Heigth</b>", halign:Gtk.Align.START, margin_left: 4, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 5, 1);
    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: "Keep width when moving north/south:",
      tooltip_text: "Don't change width when moving window from center to north or south.",
    }), 0, row, 4, 1);

    let keepWidthSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    keepWidthSwitch.set_active(Utils.getBoolean(Utils.CENTER_KEEP_WIDTH, false));
    keepWidthSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.CENTER_KEEP_WIDTH, obj.get_active()); });
    ret.attach(keepWidthSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({label: "Width:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(Utils.createSlider(Utils.CENTER_WIDTH), 1, row++, 4, 1);
    ret.attach(new Gtk.Label({label: "Height:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(Utils.createSlider(Utils.CENTER_HEIGHT), 1, row++, 4, 1);

    return ret;
  },

  _createPositionSettings: function() {
    let row = 0;
    let positions = new Gtk.Grid();
    positions.column_homogeneous = true;


    let description = new Gtk.Label({
      halign: Gtk.Align.START,
      margin_top: 4,
      margin_left: 4,
      label: "You can define up to three sizes that will be used when you move a window to the same direction " +
      "multiple times. Equal values are ignored."
    });
    description.set_line_wrap(true);
    positions.attach(description, 0, row++, 6, 1);

    let labels = ["First:", "Second: ", "Third:"];
    // ------------------------------------- north ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>North height</b>", halign:Gtk.Align.START, margin_left: 4, margin_top: 4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, "north-height");
    row++;

    // ------------------------------------- south ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>South height</b>", halign:Gtk.Align.START, margin_left:4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, "south-height");
    row++;


    // ------------------------------------- east ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>East width</b>", halign:Gtk.Align.START, margin_left:4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, "right-side-widths");
    row++;

    // ------------------------------------- west ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>West width</b>", halign:Gtk.Align.START, margin_left:4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    this._addSliders(positions, row, labels, "left-side-widths");

    let scroll = new Gtk.ScrolledWindow({ vexpand: true, hexpand: true });
    scroll.add_with_viewport(positions);

    return scroll;
  },

  _createKeyboardConfig: function() {
    return this._createBindingList({
      "put-to-corner-ne": "Move to top right corner",
      "put-to-corner-nw": "Move to top left corner",
      "put-to-corner-se": "Move to bottom right corner",
      "put-to-corner-sw": "Move to bottom left corner",
      "put-to-side-n": "Move to top",
      "put-to-side-e": "Move right",
      "put-to-side-s": "Move to bottom",
      "put-to-side-w": "Move to left",
      "put-to-center": "Move to center/maximize",
      "put-to-location": "Move to configured location",
      "put-to-left-screen": "Move to the left screen",
      "put-to-right-screen": "Move to the right screen",
    });
  },

  _createMoveFocusConfig: function() {

    let row = 0;
    let ret = new Gtk.Grid();
    ret.column_homogeneous = true;

    let description = new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 4,
      label: "'Move Focus' allows you to change the focus based on the relative location of the current focussed window using the keyboard and to push the currently focused window into the background to get the focus to the windows below."
    });
    description.set_line_wrap(true);
    ret.attach(description, 0, row++, 5, 1);
    
    let labels = [
      "Enable 'Move focus'",
      "Show animation when moving",
      "Enable cycle through windows at the same postition",
      "Enable focus the window that's north of the current",
      "Enable focus the window that's east of the current",
      "Enable focus the window that's south of the current",
      "Enable focus the window that's west of the current",
      "Enable move the focus to the left screen",
      "Enable move the focus to the right screen"
    ];

    let configNames = [
    Utils.MOVE_FOCUS_ENABLED,
    Utils.MOVE_FOCUS_ANIMATION,
      "move-focus-cycle-enabled",
      "move-focus-north-enabled",
      "move-focus-east-enabled",
      "move-focus-south-enabled",
      "move-focus-west-enabled",
      "move-focus-left-screen-enabled",
      "move-focus-right-screen-enabled",
    ];

    for (let i=0; i<labels.length; i++) {
      ret.attach(new Gtk.Label({
        halign: Gtk.Align.START,
        margin_left: 4,
        label: labels[i] + ":"
      }), 0, row, 4, 1);

      let enabledSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END, vexpand: false});
      enabledSwitch.set_active(Utils.getBoolean(configNames[i], true));

      enabledSwitch.connect("notify::active", Lang.bind(
        {configName: configNames[i]}, // funny scope, but works :)
        function(obj) {
          Utils.setParameter(this.configName, obj.get_active());
        }));
      ret.attach(enabledSwitch, 4, row++, 1, 1);  
    }
    
    
    ret.attach(new Gtk.Label({label: "<b>Keyboard bindings</b>", halign:Gtk.Align.START, margin_left: 4, margin_top: 5, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_left: 4, margin_top: 4, margin_bottom: 4}), 0, row++, 5, 1);

    let keyBinding = this._createBindingList({
      "move-focus-north": "Move the window focus up",
      "move-focus-east": "Move the window focus right",
      "move-focus-south": "Move the window focus down",
      "move-focus-west": "Move the window focus left",
      "move-focus-cycle": "Push focused window to the background",
      "move-focus-left-screen": "Move the focus to the left screen",
      "move-focus-right-screen": "Move the focus to the right screen"
    });
    ret.attach(keyBinding, 0, row, 5, 1);

    return ret;
  },

  _createBindingList: function(bindings) {

    let name, model = new Gtk.ListStore();

    model.set_column_types([
      GObject.TYPE_BOOLEAN,
      GObject.TYPE_STRING,
      GObject.TYPE_STRING,
      GObject.TYPE_INT,
      GObject.TYPE_INT
      ]);

    for (name in bindings) {
      let enabled = Utils.getBoolean(name + "-enabled");
      
      if (!enabled) {
        Utils.set_strv(name, []);
      }


      let key, mods;
      let binding = Utils.get_strv(name, null)[0];
      if (enabled && binding) {
        [key, mods] = Gtk.accelerator_parse(binding);
      } else {
        [key, mods] = [0,0];
      }

      let row = model.insert(10);
      model.set(row, [0, 1, 2, 3, 4], [enabled, name, bindings[name], mods, key ]);
    }

    let treeview = new Gtk.TreeView({
      'expand': true,
      'model': model,
      'margin': 4
    });

    // enabled column
    let cellrend = new Gtk.CellRendererToggle({'radio': false, 'activatable': true});
    let col = new Gtk.TreeViewColumn({ 'title': 'Enabled', 'expand': false});
    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'active', 0);

    cellrend.connect("toggled", function(toggle, iter) {
      let [succ, iterator ] = model.get_iter_from_string(iter);
      var value = !model.get_value(iterator, 0);
      model.set(iterator, [0], [value]);
      toggle.set_active(value);

      let name = model.get_value(iterator, 1);
      Utils.setParameter(name + "-enabled", value ? 1 : 0);
        // disable the keybinding
        if (!value) {
          model.set(iterator, [3, 4], [0, 0]);
        }
      });

    treeview.append_column(col);


    // Action column
    cellrend = new Gtk.CellRendererText();
    col = new Gtk.TreeViewColumn({ 'title': 'Action', 'expand': true});
    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'text', 2);
    treeview.append_column(col);

    // keybinding column
    cellrend = new Gtk.CellRendererAccel({
      'editable': true,
      'accel-mode': Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect('accel-edited', function(rend, iter, key, mods) {
      let value = Gtk.accelerator_name(key, mods);
      let [succ, iterator ] = model.get_iter_from_string(iter);

      if(!succ) {
        throw new Error("Error updating Keybinding");
      }

      let name = model.get_value(iterator, 1);
      let existingBinding = Utils.keyboardBindingExists(name, value);
      if (existingBinding) {
        var md = new Gtk.MessageDialog({
          modal: true,
          message_type: Gtk.MessageType.WARNING,
          buttons: Gtk.ButtonsType.OK,
          title: "Keyboard binding alread defined",
          text: "The binding is alread used by " + existingBinding
        });

        md.run();
        md.destroy();
        return;
      }
      
      // set the active flag
      Utils.setParameter(name + "-enabled",1);
      model.set(iterator, [0], [true]);

      model.set(iterator, [ 3, 4], [ mods, key ]);
      Utils.set_strv(name, [value]);
    });
    cellrend.connect('accel-cleared', function(rend, iter, key, mods) {
      let [succ, iterator] = model.get_iter_from_string(iter);

      if (!succ) {
        throw new Error("Error clearing keybinding");
      }
      let name = model.get_value(iterator, 1);

        // set the active flag
        Utils.setParameter(name + "-enabled",0);
        model.set(iterator, [0], [false]);

        model.set(iterator, [3, 4], [0, 0]);
        Utils.set_strv(name, []);
      });

    col = new Gtk.TreeViewColumn({'title': 'Modify'});

    col.pack_end(cellrend, false);
    col.add_attribute(cellrend, 'accel-mods', 3);
    col.add_attribute(cellrend, 'accel-key', 4);

    treeview.append_column(col);

    return treeview;
  }

});


function init() {
}

function buildPrefsWidget() {
  let widget = new PutWindowSettingsWidget();
  widget.show_all();
  return widget;
};
