import logging

import json
import pprint

from gi.repository import Gtk, Gio

def str2bool(v):
  return v.lower() in ("yes", "true", "t", "1")

class SettingsWindow(Gtk.Window):
  def __init__(self):
    Gtk.Window.__init__(self, title="PutWindow Settings")
    self._read_json_file()
    self.connect("delete-event", Gtk.main_quit)
    self.set_default_size(400, 250)

    root_content = Gtk.VBox(False, 2)

    toolbar = Gtk.Toolbar()
    save_tb = Gtk.ToolButton(stock_id=Gtk.STOCK_SAVE)
    save_tb.connect("clicked", self._save);

    add_tb = Gtk.ToolButton(stock_id=Gtk.STOCK_ADD);
    add_tb.connect("clicked", self._add_app);

    del_tb = Gtk.ToolButton(stock_id=Gtk.STOCK_DELETE);
    del_tb.connect("clicked", self._remove_app);

    toolbar.insert(save_tb, 0)
    toolbar.insert(add_tb, 1)
    toolbar.insert(del_tb, 2)

    root_content.pack_start(toolbar, False, True, 0)

    self.content = Gtk.Paned()

    self.apps = Gtk.ListStore(str)
    self.apps.append(["Common Settings"])
    self._csView = CommonSettingsView()

    self.mainContent = Gtk.VBox()
    self.mainContent.pack_start(self._csView.widget, False, False, 0)

    self._appView = dict()
    for app in self._apps["locations"].items():
      self.apps.append([app[0]])
      self._appView[app[0]] = AppLocationView(app[1])
      self.mainContent.pack_start(self._appView[app[0]].widget, False, False, 0)

    self.tree_view = Gtk.TreeView(model=self.apps)
    self.tree_view.append_column(Gtk.TreeViewColumn("Applications", Gtk.CellRendererText(), text=0))

    self.tree_view.get_selection().connect("changed", self._on_selection_changed)
    self.content.add1(self.tree_view)

    self.content.add2(self.mainContent)

    root_content.pack_end(self.content, True, True, 0)

    self.add(root_content)

  def show(self):
    self.show_all()
    self.hide_all()

  def hide_all(self):
    Gtk.Widget.hide(self._csView.widget)
    for app in self._appView.items():
        Gtk.Widget.hide(app[1].widget)

  def _read_json_file(self):
    f = open("putWindow.json")
    json_data=f.read()
    f.close()
    self._apps = json.loads(json_data)

  def _save(self, btn):
    locations = dict()
    for app in self._appView.items():
      print app[0]
      locations[app[0]] = app[1].get_data()

    data = dict()
    data["locations"] = locations

    f = open('putWindow.json', 'w')
    f.write(json.dumps(data, indent=2))
    f.close()
    self._show_message("Successfully saved!", "", Gtk.MessageType.INFO)

  def _remove_app(self, btn):
    model, selected = self.tree_view.get_selection().get_selected()

    if selected:
      path_selected = model.get_path(selected)
      root = model.get_iter_first()
      while root:
        if model.get_path(root) != path_selected:
          sel = model.get_value(root, 0)
        root = model.iter_next(root)

      # show the selected
      sel = model.get_value(selected, 0)
      self.hide_all()
      if (sel != "Common Settings"):
        dialog = Gtk.MessageDialog(self, 0, Gtk.MessageType.QUESTION,
            Gtk.ButtonsType.YES_NO, "Delete Application")
        dialog.format_secondary_text(
            "Are you sure you want to delete '%s' ?" % sel)
        response = dialog.run()
        if response == Gtk.ResponseType.YES:
          self.apps.remove(selected)  #remove from the tree
          del self._appView[sel]
        dialog.destroy()


  def _add_app(self, btn):
    dialog = AddAppDialog(self)
    response = dialog.run()

    if response == Gtk.ResponseType.OK:
      app_name = dialog.get_value().strip()
      if (app_name==""):
        self._show_message("Error", "The specified application name is not valid!", Gtk.MessageType.ERROR)
        dialog.destroy()
        return

      data = {
        "autoMove": "false",
        "positions": [{
          "y": "0",
          "width": "50",
          "screen": "0",
          "height": "50",
          "x": "0"
        }]
      }

      self.apps.append([app_name])
      self._appView[app_name] = AppLocationView(data)
      self.mainContent.pack_start(self._appView[app_name].widget, False, False, 0)
      self.tree_view.get_selection().select_path(len(self.apps)-1)

    dialog.destroy()

  def _show_message(self, caption, text, type):
    dialog = Gtk.MessageDialog(self, 0, type, Gtk.ButtonsType.OK, caption)
    dialog.format_secondary_text(text)
    dialog.run()
    dialog.destroy()

  def _on_selection_changed(self, selection):
    model, selected = selection.get_selected()
    if selected:
      path_selected = model.get_path(selected)
      root = model.get_iter_first()
      while root:
        if model.get_path(root) != path_selected:
          sel = model.get_value(root, 0)
        root = model.iter_next(root)

      # show the selected
      sel = model.get_value(selected, 0)
      self.hide_all()
      if (sel == "Common Settings"):
        Gtk.Widget.show_all(self._csView.widget)
      else:
        Gtk.Widget.show_all(self._appView[sel].widget)

