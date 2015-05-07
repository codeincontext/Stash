'use strict';

var Global = {
  // We store two things in localStorage:
  // - A list of stash IDs
  // - Individual stashes serialised as JSON
  STASHES_KEY: 'stashes',
  STASH_PREFIX: 'stash:',

  COMMANDS: { // maps to function names
    'stash-all-tabs': 'stashAllTabs',
    'open-overview': 'openOverview'
  },

  openOverview: function(event) {
    event.target.showPopover();
  },

  restoreStash: function(stash) {
    if (typeof stash === 'string') { stash = Global.getStash(stash); }
    stash.tabs.forEach(Global.openTabInBrowser);
    Global.removeStash(stash);
  },

  openTabInBrowser: function(tab) {
    var newTab = safari.application.activeBrowserWindow.openTab();
    newTab.url = tab.url;
  },

  stashAllTabs: function(event) {
    var activeWindow = event.target.browserWindow;
    var tabs = activeWindow.tabs
      .filter(function(t) { return !!t.url; })
      .reverse()
      .map(Global.tabData);

    var stash = {
      id: Global.generateId(),
      tabs: tabs,
      createdAt: new Date()
    };

    Global.saveStash(stash);
    // little indication of where the tabs went or way to use them after
    activeWindow.close();
  },

  saveStash: function(stash) {
    localStorage[Global.STASH_PREFIX+stash.id] = JSON.stringify(stash);

    var stashIds = Global.getAllStashIds();
    if (stashIds.indexOf(stash.id) === -1) {
      stashIds.unshift(stash.id);
      localStorage[Global.STASHES_KEY] = JSON.stringify(stashIds);
    }
  },

  getStash: function(id) {
    var stash = JSON.parse(localStorage[Global.STASH_PREFIX+id]);
    stash.createdAt = new Date(stash.createdAt);
    return stash;
  },

  removeStash: function(stash) {
    var id = stash.id || stash;

    var stashIds = Global.getAllStashIds();
    stashIds.splice(stashIds.indexOf(id), 1);
    localStorage[Global.STASHES_KEY] = JSON.stringify(stashIds);

    delete localStorage[Global.STASH_PREFIX+id];
  },

  restoreTabFromStash: function(stashId, tabId) {
    var stash = Global.getStash(stashId);
    var tab = stash.tabs.find(function(t) { return t.id === tabId; });
    Global.openTabInBrowser(tab);
    Global.removeTabFromStash(stash, tabId);
  },

  // is there potential for data loss if the stash object comes from elsewhere?
  removeTabFromStash: function(stash, tabId) {
    if (typeof stash === 'string') { stash = Global.getStash(stash); }
    stash.tabs = stash.tabs.filter(function(t) { return t.id !== tabId; });
    Global.saveStash(stash);
  },

  tabData: function(tab) {
    return {id: Global.generateId(), title: tab.title, url: tab.url};
  },

  generateId: function() {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  },

  getAllStashIds: function() {
    return JSON.parse(localStorage[Global.STASHES_KEY] || '[]');
  },

  getAllStashes: function() {
    return Global.getAllStashIds().map(Global.getStash);
  },

  updateToolbarItem: function(item) {
    if (!item.browserWindow && !item.browserWindow.tabs) {
      console.log('no tabs (if this never happens, remove this clause)')
        return;
    }

    var canStash = item.browserWindow.tabs.some(function(tab) {
      return !!tab.url;
    });

    // don't change if it doesn't need changing (mutating an object we don't own :/)
    if (canStash === item.canStash) {
      return;
    }

    if (canStash) {
      item.command = 'stash-all-tabs';
      item.image = safari.extension.baseURI + 'toolbar-in.png';
      item.tooltip = 'Stash all tabs';
    } else {
      item.command = 'open-overview';
      item.image = safari.extension.baseURI + 'toolbar-out.png';
      item.tooltip = 'Open stash overview';
    }
    item.canStash = canStash;
  },

  bindEvents: function() {
    safari.application.addEventListener("command", function(event) {
      var fn = Global[Global.COMMANDS[event.command]];
      fn && fn(event);
    }, false);

    // this gets called a lot, including any time a tab loads (which is 40 times if you've just restored 40 tabs)
    safari.application.addEventListener("validate", function(event) {
      if (event.target.identifier === 'toolbar') {
        Global.updateToolbarItem(event.target);
      }
    }, false);

    safari.application.addEventListener("popover", function(e) {
      var message = {type: 'updateStashes', stashes: Global.getAllStashes()};
      e.target.contentWindow.postMessage(message, window.location.origin);
    }, true);


    window.addEventListener("message", function(event) {
      if (event.origin !== window.location.origin) { return; } // don't know if needed

      if (event.data.type === 'restoreStash') {
        Global.restoreStash(event.data.stashId);
      } else if (event.data.type === 'removeStash') {
        Global.removeStash(event.data.stashId);
      } else if (event.data.type === 'restoreTab') {
        Global.restoreTabFromStash(event.data.stashId, event.data.tabId);
      } else if (event.data.type === 'removeTab') {
        Global.removeTabFromStash(event.data.stashId, event.data.tabId);
      }
    }, false);
  }
};
