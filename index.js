'use strict';

// Handle local development and testing
require('dotenv').config();

// CONSTANTS
var PORT = 3000;

// Dependencies
var RC = require('ringcentral');
var helpers = require('ringcentral-helpers');
var fs = require('fs');
var http = require('http');

// VARS
var _watchedExtensions;
var _extensionFilterArray = [];
var Extension = helpers.extension();
var server = http.createServer();

// Initialize the SDK
var SDK = new RC({
	server: process.env.RC_API_BASE_URL,
	appKey: process.env.RC_APP_KEY,
	appSecret: process.env.RC_APP_SECRET
});

// Bootstrap Platform and Subscription
var platform = SDK.platform();
var subscription = SDK.createSubscription();

// Login to the RingCentral Platform
platform.login({
	username: process.env.RC_USERNAME,
	password: process.env.RC_PASSWORD,
	extension: process.env.RC_EXTENSION 
});

// Start the server
server.listen(PORT);

// Once we have a valid access token, we are ready to begin
function init(options) {
	//console.log( 'INIT OPTIONS: ', options );
	options = options || {};

	_watchedExtensions = createList();

	subscription.setEventFilters(_extensionFilterArray);

	subscription.register();

}

/**
 * Application Functions
**/
function createList() {
	platform
		.get('/account/~/device', {
			query: {
				page: 1,
				perPage: 1000
			}
		}).then(function(extensions) {
			var data = JSON.parse(extensions._text);
			var cleansedList = data.records.map(cleanList);
			//console.log('CLEANSED LIST: ', cleansedList);
			//console.log('EXTENSION FILTER ARRAY: ', _extensionFilterArray)
			return cleansedList;
		})
		.catch(function(e) {
			console.error(e);
		});
}

function cleanList(ext, i, arr) {
	var tmpObj = {};
	if('SoftPhone' !== ext.type) {
		tmpObj[ext.extension.id] = {
			device: ext
		};
		_extensionFilterArray.push(generatePresenceEventFilter(ext.uri))
	}
	return tmpObj;
}

function generatePresenceEventFilter(uri) {
	if(!uri) {
		return '';
	} else {
		var p = uri.match(/(v1\.0)(.*)/) + '/presence?detailedTelephonyState=true';
		p = p.split(',');
		p = p[2];
		return p;
	}
}

// Server Event Listeners
server.on('request', inboundRequest);

server.on('error', function(err) {
	console.error(err);
});

server.on('listening', function() {
	console.log('Server is listening to ', PORT);
});

server.on('close', function() {
	console.log('Server has closed and is no longer accepting connections');
});

// Register Platform Event Listeners
platform.on(platform.events.loginSuccess, handleLoginSuccess);
platform.on(platform.events.loginError, handleLoginError);
platform.on(platform.events.logoutSuccess, handleLogoutSuccess);
platform.on(platform.events.logoutError, handleLogoutError);
platform.on(platform.events.refreshSuccess, handleRefreshSuccess);
platform.on(platform.events.refreshError, handleRefreshError);

// Register Subscription Event Listeners
subscription.on(subscription.events.notification, handleSubscriptionNotification);
subscription.on(subscription.events.removeSuccess, handleRemoveSubscriptionSuccess);
subscription.on(subscription.events.removeError, handleRemoveSubscriptionError);
subscription.on(subscription.events.renewSuccess, handleSubscriptionRenewSuccess);
subscription.on(subscription.events.renewError, handleSubscriptionRenewError);
subscription.on(subscription.events.subscribeSuccess, handleSubscribeSucess);
subscription.on(subscription.events.subscribeError, handleSubscribeError);

// Server Request Handler
function inboundRequest(req, res) {
	//console.log('REQUEST: ', req);
}

/**
 * Subscription Event Handlers
**/
function handleSubscriptionNotification(data) {
	//console.log('SUBSCRIPTION NOTIFICATION DATA: ', data);
}

function handleRemoveSubscriptionSuccess(data) {
	//console.log('REMOVE SUBSCRIPTION SUCCESS DATA: ', data);
}

function handleRemoveSubscriptionError(data) {
	//console.log('REMOVE SUBSCRIPTION ERROR DATA: ', data);
}

function handleSubscriptionRenewSuccess(data) {
	//console.log('RENEW SUBSCRIPTION SUCCESS DATA: ', data);
}

function handleSubscriptionRenewError(data) {
	//console.log('RENEW SUBSCRIPTION ERROR DATA: ', data);
}

function handleSubscribeSucess(data) {
	//console.log('SUBSCRIPTION CREATED SUCCESSFULLY: ', data);
}

function handleSubscribeError(data) {
	//console.log('FAILED TO CREATE SUBSCRIPTION: ', data);
}

/**
 * Platform Event Handlers
**/
function handleLoginSuccess(data) {
	////console.log('LOGIN SUCCESS DATA: ', data);
	init(data);
}

function handleLoginError(data) {
	//console.log('LOGIN FAILURE DATA: ', data);
}

function handleLogoutSuccess(data) {
	//console.log('LOGOUT SUCCESS DATA: ', data);
}

function handleLogoutError(data) {
	//console.log('LOGOUT FAILURE DATA: ', data);
}

function handleRefreshSuccess(data) {
	//console.log('REFRESH SUCCESS DATA: ', data);
}

function handleRefreshError(data) {
	//console.log('REFRESH FAILURE DATA: ', data);
}
