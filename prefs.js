import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import PutWindowUtils from './utils.js';
import {createSlider, createKeyboardBindings, IdValueComboItem} from './prefsHelper.js';

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
      [4, _('Nothing on first move, both on second')],
      [5, _('Nothing on first move, Only height on second')],
      [6, _('Nothing on first move, Only width on second')],
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
      title: _('Moving to corner:'),
      tooltip_text: _('Adjust window width and height when moved to corner?'),
      model: this._combo_model,
      expression: Gtk.PropertyExpression.new(IdValueComboItem, null, 'name-property'),
      selected: selectMe,
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
      title: _('Center Width & Height'),
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
      title: _('Move to center maximizes and restores initial window size (first w/h only)'),
      tooltip_text: _('Maximize the window on first move and restore original size ' +
          'and position on second. Only works with first width/height'),
      action_name: `put-windows.${PutWindowUtils.MOVE_CENTER_ONLY_TOGGLES}`,
    }));

    group.add(new Adw.SwitchRow({
      title: _('Keep width when moving from center to south or north:'),
      tooltip_text: _("Don't change width when moving window from center to north or south"),
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

    const labels = [_('First:'), _('Second:'), _('Third:')];

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


    const group = new Adw.PreferencesGroup({
      title: _('Width and height to use if window is moved to the center'),
    });

    this.add(group);

    group.add(createKeyboardBindings(utils, {
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
    }));
  }
}

class MoveFocusSettings extends Adw.PreferencesPage {
  static {
    GObject.registerClass(this);
  }

  constructor(settings, utils) {
    super({
      title: _('Move Focus'),
      icon_name: 'focus-windows-symbolic',
    });

    const group = new Adw.PreferencesGroup({
      title: 'Move Focus',
      description: _("'Move Focus' allows you to change the focus based on " +
          'the relative location of the current focused window using the keyboard and to push the currently focused' +
          ' window into the background to get the focus to the windows below.'),
    });
    this.add(group);

    this._actionGroup = new Gio.SimpleActionGroup();
    this.insert_action_group('move-focus', this._actionGroup);

    for (const key of utils.getMoveFocusSettings()) {
      this._actionGroup.add_action(settings.create_action(key));
    }

    group.add(new Adw.SwitchRow({
      title: _("Enable 'Move focus'"),
      action_name: `move-focus.${PutWindowUtils.MOVE_FOCUS_ENABLED}`,
    }));

    group.add(new Adw.SwitchRow({
      title: _('Show animation when moving'),
      action_name: `move-focus.${PutWindowUtils.MOVE_FOCUS_ANIMATION}`,
    }));

    group.add(createKeyboardBindings(utils, {
      'move-focus-north': _('Move the window focus up'),
      'move-focus-east': _('Move the window focus right'),
      'move-focus-south': _('Move the window focus down'),
      'move-focus-west': _('Move the window focus left'),
      'move-focus-cycle': _('Push focused window to the background'),
      'move-focus-left-screen': _('Move the focus to the left screen'),
      'move-focus-right-screen': _('Move the focus to the right screen'),
    }));
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
    window.add(new MoveFocusSettings(settings, utils));
  }
}
