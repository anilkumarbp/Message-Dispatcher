'use strict';

// Handle local development and testing
require('dotenv').config();

// CONSTANTS - obtained from environment variables
var PORT = process.env.PORT;
var FILTER_DIRECTION = process.env.FILTER_DIRECTION;
var FILTER_TO = process.env.FILTER_TO;                                           // ONLY USE 911 in PRODUCTION!!!
var FILTER_DEVICE_TYPE = process.env.FILTER_DEVICE_TYPE;
var FILTER_TELPHONY_STATUS = process.env.FILTER_TELEPHONY_STATUS;
var ALERT_SMS = JSON.parse(process.env.ALERT_SMS);


// Dependencies
var RC = require('ringcentral');
var helpers = require('ringcentral-helpers');
var http = require('http');
var async = require("async");
var _tmpAlertMessage = '';


// VARS
var _cachedList = [];
var _filteredDevices = [];
var _extensionFilterArray = [];
var Extension = helpers.extension();
var Message = helpers.message();
var server = http.createServer();

// Initialize the sdk
var sdk = new RC({
    server: process.env.RC_API_BASE_URL,
    appKey: process.env.RC_APP_KEY,
    appSecret: process.env.RC_APP_SECRET
});

// Bootstrap Platform and Subscription
var platform = sdk.platform();
var subscription = sdk.createSubscription();

login();
// Login to the RingCentral Platform
function login() {
    return platform.login({
            username: process.env.RC_USERNAME,
            password: process.env.RC_PASSWORD,
            extension: process.env.RC_EXTENSION
        })
        .then(init)
        .catch(function (e) {
            console.log("Login Error into the RingCentral Platform :", e);
            throw e;
        });
}


// Start the server
server.listen(PORT);

/*
 Retreive devices on Login success
 */
function init(loginData) {

    var devices = [];
    var page = 1;

    console.log("************************************");
    console.log("The auth token is :", JSON.stringify(loginData.json(), null, 2));
    console.log("************************************");
    function getDevicesPage() {

        // get the list of devoce with the Admin user privileges


        return platform
            .get('/account/~/device', {
                page: page,
                perPage: process.env.DEVICES_PER_PAGE                                             //REDUCE NUMBER TO SPEED BOOTSTRAPPING
            })
            .then(function (response) {
                var data = response.json();
                console.log("************************************");
                console.log("The devices for the account is :", JSON.stringify(data, null, 2));
                console.log("************************************");

                devices = devices.concat(data.records);
                if (data.navigation.nextPage) {
                    page++;
                    return getDevicesPage();                                                     // this will be chained
                } else {
                    return devices;                                                              // this is the finally resolved thing
                }
            });

    }


    /*
     Loop until you capture all devices
     */
    return getDevicesPage()
        .then(function (devices) {
            console.log("************************************");
            console.log("The Devices array is :", devices);
            console.log("************************************");
            _filteredDevices = devices.filter(getPhysicalDevices);
            console.log("The Filtered devices array is :", _filteredDevices);
            for (var i = 0; i < _filteredDevices.length; i++) {
                //sleep.sleep(1);
                organize(_filteredDevices[i]);
            }
            //return devices.filter(getPhysicalDevices);
            //return devices.filter(getPhysicalDevices).map(organize);
        })
        .then(startSubscription)
        .catch(function (e) {
            console.error("Error: getDevicesPage(): " + e);
            throw e;
        });


}


/*
 Format the alert
 */
function formatALert(extension) {

    try {

        var ext = extension.json();

        // For SMS, subject has 160 char max
        var messageAlert = '!! EMERGENCY ALERT: Outbound call to 911 !!';
        messageAlert += '\n First Name: ' + ext.contact.firstName;                                  // First Name of the caller
        messageAlert += '\n Last Name: ' + ext.contact.lastName;                                   // Last Name of the caller
        messageAlert += '\n Email: ' + ext.contact.email;                                          // Email id of the caller
        messageAlert += '\n From Extension: ' + ext.extensionNumber;                                // Extension Number of the caller
        messageAlert += '\n From Number: ' + _cachedList[ext.id].phoneNumber;                       // Extension Number of the caller
        messageAlert += '\n LOCATION: ';                                                            // Retreive the Emergency Address from _cachedList
        messageAlert += '\n\t\t Street 1: ' + _cachedList[ext.id].emergencyServiceAddress.street;
        messageAlert += '\n\t\t Street 2: ' + _cachedList[ext.id].emergencyServiceAddress.street2;
        messageAlert += '\n\t\t City: ' + _cachedList[ext.id].emergencyServiceAddress.city;
        messageAlert += '\n\t\t State: ' + _cachedList[ext.id].emergencyServiceAddress.state;
        messageAlert += '\n\t\t Country: ' + _cachedList[ext.id].emergencyServiceAddress.country;
        messageAlert += '\n\t\t Zip: ' + _cachedList[ext.id].emergencyServiceAddress.zip;


        _tmpAlertMessage = messageAlert;

        return messageAlert;

    } catch (e) {
        console.error("The error is in formatAlert : " + e);
        throw e;
    }
}

