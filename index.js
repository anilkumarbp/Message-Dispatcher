'use strict';

// Handle local development and testing
require('dotenv').config();

// CONSTANTS
var PORT = 3000;
var FILTER_DIRECTION = 'Outbound';
var FILTER_TO = '511';
// TODO: ADD YOUR NUMBERS TO RECEIVE THE ALERTS
var PRIORITY_RESPONSE_TEAM_SMS_NUMBERS = [
	'3176009731'
];

// Dependencies
var RC = require('ringcentral');
var helpers = require('ringcentral-helpers');
var fs = require('fs');
var http = require('http');

// VARS
var _cachedList = {};
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

// GO!
function init(options) {
	options = options || {};

	platform
		.get('/account/~/device', {
			query: {
				page: 1,
				perPage: 1000
			}
		})
		.then(parseResponse)
		.then(function(data) {
			return data.records.filter(getPhysicalDevices).map(organize);
		})
		.then(startSubscription)
		.catch(function(e) {
			console.error(e);
		});
}

/**
 * Application Functions
**/
function deliverAlerts(data) {
	// TODO: SEND THE ALERTS ON THE PROPER CHANNELS, USE THE CONSTANT ABOVE FOR THE TARGET SMS NUMBERS OF PRIORITY RESPONSE TEAM
}

function parseResponse(response) {
	return JSON.parse(response._text);
}

function organize(ext, i, arr) {
	_extensionFilterArray.push(generatePresenceEventFilter(ext))
	_cachedList[ext.extension.id] = ext;
}

function getPhysicalDevices(device) {
	var isPhysical = ('SoftPhone' !== device.type)
		? true 
		: false;
	//console.log( device.type + ' - isPysical: ', isPhysical );
	return isPhysical;
}

function generatePresenceEventFilter(item) {
	if(!item) {
		throw new Error('Message-Dispatcher Error: generatePresenceEventFilter requires a parameter');
	} else {
		return '/account/~/extension/' + item.extension.id + '/presence?detailedTelephonyState=true';
	}
}

function startSubscription(options) {
	options = options || {};
	subscription.setEventFilters(_extensionFilterArray);
	subscription.register();
}

function sendAlerts(eventData) {
	// TODO: Lookup Extension to capture user emergency information
	platform
		.get(Extension.createUrl(eventData.extension.id))
		.then(function(response){
			return JSON.parse(response);
		})
		.then(deliverAlerts)
		.catch(function(e) {
			console.error(e);
		});
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
function handleSubscriptionNotification(msg) {
	console.log('SUBSCRIPTION NOTIFICATION: ', msg);
	// TODO: NEED TO BE SURE THIS IS THE RIGHT DATA UPON WHICH TO FILTER
	// Use these constants to filter, not literals: FILTER_DIRECTION and FILTER_TO
	// To modify operation for development, just change these values in the constants
	if(msg.body.direction && msg.body.to) {
		if(msg.body.direction === FILTER_DIRECTION && msg.body.to === FILTER_TO) {
			sendAlerts(msg.body);
		}
	}
}

function handleRemoveSubscriptionSuccess(data) {
	console.log('REMOVE SUBSCRIPTION SUCCESS DATA: ', data);
}

function handleRemoveSubscriptionError(data) {
	console.log('REMOVE SUBSCRIPTION ERROR DATA: ', data);
}

function handleSubscriptionRenewSuccess(data) {
	console.log('RENEW SUBSCRIPTION SUCCESS DATA: ', data);
}

function handleSubscriptionRenewError(data) {
	console.log('RENEW SUBSCRIPTION ERROR DATA: ', data);
}

function handleSubscribeSucess(data) {
	console.log('SUBSCRIPTION CREATED SUCCESSFULLY');
}

function handleSubscribeError(data) {
	console.log('FAILED TO CREATE SUBSCRIPTION: ', data);
}

/**
 * Platform Event Handlers
**/
function handleLoginSuccess(data) {
	//console.log('LOGIN SUCCESS DATA: ', data);
	init(data);
}

function handleLoginError(data) {
	console.log('LOGIN FAILURE DATA: ', data);
}

function handleLogoutSuccess(data) {
	console.log('LOGOUT SUCCESS DATA: ', data);
}

function handleLogoutError(data) {
	console.log('LOGOUT FAILURE DATA: ', data);
}

function handleRefreshSuccess(data) {
	console.log('REFRESH SUCCESS DATA: ', data);
}

function handleRefreshError(data) {
	console.log('REFRESH FAILURE DATA: ', data);
}
