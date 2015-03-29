var global = safari.extension.globalPage.contentWindow;

Ractive.components.stash = Ractive.extend({
  template: '#stash-template',
  init: function (options) {
    this.on({
      restoreAll: function(e) {
        global.postMessage({
          type: 'restoreStash',
          stashId: this.get('id')
        }, window.location.origin);

        e.original.preventDefault();
      }
    });
  },
  twoway: false
});

Ractive.components.tab = Ractive.extend({
  template: '#tab-template',
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
