#! /usr/bin/env node

// Handle local development and testing
require('dotenv').config();

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
