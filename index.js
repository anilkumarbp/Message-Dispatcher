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
var extensions = {};
var activecalls = [];
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

	populateExtensions();
}

/**
 * Application Functions
**/
function populateExtensions() {
	platform
		.get(Extension.createUrl(), {
			query: {
				page: 1,
				perPage: 1000
			}
		}).then(function(extensions) {
			console.log(extensions);
		})
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
	console.log('REQUEST: ', req);
}

/**
 * Subscription Event Handlers
**/
function handleSubscriptionNotification(data) {
	console.log('SUBSCRIPTION NOTIFICATION DATA: ', data);
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
	console.log('SUBSCRIPTION CREATED SUCCESSFULLY: ', data);
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

/*

(function() {


// Require RCSDK
var RCSDK = require('rcsdk');
var fs = require('fs');
var extensions = [];
var activecalls = [];
var rcsdk = new RCSDK({
	server: process.env.RC_API_BASE_URL,
	appKey: process.env.RC_APP_KEY,
	appSecret: process.env.RC_APP_SECRET
});


//Platform Singleton
var platform = rcsdk.getPlatform();


// Active calls function
var activeCalls = function() {
    platform.get('/account/~/active-calls', {
            query: {
                direction: "Outbound",  // Direction
                type: "Voice"          // Type of call
            }
        })
        .then(function(response){
            activecalls = response.json.records;
        })
        .catch(function(e){
            console.log('Error inside Subscription event for active calls :' + e.stack);
        });
}


// Authenticate
platform.authorize({
	username: process.env.RC_USERNAME,            // Enter the usernmae
	extension: process.env.RC_EXTENSION,          // Enter the extension
	password: process.env.RC_PASSWORD,            // Enter the password
	remember: 'true'
}).then(function(response){
  
    platform.auth = response.json;
    console.log('Authentication success');
    console.log(JSON.stringify(response.data, null, 2));


        //********** Retreive Account Active calls numbers from the extension ********************
        //     //ret  reive all the numbers associated with this extension

        platform.get('/account/~/extension')
            .then(function(response){

                var apiresponse = response.json;
                console.log("********************Phone Numbers for the Extension*********************");
                console.log(JSON.stringify(response.data, null, 2));

            })
            .catch(function(e){
                console.error('Error ' + e.stack);
            });

     //********** Retreive Phone numbers from the extension ********************
         //ret  reive all the numbers associated with this extension
    platform.get('/account/~/device')
        .then(function(response){

            var apiresponse = response.json;
            console.log("**************** Extensions Device List  ***********************");
            console.log(JSON.stringify(response.data, null, 2));

        })
        .catch(function(e){
            console.error('Error ' + e.stack);
        });


        //********** Setup Subscriptions ********************
        //retreive all the extensions for this account
        platform.get('/account/~/extension/')
                 .then(function(response){
                     console.log(JSON.stringify(response.data, null, 2));
                   var apiresponse = response.json;
                   for(var key in apiresponse.records) {
                     var extension_number = "";

                     if (apiresponse.records[key].hasOwnProperty('extensionNumber')) {
                         extension_number = parseInt(apiresponse.records[key].id);
                         extensions.push(['/account/~/extension/' + extension_number + '/presence']);
                         extensions.push(['/account/~/extension/' + extension_number + '/message-store']);
                     }
                 }

                 // Keep pulling the active calls
                     setInterval(activeCalls, 6000);

                 // Create a subscription
                     var subscription = rcsdk.getSubscription();
                     console.log("*************** Subscription: *****************", subscription);

                     subscription.setEvents(extensions);

                     subscription.on(subscription.events.notification, function(msg) {
                         console.log("A new Event");
                         console.log("***********");
                         console.log(JSON.stringify(msg));

                         if(msg.body.telephonyStatus == "CallConnected") {

                              for(var key in records.records) {
                                  if(records[key].result == "Call connected") {
                                      if(records[key].to.phoneNumber == "511") {
                                          console.log("511 identified");
                                      }
                                  }
                              }

                         }

                     });

                     return subscription.register();

               })
               .then(function(response) {
                     console.log('Subscription success');
                     console.log(JSON.stringify(response.data, null, 2));;
               })
               .catch(function(e){
                 console.error('Error ' + e.stack);
               });


   })
   .catch(function(e){
    console.error('Error ' + e.stack);
  });


  }) ();       
*/
