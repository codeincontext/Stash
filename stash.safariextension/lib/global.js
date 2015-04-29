// We store two things in localStorage:
// - A list of stash IDs
// - Individual stashes serialised as JSON
'use strict';

var STASHES_KEY = 'stashes';
var STASH_PREFIX = 'stash:';

var COMMANDS = {
  'stash-all-tabs': stashAllTabs,
  'open-overview': openOverview
};

function openOverview(event) {
  event.target.showPopover();
}

function restoreStash(stash) {
  if (!stash.id) {
    stash = getStash(stash);
  }
  stash.tabs.forEach(restoreTab);
  removeStash(stash);
}

function restoreTab(tab) {
  var newTab = safari.application.activeBrowserWindow.openTab();
  newTab.url = tab.url;
}

function stashAllTabs(event) {
  var activeWindow = event.target.browserWindow;
  var tabs = activeWindow.tabs.filter(function (t) {
    return t.url;
  }).reverse().map(tabData);

  var stash = {
    id: generateId(),
    tabs: tabs,
    createdAt: new Date()
  };

  saveStash(stash);
  // little indication of where the tabs went or way to use them after
  activeWindow.close();
}

function saveStash(stash) {
  localStorage[STASH_PREFIX + stash.id] = JSON.stringify(stash);

  var stashIds = JSON.parse(localStorage[STASHES_KEY] || '[]');
  stashIds.unshift(stash.id);
  localStorage[STASHES_KEY] = JSON.stringify(stashIds);
}

function getStash(id) {
  return JSON.parse(localStorage[STASH_PREFIX + id]);
}

function removeStash(stash) {
  var id = stash.id || stash;
  delete localStorage[STASH_PREFIX + id];

  var stashIds = JSON.parse(localStorage[STASHES_KEY]);
  stashIds.splice(stashIds.indexOf(id), 1);
  localStorage[STASHES_KEY] = JSON.stringify(stashIds);
}

function restoreTabFromStash() {}

function tabData(tab) {
  return { id: generateId(), title: tab.title, url: tab.url };
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getAllStashes() {
  var stashIds = JSON.parse(localStorage[STASHES_KEY] || '[]');
  return stashIds.map(function (stashId) {
    return JSON.parse(localStorage[STASH_PREFIX + stashId]);
  });
}

safari.application.addEventListener('command', function (event) {
  var fn = COMMANDS[event.command];
  fn && fn(event);
}, false);

// this gets called a lot, including any time a tab loads (which is 40 times if you've just restored 40 tabs)
safari.application.addEventListener('validate', function (event) {
  if (event.target.identifier === 'toolbar') {
    updateToolbarItem(event.target);
  }
}, false);

function updateToolbarItem(item) {
  if (!item.browserWindow && !item.browserWindow.tabs) {
    console.log('no tabs (if this never happens, remove this clause)');
    return;
  }

  var canStash = item.browserWindow.tabs.some(function (tab) {
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
}

safari.application.addEventListener('popover', function (e) {
  var message = { type: 'updateStashes', stashes: getAllStashes() };
  e.target.contentWindow.postMessage(message, window.location.origin);
}, true);

window.addEventListener('message', function (event) {
  if (event.origin !== window.location.origin) {
    return;
  } // don't know if needed

  if (event.data.type === 'restoreStash') {
    restoreStash(event.data.stashId);
  } else if (event.data.type === 'removeStash') {
    removeStash(event.data.stashId);
  } else if (event.data.type === 'restoreTab') {
    restoreTabFromStash(event.data.stashId, event.data.tabId);
  } else if (event.data.type === 'removeTab') {
    removeTabFromStash(event.data.stashId, event.data.tabId);
  }
}, false);
