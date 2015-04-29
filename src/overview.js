var global = safari.extension.globalPage.contentWindow;
function sendCmd(type, data) {
  // wouldn't have to mutate with immutablejs
  data.type = type;
  global.postMessage(data, window.location.origin);
}

Ractive.components.stash = Ractive.extend({
  template: '#stash-template',
  init: function (options) {
    this.on({
      restore: function(e) {
        sendCmd('restoreStash', {stashId: this.get('id')});
        e.original.preventDefault();
      },
      remove: function(e) {
        sendCmd('removeStash', {stashId: this.get('id')});
        e.original.preventDefault();
      }
    });
  },
  twoway: false
});

Ractive.components.tab = Ractive.extend({
  template: '#tab-template',
  init: function (options) {
    this.on({
      restore: function(e) {
        sendCmd('restoreTab', {stashId: this.get('stashId'), tabId: this.get('id')});
        e.original.preventDefault();
      },
      remove: function(e) {
        sendCmd('removeTab', {stashId: this.get('stashId'), tabId: this.get('id')});
        e.original.preventDefault();
      }
    });
  },
  twoway: false
});

var ractive = new Ractive({
  el: '.js-container',
  template: '#overview-template',
  data: {},
  twoway: false
});

window.addEventListener("message", function(event) {
  if (event.origin !== window.location.origin) { return; } // don't know if needed

  ractive.set('stashes', event.data.stashes); // also look at .merge
}, false);
