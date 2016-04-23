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
 * zara86 - gnome-shell 3.16 support
 * cleverlycoding - gnome-shell 3.18 support

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
* Fedora: 
** `sudo yum install libwnck3` (should be installed on F19)
** `sudo dnf install linwnck3` (dnf is the new yum since F23)
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

In version 3.2 it was not possible for extension developers to add custom keybinding. This extension works (or let's better call say "worked") with v3.2 and  used pre defined global keyboard binding. 


For details, how to configure the extension in v3.2, please check the [[wiki|https://github.com/negesti/gnome-shell-extensions-negesti/wiki/Gnome-Shell-3.2]]


Multi screen setup support
-------

the extention works well with mutliple screens.

Moving windows from one screen to another is currently only possible in horizontal setup. e.g. a window that is a the left or right side of one screen, can be moved to the next screen using keyboard shortcuts.

 * Move to left screen: default binding: <Super> <Shift> Left 
 * Move to right screen: default binding: <Super> <Shift> Right

The keyboard settings can be changed using the preferences.


License:
--------

Copyright (c) 2011-2016 Clemens Eberwein

This program is free software; you can redistribute it and/or
modify it under the terms of VERSION 2 of the GNU General Public
License as published by the Free Software Foundation provided
that the above copyright notice is included.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
Go to http://www.gnu.org/licenses/gpl-2.0.html to get a copy
of the license.
