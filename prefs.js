const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;

const Gdk = imports.gi.Gdk;
const Wnck = imports.gi.Wnck;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Convenience = Me.imports.convenience;
const Utils = new Me.imports.utils.Utils();

const Lang = imports.lang;

const _ = imports.gettext.domain(Me.metadata['gettext-domain']).gettext;

let createSlider = function(configName) {
  let ret = new Gtk.Scale({digits: 0, sensitive: true, orientation: Gtk.Orientation.HORIZONTAL, margin_right: 6, margin_left: 6});
  ret.set_range(0, 100);
  ret.set_value(Utils.getNumber(configName, 50));
  ret.set_value_pos(Gtk.PositionType.RIGHT);
  ret.connect("value-changed", function(obj, userData) {
    Utils.setParameter(configName, obj.get_value());
  });
  return ret;
};

const PutWindowSettingsWidget = new GObject.Class({
  Name: 'PutWindow.Prefs.PutWindowSettingsWidget',
  GTypeName: 'PutWindowSettingsWidget',
  Extends: Gtk.Notebook,

  _init : function(params) {
    this.parent(params);
    this.orientation = Gtk.Orientation.VERTICAL;
    this.hexpand = true;
    this.tab_pos = Gtk.PositionType.LEFT;

    this.append_page(this._generateMainSettings(), new Gtk.Label({label: "<b>" + _("Main") + "</b>",
      halign:Gtk.Align.START, margin_top: 0, use_markup: true}));

    this.append_page(this._createPositionSettings(), new Gtk.Label({label: "<b>" + _("Width &amp; Height") + "</b>",
      halign:Gtk.Align.START, use_markup: true}));

    this.append_page(this._createKeyboardConfig(), new Gtk.Label({label: "<b>" + _("Keyboard Shortcuts") + "</b>",
     halign:Gtk.Align.START, use_markup: true}));

    this.append_page(this._createMoveFocusConfig(), new Gtk.Label({label: "<b>" + _("Move Focus") + "</b>",
     halign:Gtk.Align.START, use_markup: true}));

    this.append_page(new PutWindowLocationWidget(), new Gtk.Label({label: "<b>" + _("Applications") + "</b>",
     halign:Gtk.Align.START, use_markup: true}));
  },

  _createCornerChangesCombo: function() {
    this._model = new Gtk.ListStore();
    this._model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

    let combo = new Gtk.ComboBox({ model: this._model, halign: Gtk.Align.END});

    let currentValue = Utils.getNumber(Utils.CORNER_CHANGE, 0);

    let values = [
      ["0", _("Both")],
      ["1", _("Only height")],
      ["2", _("Only width")],
      ["3", _("Never change size")],
      ["4", _("Nothing on first move, both on second")],
      ["5", _("Nothing on first move, Only height on second")],
      ["6", _("Nothing on first move, Only width on second")]
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
      grid.attach(createSlider(configName + "-" + i), 1, row, 5, 1);
    }
    return row;
  },

  _generateMainSettings: function() {

    let row = 0;
    let ret = new Gtk.Grid();
    ret.column_homogeneous = true;

    ret.attach(new Gtk.Label({label: "<b>" + _("Main settings") + "</b>", halign:Gtk.Align.START, margin_left: 4, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 5, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Keep window on current screen:"),
      tooltip_text: _("Disable this option to move to other screen if possible"),
    }), 0, row, 4, 1);

    let alwaysSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    alwaysSwitch.set_active(Utils.getBoolean(Utils.ALWAYS_USE_WIDTHS, false));
    alwaysSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ALWAYS_USE_WIDTHS, obj.get_active()); });

    ret.attach(alwaysSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Enable move to workspace:")
    }), 0, row, 4, 1);

    let workspaceSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    workspaceSwitch.set_active(Utils.getBoolean(Utils.ENABLE_MOVE_WORKSPACE, false));
    workspaceSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ENABLE_MOVE_WORKSPACE, obj.get_active()); });

    ret.attach(workspaceSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Move to center maximizes and restores initial window size (first w/h only):"),
      tooltip_text: _("Maximize the window on first move and restore original size and position on second. Only works with first width/height")
    }), 0, row, 4, 1);

    let centerToggleSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END });
    centerToggleSwitch.set_active(Utils.getBoolean(Utils.MOVE_CENTER_ONLY_TOGGLES, false));
    centerToggleSwitch.connect("notify::active", function(obj) {
      Utils.setParameter(Utils.MOVE_CENTER_ONLY_TOGGLES, obj.get_active());
    });
    ret.attach(centerToggleSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Always ignore top panel:"),
      tooltip_text: _("Enable this if you use an extension to hide the top panel")
    }), 0, row, 4, 1);

    let ignoreTopPanelSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END });
    ignoreTopPanelSwitch.set_active(Utils.getBoolean(Utils.IGNORE_TOP_PANEL, false));
    ignoreTopPanelSwitch.connect("notify::active", function(obj) {
      Utils.setParameter(Utils.IGNORE_TOP_PANEL, obj.get_active());
    });
    ret.attach(ignoreTopPanelSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Intelligent corner movement:"),
      tooltip_text: _("Moving from E to S moves to SE not S"),
    }), 0, row, 4, 1);

    let intelligentCornerSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    intelligentCornerSwitch.set_active(Utils.getBoolean(Utils.INTELLIGENT_CORNER_MOVEMENT, false));
    intelligentCornerSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.INTELLIGENT_CORNER_MOVEMENT, obj.get_active()); });
    ret.attach(intelligentCornerSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Keep width when moving north/south:"),
      tooltip_text: _("Windows will not change their width when moved north or south"),
    }), 0, row, 4, 1);

    let keepWidthSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    keepWidthSwitch.set_active(Utils.getBoolean(Utils.ALWAYS_KEEP_WIDTH, false));
    keepWidthSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ALWAYS_KEEP_WIDTH, obj.get_active()); });
    ret.attach(keepWidthSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Keep height when moving east/west:"),
      tooltip_text: _("Windows will not change their height when moved east or west"),
    }), 0, row, 4, 1);

    let keepHeightSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    keepHeightSwitch.set_active(Utils.getBoolean(Utils.ALWAYS_KEEP_HEIGHT, false));
    keepHeightSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.ALWAYS_KEEP_HEIGHT, obj.get_active()); });
    ret.attach(keepHeightSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      label: _("Moving to corner:"),
      margin_left: 10,
      tooltip_text: _("Adjust window width and height when moved to corner?"),
      halign: Gtk.Align.START
    }), 0, row, 2, 1);

    let combo = this._createCornerChangesCombo();
    ret.attach(combo, 2, row++, 3, 1);

    // ------------------------------------- center ----------------------------------------
    ret.attach(new Gtk.Label({label: "<b>" + _("Center Width &amp; Height") + "</b>", halign:Gtk.Align.START, margin_left: 4, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 5, 1);
    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 10,
      label: _("Keep width when moving from center to south or north:"),
      tooltip_text: _("Don't change width when moving window from center to north or south")
    }), 0, row, 4, 1);

    let centerKeepWidthSwitch = new Gtk.Switch({ sensitive: true, halign: Gtk.Align.END });
    centerKeepWidthSwitch.set_active(Utils.getBoolean(Utils.CENTER_KEEP_WIDTH, false));
    centerKeepWidthSwitch.connect("notify::active", function(obj) { Utils.setParameter(Utils.CENTER_KEEP_WIDTH, obj.get_active()); });
    ret.attach(centerKeepWidthSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({label: "First width:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_WIDTH_0), 1, row++, 4, 1);
    ret.attach(new Gtk.Label({label: "First height:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_HEIGHT_0), 1, row++, 4, 1);

    ret.attach(new Gtk.Label({label: "Second width:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_WIDTH_1), 1, row++, 4, 1);
    ret.attach(new Gtk.Label({label: "Second height:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_HEIGHT_1), 1, row++, 4, 1);

    ret.attach(new Gtk.Label({label: "Third width:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_WIDTH_2), 1, row++, 4, 1);
    ret.attach(new Gtk.Label({label: "Third height:", halign: Gtk.Align.START, margin_left: 10 }), 0, ++row, 1, 1);
    ret.attach(createSlider(Utils.CENTER_HEIGHT_2), 1, row++, 4, 1);

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
      label: _("You can define up to three sizes that will be used when you move a window to the same direction " +
      "multiple times. Equal values are ignored.")
    });
    description.set_line_wrap(true);
    positions.attach(description, 0, row++, 6, 1);

    let labels = [_("First:"), _("Second:"), _("Third:")];
    // ------------------------------------- north ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>" + _("North height") + "</b>", halign:Gtk.Align.START, margin_left: 4, margin_top: 4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, "north-height");
    row++;

    // ------------------------------------- south ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>" + _("South height") + "</b>", halign:Gtk.Align.START, margin_left:4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, "south-height");
    row++;


    // ------------------------------------- east ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>" + _("East width") + "</b>", halign:Gtk.Align.START, margin_left:4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, "right-side-widths");
    row++;

    // ------------------------------------- west ----------------------------------------
    positions.attach(new Gtk.Label({label: "<b>" + _("West width") + "</b>", halign:Gtk.Align.START, margin_left:4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, row++, 6, 1);
    this._addSliders(positions, row, labels, "left-side-widths");

    let scroll = new Gtk.ScrolledWindow({ vexpand: true, hexpand: true });
    scroll.add_with_viewport(positions);

    return scroll;
  },

  _createKeyboardConfig: function() {
    return this._createBindingList({
      "put-to-corner-ne": _("Move to top right corner"),
      "put-to-corner-nw": _("Move to top left corner"),
      "put-to-corner-se": _("Move to bottom right corner"),
      "put-to-corner-sw": _("Move to bottom left corner"),
      "put-to-side-n": _("Move to top"),
      "put-to-side-e": _("Move to right"),
      "put-to-side-s": _("Move to bottom"),
      "put-to-side-w": _("Move to left"),
      "put-to-center": _("Move to center/maximize"),
      "put-to-location": _("Move to configured location"),
      "put-to-left-screen": _("Move to the left screen"),
      "put-to-right-screen": _("Move to the right screen"),
    });
  },

  _createMoveFocusConfig: function() {

    let row = 0;
    let ret = new Gtk.Grid();
    ret.column_homogeneous = true;

    let description = new Gtk.Label({
      halign: Gtk.Align.START,
      margin_left: 4,
      label: _("'Move Focus' allows you to change the focus based on the relative location of the current focused window using the keyboard and to push the currently focused window into the background to get the focus to the windows below.")
    });
    description.set_line_wrap(true);
    ret.attach(description, 0, row++, 5, 1);

    let labels = [
      _("Enable 'Move focus'"),
      _("Show animation when moving"),
      _("Enable cycle through windows at the same position"),
      _("Enable focus the window that's north of the current"),
      _("Enable focus the window that's east of the current"),
      _("Enable focus the window that's south of the current"),
      _("Enable focus the window that's west of the current"),
      _("Enable move the focus to the left screen"),
      _("Enable move the focus to the right screen")
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
      "move-focus-right-screen-enabled"
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


    ret.attach(new Gtk.Label({label: "<b>" + _("Keyboard bindings") + "</b>", halign:Gtk.Align.START, margin_left: 4, margin_top: 5, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_left: 4, margin_top: 4, margin_bottom: 4}), 0, row++, 5, 1);

    let keyBinding = this._createBindingList({
      "move-focus-north": _("Move the window focus up"),
      "move-focus-east": _("Move the window focus right"),
      "move-focus-south": _("Move the window focus down"),
      "move-focus-west": _("Move the window focus left"),
      "move-focus-cycle": _("Push focused window to the background"),
      "move-focus-left-screen": _("Move the focus to the left screen"),
      "move-focus-right-screen": _("Move the focus to the right screen")
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
    let col = new Gtk.TreeViewColumn({ 'title': _('Enabled'), 'expand': false});
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
    col = new Gtk.TreeViewColumn({ 'title': _('Action'), 'expand': true});
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
        throw new Error(_("Error updating Keybinding"));
      }

      let name = model.get_value(iterator, 1);
      let existingBinding = Utils.keyboardBindingExists(name, value);
      if (existingBinding) {
        var md = new Gtk.MessageDialog({
          modal: true,
          message_type: Gtk.MessageType.WARNING,
          buttons:Gtk. ButtonsType.OK,
          title: _("Keyboard binding already defined"),
          text: _("The binding is already used by '%s'").format(existingBinding)
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
        throw new Error(_("Error clearing keybinding"));
      }
      let name = model.get_value(iterator, 1);

        // set the active flag
        Utils.setParameter(name + "-enabled",0);
        model.set(iterator, [0], [false]);

        model.set(iterator, [3, 4], [0, 0]);
        Utils.set_strv(name, []);
      });

    col = new Gtk.TreeViewColumn({'title': _('Modify')});

    col.pack_end(cellrend, false);
    col.add_attribute(cellrend, 'accel-mods', 3);
    col.add_attribute(cellrend, 'accel-key', 4);

    treeview.append_column(col);

    return treeview;
  }

});

const PutWindowLocationWidget = new GObject.Class({
  Name: 'PutWindow.Prefs.PutWindowLocationWidget',
  GTypeName: 'PutWindowLocationWidget',
  Extends: Gtk.Grid,
  _init: function() {
    this.parent();
    this.margin = 4;
    this.orientation= Gtk.Orientation.VERTICAL;
    this.column_homogeneous = true;

    let label = new Gtk.Label({
      label: _("Application based size and location setting, that allows you to move windows on startup or circle between multiple configured locations."),
      halign:Gtk.Align.START,
      margin_left: 4
    });
    label.set_line_wrap(true);
    this.attach(label, 0, 0, 8, 1);

    this._selectedApp = null;
    this._apps = [];

    this.treeModel = new Gtk.ListStore();
    this.treeModel.set_column_types([GObject.TYPE_STRING]);

    this.treeView = new Gtk.TreeView({model: this.treeModel, headers_visible: false});

    this.treeView.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);
    let column = new Gtk.TreeViewColumn({ min_width: 150 });
    let renderer = new Gtk.CellRendererText();
    column.pack_start(renderer, true);
    column.add_attribute(renderer, 'text', 0);

    let appsLength = 1;
    if (Utils.getParameter("locations", null) != null) {
      let apps = Object.getOwnPropertyNames(Utils.getParameter("locations"));
      appsLength = apps.length;
      apps.sort();
      for(let i=0; i< appsLength; i++) {
        let iter = this.treeModel.append();
        this.treeModel.set(iter, [0], [ apps[i] ]);
        this._apps.push({name: apps[i], listElement: iter});
      }
    }

    this.treeView.append_column(column);

    this.treeView.get_selection().connect("changed",
      Lang.bind(this, function(selection) {
        let s = selection.get_selected();
        // no new selection
        if (!s[0]) {
          return;
        }
        let selectedValue = s[1].get_value(s[2], 0);
        if (this._selectedApp != null && this._selectedApp == selectedValue) {
          return;
        }

        this._removeAppButton.set_sensitive(true);
        this._updateAppContainerContent(selectedValue, this.createAppWidgets(selectedValue));
      })
      );

    let toolbar = new Gtk.Toolbar({});
    toolbar.set_icon_size(Gtk.IconSize.MENU);
    toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR)

    this._removeAppButton = new Gtk.ToolButton( {stock_id: Gtk.STOCK_REMOVE} );
    this._removeAppButton.set_sensitive(false);
    this._removeAppButton.set_tooltip_text(_("Remove an existing application setting"));

    this._removeAppButton.connect("clicked",
      Lang.bind(this, function() {

        let dialog = new Gtk.MessageDialog({
          modal: true,
          message_type: Gtk.MessageType.QUESTION,
          title: _("Delete application '%s'?").format(this._selectedApp),
          text: _("Are you sure to delete the configuration for  '%s'?").format(this._selectedApp)
        });

        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
        dialog.add_button(Gtk.STOCK_DELETE, Gtk.ResponseType.DELETE_EVENT);

        dialog.connect("response",
          Lang.bind(this, function(dialog, responseType) {
            if (responseType == Gtk.ResponseType.DELETE_EVENT) {
              for (let i=0; i< this._apps.length; i++) {
                if (this._apps[i].name != this._selectedApp) {
                  continue;
                }
                // remove the widget
                if (this._appContainer.get_child()) {
                  this._appContainer.get_child().destroy();
                }
                // remove the list entry
                this.treeModel.remove(this._apps[i].listElement);
                // unset the parameter
                Utils.unsetParameter("locations." + this._apps[i].name);
                // remove the entry from _apps array
                this._apps.pop(this._apps[i]);
                break;
              }
            }
          })
          );
        dialog.run();
        dialog.destroy();

      })
      );

    this._addAppButton = new Gtk.ToolButton( {stock_id: Gtk.STOCK_ADD} );
    this._addAppButton.set_tooltip_text(_("Add a new application (make sure it is running)"));
    this._addAppButton.connect("clicked",
      Lang.bind(this, function() {

        let apps = this._getRunningApps(this._apps);
        if (apps == null) {
          return;
        }

        let appsLength = apps.length;

        let dialog = new Gtk.MessageDialog({
          modal: false,
          message_type: Gtk.MessageType.QUESTION,
          title: _("Add application"),
          text: _("Please select the application you want to add")
        });

        let appModel = new Gtk.ListStore();
        appModel.set_column_types([ GObject.TYPE_INT, GObject.TYPE_STRING ]);

        let appSelector = new Gtk.ComboBox({ model: appModel, hexpand: true });
        appSelector.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);

        let renderer = new Gtk.CellRendererText();
        appSelector.pack_start(renderer, true);
        appSelector.add_attribute(renderer, 'text', 1);

        for (let i = 0; i < appsLength; i++ ) {
          let iter = appModel.append();
          appModel.set(iter, [0, 1], apps[i] );
        }

        appSelector.connect('changed',
          Lang.bind(this, function(combo) {
            let selection = combo.get_model().get_value(combo.get_active_iter()[1], 1);
            let configPath = "locations." + selection;
            Utils.setParameter(configPath, Utils.START_CONFIG);

            this._addToTreeView(selection, true);

            this._updateAppContainerContent(selection, this.createAppWidgets(selection));
            dialog.close();
          })
        );

        dialog.get_action_area().add(appSelector);
        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);

        dialog.set_default_size(350, 100);
        dialog.show_all();
        dialog.run();
        dialog.destroy();                  
      })
    );

    this._saveButton = new Gtk.ToolButton({stock_id: Gtk.STOCK_SAVE});
    this._saveButton.set_tooltip_text(_("'Applications' config is not saved automatically."));
    this._saveButton.connect("clicked", function() {
      Utils.saveSettings();
    });

    toolbar.insert(this._removeAppButton, 0);
    toolbar.insert(this._addAppButton, 1);
    toolbar.insert(this._saveButton, 2);

    let leftPanel = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    leftPanel.pack_start(this.treeView, true, true, 0);
    leftPanel.pack_start(toolbar, false, false, 0);
    this.attach(leftPanel, 0, 1, 2, 1);

    this._appContainer = new Gtk.Frame({ hexpand: true});
    this._appContainer.add(new Gtk.Label({label: _("Select an application to configure using the list on the left side.") }));
    let scroll = new Gtk.ScrolledWindow({
      'vexpand': true
    });
    scroll.add_with_viewport(this._appContainer);
    this.attach(scroll, 2, 1, 6, 1);
  },

  _getRunningApps: function(exclude) {

    if (this._wnckScreen != null) {
      return this._internalGetRunningApps(exclude);
    }

    // wnckScreen will be null when using wayland ...
    try {
      this._wnckScreen = Wnck.Screen.get_default();
    } catch (e) {
      global.log(e);
      this._wnckScreen = null;
    }
    if (this._wnckScreen == null) {
      var md = new Gtk.MessageDialog({
        modal: true,
        message_type: Gtk.MessageType.WARNING,
        buttons: Gtk.ButtonsType.OK,
        title: _("Error getting running apps"),
        text: _("We were not able to get the list of running apps from Wnck. Are you running Wayland? ")
      });

      md.run();
      md.destroy();
      return null;
    }

    this._wnckScreen.force_update();
    //global.log("wnck: " + this._wnckScreen);
    //global.log("wnck: " + this._wnckScreen.get_windows());
    return this._internalGetRunningApps(exclude);
  },

  _internalGetRunningApps: function(exclude) {
    let windows = this._wnckScreen.get_windows();
    let winSize = windows.length;
    let apps = [];
    let name;
    for (let i=0; i < winSize; i++) {
      name = windows[i].get_class_group_name();
      if (name && name != "") {
        apps.push( windows[i].get_class_group_name() );  
      }
    }
    apps.push("All");

    let ret = [],
    excludeLength = exclude.length;

    for (let i=0; i < apps.length; i++) {
      let wm =  apps[i],
      found = false;
      // dont add excluded entries to the returned value
      for (let j=0; j < excludeLength; j++) {
        if (exclude[j].name == wm || wm == "Update-notifier") {
          found = true;
          break;
        }
      }

      if (!found) {
        ret.push( [ret.length, wm]);
      }
    }

    ret.sort(function(a, b){
      return  a[1] < b[1] ? -1
      : a[1] == b[1] ? 0 : 1;
    });

    return ret;
  },

  createAppWidgets: function(appName) {

    let configLocation = "locations." + appName + ".";

    let ret = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 10 });

    if (Utils.getBoolean(Utils.ENABLE_MOVE_WORKSPACE, false)) {
      let workspaceBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

      workspaceBox.pack_start(new Gtk.Label({
        label: _("Move window to workspace when created"),
        xalign: 0
      }), true, true, 0);

      let workspacesActive = Utils.getBoolean(configLocation + "moveWorkspace", false);

      let btn = new Gtk.Switch({ active: workspacesActive });
      btn.connect("notify::active",
        function(sw) {
          Utils.setParameter(configLocation + "moveWorkspace", sw.get_active());
          numberButton.set_sensitive(sw.get_active());
        });
      workspaceBox.pack_start(btn, false, false, 0);
      ret.pack_start(workspaceBox, false, false, 0);

      let workspaceIndexBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
      let numberButton = new Gtk.SpinButton( {
        value: Utils.getNumber(configLocation + "targetWorkspace", 1),
        numeric: true,
        snap_to_ticks: true,
        adjustment: new Gtk.Adjustment({
          lower: 1,
          upper: 10,
          step_increment: 1
        })
      });
      numberButton.connect("changed",
        function(btn){
          Utils.setParameter(configLocation + "targetWorkspace", btn.value);
        });

      numberButton.set_sensitive(workspacesActive);


      workspaceIndexBox.pack_start(new Gtk.Label({label: _("Window target workspace"), xalign: 0}), true, true, 0);
      workspaceIndexBox.pack_start(numberButton, false, false, 0);

      ret.pack_start(workspaceIndexBox, false, false, 0);

      ret.pack_start(
        new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}),
        false, false, 0);
    }

    let autoMoveBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL});
    autoMoveBox.pack_start(new Gtk.Label({label: _("Auto-Move window when created"), xalign: 0}), true, true, 0);

    let btn = new Gtk.Switch({ active: Utils.getBoolean(configLocation + "autoMove", false) });
    btn.connect("notify::active", function(sw) {
      Utils.setParameter(configLocation + "autoMove", sw.get_active());
    });
    autoMoveBox.pack_end(btn, false, false, 0);

    ret.pack_start(autoMoveBox, false, false, 0);


    // widgets for the positions defined for the app
    let positions = Utils.getParameter(configLocation + "positions", { positions: []});
    let positionSize = positions.length;

    this.locationBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    for (let i = 0; i < positionSize; i++) {
      this.locationBox.pack_start(this._generateOnePositionWidgets(configLocation, i, positionSize), false, false, 0);
    }
    ret.pack_start(this.locationBox, false, false, 0);

    return ret;
  },

  _updateAppContainerContent: function(appName, widget) {
    this._selectedApp = appName;
    if (this._appContainer.get_child()) {
      this._appContainer.get_child().destroy();
    }
    this._appContainer.add(widget);
    this._appContainer.show_all();
  },

  _addToTreeView: function(value, select) {
    let iter = this.treeModel.append();
    this.treeModel.set(iter, [0], [ value ]);
    this._apps.push({name: value, listElement: iter});

    if (select && select == true) {
      this.treeView.get_selection().select_iter(iter);
      this._selectedApp = value;
    }
  },

  _generateOnePositionWidgets: function(configLocation, index, positionSize) {

    let loc = configLocation + "positions." + index + ".",
    top = 0;

    let grid = new Gtk.Grid({ hexpand: true});
    grid.locationIndex = index;
    // screen ComboBox
    let screenModel = new Gtk.ListStore();
    screenModel.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);

    let screenSelector = new Gtk.ComboBox({ model: screenModel, hexpand: true, margin_top: 6, margin_bottom: 6 });
    screenSelector.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);

    let screenSelectRenderer = new Gtk.CellRendererText();
    screenSelector.pack_start(screenSelectRenderer, true);
    screenSelector.add_attribute(screenSelectRenderer, 'text', 0);

    let numScreens =  Gdk.Screen.get_default().get_n_monitors();
    for (let j = 0; j < numScreens; j++ ) {
      let iter = screenModel.append();
      screenModel.set(iter, [0, 1], ["Screen " + (j+1), j]);
    }

    screenSelector.set_active(Utils.getNumber(loc + "screen", 0));
    screenSelector.connect('changed',
      Lang.bind(this, function(combo) {
        Utils.setParameter(loc + "screen", combo.get_model().get_value(combo.get_active_iter()[1], 1));
      })
      );

    grid.attach(new Gtk.Label({label: _("Screen"), xalign: 0}), 0, top, 3, 1);
    grid.attach(screenSelector, 3, top, 1, 1);

    // add/delete buttons
    let buttonContainer = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });
    let addButton = new Gtk.ToolButton({ stock_id: Gtk.STOCK_ADD });
    addButton.connect("clicked",
      Lang.bind(this, function() {

        let length = Utils.getParameter(configLocation + "positions", []).length;
        let newLocation = configLocation + "positions." + length;
        Utils.setParameter(newLocation, {x: 0, y: 0, width: 100, height: 100, screen: 0} );

        this.locationBox.pack_start(this._generateOnePositionWidgets(configLocation, length, length), false, false, 0);
        this.locationBox.show_all();
      })
      );
    buttonContainer.pack_end(addButton, false, false, 0);

    // don't delete the first position
    if (index > 0) {
      let deleteButton = new Gtk.ToolButton({ stock_id: Gtk.STOCK_REMOVE });
      deleteButton.connect("clicked",
        Lang.bind(this, function() {
          Utils.unsetParameter(configLocation + "positions." + index);
          this.locationBox.remove(grid);

        })
      );
      buttonContainer.pack_end(deleteButton, false, false, 0)
    }

    grid.attach(buttonContainer, 4, top, 1, 1);
    
    // sliders for width, height, x, y

    top++;
    grid.attach(new Gtk.Label({
      label: _("Disable resize"), 
      xalign: 0,
      tooltip_text: _("Width and height of the window will not be changed")
    }), 0, top, 3, 1);
    let dontResizeSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END });
    let disableResize = Utils.getBoolean(loc + "disableResize", false);
    dontResizeSwitch.set_active(disableResize);
    dontResizeSwitch.connect("notify::active", function(obj) {      
      let newValue = obj.get_active();
      Utils.setParameter(loc + "disableResize", newValue);
      updateWidthSliders(newValue);
    });
    grid.attach(dontResizeSwitch, 1, top, 4, 1);

    top++;
    let scaleW = createSlider(loc + "width");
    grid.attach(new Gtk.Label({label: _("Width"), xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleW, 1, top, 4, 1);

    top++;
    let scaleH = createSlider(loc + "height");
    grid.attach(new Gtk.Label({label: _("Height"), xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleH, 1, top, 4, 1);

    let updateWidthSliders = function(disabled) {
      scaleW.set_sensitive(!disabled);
      scaleH.set_sensitive(!disabled);      
    };
    updateWidthSliders(disableResize);

    top++;
    grid.attach(new Gtk.Label({
      label: _("Disable moving"),
      xalign: 0,
      tooltip_text: _("Relative position of the window will not be changed")
    }), 0, top, 3, 1);
    let dontMoveSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END });
    let disableMove = Utils.getBoolean(loc + "disableMove", false);
    dontMoveSwitch.set_active(disableMove);
    dontMoveSwitch.connect("notify::active", function(obj) {      
      let newValue = obj.get_active();
      Utils.setParameter(loc + "disableMove", newValue);
      updatePositionSliders(newValue);
    });
    grid.attach(dontMoveSwitch, 1, top, 4, 1);

    top++;
    let scaleX = createSlider(loc + "x");
    grid.attach(new Gtk.Label({label: _("X-Position"), xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleX, 1, top, 4, 1);

    top++;
    let scaleY = createSlider(loc + "y");
    grid.attach(new Gtk.Label({label: _("Y-Position"), xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleY, 1, top, 4, 1);

    let updatePositionSliders = function(disabled) {
      scaleX.set_sensitive(!disabled);
      scaleY.set_sensitive(!disabled);      
    };
    updatePositionSliders(disableMove);

    if (index < (positionSize -1 )) {
      top++;
      grid.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, top, 6, 1);
    }
    return grid;
  }
});

function init() {
  Convenience.initTranslations();
}

function buildPrefsWidget() {
  //var windows = imports.gi.Gdk.Screen.get_default().get_window_stack();

  let widget = new PutWindowSettingsWidget();
  widget.show_all();
  return widget;
}
