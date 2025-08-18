import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export function createSlider(utils, configName, title, mark) {
  const scale = new Gtk.Scale({
    digits: 0,
    sensitive: true,
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_end: 0,
    margin_start: 0,
    hexpand: true,
    halign: Gtk.Align.FILL,
    draw_value: true,  // Enable value display
    value_pos: Gtk.PositionType.RIGHT  // Position of the value
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
    activatable_widget: scale
  });

  row.add_suffix(scale);

  return row;

}

export function createBindingList(utils, bindings) {
  let name;
  const model = new Gtk.ListStore();

  model.set_column_types([
    GObject.TYPE_BOOLEAN,
    GObject.TYPE_STRING,
    GObject.TYPE_STRING,
    GObject.TYPE_INT,
    GObject.TYPE_INT,
  ]);

  for (const name in bindings) {
    if (!Object.hasOwn(bindings, name)) {
      continue;
    }
    const enabled = utils.getBoolean(`${name}-enabled`);

    if (!enabled) {
      utils.set_strv(name, []);
    }

    let unusedOk, key, mods;
    const binding = utils.get_strv(name, null)[0];
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
    utils.setParameter(`${configName}-enabled`, value ? 1 : 0);
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
    const value = Gtk.accelerator_name(accelKey, accelMods);
    // eslint-disable-next-line no-invalid-this
    const existingBinding = utils.keyboardBindingExists(configName, value);
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
    utils.setParameter(`${configName}-enabled`, 1);
    model.set(iterator, [0], [true]);

    model.set(iterator, [3, 4], [accelMods, accelKey]);
    // eslint-disable-next-line no-invalid-this
    utils.set_strv(configName, [value]);
  }

  function accelCleared(rend, iter) {
    const [success, iterator] = model.get_iter_from_string(iter);

    if (!success) {
      throw new Error(_('Error clearing keybinding'));
    }

    const configName = model.get_value(iterator, 1);

    // set the active flag
    // eslint-disable-next-line no-invalid-this
    utils.setParameter(`${configName}-enabled`, 0);
    model.set(iterator, [0], [false]);

    model.set(iterator, [3, 4], [0, 0]);
    // eslint-disable-next-line no-invalid-this
    utils.set_strv(configName, []);
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


export const IdValueComboItem = GObject.registerClass({
  GTypeName: 'IdValueComboItem',
  Properties: {
    'name-property': GObject.ParamSpec.string(
        'name-property',
        'Name property',
        'Name / Label to display',
        GObject.ParamFlags.READWRITE,
        "My fancy label"
    ),
    'id-property': GObject.ParamSpec.int(
        'id-property',
        'Id property',
        'id/Value that will be stored in settings',
        GObject.ParamFlags.READWRITE,
        "0"
    ),
  },
}, class IdValueComboItem extends GObject.Object {
  constructor(constructProperties = {}) {
    super(constructProperties);
  }

  get name_property() {
    if (this._name_property === undefined)
      this._name_property = null;

    return this._name_property;
  }

  set name_property(value) {
    if (this._name_property === value)
      return;

    this._name_property = value;
  }

  get id_property() {
    if (this._id_property === undefined)
      this._id_property = null;

    return this._id_property;
  }

  set id_property(value) {
    if (this._id_property === value)
      return;

    this._id_property = value;
  }
});