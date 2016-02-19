'use strict';

var expect = require('chai').expect;
var SubscriptionManager = require('../lib/SubscriptionManager');

describe('Message-Dispatcher.SubscriptionManager', function() {
  // Setup Test Vars
  var sm;

  beforeEach(function() {
    sm = new SubscriptionManager();
  });

  it('initializes', function() {
    expect(sm).to.be.an.instanceOf(SubscriptionManager);
    expect(sm).to.be.ok;
  });

  it('accepts configuration options', function() {
    var mySM = new SubscriptionManager({test:123});
    expect(mySM).to.be.an.instanceOf(SubscriptionManager);
    expect(mySM).to.be.ok;
  });

  // Note the use of the done parameter for the async operation
  it('fetches list of extensions', function(done) {
    // TODO: Setup mock for RC-SDK to get list of extensions
    // TODO: Create extension type object to test against
    // TODO: Test getting default list of extensions
    // TODO: Test providing query parameters
    // TODO: Test getting ALL extensions on the account
    //done();
  });

  // Note the use of the done parameter for the async operation
  it('fetches by devices', function(done) {
    // TODO: Setup mock for RC-SDK to get list of devices
    // TODO: Create device type object to test against
    // TODO: Test getting default list of devices
    // TODO: Test providing query parameters
    // TODO: Test getting ALL devices on the account
    //done();
  });

  it('watches for newly added devices', function(done) {
    // TODO: Create dummy list for use
    // TODO: Add new item into list, and make sure it filters properly
    //done();
  });

  it('adds new extensions to eventFilters', function() {
    // TODO: Setup requirements for this test
  });

  it('creates new Event Monitors as needed', function() {
    // TODO: Setup requiremenets for this test
  });

  it('passes eventFilter(s) to EventMonitors', function() {
    // TODO: Setup mock EventMonitor, provide it with new events
  });

  it('can filter devices by type', function() {
    // TODO: Provide a dummy list of devices
    // TODO: Only return devices meeting specified type
  });

  it('can filter extensions by property', function() {
    // TODO: Provide a dummy list of extensions
    // TODO: Only return extensions meeting specified properties, CREATE MULTIPLE VARIANTS 
  });

});
