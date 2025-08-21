import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import PutWindowUtils from './utils.js';
import {createSlider, IdValueComboItem} from './prefsHelper.js';

class MainPage extends Adw.PreferencesPage {
  static {
    GObject.registerClass(this);
  }

  clear() {
    this._combo_model = null;
  }

  constructor(settings, utils) {
    super({
      title: _('Main'),
      icon_name: 'applications-system-symbolic',
    });

    this._actionGroup = new Gio.SimpleActionGroup();
    this.insert_action_group('put-windows', this._actionGroup);

    for (const key of utils.getMainSettings()) {
      this._actionGroup.add_action(settings.create_action(key));
    }

    const group = new Adw.PreferencesGroup({
      title: 'Main settings',
    });

    group.add(new Adw.SwitchRow({
      title: _('Keep window on current screen'),
      tooltip_text: _('Disable this option to move to other screen if possible'),
      action_name: `put-windows.${PutWindowUtils.ALWAYS_USE_WIDTHS}`,

    }));

    group.add(new Adw.SwitchRow({
      title: _('Always ignore top panel'),
      tooltip_text: _('Enable this if you use an extension to hide the top panel'),
      action_name: `put-windows.${PutWindowUtils.IGNORE_TOP_PANEL}`,
    }));

    group.add(new Adw.SwitchRow({
      title: _('Intelligent corner movement'),
      tooltip_text: _('Moving from E to S moves to SE not S'),
      action_name: `put-windows.${PutWindowUtils.INTELLIGENT_CORNER_MOVEMENT}`,
    }));

    group.add(new Adw.SwitchRow({
      title: _('Keep width when moving north/south'),
      tooltip_text: _('Windows will not change their width when moved north or south'),
      action_name: `put-windows.${PutWindowUtils.ALWAYS_KEEP_WIDTH}`,
    }));

    group.add(new Adw.SwitchRow({
      title: _('Keep height when moving east/west'),
      tooltip_text: _('Windows will not change their height when moved east or west'),
      action_name: `put-windows.${PutWindowUtils.ALWAYS_KEEP_HEIGHT}`,
    }));


    group.add(this.createCornerChangeCombo(settings, utils));

    this.add(group);
  }

  createCornerChangeCombo(settings, utils) {
    this._combo_model = new Gio.ListStore();

    const currentValue = utils.getNumber(PutWindowUtils.CORNER_CHANGE, 0);

    const values = [
      [0, _('Both')],
      [1, _('Only height')],
      [2, _('Only width')],
      [3, _('Never change size')],
      [4, _('Both on second second move')],
      [5, _('Height on second move')],
      [6, _('Wiidth on second move')],
    ];

    let selectMe = 0;
    for (let i = 0; i < values.length; i++) {
      const addMe = new IdValueComboItem();
      addMe.id_property = values[i][0];
      addMe.name_property = values[i][1];
      this._combo_model.append(addMe);
      if (values[i][0] === currentValue) {
        selectMe = i;
      }
    }

    const comboRow = new Adw.ComboRow({
      title: _('Moving to corner'),
      tooltip_text: _('Adjust window width and height when moved to corner?'),
      model: this._combo_model,
      expression: Gtk.PropertyExpression.new(IdValueComboItem, null, 'name-property'),
      selected: selectMe
    });

    comboRow.connect('notify::selected', () => {
      const selectedItem = comboRow.selected_item;

      if (selectedItem) {
        utils.setParameter(PutWindowUtils.CORNER_CHANGE, selectedItem.id_property);
      }
    });
    return comboRow;
  }
}


class CenterPage extends Adw.PreferencesPage {
  static {
    GObject.registerClass(this);
  }

  constructor(settings, utils) {
    super({
      title: _('Center'),
      icon_name: 'format-justify-center-symbolic',
    });

    this._actionGroup = new Gio.SimpleActionGroup();
    this.insert_action_group('put-windows', this._actionGroup);
    this._actionGroup.add_action(settings.create_action(PutWindowUtils.CENTER_KEEP_WIDTH));
    this._actionGroup.add_action(settings.create_action(PutWindowUtils.MOVE_CENTER_ONLY_TOGGLES));

    const group = new Adw.PreferencesGroup({
      title: _('Width and height to use if window is moved to the center'),
    });


    group.add(new Adw.SwitchRow({
      title: _('Maximize the window on first move and restore original size and position on second.'),
      action_name: `put-windows.${PutWindowUtils.MOVE_CENTER_ONLY_TOGGLES}`,
    }));

    group.add(new Adw.SwitchRow({
      title: _('Keep width when moving from center to south or north'),
      action_name: `put-windows.${PutWindowUtils.CENTER_KEEP_WIDTH}`,

    }));

    group.add(createSlider(utils, PutWindowUtils.CENTER_WIDTH_0, 'First width', 34));
    group.add(createSlider(utils, PutWindowUtils.CENTER_HEIGHT_0, 'First height', 34));
    group.add(createSlider(utils, PutWindowUtils.CENTER_WIDTH_1, 'Second width', 66));
    group.add(createSlider(utils, PutWindowUtils.CENTER_HEIGHT_1, 'Second height', 66));
    group.add(createSlider(utils, PutWindowUtils.CENTER_WIDTH_2, 'Third width', 100));
    group.add(createSlider(utils, PutWindowUtils.CENTER_HEIGHT_2, 'Third height', 100));

    this.add(group);
  }
}


class PositionPage extends Adw.PreferencesPage {
  static {
    GObject.registerClass(this);
  }

