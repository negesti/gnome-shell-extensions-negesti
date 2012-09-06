Put Window
==========


An gnome-shell extension that makes window movement a lot
easier. It can be compared with a basic version of the compiz
grid plugin.

[![Friend of GNOME](http://www-old.gnome.org/friends/banners/friends-of-gnome.png)](http://www.gnome.org/friends/ "Friend of GNOME")

ChangeLog
-------

__July 13, 2012__
 * Fixed config reload -> no need to reload the shell

__July 08, 2012__
 * KNOWN ISSUES: config is not reloaded after modifying with the prefs tool (manual reload required)
 * moved config to gsettings
 * custom keybindings using gsettings

__May 31, 2012__
 * dont maximize chrome, resize it to max-size (e.g. dont change into fullscreen mode)

__May 12, 2012__

 * Added GTK Settings window
  * Open from [extensions.gnome.org](https://extensions.gnome.org/local/)
  * Open from command line `gnome-shell-extension-prefs putWindow@clemens.lab21.org`

__April 26, 2012__

 * Extension is now **3.4** compatible (Tested with 3.4.1)
 * SettingsWindow is disabled for the moment (will be replaced by tweak-tool "plugin")
 * **The shell uses gsettings now!**

__January 15, 2012__

 * added a config ui
 * position.x/y/width/height must be integers between 0 and 100 (was 0...1)

__December 17, 2011__

 * fix a bug that occures if the top panel is hidden.
  * checkout https://extensions.gnome.org/extension/42/auto-hide-top-panel/ it's awesome!

__December 11, 2011__

 * reduced the horizontal and vertical "gap" between windows
 * hitting move_to_center twice will now correctly maximize evolution

Configuration
-------------

The extension can be configured using the gnome prefs tool.
 * Keybindings are updated when you edit them in the settings window.
 * All other changes are not saved until you hit the save button


Keybindings
-----------

__Gnome Shell >= 3.4__
Keybindings are configured using gsettings stored in a custom schema file inside the extension directory. To
modify the keybindings use the "gnome prefs tool".

The following keys are available:

* put-to-side-n
  *  move to north edge, height: 50% width 100%
* put-to-side-e
  *  move to easth edge, height: 100% width 50%
* put-to-side-s
  *  move to south edge, height: 50% width 100%
* put-to-side-w
  *  move to west  edge, height: 100% width 50%
* put-to-corner-XY   width 50% height 50%
  *  move-to-corner-ne
  *  move-to-corner-se
  *  move-to-corner-sw
  *  move-to-corner-nw
* put-to-center
  *  move to center of the screen, widht 50% height 50%. Press twice to maximize the window
* put-to-location
  *  resize to a configured location (see wiki for details)

__Gnome Shell 3.2__
The keybinding can not be stored in a custom schema. The extension uses de predefined bindings
/apps/metacity/window_keybindings. Modify ghem with gconf-editor/gconftool/gconftool-2.
    run gconf-editor /apps/metacity/window_keybindings
    
For details how to configure it, please check the wiki.

2 screen setup support
-------

the extention works well with 2 screens in horizontal setup.

Moving windows from one screen to another only possible widh side_e and side_w
and only if windows was at side_e (or side_w) before. eg.

* a window in corner_nw of the right screen is not move to the left screen.
* a window at side_e of the right screen is move to the left screen (side_w)


- - -
TODO
----

* 2 screens support vor vertical alignment
* reload config

