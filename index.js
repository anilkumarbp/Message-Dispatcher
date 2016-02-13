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

        //platform.get('/account/~/extension')
        //    .then(function(response){
        //
        //        var apiresponse = response.json;
        //        console.log("********************Phone Numbers for the Extension*********************");
        //        console.log(JSON.stringify(response.data, null, 2));
        //
        //    })
        //    .catch(function(e){
        //        console.error('Error ' + e.stack);
        //    });

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
                         extensions.push(['/account/~/extension/' + extension_number + '/presence?detailedTelephonyState=true']);
                         extensions.push(['/account/~/extension/' + extension_number + '/message-store']);
                     }
                 }

                 // Keep pulling the active calls
                     setInterval(activeCalls, 10000);

                 // Create a subscription
                     var subscription = rcsdk.getSubscription();
                     console.log("*************** Subscription: *****************", subscription);

                     subscription.setEvents(extensions);

                     subscription.on(subscription.events.notification, function(msg) {
                         console.log("A new Event");
                         console.log("***********");
                         console.log(JSON.stringify(msg));
                         console.log(msg.body);
                         console.log(msg.body.telephonyStatus);
                         console.log(msg.body.activeCalls[0].to);


                         if(msg.body.telephonyStatus == "CallConnected" && msg.body.activeCalls[0].direction == "Outbound" && msg.body.activeCalls[0].to == "18315941779") {

                             // send an SMS on the outbound call
                             platform.post('/account/~/extension/~/sms', {
                                 body: {
                                     from: {phoneNumber: msg.body.activeCalls[0].from}, // Your sms-enabled phone number
                                     to: [
                                         {phoneNumber: 18315941779} // Second party's phone number
                                     ],
                                     text: "511 is coming to pick you up"
                                 }
                             }).then(function(response) {
                                console.log("Succesfully notified about the 511 request");
                             }).catch(function(e) {
                                 alert('Error: ' + e.message);
                             });
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