function getPhysicalDevices(device) {
    if ((FILTER_DEVICE_TYPE == device.type) && device.extension) return 1;

}

function generatePresenceEventFilter(item) {
    if (!item) {
        ;
        throw new Error('Message-Dispatcher Error: generatePresenceEventFilter requires a parameter');
    } else {
        return '/account/~/extension/' + item.extension.id + '/presence?detailedTelephonyState=true';
    }
}

function loadAlertDbataAndSend(extensionId) {
    // TODO: Lookup Extension to capture user emergency information
    return platform
        .get('/account/~/extension/' + extensionId)
        .then(formatALert)                                                                      // format the alert message
        .then(sendAlerts)                                                                       // send SMS Alert
        .catch(function (e) {
            console.error("The error is in loadAlertDataAndSend : " + e);
            throw e;
        });
}


function organize(device) {
    console.log("The device passed to generatepresenceeventfilter is :", device);
    _extensionFilterArray.push(generatePresenceEventFilter(device));
    //_cachedList[device.extension.id] = device;

    return platform
        .get('/account/~/device/' + device.id)
        .then(function (response) {
            //var item = {};
            console.log("the phone number is :", JSON.stringify(response.json(), null, 2));
            _cachedList[device.extension.id] = {};
            _cachedList[device.extension.id].emergencyServiceAddress = response.json().emergencyServiceAddress;
            _cachedList[device.extension.id].phoneNumber = response.json().phoneLines[0].phoneInfo.phoneNumber;

        })
        .catch((function (e) {
            //console.error("The error is in organize : " + e);
            
            throw(e);
        }));
}

function startSubscription(devices) { //FIXME MAJOR Use devices list somehow

    console.log("STARTING TO CREATE SUBSCRIPTION ON ALL DEVICES");
    return subscription
        .setEventFilters(_extensionFilterArray)
        .register();
}


/**
 * Application Functions
 **/
//TODO: MAJOR Refactor to handle multiple channels for notification (such as webhooks, etc...)
function sendAlerts(response) {

    // Send alerts to each of the SMS in the array as defined in environment variable `ALERT_SMS`
    console.log("ALERT SMS SENT TO NUMBERS :", ALERT_SMS);
    return Promise.all(ALERT_SMS.map(function (ext) {
        return sendSms(ext);
    })).catch(function (e) {
        console.log("The error is with the promises", e);
        throw e;
    });

}

function sendSms(number) {

    return platform
        .post(Message.createUrl({sms: true}), {
            from: {
                phoneNumber: process.env.SOURCE_PHONE_NUMBER
            },
            to: [{phoneNumber: number}],
            text: _tmpAlertMessage
        })
        .then(function (response) {
            return response;
        })
        .catch(function (e) {
            console.error("The error is in sendSMS : " + e.message);
            throw (e);
        });
}


// Server Event Listeners
server.on('request', inboundRequest);

server.on('error', function (err) {
    console.error(err);
});

server.on('listening', function () {
    console.log('Server is listening to ', PORT);
});

server.on('close', function () {
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
 * Subscription Event Handlers   - to capture events on telephonyStatus ~ callConnected
 **/
function handleSubscriptionNotification(msg) {
    console.log('***************SUBSCRIPTION NOTIFICATION: ****************(', JSON.stringify(msg, null, 2));
    if (FILTER_DIRECTION === msg.body.activeCalls[0].direction && FILTER_TO === msg.body.activeCalls[0].to && FILTER_TELPHONY_STATUS === msg.body.telephonyStatus) {
        console.log("Calling to 511 has been initiated");
        loadAlertDataAndSend(msg.body.extensionId);
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
    console.log('Initialing Login again :');
    login();
}
