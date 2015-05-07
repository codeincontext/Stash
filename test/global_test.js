// spies: observe without changing execution
// stubs: change the return value of a call to make your test take a certain path
// mocks: test that a function is being interacted with as you expect

// TODO: should I be testing the message listener, not the functions they call?

var assert = chai.assert
  , sandbox // sinon sandbox
  , mock

function assertJSONEqual(a, b) {
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
}

beforeEach(function() {
  sandbox = sinon.sandbox.create();
  this.oldSafari = window.safari;
  mock = sandbox.mock(Global);
});

afterEach(function() {
  mock.verify();
  sandbox.restore();
  localStorage.clear();
  window.safari = this.oldSafari;
});


describe('Storage commands', function() {
  describe('saveStash', function() {
    it('saves the stash as json', function() {
      var stash = {id: 'st123', tabs: [], createdAt: new Date()};
      Global.saveStash(stash);
      var key = Global.STASH_PREFIX + stash.id;
      assert.strictEqual(localStorage[key], JSON.stringify(stash));
    });

    it('prepends the stash ID to the list of stashes if it\'s new', function() {
      var stash = {id: 'st123', tabs: [], createdAt: new Date()};
      localStorage[Global.STASHES_KEY] = '["st122","st121"]';
      Global.saveStash(stash);
      assert.strictEqual(localStorage[Global.STASHES_KEY], '["st123","st122","st121"]');
    });

    it('doesn\'t prepend the stash ID if it\'s not new', function() {
      var stash = {id: 'st122', tabs: [], createdAt: new Date()};
      localStorage[Global.STASHES_KEY] = '["st123","st122","st121"]';
      Global.saveStash(stash);
      assert.strictEqual(localStorage[Global.STASHES_KEY], '["st123","st122","st121"]');
    });
  });

  // describe.skip('getStash'); // too simple to test atm. Test the commands calling it instead

  describe('getAllStashes', function() {
    it('returns all known stashes', function() {
      var stashes = [
        {id: 'st121', tabs: [], createdAt: new Date()},
        {id: 'st122', tabs: [], createdAt: new Date()},
        {id: 'st123', tabs: [], createdAt: new Date()}
      ];
      stashes.forEach(Global.saveStash);
      assertJSONEqual(Global.getAllStashes(), stashes.reverse());
    });
  });

  describe('removeStash', function() {
    it('removes the stash record from localStorage', function() {
      localStorage[Global.STASHES_KEY] = '["st123","st122","st121"]';
      Global.removeStash('st122'); // taking an id
      assert.strictEqual(localStorage[Global.STASHES_KEY], '["st123","st121"]');
    });

    it('removes the stash from the stash ID list', function() {
      localStorage[Global.STASH_PREFIX + 'st122'] = 'mystashdata';
      Global.removeStash({id: 'st122', tabs: [], createdAt: new Date()}); // taking a stash object
      assert.isUndefined(localStorage[Global.STASH_PREFIX + 'st122']);
    });
  });

  describe('restoreTabFromStash', function() {
    it('opens a new tab in the browser', function() {
      var tab = {id: 'ta123'};
      Global.saveStash({id: 'st123', tabs: [tab], createdAt: new Date()});
      mock.expects('openTabInBrowser').withArgs(tab).once();
      Global.restoreTabFromStash('st123', 'ta123');
    });

    it('removes the tab from the stash', function() {
      sandbox.stub(Global, 'openTabInBrowser');
      var stash = {id: 'st123', tabs: [{id: 'ta123'}], createdAt: new Date()};
      Global.saveStash(stash);
      mock.expects('removeTabFromStash').withArgs(stash, 'ta123').once();
      Global.restoreTabFromStash('st123', 'ta123');
    });
  });

  describe('removeTabFromStash', function() {
    describe('given a stash ID', function() {
      it('removes the tab from the stash', function() {
        var stash = {id: 'st123', tabs: [{id: 'ta123'}], createdAt: new Date()};
        Global.saveStash(stash);
        assert.lengthOf(Global.getStash(stash.id).tabs, 1);

        Global.removeTabFromStash('st123', 'ta123');
        assert.lengthOf(Global.getStash(stash.id).tabs, 0);
      });
    });

    describe('given a stash', function() {
      it('removes the tab from the stash', function() {
        var stash = {id: 'st123', tabs: [{id: 'ta123'}], createdAt: new Date()};
        Global.saveStash(stash);
        assert.lengthOf(Global.getStash(stash.id).tabs, 1);

        Global.removeTabFromStash(stash, 'ta123');
        assert.lengthOf(Global.getStash(stash.id).tabs, 0);
      });
    });
  });
});

describe('restoreStash', function() {
  it('fetches the stash if given an id', function() {
    mock.expects('getStash')
        .once()
        .withArgs('myid1234')
        .returns({tabs: []});
    Global.restoreStash('myid1234');
  });

  it('restores each tab item', function() {
    var exampleTab = {url: 'www.google.com'};
    mock.expects('openTabInBrowser').thrice();
    Global.restoreStash({tabs: [exampleTab, exampleTab, exampleTab]});
  });

  it('removes the stash', function() {
    var stash = {fake: stash, tabs: []};
    mock.expects('removeStash').once().withArgs(stash);
    Global.restoreStash(stash);
  });
});

// describe('restoreTab'); // untestable and basic enough to trust

describe('stashAllTabs', function() {
  it('saves the window\'s tabs', function() {
    var spy = sandbox.spy();
    var tabs = [{url: 'abc.com'}, {url: ''}, {url: 'def.com'}];
    var event = {target: {browserWindow: {close: spy, tabs: tabs}}};

    Global.stashAllTabs(event);
    var stash = JSON.parse(localStorage[Object.keys(localStorage)[0]]);
    assert.equal(stash.tabs[0].url, tabs[2].url);
    assert.equal(stash.tabs[1].url, tabs[0].url);
  });

  it('closes the window', function() {
    var spy = sandbox.spy();
    var event = {target: {browserWindow: {close: spy, tabs: []}}};

    Global.stashAllTabs(event);
    sinon.assert.called(spy);
    sinon.assert.calledOnce(spy);
  });
});

// describe('Handling messages from Safari', function(){
// })

// describe('Handling messages from Overview', function(){
// })

// describe('popover event', function(){
// })
