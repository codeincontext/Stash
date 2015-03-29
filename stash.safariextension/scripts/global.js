// We store two things in localStorage:
// - A list of stash IDs
// - Individual stashes serialised as JSON
var STASHES_KEY = 'stashes';
var STASH_PREFIX = 'stash:';

var COMMANDS = {
  'stash-all-tabs': stashAllTabs,
  'open-overview': openOverview
}

function openOverview(event) {
  event.target.showPopover();
  // var newTab = safari.application.activeBrowserWindow.activeTab;
  // newTab.url = safari.extension.baseURI + "overview.html"
}

function restoreStash(stash) {
  if (!stash.id) { stash = getStash(stash); }
  stash.tabs.forEach(restoreTab);
  deleteStash(stash);
}

function restoreTab(tab) {
  var newTab = safari.application.activeBrowserWindow.openTab();
  newTab.url = tab.url;
}

function stashAllTabs() {
  var activeWindow = safari.application.activeBrowserWindow;
  var tabs = activeWindow.tabs
                          .filter(function(t) { return t.id; })
                          .reverse()
                          .map(tabData);

  var stash = {
    id: generateId(),
    tabs: tabs,
    createdAt: new Date()
  };

  saveStash(stash);
}

function saveStash(stash) {
  localStorage[STASH_PREFIX+stash.id] = JSON.stringify(stash);

  var stashIds = JSON.parse(localStorage[STASHES_KEY] || '[]');
  stashIds.unshift(stash.id);
  localStorage[STASHES_KEY] = JSON.stringify(stashIds);
}

function getStash(id) {
  return JSON.parse(localStorage[STASH_PREFIX+id]);
}

function deleteStash(stash) {
  var id = stash.id || stash;
  delete localStorage[STASH_PREFIX+id];

  var stashIds = JSON.parse(localStorage[STASHES_KEY]);
  stashIds.splice(stashIds.indexOf(id), 1);
  localStorage[STASHES_KEY] = JSON.stringify(stashIds);
}

function tabData(tab) {
  return {id: generateId(), title: tab.title, url: tab.url};
}

function generateId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

function getAllStashes() {
  var stashIds = JSON.parse(localStorage[STASHES_KEY] || '[]');
  return stashIds.map(function(stashId) {
    return JSON.parse(localStorage[STASH_PREFIX+stashId]);
  });
}

safari.application.addEventListener("command", function(event) {
  var fn = COMMANDS[event.command];
  fn && fn(event);
}, false);

safari.application.addEventListener("validate", function(event) {
  var toolbarItem = event.target;
  if (!toolbarItem.browserWindow) { return; }

  var canStash = toolbarItem.browserWindow.tabs.some(function(tab) {
    return !!tab.url;
  });

  if (canStash) {
    toolbarItem.command = 'stash-all-tabs';
    toolbarItem.image = safari.extension.baseURI + 'toolbar-in.png';
    toolbarItem.tooltip = 'Stash all tabs';
  } else {
    toolbarItem.command = null; // show popover
    toolbarItem.image = safari.extension.baseURI + 'toolbar-out.png';
    toolbarItem.tooltip = 'Open stash overview';
  }
}, false);

safari.application.addEventListener("popover", function(e) {
  var message = {type: 'updateStashes', stashes: getAllStashes()};
  e.target.contentWindow.postMessage(message, window.location.origin);
}, true);



window.addEventListener("message", function(event) {
  if (event.origin !== window.location.origin) { return; } // don't know if needed

  if (event.data.type === 'restoreStash') {
    restoreStash(event.data.stashId);
  }
}, false);
