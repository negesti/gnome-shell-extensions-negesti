const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = new Me.imports.utils.Utils();

const Lang = imports.lang;
const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

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
  	 	halign: Gtk.Align.START,
  	 	margin_left: 4,});
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
    this._removeAppButton.set_tooltip_text(_("Remove an existing application"));

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
    this._addAppButton.set_tooltip_text(_("Add a new application"));
    this._addAppButton.connect("clicked", Lang.bind(this, this._selectAppDialog));
    //     let dialog = new Gtk.MessageDialog({
    //       modal: false,
    //       message_type: Gtk.MessageType.QUESTION,
    //       title: _("Add application"),
    //       text: _("Please select the application you want to add")
    //     });

    //     let appModel = new Gtk.ListStore();
    //     appModel.set_column_types([ GObject.TYPE_INT, GObject.TYPE_STRING ]);

    //     let appSelector = new Gtk.ComboBox({ model: appModel, hexpand: true });
    //     appSelector.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);

    //     let renderer = new Gtk.CellRendererText();
    //     appSelector.pack_start(renderer, true);
    //     appSelector.add_attribute(renderer, 'text', 1);

    //     let apps = this._getRunningApps(this._apps);
    //     let appsLength = apps.length;

    //     for (let i = 0; i < appsLength; i++ ) {
    //       let iter = appModel.append();
    //       appModel.set(iter, [0, 1], apps[i] );
    //     }

    //     appSelector.connect('changed',
    //       Lang.bind(this, function(combo) {
    //         let selection = combo.get_model().get_value(combo.get_active_iter()[1], 1);
    //         let configPath = "locations." + selection;
    //         Utils.setParameter(configPath, Utils.START_CONFIG);

    //         this._addToTreeView(selection, true);

    //         this._updateAppContainerContent(selection, this.createAppWidgets(selection));
    //         dialog.destroy();
    //       })
    //       );

    //     dialog.get_action_area().add(appSelector);
    //     dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);

    //     dialog.set_default_size(350, 100);
    //     dialog.show_all();
    //     dialog.run();
    //     dialog.destroy();
    //   })
    // );

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

  _selectAppDialog: function() {

    let grid = new Gtk.Grid({ vexpand: true, hexpand: true, orientation: Gtk.Orientation.VERTICAL, 
      column_homogeneous: true, margin: 4});

    let row = 0;
    let activeRadioButton = 1;
    this.radio = null;
    this.radio = new Gtk.RadioButton({ label: _("Rule for all applications"), group: this.radio});
    this.radio.connect("toggled", function(btn) {
      updateCheckedState(btn.get_active(), false, false);
      activeRadioButton = 1;
    });
    grid.attach(this.radio, 0, row++, 2, 1);


    this.radio = new Gtk.RadioButton({ label: _("Manual enter application name: "), xalign: 0, group: this.radio});
    this.radio.connect("toggled", function(btn) {
      updateCheckedState(false, btn.get_active(), false);
      activeRadioButton = 2;
    });

    let manualEntry = new Gtk.Entry({sensitive: false});
    grid.attach(this.radio, 0, row, 1, 1);
    grid.attach(manualEntry, 1, row++, 1, 1);

     manualEntry.connect("changed", function(entry, data) {
      updateCheckedState(entry.get_text().length > 0, true, false);
    });

    this.radio = new Gtk.RadioButton({label: _("Select an App"), xalign: 0, group: this.radio});
    this.radio.connect("toggled", function(btn) {
      updateCheckedState(false, false, btn.get_active());
      activeRadioButton = 3;
    })
    grid.attach(this.radio, 0, row++, 2, 1);

    let updateCheckedState = function(one, two, three) {
      addButton.sensitive = one;
      manualEntry.sensitive = two;
      dialog._appChooser.sensitive = three;
    }

  	let dialog = new Gtk.Dialog({ title: _("Create new application rule"),
      transient_for: this.get_toplevel(),
      use_header_bar: true,
      modal: true 
    });
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    let addButton = dialog.add_button(_("Add"), Gtk.ResponseType.OK);

    dialog.set_default_response(Gtk.ResponseType.OK);

    dialog._appChooser = new Gtk.AppChooserWidget({
      show_all: true,
      content_type: 'txt',
      show_other: true,
      show_fallback: true,
      hexpand: true,
      vexpand: true
    });
    dialog._appChooser.connect('application-selected', Lang.bind(this,
      function(w, appInfo) {
        addButton.sensitive = appInfo && this._checkName(appInfo.get_name());
      }));
    let appInfo = dialog._appChooser.get_app_info();
    addButton.sensitive = appInfo && this._checkName(appInfo.get_name());

    updateCheckedState(true, false, false);

    row++;
    grid.attach(dialog._appChooser, 0, row++, 2, 1);


    // dialog._spin = new Gtk.SpinButton({ adjustment: adjustment,
    //   snap_to_ticks: true });
    // dialog._spin.set_value(1);
    // grid.attach(dialog._spin, 1, 1, 1, 1);
    dialog.get_content_area().add(grid);

    dialog.connect('response', Lang.bind(this, function(dialog, id) {
      if (id != Gtk.ResponseType.OK) {
        dialog.destroy();
        return;
      }
      
      let appName;
      if (activeRadioButton == 1) {
        appName = "All";
      } else if (activeRadioButton == 2) {
        appName = manualEntry.get_text();
      } else if (activeRadioButton == 3) {
        appName = dialog._appChooser.get_app_info().get_id();
      }

      let suffix = appName.indexOf(".desktop");
      if (suffix != -1) {
        appName = appName.substring(0, suffix);
      }

      appName = appName.toLowerCase();
      
      let configPath = "locations." + appName;
      Utils.setParameter(configPath, Utils.START_CONFIG);
      this._addToTreeView(appName, true);
      this._updateAppContainerContent(appName, this.createAppWidgets(appName));

      dialog.destroy();
    }));
    dialog.show_all();
	},
	
	_checkName: function(id) {
		return !this._apps.some(function(i) { 
      return i.name.startsWith(id + ':');
    });
	},

  _getRunningApps: function(exclude) {

    let screen = this.get_screen();
    let display = screen.get_display();
    let windows = display.sort_windows_by_stacking(display.get_tab_list(Meta.TabList.NORMAL_ALL, screen.get_active_workspace()))

    let winSize = windows.length;
    let apps = [];
    for (let i=0; i < winSize; i++) {
      apps.push( windows[i].get_wm_class() );
    }
    apps.push("All");

    let ret = [],
    exludeLength = exclude.length;

    for (let i=0; i < apps.length; i++) {
      let wm =  apps[i],
      found = false;
      // dont add excluded entries to the returned value
      for (let j=0; j < exludeLength; j++) {
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
      : a[1]==b[1] ? 0 : 1;
    });

    return ret;
  },

  createAppWidgets: function(appName) {

    let configLocation = "locations." + appName + ".";

    let ret = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 10 });

    if (Utils.getBoolean(Utils.ENABLE_MOVE_WORKSPACE, false)) {
      let workspaceBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

      workspaceBox.pack_start(new Gtk.Label({label: _("Move window to workspace when created"), xalign: 0}), true, true, 0);

      let workspacesActive = Utils.getBoolean(configLocation + "moveWorkspace", false);

      let btn = new Gtk.Switch({ active: workspacesActive });
      btn.connect("notify::active", 
        function(sw) {
          Utils.setParameter(configLocation + "moveWorkspace", sw.get_active());
          numberButton.set_sensitive(sw.get_active());
        })
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
    })
    autoMoveBox.pack_end(btn, false, false, 0);

    ret.pack_start(autoMoveBox, false, false, 0);


    // widgets for the positions defined for the app
    let positions = Utils.getParameter(configLocation + "positions", Utils.START_CONFIG.positions);
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
      screenModel.set(iter, [0, 1], [_("Screen %d").format(j+1), j]);
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
    buttonContainer.pack_end(addButton, false, false, 0)

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

    // sliders for widht, height, x, y
    top++;
    let scaleW = Utils.createSlider(loc + "width");
    grid.attach(new Gtk.Label({label: "width", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleW, 1, top, 4, 1);

    top++;
    let scaleH = Utils.createSlider(loc + "height");
    grid.attach(new Gtk.Label({label: "Height", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleH, 1, top, 4, 1);

    top++;
    let scaleX = Utils.createSlider(loc + "x");
    grid.attach(new Gtk.Label({label: "X-Position", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleX, 1, top, 4, 1);

    top++;
    let scaleY = Utils.createSlider(loc + "y");
    grid.attach(new Gtk.Label({label: "Y-Position", xalign: 0}), 0, top, 1, 1);
    grid.attach(scaleY, 1, top, 4, 1);

    if (index < (positionSize -1 )) {
      top++;
      grid.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4}), 0, top, 6, 1);
    }
    return grid;
  }
});