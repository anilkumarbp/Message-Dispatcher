'use strict';

// Handle local development and testing
require('dotenv').config();

// CONSTANTS
var PORT = 3000;
var FILTER_DIRECTION = 'Outbound';
var FILTER_TO = '511'; // Using 511 as it is the right thing to filter upon for now
var FILTER_DEVICE_TYPE = 'SoftPhone';
var DEVICES_PER_PAGE = 1500;
// TODO: ADD YOUR NUMBERS TO RECEIVE THE ALERTS
var ALERT_SMS = [
	'15856234190'
];

// Dependencies
var RC = require('ringcentral');
var helpers = require('ringcentral-helpers');
var http = require('http');
/*
Code is stubbed to break this into modules, but not implemented completely yet
var SubscriptionManager = require('./lib/SubscriptionManager');
var EventMonitor = require('./lib/EventMonitor');
var AlertDispatcher = require('./lib/AlertDispatcher');
*/

// VARS
var _cachedList = {};
var _extensionFilterArray = [];
var Extension = helpers.extension();
var Message = helpers.message();
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
}).then(function(){

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
				perPage: DEVICES_PER_PAGE
			}
		})
		.then(parseResponse)
		.then(function(data) {
			return data.records.filter(getPhysicalDevices).map(organize);
		})
		.then(startSubscription)
		.catch(function(e) {
			console.error(e);
			throw Error(e);
		});
}

/**
 * Application Functions
**/
function sendAlerts(data) {
	// TODO: Refactor to handle multiple channels for notification (such as webhooks, etc...)
	var LENGTH = ALERT_SMS.length;
	if(0 < LENGTH) {
		for(var i = 0; i < LENGTH; i++) {
			sendSms(data);
		}
	}
}

function getPhysicalDevices(device) {
	return (FILTER_DEVICE_TYPE === device.type);
}

function generatePresenceEventFilter(item) {
	if(!item) {
		throw new Error('Message-Dispatcher Error: generatePresenceEventFilter requires a parameter');
	} else {
		return '/account/~/extension/' + item.extension.id + '/presence?detailedTelephonyState=true';
	}
}

function loadAlertDataAndSend(extensionId) {
	// TODO: Lookup Extension to capture user emergency information
	var url = '/account/~/extension/' + extensionId ;
	platform
		.get(url)
		.then(function(response){
			// Extrapolate emergency information
			//return JSON.parse(response._text);
		})
		.then(sendAlerts)
		.catch(function(e) {
			console.error(e);
		});
}

function organize(ext, i, arr) {
	//console.log("Adding the presence event for :", generatePresenceEventFilter(ext));
	_extensionFilterArray.push(generatePresenceEventFilter(ext))
	_cachedList[ext.extension.id] = ext;
}

function parseResponse(response) {
	return JSON.parse(response._text);
}

function startSubscription(options) {
	options = options || {};
	subscription.setEventFilters(_extensionFilterArray);
	//console.log('EXTENSIONS:', _extensionFilterArray);
	subscription.register();
}

function sendSms(data) {
	// For SMS, subject has 160 char max
	var url = Message.createUrl(option);
	platform
		.send({
			url: Message.createUrl({options: sms},'131074004'),
			body: {
				from: {
					phoneNumber: '15856234212'
				},
				to: {
					phoneNumber: '18315941779'
				},
				text: 'SOMEONE CALLED' + FILTER_TO
			}
		})
		.then(function(response) {
			if(response.error) {
				console.error(response.error);
			} else {
				console.log("Message sent");
				return true;
			}
		})
		.catch(function(e) {
			throw (e);
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
subscription.on(subscription.events.subscribeSuccess, handleSubscribeSuccess);
subscription.on(subscription.events.subscribeError, handleSubscribeError);

// Server Request Handler
function inboundRequest(req, res) {
	//console.log('REQUEST: ', req);
}

/**
 * Subscription Event Handlers
**/
function handleSubscriptionNotification(msg) {
	console.log('SUBSCRIPTION NOTIFICATION: ', JSON.stringify(msg));
	//if(msg.body.activeCalls[0].direction && msg.body.activeCalls[0].to) {
		if(FILTER_DIRECTION === msg.body.activeCalls[0].direction && FILTER_TO === msg.body.activeCalls[0].to) {
			loadAlertDataAndSend(msg.body.extensionId);
		}
	//}
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

function handleSubscribeSuccess(data) {
	console.log('SUBSCRIPTION CREATED SUCCESSFULLY');
}

function handleSubscribeError(data) {
	console.log('FAILED TO CREATE SUBSCRIPTION: ', data);
}

/**
 * Platform Event Handlers
**/
function handleLoginSuccess(data) {
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
