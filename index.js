'use strict';

// Handle local development and testing
if( process.env.RC_ENVIRONMENT !== 'Production' ) {
    require('dotenv').config();
}

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


// VARS
var _devices=[];
var _extensionFilterArray = [];
var _alertExtensionData;
var Message = helpers.message();
var server = http.createServer();
var street1,street2,city,state,zip,country,fromNumber;

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

//login();
login_SA();

//Login to the SA Platform
function login_SA() {
    platform_SA.login({
            username: process.env.SA_USERNAME,
            password: process.env.SA_PASSWORD,
            extension: process.env.SA_EXTENSION,
            cachePrefix: process.env.SA_CACHE_PREFIX
        })
        .then(function (response) {
            login();
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
            extension: process.env.RC_EXTENSION,
            cachePrefix: process.env.RC_CACHE_PREFIX
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

                console.log("The account level devices is :", JSON.stringify(response.json(), null, 2));
                var data = response.json();

                console.log("************** THE NUMBER OF ACCOUNT LEVEL DEVICES ARE : ***************",data.records.length);

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
            console.log("************** The total devices getting filtered is : **********", devices.length);
            return devices.filter(getPhysicalDevices);
            //.map(organize);
        })
        .then(createEventFilter)
        .then(startSubscription)
        .catch(function (e) {
            console.error(e);
            throw e;
        });

}

/*
 To generate the presence Event Filter for subscription
 */
function createEventFilter(devices) {
    _devices = devices;
    for (var i = 0; i < devices.length; i++) {

            var device = devices[i];
            _extensionFilterArray.push(generatePresenceEventFilter(device));
    }
    return devices;
}

/*
 Emergency Lookup while Lazy Loading Device Information
 */

function emergencyLookUp(extension) {
    return new Promise(function (fulfill, reject) {
        _alertExtensionData = extension.json();
        var ext = _alertExtensionData;;
        var devicesLength = _devices.length;
        var device;
        for (var i = 0; i < devicesLength; i++) {
            if(_devices[i].extension.id === ext.id) {
                device = _devices[i];
            }
        }
         platform
            .get('/account/~/device/' + device.id)
            .then(function (response) {
                if (response.json().emergencyServiceAddress) {
                    console.log(' The Device Lookup is : ', JSON.stringify(response.json(),null,2));
                    console.log(' LOOKUP EA DATA: ', response.json().emergencyServiceAddress);
                    fulfill({
                        street1: response.json().emergencyServiceAddress.street,
                        street2: response.json().emergencyServiceAddress.street2,
                        city: response.json().emergencyServiceAddress.city,
                        state: response.json().emergencyServiceAddress.state,
                        zip: response.json().emergencyServiceAddress.zip,
                        country: response.json().emergencyServiceAddress.country
                    });

                }
                else {
                    var exMsg = "The Device :" + device.id + " has no emergency address attached to it. Kindly Add the Emergency Address to it.";
                    console.log(exMsg);
                    reject(false);
                }
            })
            .catch(function (e) {
                console.error("The error is in organize : " + e);
                throw(e);
            });
        });
}

/*
 Format the alert
 */
