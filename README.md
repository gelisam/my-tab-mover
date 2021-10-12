# My Tab Mover

[Tab Mover](https://addons.mozilla.org/en-CA/firefox/addon/tab-mover/) is a
Firefox Addon for quickly moving tabs between windows via the context menu. My
Tab Mover is a fork of Tab Mover with the following differences:

1.  Simpler menu structure. In order to achieve that, My Tab Mover sacrifices
    the close-and-reopen feature, and is thus unable to move tabs between
    normal windows and windows in incognito mode.
2.  The name of each window is obtained from its first tab rather than its
    current tab. This makes it possible to give a permanent name to a window by
    pinning a tab whose title is meaningful to you.


## Usage

In order to move a tab between windows, open the tab context menu by clicking
on the tab using the right mouse button, then open the submenu named
"Move to Window", and finally select a window from that submenu. Multiple tabs
can be moved by opening the context menu on a tab belonging to a group of
highlighted tabs (highlighting multiple tabs is possible starting from Firefox
62 if the preference browser.tabs.multiselect is set to "true").


## Future Plans

I do not plan, and am not legally allowed, to publish this extension to
https://addons.mozilla.org, as Firefox's [Addon Policy](https://extensionworkshop.com/documentation/publish/add-on-policies/)
specifically states that "If the add-on is a fork of another add-on, [it must]
provide a significant difference in functionality and/or code." The differences
above don't seem big enough to satisfy that requirement.


## License

Tab Mover is Copyright (C) 2017 Guido Berhoerster. My (minor) modifications are
public domain. Both are published under the Mozilla Public License.
