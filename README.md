Put Window
==========


An gnome-shell extension that makes window movement a lot
easier. It can be compared with a basic version of the compiz
grid plugin.

[![Friend of GNOME](http://www-old.gnome.org/friends/banners/friends-of-gnome.png)](http://www.gnome.org/friends/ "Friend of GNOME")

Contributors
-------------
 * krlmr - Move to other display
 * 73 - Move focus 
 * Anthony25 - gnome-shell 3.12 support
 * airtonix - gnome-shell 3.5 support
 * zara86 - gnom-shell 3.16 support

Configuration
-------------

The extension can be configured using the gnome prefs tool.
 * East/West widths, North/South heights  
 * Keybindings
 * Change width and height when moving to corner (Always, only height, only width)
 * Use multiple widths even if moving to other screen is possible
 * Move focus using the keyboard
  * move-focus-north/east/south/west using super + i/l/k/j (default)
 * Application based config (hit the save button)

Wnck
-----
For application base configuration the extension requires the wnck library. If wnck is not installed, you can not open
the preferences window

* Suse: `sudo zypper in libwnck-devel`
* Arch: `pacman -S libwnck3`
* Fedora: `sudo yum install libwnck3` (should be installed on F19)
* Debian/Ubuntu: `apt-get install gir1.2-wnck-3.0`

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



ChangeLog
-------

__June 24, 2014__
* support gnome-shell 3.12
* #56 allow the user to disable keybindings

__October 6, 2013__
 * Conributed by  @krlmlr 
  * Fixed #37 Moving maximized window to other display
  * General improvement for "move to other display"

__July 20, 2013__
 * Settings are now organized in tabs
 * New feature 'intelligent corner movement'
 * New config option to keep window width when moving from center to north/south
 * additional options for "move to corner". When moving to a corner you have the choice to change:
  * both
  * only height
  * only width
  * never change size
  * Nothing on first move, both on second
  * Nothing on first move, only height on second
  * Nothing on first move, only width on second

__April 17, 2013__
 * "Move Focus" using the keyboard 
 * Fix for overlapping windows
 * Contributors: @73

__December 27, 2012__
 * Config to change center/maximize to maximize/center

__Octover 31, 2012__
 * new the config ui including 3 heights
 * fix window height if topPanel is visible

__Octover 30, 2012__
 * Support multiple heights when moving to top/bottom
 * "move to corner" uses widths and heights defined for sides
  * atm NO CONFIG UI to define heights (can be modified in utils.js)
  * CORNER_CHANGE_WIDTH
   * true... move to corner multiple times will change width and height
   * false.. width is not changed, if the window is has a "known" width

__October 9, 2012__
 * Support multiple widths when moving to left/right side
 * Added keybindings to move window to left/right screen

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