function formatAlert(emergencyAddress) {
    try {
        var ext = _alertExtensionData;
        console.log( 'FORMAT ALERT EXTENSION DATA ----->', ext);

        // For SMS, subject has 160 char max
        var messageAlert = '!! EMERGENCY ALERT: Outbound call to 911 !!';
        messageAlert += '\n First Name: ' + ext.contact.firstName;                                  // First Name of the caller
        messageAlert += '\n Last Name: ' + ext.contact.lastName;                                   // Last Name of the caller
        messageAlert += '\n Email: ' + ext.contact.email;                                          // Email id of the caller
        messageAlert += '\n From Extension: ' + ext.extensionNumber;                                // Extension Number of the caller
        messageAlert += '\n From Number: ' + ext.contact.businessPhone;                       // Extension Number of the caller
        messageAlert += '\n LOCATION: ';                                                            // Retreive the Emergency Address from _cachedList
        if(!emergencyAddress) {
            messageAlert += '\n\t Missing Emergency Service Address info, you MUST lookup the location';
        } else {
            messageAlert += '\n\t\t Street 1: ' + emergencyAddress.street1;
            messageAlert += '\n\t\t Street 2: ' + emergencyAddress.street2;
            messageAlert += '\n\t\t City: ' + emergencyAddress.city;
            messageAlert += '\n\t\t State: ' + emergencyAddress.state;
            messageAlert += '\n\t\t Zip: ' + emergencyAddress.zip;
            messageAlert += '\n\t\t Country: ' + emergencyAddress.country;
        }

        _tmpAlertMessage = messageAlert;
        console.log("The message is :",messageAlert);
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
    //console.log("The item is :", item);
    if (!item) {
        ;
        throw new Error('Message-Dispatcher Error: generatePresenceEventFilter requires a parameter');
    } else {
        // console.log("The Presence Filter added for the extension :" + item.extension.id + ' : /account/~/extension/' + item.extension.id + '/presence?detailedTelephonyState=true');
        return '/account/~/extension/' + item.extension.id + '/presence?detailedTelephonyState=true';
    }
}

function loadAlertDataAndSend(extensionId) {
    return platform
        .get('/account/~/extension/' + extensionId)
        .then(emergencyLookUp)
        .then(formatAlert)                                                                      // format the alert message
        .then(sendAlerts)                                                                       // send SMS Alert
        .catch(function (e) {
            console.error("The error is in loadAlertDataAndSend : " + e);
            throw e;
        });
}


function startSubscription(devices) { //FIXME MAJOR Use devices list somehow

    console.log("********* STARTING TO CREATE SUBSCRIPTION ON ALL FILTERED DEVICES ***************");
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
        console.log("Inside Send Alert Success");
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

    return platform_SA
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
    var e911ErrorLogMessages = [];
    var notificationDataForLogs = JSON.stringify(msg, null, 2);
    var body = msg.body;
    var activeCalls = msg.body.activeCalls;
    var telephonyStatus = msg.body.telephonyStatus;
    var extensionId = msg.body.extensionId;

    console.log('*************** SUBSCRIPTION NOTIFICATION: ****************(', JSON.stringify(msg, null, 2));
        
    if(!msg.body) {
        e911ErrorLogMessages.push('Missing msg.body used to qualify a call as an e911 SMS alert.');
    } else {
        if(!activeCalls) {
            e911ErrorLogMessages.push('Unable to validate if this is an e911 alert candidate, missing activeCalls property');
        }
        if(!telephonyStatus) {
            e911ErrorLogMessages.push('Unable to validate if this is an e011 alert candidate, missing telephonyStatus property');
        }
        if(!extensionId) {
            e911ErrorLogMessages.push('Unable to validate if this is an e911 alert candidate, missing extensionId property');
        }

        if( Array.isArray(activeCalls) ) {
        // Filter it like an array
            if (FILTER_DIRECTION === activeCalls[0].direction && dialedNumberInvalidator(FILTER_TO,activeCalls[0].to) && FILTER_TELPHONY_STATUS === telephonyStatus) {
                console.log('*************** SUBSCRIPTION NOTIFICATION: ****************(', JSON.stringify(msg, null, 2));
                console.log("Calling to 511 has been initiated");
                console.log("The extension that initiated call to 511 is :",msg.body.extensionId);
                loadAlertDataAndSend(extensionId);
            } else {
                //console.log('DNQ');
            }
        } else {
            // Filter it like whatever the hell it is...or maybe coersion?
            e911ErrorLogMessages.push('Unable to validate if this is an e911 alert candidate, type error: activeCalls is type: ' + typeof activeCalls + ', and should be array');
        }
    }

    // We have errors, let's log them
    if(0 !== e911ErrorLogMessages.length) {
        for(var i = 0; i <= e911ErrorLogMessages.length; i++) {
            console.error(e911ErrorLogMessages[i]);
        }
    }
}

function dialedNumberInvalidator(configValue, logValue) {
    configValue = configValue || process.env.FILTER_TO;
    var validNumberFormatRegex = /^\+?[1]?(411|511|911)/; // Checks for e.164 and non-e.164 formats of 911,511,411 service numbers
    var errorMessage;
    if(!logValue) {
        errorMessage = 'Required parameter logValue was undefined or null when passed to the dialedNumberInvalidator function.';
        console.error(errorMessage);
        return false;
    }
    logValue = String(logValue); // Makes sure logValue has the match method available
    try {
        if(null !== logValue.match(validNumberFormatRegex) ) {
            return (-1 !== logValue.indexOf(configValue) ) ? true : false;
        }
    } catch( e ) {
        errorMessage = 'The dialed (to) number is not a recognized service number.';
        console.error(errorMessage);
        throw new Error(errorMessage);
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
