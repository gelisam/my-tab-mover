/*
 * Copyright (C) 2018 Guido Berhoerster <guido+tab-mover@berhoerster.name>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'ftp:']);
var windowMenuIds = [];
var lastMenuInstanceId = 0;
var nextMenuInstanceId = 1;

function createMenuItem(createProperties) {
    return new Promise((resolve, reject) => {
        let id = browser.menus.create(createProperties, () => {
            if (browser.runtime.lastError) {
                reject(browser.runtime.lastError);
            } else {
                resolve(id);
            }
        });
    });
}

async function moveTabs(tab, targetWindowId) {
    // if the current tab is part of a highlighted group then move the whole
    // group
    let selectedTabs = (tab.highlighted) ? await browser.tabs.query({
        highlighted: true,
        windowId: tab.windowId
    }) : [tab];
    let activeTab = selectedTabs.find(tab => tab.active);

    // unpin tabs before moving, this matches the built-in behavior
    let unpinningTabs = selectedTabs.flatMap(tab =>
        tab.pinned ? [browser.tabs.update(tab.id, {pinned: false})] : []);
    await Promise.all(unpinningTabs.map(p => p.catch(e => e)));

    await browser.tabs.move(selectedTabs.map(selectedTab => selectedTab.id),
            {windowId: targetWindowId, index: -1});

    // mark the previously active tab active again before highlighting other
    // tabs since this resets the selected tabs
    await browser.tabs.update(activeTab.id, {active: true});
    for (let tab of selectedTabs) {
        if (typeof activeTab === 'undefined' || tab.id !== activeTab.id) {
            browser.tabs.update(tab.id, {active: false, highlighted: true});
        }
    }
}

async function reopenTabs(tab, targetWindowId) {
    // if the current tab is part of a highlighted group then reopen the whole
    // group
    let selectedTabs = (tab.highlighted) ? await browser.tabs.query({
        highlighted: true,
        windowId: tab.windowId
    }) : [tab];
    // filter out privileged tabs which cannot be reopened
    selectedTabs = selectedTabs.filter(selectedTab =>
            ALLOWED_PROTOCOLS.has(new URL(selectedTab.url).protocol));
    if (selectedTabs.length === 0) {
        return;
    }
    let activeTab = selectedTabs.find(tab => tab.active);
    // the actually active tab may have been filtered out above, fall back to
    // the first highlighted one
    if (typeof activeTab === 'undefined') {
        activeTab = selectedTabs[0];
        activeTab.active = true;
    }

    let newTabs = await Promise.all(selectedTabs.map(selectedTab => {
        return browser.tabs.create({
            url: selectedTab.url,
            windowId: targetWindowId,
            active: selectedTab.active
        });
    }));
    // tabs can only be highlighted after they have been created
    for (let tab of newTabs) {
        if (!tab.active) {
            browser.tabs.update(tab.id, {active: false, highlighted: true});
        }
    }
    browser.tabs.remove(selectedTabs.map(selectedTab => selectedTab.id));
}

async function onMenuShown(info, tab)  {
    let menuInstanceId = nextMenuInstanceId++;
    lastMenuInstanceId = menuInstanceId;
    let targetWindows = await browser.windows.getAll({
        populate: true,
        windowTypes: ['normal']
    });
    let creatingMenus = [];
    let moveMenuItems = 0;
    let reopenMenuItems = 0;
    for (let targetWindow of targetWindows) {
        if (targetWindow.id === tab.windowId) {
            // ignore active window
            continue;
        }
        if (tab.incognito === targetWindow.incognito) {
            creatingMenus.push(createMenuItem({
                onclick: (info, tab) => moveTabs(tab, targetWindow.id),
                parentId: 'move-menu',
                title: targetWindow.title
            }));
            moveMenuItems++;
        } else {
            creatingMenus.push(createMenuItem({
                onclick: (info, tab) => reopenTabs(tab, targetWindow.id),
                parentId: 'reopen-menu',
                title: targetWindow.title
            }));
            reopenMenuItems++;
        }
    }
    let updatingMenus = [
        browser.menus.update('move-menu', {enabled: moveMenuItems > 0}),
        browser.menus.update('reopen-menu', {enabled: reopenMenuItems > 0})
    ];
    await Promise.all([...creatingMenus, ...updatingMenus]);
    let newWindowMenuIds = await Promise.all(creatingMenus);
    if (menuInstanceId !== lastMenuInstanceId) {
        // menu has been closed and opened again, remove the items of this
        // instance again
        for (let menuId of newWindowMenuIds) {
            browser.menus.remove(menuId);
        }
        return;
    }
    windowMenuIds = newWindowMenuIds;
    browser.menus.refresh();
}

async function onMenuHidden() {
    lastMenuInstanceId = 0;
    browser.menus.update('move-menu', {enabled: false});
    browser.menus.update('reopen-menu', {enabled: false});
    for (let menuId of windowMenuIds) {
        browser.menus.remove(menuId);
    }
}

(async () => {
    await Promise.all([
        // create submenus
        createMenuItem({
            id: 'move-menu',
            title: browser.i18n.getMessage('moveToWindowMenu'),
            enabled: false,
            contexts: ['tab']
        }),
        createMenuItem({
            id: 'reopen-menu',
            title: browser.i18n.getMessage('reopenInWindowMenu'),
            enabled: false,
            contexts: ['tab']
        })
    ]);
    browser.menus.onShown.addListener(onMenuShown);
    browser.menus.onHidden.addListener(onMenuHidden);
})();
