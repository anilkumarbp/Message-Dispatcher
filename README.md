# Message-Dispatcher


Message-Dispatcher
=======================

Subscription_Generator allows you to create subscription for all the extensions enabling you to listen to Presence events and message-store notifications when a call/messages comes into **ANY** of the extension. For more information, see the 
[Developer Guide](https://developer.ringcentral.com/api-docs/latest/index.html#!#Notifications.html).

## Getting Started

To subscribe to all the extensions on an account follow the steps marked below :

1. [Authorize using an Admin User](http://ringcentral.github.io/api-explorer/#!/Authentication/oauth_token_post)
2. [Retreive all the extensions](http://ringcentral.github.io/api-explorer/#!/Account_and_Extension_Information/v1_0_account__accountId__extension_get)
3. [Set Subscription Events/EventFilters](http://ringcentral.github.io/api-explorer/#!/Notifications/v1_0_subscription_post)
4. [Register Subscription](http://ringcentral.github.io/api-explorer/#!/Notifications/v1_0_subscription_post)


## Building

Fork and clone the repository. Then, install dependencies with

```
git clone https://github.com/anilkumarbp/Subscriptions_Generator.git
```
```
npm install
```
```
node index.js
```

## Dependencies

Current used RCSDK version for this demo is :
[RCSDK-1.3.2](https://github.com/ringcentral/ringcentral-js/tree/1.3.2)
* Make sure to change the SDK version in the package.json before you chose to use a different SDK Version.


## Links

Project Repo

* https://github.com/anilkumarbp/Subscriptions_Generator

RingCentral SDK for JavaScript

* https://github.com/ringcentral/js-sdk

RingCentral API Docs

* https://developers.ringcentral.com/library.html

RingCentral API Explorer

* http://ringcentral.github.io/api-explorer

## Contributions

Any reports of problems, comments or suggestions are most welcome.

Please report these on [GitHub](https://github.com/anilkumarbp/Subscriptions_Generator).

## License

RingCentral SDK is available under an MIT-style license. See [LICENSE.txt](LICENSE.txt) for details.

RingCentral SDK &copy; 2015 by RingCentral
