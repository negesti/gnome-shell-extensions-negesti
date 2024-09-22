import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import PutWindowUtils from './utils.js';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


/**
 * @param {PutWindowUtils} utils
 * @param {*} configName
 */
function _createSlider(utils, configName) {
  const ret = new Gtk.Scale({
    digits: 0, sensitive: true,
    orientation: Gtk.Orientation.HORIZONTAL, margin_end: 6, margin_start: 6,
  });
  ret.set_range(0, 100);
  ret.set_value(utils.getNumber(configName, 50));
  ret.set_value_pos(Gtk.PositionType.RIGHT);

  const valueChanged = obj => {
    utils.setParameter(configName, obj.get_value());
  };

  ret.connect('value-changed', valueChanged.bind({utils, configName}));
  return ret;
}

function _createDescriptionLabel(text) {
  return new Gtk.Label({
    halign: Gtk.Align.START,
    margin_end: 4,
    margin_start: 4,
    margin_top: 8,
    margin_bottom: 8,
    label: text,
    wrap: true,
  });
}

const PutWindowSettingsWidget = GObject.registerClass({
  GTypeName: 'PutWindowSettingsWidget',
},
class PutWindowSettingsWidget extends Gtk.Notebook {
  _init(settingsObject) {
    super._init(settingsObject);

    this._utils = new PutWindowUtils(settingsObject);
    this.orientation = Gtk.Orientation.VERTICAL;
    this.hexpand = true;
    this.tab_pos = Gtk.PositionType.LEFT;
    this.default_width = 700;

    this.append_page(this._generateMainSettings(), new Gtk.Label({
      label: `<b>${_('Main')}</b>`,
      halign: Gtk.Align.START, margin_top: 0, use_markup: true,
    }));

    this.append_page(this._createPositionSettings(), new Gtk.Label({
      label: `<b>${_('Width &amp; Height')}</b>`,
      halign: Gtk.Align.START, use_markup: true,
    }));

    this.append_page(this._createKeyboardConfig(), new Gtk.Label({
      label: `<b>${_('Keyboard Shortcuts')}</b>`,
      halign: Gtk.Align.START, use_markup: true,
    }));

    this.append_page(this._createMoveFocusConfig(), new Gtk.Label({
      label: `<b>${_('Move Focus')}</b>`,
      halign: Gtk.Align.START, use_markup: true,
    }));
  }

  _createCornerChangesCombo() {
    this._model = new Gtk.ListStore();
    this._model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

    const combo = new Gtk.ComboBox({model: this._model, halign: Gtk.Align.END});

    const currentValue = this._utils.getNumber(PutWindowUtils.CORNER_CHANGE, 0);

    const values = [
      ['0', _('Both')],
      ['1', _('Only height')],
      ['2', _('Only width')],
      ['3', _('Never change size')],
      ['4', _('Nothing on first move, both on second')],
      ['5', _('Nothing on first move, Only height on second')],
      ['6', _('Nothing on first move, Only width on second')],
    ];
    let selectMe = null;
    for (let i = 0; i < values.length; i++) {
      const iter = this._model.append();
      this._model.set(iter, [0, 1], values[i]);
      if (values[i][0] === currentValue) {
        selectMe = iter;
      }
    }

    if (selectMe != null) {
      combo.set_active_iter(selectMe);
    }

    function comboChanged(obj) {
      const [success, iter] = obj.get_active_iter();
      if (!success) {
        return;
      }

      // eslint-disable-next-line no-invalid-this
      this._utils.setParameter(PutWindowUtils.CORNER_CHANGE, this._model.get_value(iter, 0));
    }

    const renderer = new Gtk.CellRendererText();
    combo.pack_start(renderer, true);
    combo.add_attribute(renderer, 'text', 1);
    combo.connect('changed', comboChanged.bind(this));
    return combo;
  }

  _addSliders(grid, row, labels, configName) {
    for (let i = 0; i < labels.length; i++) {
      row++;
      grid.attach(new Gtk.Label({label: labels[i], halign: Gtk.Align.START, margin_start: 15}), 0, row, 1, 1);
      grid.attach(_createSlider(this._utils, `${configName}-${i}`), 1, row, 5, 1);
    }
    return row;
  }

  _createWorkInProgress() {
    let row = 0;
    const ret = new Gtk.Grid({
      column_homogeneous: true,
      margin_top: 4,
      margin_start: 4,
      margin_end: 4,
    });

    ret.attach(new Gtk.Label({
      label: '<b>This settings are not supported at the moment</b>',
      halign: Gtk.Align.START,
      margin_start: 4,
      use_markup: true,
    }), 0, row++, 5, 1);

    return ret;
  }

  _generateMainSettings() {
    let row = 0;
    const ret = new Gtk.Grid({
      column_homogeneous: true,
      margin_top: 4,
      margin_start: 4,
      margin_end: 4,
    });

    ret.attach(new Gtk.Label({label: `<b>${_('Main settings')}</b>`, halign: Gtk.Align.START, margin_start: 4, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({
      orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4,
    }), 0, row++, 5, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_start: 10,
      label: _('Keep window on current screen:'),
      tooltip_text: _('Disable this option to move to other screen if possible'),
    }), 0, row, 4, 1);

    function switchToggled(parameterName, obj) {
      // eslint-disable-next-line no-invalid-this
      this._utils.setParameter(parameterName, obj.get_active());
    }

    const alwaysSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END});
    alwaysSwitch.set_active(this._utils.getBoolean(PutWindowUtils.ALWAYS_USE_WIDTHS, false));
    alwaysSwitch.connect('notify::active', switchToggled.bind(this, PutWindowUtils.ALWAYS_USE_WIDTHS));
    ret.attach(alwaysSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_start: 10,
      label: _('Move to center maximizes and restores initial window size (first w/h only):'),
      tooltip_text: _(
        'Maximize the window on first move and restore original size ' +
        'and position on second. Only works with first width/height'),
    }), 0, row, 4, 1);

    const centerToggleSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END});
    centerToggleSwitch.set_active(this._utils.getBoolean(PutWindowUtils.MOVE_CENTER_ONLY_TOGGLES, false));
    centerToggleSwitch.connect('notify::active',
      switchToggled.bind(this, PutWindowUtils.MOVE_CENTER_ONLY_TOGGLES));
    ret.attach(centerToggleSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_start: 10,
      label: _('Always ignore top panel:'),
      tooltip_text: _('Enable this if you use an extension to hide the top panel'),
    }), 0, row, 4, 1);

    const ignoreTopPanelSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END});
    ignoreTopPanelSwitch.set_active(this._utils.getBoolean(PutWindowUtils.IGNORE_TOP_PANEL, false));
    ignoreTopPanelSwitch.connect('notify::active', switchToggled.bind(this, PutWindowUtils.IGNORE_TOP_PANEL));
    ret.attach(ignoreTopPanelSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_start: 10,
      label: _('Intelligent corner movement:'),
      tooltip_text: _('Moving from E to S moves to SE not S'),
    }), 0, row, 4, 1);

    const intelligentCornerSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END});
    intelligentCornerSwitch.set_active(this._utils.getBoolean(PutWindowUtils.INTELLIGENT_CORNER_MOVEMENT, false));
    intelligentCornerSwitch.connect('notify::active',
      switchToggled.bind(this, PutWindowUtils.INTELLIGENT_CORNER_MOVEMENT));
    ret.attach(intelligentCornerSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_start: 10,
      label: _('Keep width when moving north/south:'),
      tooltip_text: _('Windows will not change their width when moved north or south'),
    }), 0, row, 4, 1);

    const keepWidthSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END});
    keepWidthSwitch.set_active(this._utils.getBoolean(PutWindowUtils.ALWAYS_KEEP_WIDTH, false));
    keepWidthSwitch.connect('notify::active', switchToggled.bind(this, PutWindowUtils.ALWAYS_KEEP_WIDTH));
    ret.attach(keepWidthSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_start: 10,
      label: _('Keep height when moving east/west:'),
      tooltip_text: _('Windows will not change their height when moved east or west'),
    }), 0, row, 4, 1);

    const keepHeightSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END});
    keepHeightSwitch.set_active(this._utils.getBoolean(PutWindowUtils.ALWAYS_KEEP_HEIGHT, false));
    keepHeightSwitch.connect('notify::active', switchToggled.bind(this, PutWindowUtils.ALWAYS_KEEP_HEIGHT));
    ret.attach(keepHeightSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({
      label: _('Moving to corner:'),
      margin_start: 10,
      tooltip_text: _('Adjust window width and height when moved to corner?'),
      halign: Gtk.Align.START,
    }), 0, row, 2, 1);

    const combo = this._createCornerChangesCombo();
    ret.attach(combo, 2, row++, 3, 1);

    // ------------------------------------- center ----------------------------------------
    ret.attach(new Gtk.Label({
      label: `<b>${_('Center Width &amp; Height')}</b>`,
      halign: Gtk.Align.START, use_markup: true,
    }), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({
      orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4,
    }), 0, row++, 5, 1);
    ret.attach(new Gtk.Label({
      halign: Gtk.Align.START,
      margin_start: 10,
      label: _('Keep width when moving from center to south or north:'),
      tooltip_text: _("Don't change width when moving window from center to north or south"),
    }), 0, row, 4, 1);

    const centerKeepWidthSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END});
    centerKeepWidthSwitch.set_active(this._utils.getBoolean(PutWindowUtils.CENTER_KEEP_WIDTH, false));
    centerKeepWidthSwitch.connect('notify::active', switchToggled.bind(this, PutWindowUtils.CENTER_KEEP_WIDTH));
    ret.attach(centerKeepWidthSwitch, 4, row++, 1, 1);

    ret.attach(new Gtk.Label({label: 'First width:', halign: Gtk.Align.START, margin_start: 10}), 0, ++row, 1, 1);
    ret.attach(_createSlider(this._utils, PutWindowUtils.CENTER_WIDTH_0), 1, row++, 4, 1);
    ret.attach(new Gtk.Label({label: 'First height:', halign: Gtk.Align.START, margin_start: 10}), 0, ++row, 1, 1);
    ret.attach(_createSlider(this._utils, PutWindowUtils.CENTER_HEIGHT_0), 1, row++, 4, 1);

    ret.attach(new Gtk.Label({label: 'Second width:', halign: Gtk.Align.START, margin_start: 10}), 0, ++row, 1, 1);
    ret.attach(_createSlider(this._utils, PutWindowUtils.CENTER_WIDTH_1), 1, row++, 4, 1);
    ret.attach(new Gtk.Label({label: 'Second height:', halign: Gtk.Align.START, margin_start: 10}), 0, ++row, 1, 1);
    ret.attach(_createSlider(this._utils, PutWindowUtils.CENTER_HEIGHT_1), 1, row++, 4, 1);

    ret.attach(new Gtk.Label({label: 'Third width:', halign: Gtk.Align.START, margin_start: 10}), 0, ++row, 1, 1);
    ret.attach(_createSlider(this._utils, PutWindowUtils.CENTER_WIDTH_2), 1, row++, 4, 1);
    ret.attach(new Gtk.Label({label: 'Third height:', halign: Gtk.Align.START, margin_start: 10}), 0, ++row, 1, 1);
    ret.attach(_createSlider(this._utils, PutWindowUtils.CENTER_HEIGHT_2), 1, row++, 4, 1);

    return ret;
  }

  _createPositionSettings() {
    let row = 0;
    const positions = new Gtk.Grid();
    positions.column_homogeneous = true;


    const description = _createDescriptionLabel(_('You can define up to three sizes that will be used ' +
            'when you move a window to the same direction multiple times. Equal values are ignored.'));
    positions.attach(description, 0, row++, 6, 1);

    const labels = [_('First:'), _('Second:'), _('Third:')];
    // ------------------------------------- north ----------------------------------------
    positions.attach(new Gtk.Label({label: `<b>${_('North height')}</b>`, halign: Gtk.Align.START, margin_start: 4, margin_top: 4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({
      orientation: Gtk.Orientation.HORIZONTAL, margin_start: 4, margin_top: 4,
    }), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, 'north-height');
    row++;

    // ------------------------------------- south ----------------------------------------
    positions.attach(new Gtk.Label({label: `<b>${_('South height')}</b>`, halign: Gtk.Align.START, margin_start: 4, margin_top: 4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({
      orientation: Gtk.Orientation.HORIZONTAL, margin_start: 4, margin_top: 4,
    }), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, 'south-height');
    row++;


    // ------------------------------------- east ----------------------------------------
    positions.attach(new Gtk.Label({label: `<b>${_('East width')}</b>`, halign: Gtk.Align.START, margin_start: 4, margin_top: 4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({
      orientation: Gtk.Orientation.HORIZONTAL, margin_start: 4, margin_top: 4,
    }), 0, row++, 6, 1);
    row = this._addSliders(positions, row, labels, 'right-side-widths');
    row++;

    // ------------------------------------- west ----------------------------------------
    positions.attach(new Gtk.Label({label: `<b>${_('West width')}</b>`, halign: Gtk.Align.START, margin_start: 4, margin_top: 4, use_markup: true}), 0, row++, 5, 1);
    positions.attach(new Gtk.Separator({
      orientation: Gtk.Orientation.HORIZONTAL, margin_start: 4, margin_top: 4,
    }), 0, row++, 6, 1);
    this._addSliders(positions, row, labels, 'left-side-widths');

    const scroll = new Gtk.ScrolledWindow({vexpand: true, hexpand: true});
    // scroll.add_with_viewport(positions);
    scroll.set_child(positions);

    return scroll;
  }

  _createKeyboardConfig() {
    return this._createBindingList({
      'put-to-corner-ne': _('Move to top right corner'),
      'put-to-corner-nw': _('Move to top left corner'),
      'put-to-corner-se': _('Move to bottom right corner'),
      'put-to-corner-sw': _('Move to bottom left corner'),
      'put-to-side-n': _('Move to top'),
      'put-to-side-e': _('Move to right'),
      'put-to-side-s': _('Move to bottom'),
      'put-to-side-w': _('Move to left'),
      'put-to-center': _('Move to center/maximize'),
      'put-to-left-screen': _('Move to the left screen'),
      'put-to-right-screen': _('Move to the right screen'),
      'put-to-previous-screen': _('Move to the previous screen'),
      'put-to-next-screen': _('Move to the next screen'),
    });
  }

  _createMoveFocusConfig() {
    let row = 0;
    const ret = new Gtk.Grid();
    ret.column_homogeneous = true;

    const description = _createDescriptionLabel(_("'Move Focus' allows you to change the focus based on " +
            'the relative location of the current focused window using the keyboard and to push the currently focused' +
            ' window into the background to get the focus to the windows below.'));
    ret.attach(description, 0, row++, 5, 1);

    const configOptions = [
      {
        key: PutWindowUtils.MOVE_FOCUS_ENABLED,
        label: _("Enable 'Move focus'"),
      }, {
        key: PutWindowUtils.MOVE_FOCUS_ANIMATION,
        label: _('Show animation when moving'),
      },
    ];

    function setParamFunction(obj) {
      // eslint-disable-next-line no-invalid-this
      this.utils.setParameter(this.configName, obj.get_active());
    }

    for (let i = 0; i < configOptions.length; i++) {
      ret.attach(new Gtk.Label({
        halign: Gtk.Align.START,
        margin_start: 4,
        label: `${configOptions[i].label}:`,
      }), 0, row, 4, 1);

      const enabledSwitch = new Gtk.Switch({sensitive: true, halign: Gtk.Align.END, vexpand: false});
      enabledSwitch.set_active(this._utils.getBoolean(configOptions[i].key, true));

      enabledSwitch.connect('notify::active', setParamFunction.bind({
        configName: configOptions[i].key,
        utils: this._utils,
      }));
      ret.attach(enabledSwitch, 4, row++, 1, 1);
    }

    ret.attach(new Gtk.Label({label: `<b>${_('Keyboard bindings')}</b>`, halign: Gtk.Align.START, margin_start: 4, margin_top: 4, use_markup: true}), 0, row++, 5, 1);
    ret.attach(new Gtk.Separator({
      orientation: Gtk.Orientation.HORIZONTAL, margin_start: 4, margin_top: 4, margin_bottom: 4,
    }), 0, row++, 5, 1);

    const keyBinding = this._createBindingList({
      'move-focus-north': _('Move the window focus up'),
      'move-focus-east': _('Move the window focus right'),
      'move-focus-south': _('Move the window focus down'),
      'move-focus-west': _('Move the window focus left'),
      'move-focus-cycle': _('Push focused window to the background'),
      'move-focus-left-screen': _('Move the focus to the left screen'),
      'move-focus-right-screen': _('Move the focus to the right screen'),
    });
    ret.attach(keyBinding, 0, row, 5, 1);

    return ret;
  }

  _createBindingList(bindings) {
    let name;
    const model = new Gtk.ListStore();

    model.set_column_types([
      GObject.TYPE_BOOLEAN,
      GObject.TYPE_STRING,
      GObject.TYPE_STRING,
      GObject.TYPE_INT,
      GObject.TYPE_INT,
    ]);

    for (name in bindings) {
      if (!Object.hasOwn(bindings, name)) {
        continue;
      }
      const enabled = this._utils.getBoolean(`${name}-enabled`);

      if (!enabled) {
        this._utils.set_strv(name, []);
      }

      let unusedOk, key, mods;
      const binding = this._utils.get_strv(name, null)[0];
      if (enabled && binding) {
        [unusedOk, key, mods] = Gtk.accelerator_parse(binding);
      } else {
        [unusedOk, key, mods] = [0, 0];
      }

      const row = model.insert(10);
      if (mods === undefined) {
        mods = null;
      }

      model.set(row, [0, 1, 2, 3, 4], [enabled, name, bindings[name], mods, key]);
    }

    const treeview = new Gtk.TreeView({
      hexpand: true,
      vexpand: true,
      model,
      margin_top: 4,
      margin_bottom: 4,
      margin_start: 4,
      margin_end: 4,
    });

    // enabled column
    let cellrend = new Gtk.CellRendererToggle({'radio': false, 'activatable': true});
    let col = new Gtk.TreeViewColumn({'title': _('Enabled'), 'expand': false});
    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'active', 0);

    function checkboxToggled(toggle, iter) {
      const [unusedSuccessParsing, iterator] = model.get_iter_from_string(iter);
      var value = !model.get_value(iterator, 0);
      model.set(iterator, [0], [value]);
      toggle.set_active(value);

      const configName = model.get_value(iterator, 1);
      // eslint-disable-next-line no-invalid-this
      this._utils.setParameter(`${configName}-enabled`, value ? 1 : 0);
      // disable the keybinding
      if (!value) {
        model.set(iterator, [3, 4], [0, 0]);
      }
    }

    cellrend.connect('toggled', checkboxToggled.bind(this));

    treeview.append_column(col);

    // Action column
    cellrend = new Gtk.CellRendererText();
    col = new Gtk.TreeViewColumn({'title': _('Action'), 'expand': true});
    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'text', 2);
    treeview.append_column(col);

    // keybinding column
    cellrend = new Gtk.CellRendererAccel({
      'editable': true,
      'accel-mode': Gtk.CellRendererAccelMode.GTK,
    });

    function accelEdited(renderer, path, accelKey, accelMods) {
      const [success, iterator] = model.get_iter_from_string(path);

      if (!success) {
        throw new Error(_('Error updating Keybinding'));
      }

      const configName = model.get_value(iterator, 1);
      // eslint-disable-next-line no-invalid-this
      const existingBinding = this._utils.keyboardBindingExists(configName, value);
      if (existingBinding) {
        var md = new Gtk.MessageDialog({
          modal: true,
          message_type: Gtk.MessageType.WARNING,
          buttons: Gtk.ButtonsType.OK,
          text: _('Keyboard binding already defined'),
          secondary_text: _("The binding is already used by '%s'").format(existingBinding),
        });

        md.connect('response', dialog => {
          dialog.destroy();
        });

        md.show();
        return;
      }

      // set the active flag
      // eslint-disable-next-line no-invalid-this
      this._utils.setParameter(`${configName}-enabled`, 1);
      model.set(iterator, [0], [true]);

      model.set(iterator, [3, 4], [accelMods, accelKey]);
      const value = Gtk.accelerator_name(accelKey, accelMods);
      // eslint-disable-next-line no-invalid-this
      this._utils.set_strv(configName, [value]);
    }

    function accelCleared(rend, iter) {
      const [success, iterator] = model.get_iter_from_string(iter);

      if (!success) {
        throw new Error(_('Error clearing keybinding'));
      }

      const configName = model.get_value(iterator, 1);

      // set the active flag
      // eslint-disable-next-line no-invalid-this
      this._utils.setParameter(`${configName}-enabled`, 0);
      model.set(iterator, [0], [false]);

      model.set(iterator, [3, 4], [0, 0]);
      // eslint-disable-next-line no-invalid-this
      this._utils.set_strv(configName, []);
    }

    cellrend.connect('accel-edited', accelEdited.bind(this));
    cellrend.connect('accel-cleared', accelCleared.bind(this));

    col = new Gtk.TreeViewColumn({'title': _('Modify')});

    col.pack_end(cellrend, false);
    col.add_attribute(cellrend, 'accel-mods', 3);
    col.add_attribute(cellrend, 'accel-key', 4);

    treeview.append_column(col);

    return treeview;
  }
}
);

export default class PutWindowsPrefs extends ExtensionPreferences {
  getPreferencesWidget() {
    const settings = this.getSettings();
    return new PutWindowSettingsWidget(settings);
  }
}
