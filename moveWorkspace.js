const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;

/**
* Based on code by Florain Müller and the auto-move-window-extension. 
* https://git.gnome.org/browse/gnome-shell-extensions/
* 
*
*/
function MoveWorkspace(utils) {
  this._init(utils);
}

MoveWorkspace.prototype = {

  _windowTracker: null,
  _prevCheckWorkspaces: false,
  _windowCreateId: 0,

  _init: function(utils) {
    this._utils = utils;

    this._prevCheckWorkspaces = Main.wm._workspaceTracker._checkWorkspaces;

    this._settingObject = this._utils.getSettingsObject();
    this._settingsChangedListener = {
      name: this._utils.ENABLE_MOVE_WORKSPACE,
      fn: () => {
        let enabled = this._utils.getBoolean(this._utils.ENABLE_MOVE_WORKSPACE, false);
        if (enabled) {
          this.enable();
        } else {
          this.disable();
        }
      }
    };

    this._settingsChangedListener.handlerId = this._settingObject.connect(
      'changed::' + this._utils.ENABLE_MOVE_WORKSPACE,
      this._settingsChangedListener.fn
    );

    let enabled = this._utils.getBoolean(this._utils.ENABLE_MOVE_WORKSPACE, false);
    if (enabled) {
      this.enable();
    }

  },

  enable : function() {
    this._windowTracker = Shell.WindowTracker.get_default();

    Main.wm._workspaceTracker._checkWorkspaces = this._myCheckWorkspaces;

    // Connect after so the handler from ShellWindowTracker has already run
    let display = global.display;
    this._windowCreatedId = display.connect_after('window-created', this._findAndMove.bind(this));
  },

  destroy: function() {
    this.disable();
  },

  disable: function() {
    if (this._prevCheckWorkspaces) {
      Main.wm._workspaceTracker._checkWorkspaces = this._prevCheckWorkspaces;
    }

    if (this._windowCreatedId) {
      global.display.disconnect(this._windowCreatedId);
      this._windowCreatedId = 0;
    }
  },

  _myCheckWorkspaces: function() {
    let i;
    let emptyWorkspaces = new Array(this._workspaces.length);

    if (!Meta.prefs_get_dynamic_workspaces()) {
      this._checkWorkspacesId = 0;
      return false;
    }

    for (i = 0; i < this._workspaces.length; i++) {
      let lastRemoved = this._workspaces[i]._lastRemovedWindow;
      if (this._workspaces[i]._keepAliveId || (lastRemoved && (
                           lastRemoved.get_window_type() == Meta.WindowType.SPLASHSCREEN ||
                           lastRemoved.get_window_type() == Meta.WindowType.DIALOG ||
                           lastRemoved.get_window_type() == Meta.WindowType.MODAL_DIALOG))) {
        emptyWorkspaces[i] = false;
      } else {
        emptyWorkspaces[i] = true;
      }
    }

    let sequences = Shell.WindowTracker.get_default().get_startup_sequences();
    for (i = 0; i < sequences.length; i++) {
      let index = sequences[i].get_workspace();
      if (index >= 0 && index <= Utils.getWorkspaceManager().n_workspaces) {
        emptyWorkspaces[index] = false;
      }
    }

    let windows = global.get_window_actors();
    for (i = 0; i < windows.length; i++) {
      let winActor = windows[i];
      let win = winActor.meta_window;
      if (win.is_on_all_workspaces()) {
        continue;
      }

      let workspaceIndex = win.get_workspace().index();
      emptyWorkspaces[workspaceIndex] = false;
    }

    // If we don't have an empty workspace at the end, add one
    if (!emptyWorkspaces[emptyWorkspaces.length -1]) {
      Utils.getWorkspaceManager().append_new_workspace(false, global.get_current_time());
      emptyWorkspaces.push(false);
    }

    let activeWorkspaceIndex = Utils.getWorkspaceManager().get_active_workspace_index();
    emptyWorkspaces[activeWorkspaceIndex] = false;

    // Delete other empty workspaces; do it from the end to avoid index changes
    for (i = emptyWorkspaces.length - 2; i >= 0; i--) {
      if (emptyWorkspaces[i]) {
        Utils.getWorkspaceManager().remove_workspace(this._workspaces[i], global.get_current_time());
      } else {
        break;
      }
    }

    this._checkWorkspacesId = 0;
    return false;
  },

  _findAndMove: function(display, window, noRecurse) {
    if (window.skip_taskbar)
      return;

    let app = this._windowTracker.get_window_app(window);
    if (!app) {
      if (!noRecurse) {
        // window is not tracked yet
        Mainloop.idle_add(() => {
          this._findAndMove(display, window, true);
          return false;
        });
      } else
        global.log ('Cannot find application for window');
      return;
    }

    app = window.get_wm_class();
    // move the window if a location is configured and autoMove is set to true
    let appPath = "locations." + app;

    if (this._utils.getParameter(appPath, false)) {
      if (this._utils.getBoolean(appPath + ".moveWorkspace", false)) {
        let targetWorkspace = this._utils.getNumber(appPath + ".targetWorkspace", 1) - 1;

        if (targetWorkspace >= Utils.getWorkspaceManager().n_workspaces) {
          this._ensureAtLeastWorkspaces(targetWorkspace, window);
        }

        // wait until we focus the new window e.g. it really exists and then move it
        this.moveWorkspaceListener = window.connect("focus",
          () => {

            if (this.moveWorkspaceListener != null) {
              window.disconnect(this.moveWorkspaceListener);
              this.moveWorkspaceListener = null;
            }

            window.change_workspace_by_index(targetWorkspace, false);
          }
        );
      }
    }
  },


  _ensureAtLeastWorkspaces: function(num, window) {
    for (let j = Utils.getWorkspaceManager().n_workspaces; j <= num; j++) {
      window.change_workspace_by_index(j-1, false);
      Utils.getWorkspaceManager().append_new_workspace(false, 0);
    }
  }
};
