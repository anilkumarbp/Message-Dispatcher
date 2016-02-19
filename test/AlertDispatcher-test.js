'use strict';

var expect = require('chai').expect;
var AlertDispatcher = require('../lib/AlertDispatcher');

describe('Message-Dispatcher.AlertDispatcher', function() {
  // Setup Test Vars
  var sm;

  beforeEach(function() {
    sm = new AlertDispatcher();
  });

  it('initializes', function() {
    expect(sm).to.be.an.instanceOf(AlertDispatcher);
    expect(sm).to.be.ok;
  });

});
