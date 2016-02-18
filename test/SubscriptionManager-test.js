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

});
