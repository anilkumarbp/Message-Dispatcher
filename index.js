'use strict';

// Handle local development and testing
require('dotenv').config();

// CONSTANTS - obtained from environment variables
var PORT                    = process.env.PORT;
var FILTER_DIRECTION        = process.env.FILTER_DIRECTION;
var FILTER_TO               = process.env.FILTER_TO; // ONLY USE 911 in PRODUCTION!!!
var FILTER_DEVICE_TYPE      = process.env.FILTER_DEVICE_TYPE;
var FILTER_TELPHONY_STATUS  = process.env.FILTER_TELEPHONY_STATUS;
var DEVICES_PER_PAGE    = process.env.DEVICES_PER_PAGE;
var ALERT_SMS           = ['18315941779', '16197619503'];


// Dependencies
var RC = require('ringcentral');
var helpers = require('ringcentral-helpers');
var http = require('http');

var _tmpAlertMessage = '';

/*
 Code is stubbed to break this into modules, but not implemented completely yet
 var SubscriptionManager = require('./lib/SubscriptionManager');
 var EventMonitor = require('./lib/EventMonitor');
 var AlertDispatcher = require('./lib/AlertDispatcher');
*/

// VARS
var _cachedList = {};
var AlertMessage = '';
var _extensionFilterArray = [];
var Extension = helpers.extension();
var Message = helpers.message();
var server = http.createServer();

// Initialize the sdk
var sdk= new RC({
    server: process.env.RC_API_BASE_URL,
    appKey: process.env.RC_APP_KEY,
    appSecret: process.env.RC_APP_SECRET
});

// Bootstrap Platform and Subscription
var platform = sdk.platform();
var subscription = sdk.createSubscription();

// Login to the RingCentral Platform
platform.login({
    username: process.env.RC_USERNAME,
    password: process.env.RC_PASSWORD,
    extension: process.env.RC_EXTENSION
}).then(init);

// Start the server
server.listen(PORT);

// GO!
function init(loginData) {

    var devices = [];
    var page = 1;

    function getDevicesPage() {

        console.log('Requesting page', page);

        return platform
            .get('/account/~/device', {
                page: page,
                perPage: process.env.DEVICES_PER_PAGE //REDUCE NUMBER TO SPEED BOOTSTRAPPING
            })
            .then(function(response) {
                var data = response.json();

                devices = devices.concat(data.records);
                if (data.navigation.nextPage) {
                    page++;
                    return getDevicesPage(); // this will be chained
                } else {
                    return devices; // this is the finally resolved thing
                }
            });

    }

    return getDevicesPage()
        .then(function(devices) {
            return devices.filter(getPhysicalDevices).map(organize);
        })
        .then(startSubscription)
        .catch(function(e) {
            console.error("The error is in getDevicesPage : " + e);
            throw e;
        });

}


/*
    Format the alert
 */
function formatALert(extension) {

    try {

        var ext = extension.json();
        console.log(" the ext is : " + JSON.stringify(ext));
        // For SMS, subject has 160 char max
        var alertMessage = '!!EMERGENCY ALERT: Outbound call to 911 ';
        alertMessage += '\n First Name: ' + ext.contact.firstName;        // First Name of the caller
        alertMessage += '\n Last Name: '  + ext.contact.lastName;         // Last Name of the caller
        alertMessage += '\n Email: '  + ext.contact.email;                // Email id of the caller
        alertMessage += '\n From Extension: ' + ext.extensionNumber;      // Extension Number of the caller
        //alertMessage += '\n From Phone Number: ' + _cachedList[ext.extensionNumber].phoneLines[0].phoneInfo.phoneNumber;
        alertMessage += '\n LOCATION: ' + ext.contact.businessAddress; // TODO: Need to find out which value of this should hold emergency info and fix

        _tmpAlertMessage = alertMessage;

        return alertMessage;

    } catch(e) {
        console.error("The error is in formatAlert : " + e);
        throw e;
    }
}

