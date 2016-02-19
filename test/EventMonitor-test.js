'use strict';

var expect = require('chai').expect;
var EventMonitor = require('../lib/EventMonitor');

describe('Message-Dispatcher.EventMonitor', function() {
  // Setup Test Vars
  var sm;

  beforeEach(function() {
    sm = new EventMonitor();
  });

  it('initializes', function() {
    expect(sm).to.be.an.instanceOf(EventMonitor);
    expect(sm).to.be.ok;
  });

});