class CommonSettingsView:
  def __init__(self):
    self._widget = Gtk.Label("Comming Soon")

  @property
  def widget(self):
    return self._widget

class AddAppDialog(Gtk.Dialog):
  def __init__(self, parent):
    Gtk.Dialog.__init__(self, "My Dialog", parent, 0,
        (Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
         Gtk.STOCK_OK, Gtk.ResponseType.OK))

    self.set_default_size(200, 100)

    label = Gtk.Label("Application name: ")
    self.entry = Gtk.Entry()

    box = self.get_content_area()

    content = Gtk.Box(spacing=6)
    content.pack_start(label, True, True, 0)
    content.pack_start(self.entry, True, True, 0)
    box.add(content)
    self.show_all()

  def get_value(self):
    return self.entry.get_text()


class AppLocationView:

  def get_data(self):
    ret = dict()
    if self.autoMoveButton.get_active():
      ret["autoMove"] = "true"
    else:
      ret["autoMove"] = "false"

    loc = []
    for location in self.widgets:
      oneLocation = dict()
      for w in location.items():
        value = "%d" % w[1].get_value()
        oneLocation[w[0]] = value

      loc.append(oneLocation)

    ret["positions"] = loc
    return ret

  def __init__(self, locations):
    self._widget = Gtk.Grid()

    self.autoMoveButton = Gtk.CheckButton(label="Auto move when created", active=str2bool(locations["autoMove"]))
    self._widget.attach(self.autoMoveButton, 0, 0, 2, 1)

    self.widgets = []

    numLocations = 0;
    for config in locations["positions"]:
      row = numLocations * 7 + 1;
      self.widgets.append(dict())

      self._widget.attach(Gtk.Label(label="Location %d:" % (numLocations + 1), halign=Gtk.Align.START), 0, row+1, 3, 1)
      self._widget.attach(Gtk.HSeparator(), 0, row + 2 , 3, 1)

      row +=3
      self._widget.attach(Gtk.Label(label="Screen:", halign=Gtk.Align.START), 0, row, 1, 1,)

      screen_button = Gtk.SpinButton()
      screen_button.set_adjustment(Gtk.Adjustment(float(config["screen"]), 0, 2, 1, 1, 0))
      self._widget.attach(screen_button, 1, row, 1, 1,)

      self.widgets[numLocations]["screen"] = screen_button

      row+=1
      self._widget.attach(Gtk.Label(label="Width:", halign=Gtk.Align.START), 0, row, 1, 1,)

      width_button = Gtk.SpinButton()
      width_button.set_adjustment(Gtk.Adjustment(float(config["width"]), 0, 100, 5, 10, 0))
      self._widget.attach(width_button, 1, row, 1, 1,)
      self.widgets[numLocations]["width"] = width_button

      row+=1
      self._widget.attach(Gtk.Label(label="Height:", halign=Gtk.Align.START), 0, row, 1, 1,)

      height_button = Gtk.SpinButton()
      height_button.set_adjustment(Gtk.Adjustment(float(config["height"]), 0, 100, 5, 10, 0))
      self._widget.attach(height_button, 1, row, 1, 1,)
      self.widgets[numLocations]["height"] = height_button

      row+=1
      self._widget.attach(Gtk.Label(label="X-Position:", halign=Gtk.Align.START), 0, row, 1, 1,)

      pos_x_button = Gtk.SpinButton()
      pos_x_button.set_adjustment(Gtk.Adjustment(float(config["x"]), 0, 100, 5, 10, 0))
      self._widget.attach(pos_x_button, 1, row, 1, 1,)
      self.widgets[numLocations]["x"] = pos_x_button

      row+=1
      self._widget.attach(Gtk.Label(label="Y-Position:", halign=Gtk.Align.START), 0, row, 1, 1,)

      pos_y_button = Gtk.SpinButton()
      pos_y_button.set_adjustment(Gtk.Adjustment(float(config["y"]), 0, 100, 5, 10, 0))
      self._widget.attach(pos_y_button, 1, row, 1, 1,)
      self.widgets[numLocations]["y"] = pos_y_button

      numLocations+=1

  @property
  def widget(self):
    return self._widget


if __name__ == "__main__":
  app = SettingsWindow()
  app.show()
  Gtk.main()
