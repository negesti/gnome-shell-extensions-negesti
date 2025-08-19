import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 *
 *
 * @param {PutWindowUtils} utils
 * @param {string} configName
 * @param {string} title
 * @param {number} mark
 * @returns {Adw.ActionRow}
 */
export function createSlider(utils, configName, title, mark) {
  const scale = new Gtk.Scale({
    digits: 0,
    sensitive: true,
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_end: 0,
    margin_start: 0,
    hexpand: true,
    halign: Gtk.Align.FILL,
    draw_value: true,
    value_pos: Gtk.PositionType.RIGHT,
  });
  scale.set_range(0, 100);
  scale.set_value(utils.getNumber(configName, 50));
  scale.set_value_pos(Gtk.PositionType.RIGHT);
  if (mark) {
    scale.add_mark(mark, Gtk.PositionType.GTK_POS_TOP, null);
  }

  const valueChanged = obj => {
    utils.setParameter(configName, obj.get_value());
  };

  scale.connect('value-changed', valueChanged.bind({utils, configName}));

  const row = new Adw.ActionRow({
    title: _(title),
    activatable_widget: scale,
  });

  row.add_suffix(scale);

  return row;
}

/**
 *
 * @param {PutWindowUtils} utils
 * @param {Array} bindings
 * @returns {Adw.PreferencesGroup}
 */
export function createKeyboardBindings(utils, bindings) {
  const group = new Adw.PreferencesGroup({
    title: _('Keyboard Shortcuts'),
    description: _('Click “Set”, then press a key combination. Press Backspace or Escape to clear. ' +
        'Already used key combination are ignored/must be cleared first'),
  });

  Object.entries(bindings).forEach(([name, label]) => {
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
      label: _('Set shortcut'),
      valign: Gtk.Align.CENTER,
    });

    // Recording state
    let recording = false;
    let keyController = null;
    let keyPressedHandler = null;

    const stopRecording = () => {
      recording = false;
      setBtn.label = _('Set');
      setBtn.sensitive = true;
      if (keyController) {
        if (keyPressedHandler != null) {
          keyController.disconnect(keyPressedHandler);
        }
        keyController = null;
      }
    };

    const startRecording = () => {
      if (recording) {
        return;
      }
      recording = true;
      setBtn.label = _('Press keys…');
      // Prevent accidental clicks while recording
      setBtn.sensitive = false;

      const toplevel = row.get_root();
      if (!toplevel) {
        stopRecording();
        return;
      }

      // Capture at the window level, in CAPTURE phase to reliably get modifiers (including Super)
      keyController = new Gtk.EventControllerKey();
      keyController.propagation_phase = Gtk.PropagationPhase.CAPTURE;

      keyPressedHandler = keyController.connect('key-pressed', (_ctrl, keyval, _keycode, state) => {
        // Clear on ESC or Backspace
        if (keyval === Gdk.KEY_Escape || keyval === Gdk.KEY_BackSpace) {
          utils.set_strv(name, []);
          shortcutLabel.accelerator = '';
          stopRecording();
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

        stopRecording();
        return Gdk.EVENT_STOP;
      });

      // Attach controller to the toplevel window so it sees all key events
      toplevel.add_controller(keyController);
    };

    const shortcutBox = new Gtk.Box({
      spacing: 6,
      halign: Gtk.Align.END,
    });


    setBtn.connect('clicked', () => {
      if (!recording) {
        startRecording();
      } else {
        stopRecording();
      }
    });
    shortcutBox.append(shortcutLabel);
    shortcutBox.append(setBtn);
    row.add_suffix(shortcutBox);


    group.add(row);
  });

  return group;
}

export const IdValueComboItem = GObject.registerClass({
  GTypeName: 'IdValueComboItem',
  Properties: {
    'name-property': GObject.ParamSpec.string(
      'name-property',
      'Name property',
      'Name / Label to display',
      GObject.ParamFlags.READWRITE,
      'My fancy label'
    ),
    'id-property': GObject.ParamSpec.int(
      'id-property',
      'Id property',
      'id/Value that will be stored in settings',
      GObject.ParamFlags.READWRITE,
      '0'
    ),
  },
}, class IdValueComboItem extends GObject.Object {
  constructor(constructProperties = {}) {
    super(constructProperties);
  }

  get name_property() {
    if (this._name_property === undefined) {
      this._name_property = null;
    }

    return this._name_property;
  }

  set name_property(value) {
    if (this._name_property === value) {
      return;
    }

    this._name_property = value;
  }

  get id_property() {
    if (this._id_property === undefined) {
      this._id_property = null;
    }

    return this._id_property;
  }

  set id_property(value) {
    if (this._id_property === value) {
      return;
    }

    this._id_property = value;
  }
});
