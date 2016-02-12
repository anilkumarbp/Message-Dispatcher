Message-Dispatcher
=======================

Message-Dispatcher allows you to create subscription for all the extensions enabling you to listen to Presence events and message-store notifications when a call/messages comes into a specific extension and dispatch a message ( send SMS ). For more information, see the 
[Developer Guide](https://developer.ringcentral.com/api-docs/latest/index.html#!#Notifications.html).

## Getting Started

## Installation

Fork and clone the repository. Then, install dependencies with

```
git clone https://github.com/anilkumarbp/Message-Dispatcher.git
```
```
npm install
```
```
npm start
```

## To subscribe to all the extensions on an account follow the steps marked below :

Open the file [index.js](https://github.com/anilkumarbp/Message-Dispatcher/blob/master/index.js) and add the following :
* appKey
* appSecret
* Username
* extension
* password


## Dependencies

Current used RCSDK version for this demo is :
[RCSDK-1.3.2](https://github.com/ringcentral/ringcentral-js/tree/1.3.2)
* Make sure to change the SDK version in the package.json before you chose to use a different SDK Version.


## Links

Project Repo

* https://github.com/anilkumarbp/Message-Dispatcher

RingCentral SDK for JavaScript

* https://github.com/ringcentral/js-sdk

RingCentral API Docs

* https://developers.ringcentral.com/library.html

RingCentral API Explorer

* http://ringcentral.github.io/api-explorer

## Contributions

Any reports of problems, comments or suggestions are most welcome.

Please report these on [GitHub](https://github.com/anilkumarbp/Message-Dispatcher).

## License

RingCentral SDK is available under an MIT-style license. See [LICENSE.txt](LICENSE.txt) for details.

RingCentral SDK &copy; 2016 by RingCentral