  constructor(settings, utils) {
    super({
      title: _('Width & Height'),
      icon_name: 'view-grid-symbolic',
    });

    const groups = [
      {
        title: 'North height',
        config: 'north-height-',
      }, {
        title: 'South height',
        config: 'south-height-',
      }, {
        title: 'West width',
        config: 'left-side-widths-',
      }, {
        title: 'West height',
        config: 'right-side-widths-',
      },
    ];

    const labels = [_('First'), _('Second'), _('Third')];

    const evenMarks = [50, 66, 34];
    const oddMarks = [50, 34, 66];

    for (let i = 0; i < groups.length; i++) {
      const group = new Adw.PreferencesGroup({
        title: groups[i].title,
      });
      this.add(group);

      const marks = i % 2 === 0 ? evenMarks : oddMarks;

      for (let j = 0; j < labels.length; j++) {
        group.add(
          createSlider(utils, groups[i].config + j, labels[j], marks[j])
        );
      }
    }
  }
}

class KeyboardSettings extends Adw.PreferencesPage {
  static {
    GObject.registerClass(this);
  }

  constructor(utils) {
    super({
      title: _('Keyboard Shortcuts'),
      icon_name: 'input-keyboard-symbolic',
    });

    this.recording = false;
    this.keyController = null;
    this.keyPressedHandler = null;

    const group = new Adw.PreferencesGroup({
      title: _('Width and height to use if window is moved to the center'),
    });

    this.add(group);

    const keyboardGroup = new Adw.PreferencesGroup({
      title: _('Keyboard Shortcuts'),
      description: _('Click “Edit”, then press a key combination. Press Backspace or Escape to clear.'),
    });

    group.add(keyboardGroup);

    const bindings = {
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
    };

    Object.entries(bindings).forEach(([name, label]) => {
      keyboardGroup.add(this._createKeyboardBinding(utils, name, label));
    });
  }

  /**
   *
   * @param {PutWindowUtils} utils
   * @param {string} name
   * @param {string} label
   * @returns {Adw.ActionRow}
   */
  _createKeyboardBinding(utils, name, label) {
    const current = utils.get_strv(name, null)[0] || '';

    const row = new Adw.ActionRow({
      title: _(label),
    });

    const shortcutLabel = new Gtk.ShortcutLabel({
      accelerator: current,
      hexpand: false,
      halign: Gtk.Align.END,
    });

    const setBtn = new Gtk.Button({
      label: _('Edit'),
      valign: Gtk.Align.CENTER,
    });


    const shortcutBox = new Gtk.Box({
      spacing: 6,
      halign: Gtk.Align.END,
    });


    setBtn.connect('clicked', () => {
      if (!this.recording) {
        this.startRecording(utils, row, setBtn, name, shortcutLabel);
      } else {
        this.stopRecording(setBtn);
      }
    });
    shortcutBox.append(shortcutLabel);
    shortcutBox.append(setBtn);
    row.add_suffix(shortcutBox);

    return row;
  }

  stopRecording(setBtn) {
    this.recording = false;
    setBtn.label = _('Edit');
    setBtn.sensitive = true;
    if (this.keyController) {
      if (this.keyPressedHandler !== null) {
        this.keyController.disconnect(this.keyPressedHandler);
      }
      this.keyController = null;
    }
  }

  startRecording(utils, row, setBtn, name, shortcutLabel) {
    if (this.recording) {
      return;
    }
    this.recording = true;
    setBtn.label = _('Press keys…');
    // Prevent accidental clicks while recording
    setBtn.sensitive = false;

    const toplevel = row.get_root();
    if (!toplevel) {
      this.stopRecording(setBtn);
      return;
    }

    // Capture at the window level, in CAPTURE phase to reliably get modifiers (including Super)
    this.keyController = new Gtk.EventControllerKey();
    this.keyController.propagation_phase = Gtk.PropagationPhase.CAPTURE;

    this.keyPressedHandler = this.keyController.connect('key-pressed', (_ctrl, keyval, _keycode, state) => {
      // Clear on ESC or Backspace
      if (keyval === Gdk.KEY_Escape || keyval === Gdk.KEY_BackSpace) {
        utils.set_strv(name, []);
        shortcutLabel.accelerator = '';
        this.stopRecording(setBtn);
        return Gdk.EVENT_STOP;
      }

      // Ignore pure modifiers
      if (keyval === 0 ||
          keyval === Gdk.KEY_Shift_L || keyval === Gdk.KEY_Shift_R ||
          keyval === Gdk.KEY_Control_L || keyval === Gdk.KEY_Control_R ||
          keyval === Gdk.KEY_Alt_L || keyval === Gdk.KEY_Alt_R ||
          keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R ||
          keyval === Gdk.KEY_Meta_L || keyval === Gdk.KEY_Meta_R) {
        return Gdk.EVENT_STOP;
      }

      // Only keep standard accelerator modifiers
      const mods = state & (
        Gdk.ModifierType.SHIFT_MASK |
        Gdk.ModifierType.CONTROL_MASK |
        Gdk.ModifierType.MOD1_MASK |     // Alt
        Gdk.ModifierType.SUPER_MASK |
        Gdk.ModifierType.META_MASK
      );

      const accelName = Gtk.accelerator_name(keyval, mods);

      // Save and update label
      utils.set_strv(name, [accelName]);
      shortcutLabel.accelerator = accelName;

      this.stopRecording(setBtn);
      return Gdk.EVENT_STOP;
    });

    // Attach controller to the toplevel window so it sees all key events
    toplevel.add_controller(this.keyController);
  }
}

export default class PutWindowPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const utils = new PutWindowUtils(settings);

    window.add(new MainPage(settings, utils));
    window.add(new CenterPage(settings, utils));
    window.add(new PositionPage(settings, utils));
    window.add(new KeyboardSettings(utils));
  }
}
