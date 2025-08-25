Put Window
==========


An gnome-shell extension that makes window movement a lot easier.

[![Friend of GNOME](http://www-old.gnome.org/friends/banners/friends-of-gnome.png)](http://www.gnome.org/friends/ "Friend of GNOME")

## Installation

As you ended up here, I assume the installation from [extensions.gnome.org](https://extensions.gnome.org/extension/39/put-windows/) didn't work :)

If you want to contribute or go the 'git way' just clone this extension and link it to the .local extension folder. This
way you can always update the extension using `git pull`. However wayland will not detect any updated until the next reboot.

     ln -s "PATH_TO_YOUR_CLONE" ~/.local/share/gnome-shell/extensions/putWindow@clemens.lab21.org

## Configuration

The extension can be configured using the gnome prefs tool.
* East/West widths, North/South heights
* Keybindings
* Change width and height when moving to corner (Always, only height, only width)
* Use multiple widths even if moving to other screen is possible

## Multi screen setup support

Moving windows from one screen to another is currently only possible in horizontal setup. e.g. a window that is a the
left or right side of one screen, can be moved to the next screen using keyboard shortcuts.

* Move to left screen: default binding: <Super> <Shift> Left
* Move to right screen: default binding: <Super> <Shift> Right

The keyboard settings can be changed using the preferences.

**Note**:  <Super> <Shift> Left/Right is a default gnome-shell keyboard shortcut. Leave the keyboard bindings unset if
you want to use gnomes build in funcitonality.
                    
## Gnome Shell 48 and later 

First release using GTK 4 for preferences. This version is not backward compatible with earlier versions and
may require reconfiguring features and keyboard binding. 

"Move Focus" and "application based configuration" are no longer supported and have been removed

## Gnome SHell 45, 46, 47

The extension "worked" with these version but no preferences can be changed.

## Gnome Version 44 and earlier

Gnome 45 introduced breaking changes and the extension was not updated until v46 was released. As of now
the application based config was removed with v46.0 and the extension no longer requires Wnck.

### Translations
                 
I always have to search how to update the translations, so I decided to document it here 
                                                                                         

Update the .pot file from sources
```
gettext --from-code=UTF-8 --output=locale/putwindow@clemens.lab21.org.pot *.js
```

Open the .po file in Poedit and update the available translations with the pot file  

### Wayland & Wnck

For application based configuration the extension relies on the X11 library wnck.

* Suse: `sudo zypper in libwnck-devel`
* Arch: `pacman -S libwnck3`
* Fedora:
  * `sudo yum install libwnck3`
  * `sudo dnf install libwnck3`
* Debian/Ubuntu: `apt-get install gir1.2-wnck-3.0`

Because of this dependency and the different concepts of wayland and X11 to identify applications (wm_class vs.
application_id) **Wayland is not supported**!

After switching to wayland and not using this feature for ~ 2 years it was removed from the extension 

Contributors
-------------
 * krlmr - Move to other display
 * 73 - Move focus (removed in gnome-shell >= v46) 
 * Anthony25 - gnome-shell 3.12 support
 * airtonix - gnome-shell 3.5 support
 * zara86 - gnome-shell 3.16 support
 * cleverlycoding - gnome-shell 3.18 support
 * wdoekes - cleanup, improve move to center
 * eddy-geek - gnome-shell 3.30 support 

License
--------
Copyright (c) 2011-2025 [negesti](https://github.com/negesti/)

This program is free software; you can redistribute it and/or
modify it under the terms of VERSION 3 of the GNU General Public
License as published by the Free Software Foundation provided
that the above copyright notice is included.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
Go to http://www.gnu.org/licenses/gpl-3.0.html to get a copy
of the license (or check the licence file)

