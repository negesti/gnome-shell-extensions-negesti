const Gettext = imports.gettext;
const Lang = imports.lang;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Tweener = imports.ui.tweener;
const Util = imports.misc.util;

let _path, _simpleMenu, allySymbolVisible, _dynamicMenu;

// read the menu entries from simpleMenu.json
function _readFile() {
  let ret = null;

  let dummy = {
    hide_ally: false,
    terminal: "gnome-terminal -x",
    editor: "gedit",
    position: "right",
    items: []
  };

  let content;
  try {
    content = Shell.get_file_contents_utf8_sync(_path+"simpleMenu.json");
  } catch (e) {
    Main.notifyError("Error reading file", e.message);
    return dummy;
  }

  try {
    ret = JSON.parse(content);
  } catch (e) {
     Main.notifyError("Error parsing file", e.message);
     return dummy;
  }

  return ret;
}

function _startTerminal(terminal, command) {
  if (terminal=="true") {
    log("in terminal")
    Util.spawnCommandLine(_simpleMenu.terminal +" "+ command);
  } else {
    if (command instanceof Array) {
      Util.spawn(command);
    } else {
      Util.spawn([command]);
    }

  }
};

// have some fun with the ally icon

function toggleAllySymbol() {
  if (allySymbolVisible) {
    hideAllySymbol();
  } else {
    showAllySymbol();
  }
  allySymbolVisible = !allySymbolVisible;
};

function hideAllySymbol() {
  for (let Index = 0; Index < Main.panel._rightBox.get_children().length; Index++){
    if(Main.panel._statusArea['a11y'] == Main.panel._rightBox.get_children()[Index]._delegate){
      Main.panel._rightBox.get_children()[Index].destroy();
      break;
    }
  }

  Main.panel._statusArea['a11y'] = null;
};

function showAllySymbol() {
  try{
    let Indicator = new Panel.STANDARD_STATUS_AREA_SHELL_IMPLEMENTATION['a11y'];
    Main.panel.addToStatusArea('a11y', Indicator, Panel.STANDARD_STATUS_AREA_ORDER.indexOf('a11y'));
    log("added");
  } catch(err) {
    global.log("error showing ally simbol" + err.Message);
  }
};


// the actual menu
function SimpleMenu() {
    this._init.apply(this, arguments);
};

SimpleMenu.prototype = {
  __proto__: PanelMenu.Button.prototype,

  // create the dynamic menu entries defined in simpleMenu.json
  _createEntries: function() {
    let section = new PopupMenu.PopupMenuSection()
    let size = _simpleMenu.items.length;
    for(let i=0; i<size; i++) {
        let add = new PopupMenu.PopupMenuItem(_(_simpleMenu.items[i].display));

        // i hate js scopes...
        let term = _simpleMenu.items[i].terminal;
        let com = _simpleMenu.items[i].command;
        add.connect('activate',
          function() {
            _startTerminal(term, com);
          }
        );

        section.addMenuItem(add);
    }
    return section;
  },

  rebuildMenu: function() {
    this.menu._getMenuItems()[0].destroy();
    _simpleMenu = _readFile();
    _dynamicMenu = this._createEntries()
    this.menu.addMenuItem(_dynamicMenu, 0);
    Main.notify("Rebuild done", "");
  },

  _init: function() {
    try {
      PanelMenu.Button.prototype._init.call(this, 0.0);
      let icon = new St.Icon(
        { icon_name: 'start-here', icon_type: St.IconType.SYMBOLIC, style_class: 'system-status-icon' });

      this.actor.add_actor(icon);

      _dynamicMenu = this._createEntries()
      this.menu.addMenuItem(_dynamicMenu);

      let sep = new PopupMenu.PopupSeparatorMenuItem()
      this.menu.addMenuItem(sep);

      let utils = new PopupMenu.PopupSubMenuMenuItem("Utils");

      let editMenu = new PopupMenu.PopupMenuItem(_("Edit Menu"));
      editMenu.connect('activate', function() {
        try {
          Util.trySpawn([_simpleMenu.editor, _path+"simpleMenu.json"]);
        }catch(e){
          Main.notifyError("Error open simpleMenu.json", e.message)
        }
      });
      utils.menu.addMenuItem(editMenu);

      let rebuild = new PopupMenu.PopupMenuItem(_("Rebuild Menu"));
      rebuild.connect('activate', Lang.bind(this, this.rebuildMenu));
      utils.menu.addMenuItem(rebuild);

      let devTools = new PopupMenu.PopupSwitchMenuItem  (_("Development-tools"), global.settings.get_boolean('development-tools'));
      devTools.connect('activate', function() {
        var active = global.settings.get_boolean('development-tools');
        global.settings.set_boolean('development-tools', !active)
      });
      utils.menu.addMenuItem(devTools);

      let allyButton = new PopupMenu.PopupSwitchMenuItem  (_("Accessability menu"), allySymbolVisible);
      allyButton.connect('activate', Lang.bind(this, toggleAllySymbol));
      utils.menu.addMenuItem(allyButton);

      this.menu.addMenuItem(utils);

      Main.panel._menus.addMenu(this.menu);
    }catch (err) {
      Main.notifyError("Error creating menuitems", err.message);
    }
  },

  _onDestroy: function() {}
};

function init(meta) {
  _path = meta.path+"/";
  let userExtensionLocalePath = meta.path + '/locale';
  Gettext.bindtextdomain("simpleMenu", userExtensionLocalePath);
  Gettext.textdomain("simpleMenu");
};

function enable(){
  _simpleMenu = this._readFile();
  log(_simpleMenu);
  this._myPanelButton = new SimpleMenu();

  if (_simpleMenu.position=="center") {
    Main.panel._centerBox.add(this._myPanelButton.actor, {y_fill: true});
  } else {
    Main.panel._rightBox.insert_actor(this._myPanelButton.actor, 0);
  }

  global.window_manager.takeover_keybinding(_simpleMenu.key_binding);
  Main.wm.setKeybindingHandler(_simpleMenu.key_binding,
    Lang.bind(this, function(){
        this._myPanelButton.menu.toggle();
    })
  );

  allySymbolVisible = !_simpleMenu.hide_ally;
  if (_simpleMenu.hide_ally) {
    hideAllySymbol();
  }
};

function disable(){
  if (_simpleMenu.position=="center") {
    Main.panel._centerBox.remove_actor(this._myPanelButton.actor);
  } else {
    Main.panel._rightBox.remove_actor(this._myPanelButton.actor, 0);
  }
  _simpleMenu = null;

  this._myPanelButton.destroy();
};
