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

var _tmpAlertMessage = '';
var sleep = require('sleep');


// VARS
var _cachedList = [];
var _extensionFilterArray = [];
var Extension = helpers.extension();
var Message = helpers.message();
var server = http.createServer();

// Initialize the sdk for RC
var sdk = new RC({
    server: process.env.RC_API_BASE_URL,
    appKey: process.env.RC_APP_KEY,
    appSecret: process.env.RC_APP_SECRET,
    cachePrefix: process.env.RC_CACHE_PREFIX
});

//Initialize the sdk for SA
var sdk_SA = new RC({
    server: process.env.SA_API_BASE_URL,
    appKey: process.env.SA_APP_KEY,
    appSecret: process.env.SA_APP_SECRET
});

// Bootstrap Platform and Subscription
var platform = sdk.platform();
var platform_SA = sdk_SA.platform();
var subscription = sdk.createSubscription();

// Login into RC and SA accounts

login();
//login_SA();

//Login to the SA Platform
function login_SA() {
    platform_SA.login({
            username: process.env.SA_USERNAME,
            password: process.env.SA_PASSWORD,
            extension: process.env.SA_EXTENSION
        })
        .then(function (response) {
            console.log("The SA auth object is :", JSON.stringify(response.json(), null, 2));
            console.log("Successfully logged into the Service Account");
        })
        .catch(function (e) {
            console.log("Login Error into the Service Account Platform :", e);
            throw e;
        });
}

// Login to the RingCentral Platform
function login() {
    return platform.login({
            username: process.env.RC_USERNAME,
            password: process.env.RC_PASSWORD,
            extension: process.env.RC_EXTENSION
        })
        .then(function (response) {
            console.log("The RC auth object is :", JSON.stringify(response.json(), null, 2));
            console.log("Succesfully logged into the RC Account");
            init();
        })
        .catch(function (e) {
            console.log("Login Error into the Ringcentral Platform :", e);
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

    function getDevicesPage() {

        return platform
            .get('/account/~/device', {
                page: page,
                perPage: process.env.DEVICES_PER_PAGE                                             //REDUCE NUMBER TO SPEED BOOTSTRAPPING
            })
            .then(function (response) {

                console.log("The account level devices is :",JSON.stringify(response.json(),null,2));
                var data = response.json();

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
            return devices.filter(getPhysicalDevices);
                //.map(organize);
        })
        .then(deviceAddress)
        //.then(organize)
        .then(startSubscription)
        .catch(function (e) {
            console.error("Error: getDevicesPage(): " + e);
            throw e;
        });

}


/*/
 function deviceAddress
 */

function deviceAddress(devices) {


    console.log("Devices after filtering  :",devices);

    for(var i=0; i<devices.length; i++) {

        var device = devices[i];
        _extensionFilterArray.push(generatePresenceEventFilter(device));

        console.log("The device is :",device);

        //sleep.sleep(1);

        platform
            .get('/account/~/device/' + device.id)
            .then(function (response) {
                console.log("The respsone from get device by ID :",response.json());
                if (response.json().emergencyServiceAddress) {
                    _cachedList[device.extension.id] = {};
                    _cachedList[device.extension.id].emergencyServiceAddress = response.json().emergencyServiceAddress;
                    _cachedList[device.extension.id].phoneNumber = response.json().phoneLines[0].phoneInfo.phoneNumber;
                }
                else {
                    console.log("The Device :", device.id + " has no emergency address attached to it. Kindly Add the Emergency Address to it.");
                }

            })
            .catch((function (e) {
                //console.error("The error is in organize : " + e);
                throw(e);
            }));
    }

    return devices;
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
    if ((FILTER_DEVICE_TYPE==device.type) && device.extension) return 1;

}

function generatePresenceEventFilter(item) {
    console.log("The item is :", item);
    if (!item) {
        ;
        throw new Error('Message-Dispatcher Error: generatePresenceEventFilter requires a parameter');
    } else {
        return '/account/~/extension/' + item.extension.id + '/presence?detailedTelephonyState=true';
    }
}

function loadAlertDataAndSend(extensionId) {
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

//
//function organize(device) {
//    _extensionFilterArray.push(generatePresenceEventFilter(device));
//    //_cachedList[device.extension.id] = device;
//    //return platform
//    //    .get('/account/~/device/' + device.id)
//    //    .then(function (response) {
//    //        //var item = {};
//    //        if (response.json().emergencyServiceAddress) {
//    //            _cachedList[device.extension.id] = {};
//    //            _cachedList[device.extension.id].emergencyServiceAddress = response.json().emergencyServiceAddress;
//    //            _cachedList[device.extension.id].phoneNumber = response.json().phoneLines[0].phoneInfo.phoneNumber;
//    //        }
//    //        else {
//    //            console.log("The Device :", device.id + "with the phone number :", response.json().phoneLines[0].phoneInfo.phoneNumber + " has no emergency address attached to it. Kindly Add the Emergency Address to it.");
//    //        }
//    //
//    //    })
//    //    .catch((function (e) {
//    //        console.error("The error is in organize : " + e);
//    //        throw(e);
//    //    }));
//}

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

    // Create a function to send SMS using SA account
    sendSms_SA(number);

}


function sendSms_SA(number) {

    platform_SA
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
            console.error("The error in sendSMS :" + e.message);
            throw(e);
        });

    return platform;

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