function getPhysicalDevices(device) {
    if(FILTER_DEVICE_TYPE.indexOf(device.type) && device.extension) return 1;

}

function generatePresenceEventFilter(item) {
    if (!item) {;
        throw new Error('Message-Dispatcher Error: generatePresenceEventFilter requires a parameter');
    } else {
        return '/account/~/extension/' + item.extension.id + '/presence?detailedTelephonyState=true';
    }
}

function loadAlertDataAndSend(extensionId) {
    // TODO: Lookup Extension to capture user emergency information
    return platform
        .get('/account/~/extension/' + extensionId)
        .then(formatALert)                              // format the alert message
        .then(sendAlerts)                               // send SMS Alert
        .catch(function(e) {
            console.error("The error is in loadAlertDataAndSend : " + e);
            throw e;
        });
}


function organize(device) {
    //console.log("Adding the presence event for :", generatePresenceEventFilter(device));
    _extensionFilterArray.push(generatePresenceEventFilter(device));
    _cachedList[device.extension.id] = device;
    console.log("The cachedList array  is :" + _cachedList.valueOf());
    return platform
        .get('/account/~/device/' + device.id)
        .then(function(response){
            _cachedList[device.extension.id].deviceDetails = response.emergencyServiceAddress;
            console.log("The cachedlist array now is : " + _cachedList.valueOf());
        })
        .catch((function(e){
            console.error("The error is in organize : " + e);
            throw(e);
        }));
}

function startSubscription(devices) { //FIXME MAJOR Use devices list somehow

    console.log("Starting to create subscription");
    return subscription
        .setEventFilters(_extensionFilterArray)
        .register();
}


/**
 * Application Functions
 **/
//TODO: MAJOR Refactor to handle multiple channels for notification (such as webhooks, etc...)
function sendAlerts(response) {
    // This is the extension data which needs to be transformed for SMS message
    console.log("within the sendAlerts :" + response);

    AlertMessage = response;
    //var ext = response.json();
    //console.log("The response in sandAlerts function is : " + JSON.stringify(ext));
    // Send alerts to each of the SMS in the array as defined in environment variable `ALERT_SMS`
    console.log("Alert SMS type" + typeof ALERT_SMS);
    return Promise.all(ALERT_SMS.map(function(ext) {
        console.log("Error within the promise array");
        return sendSms(ext);
    }));

}

function sendSms(number) {

    //// For SMS, subject has 160 char max
    //var alertMessage = '!!EMERGENCY ALERT: ';
    //alertMessage += '\n' + data.contact.firstName + ' ' + data.contact.lastName;
    //alertMessage += '\n Dialed: ' + FILTER_TO;
    //alertMessage += '\n From Extension: ' + data.extensionNumber;
    //alertMessage += '\n LOCATION: '; // TODO: Need to find out which value of this should hold emergency info and fix

    return platform
        .post(Message.createUrl({sms: true}), {
            from: {
                phoneNumber: process.env.SOURCE_PHONE_NUMBER
            },
            to: [{phoneNumber: number}],
            text: AlertMessage
        })
        .then(function(response) {
            return response;
        })
        .catch(function(e) {
            console.error("The error is in sendSMS : " + e.message);
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
    console.log('***************SUBSCRIPTION NOTIFICATION: ****************(', JSON.stringify(msg, null, 2));
    //if(msg.body.activeCalls[0].direction && msg.body.activeCalls[0].to) {
    if (FILTER_DIRECTION === msg.body.activeCalls[0].direction && FILTER_TO === msg.body.activeCalls[0].to && FILTER_TELPHONY_STATUS === msg.body.telephonyStatus) {
        console.log("Calling to 511 has been initiated");
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
    // UNCOMMENT TO VIEW LOGIN DATA
    //console.log('LOGIN SUCCESS DATA: ', data);  
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
