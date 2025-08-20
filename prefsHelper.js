import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * Create a Adw.ActionRow with the and update the int value of the given config
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
