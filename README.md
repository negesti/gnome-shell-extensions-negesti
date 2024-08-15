Put Window
==========


An gnome-shell extension that makes window movement a lot easier.

[![Friend of GNOME](http://www-old.gnome.org/friends/banners/friends-of-gnome.png)](http://www.gnome.org/friends/ "Friend of GNOME")

## Installation

As you ended up here, I assume the installation from [extensions.gnome.org](https://extensions.gnome.org/extension/39/put-windows/) didn't work :)

If you want to contribute or go the 'git way' just clone this extension and link it to the .local extension folder. This way you can always update the extension using `git pull`.

     ln -s "PATH_TO_YOUR_CLONE" ~/.local/share/gnome-shell/extensions/putWindow@clemens.lab21.org
                    
## Gnome Shell 46.0 

Checke #208 for more details and current status

## Configuration

The extension can be configured using the gnome prefs tool.
* East/West widths, North/South heights  
* Keybindings
* Change width and height when moving to corner (Always, only height, only width)
* Use multiple widths even if moving to other screen is possible
* Move focus using the keyboard
   * move-focus-north/east/south/west using super + i/l/k/j (default)
* Application based config (hit the save button)


## Multi screen setup support

The extension works well with mutliple screens.

Moving windows from one screen to another is currently only possible in horizontal setup. e.g. a window that is a the left or right side of one screen, can be moved to the next screen using keyboard shortcuts.

 * Move to left screen: default binding: <Super> <Shift> Left 
 * Move to right screen: default binding: <Super> <Shift> Right

The keyboard settings can be changed using the preferences.

## Gnome Version <= 44.0

Gnome 45 introduced breaking changes and the extension was not updated until 
v46 was released. As of now the application based config was removed with v46.0
and the extension no longer requires Wnck.

### Wayland & Wnck

For application based configuration the extension relies on the X11 library wnck.

* Suse: `sudo zypper in libwnck-devel`
* Arch: `pacman -S libwnck3`
* Fedora:
  * `sudo yum install libwnck3`
  * `sudo dnf install libwnck3`
* Debian/Ubuntu: `apt-get install gir1.2-wnck-3.0`

Because of this dependency and the different concepts of wayland and X11 to identify applications (wm_class vs. application_id) **Wayland is not supported**!

As wayland is no real alternative for me until global keyboard/mouse grab is supported, I don't plan to switch to wayland and will not actively work on wayland support.

For more details please check the associated issues
* [Issue 109](https://github.com/negesti/gnome-shell-extensions-negesti/issues/109)
* [Issue 124](https://github.com/negesti/gnome-shell-extensions-negesti/issues/124)



Contributors
-------------
 * krlmr - Move to other display
 * 73 - Move focus 
 * Anthony25 - gnome-shell 3.12 support
 * airtonix - gnome-shell 3.5 support
 * zara86 - gnome-shell 3.16 support
 * cleverlycoding - gnome-shell 3.18 support
 * wdoekes - cleanup, improve move to center
 * eddy-geek - gnome-shell 3.30 support 

License
--------
Copyright (c) 2011-2022 [negesti](https://github.com/negesti/)

This program is free software; you can redistribute it and/or
modify it under the terms of VERSION 3 of the GNU General Public
License as published by the Free Software Foundation provided
that the above copyright notice is included.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
Go to http://www.gnu.org/licenses/gpl-3.0.html to get a copy
of the license (or check the licence file)

