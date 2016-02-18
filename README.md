Message-Dispatcher
=======================

Message-Dispatcher allows RingCentral Developers to subscribe to all extensions within your RingCentral account. This enables you to listen to presence events for extensions within your account and to dispatch a message ( send SMS ). For more information, read the [RingCentral Developer Guide - Notifications and Subscriptions](https://developer.ringcentral.com/api-docs/latest/index.html#!#Notifications.html).

## Prerequisites

* Have a RingCentral Admin Account
* Be registered as a [RingCentral Developer](https://developers.ringcentral.com/)
* [Created your sandbox(aka: test or development) account](https://developer.ringcentral.com/library/tutorials/test-account.html) within the RingCentral Developer Portal
* Are able to [create a new application](https://developer.ringcentral.com/my-account.html#/applications) using the RingCentral Developer Portal

## Installation

Clone the repository to your local system:
[_Optionally, you can fork it first, but will need to modify the URI in the following command to match your fork's GIT repository._]

```
git clone https://github.com/anilkumarbp/Message-Dispatcher.git
```

Change your working directory to the newly cloned repository:
```
cd Message-Dispatcher
```

Install dependencies using NPM:
```
npm install
```

### Define an Application in RingCentral

In order to communicate with the RingCentral API, you will need to have RingCentral API Keys for the appropriate environment, either **Sandbox** or **Production**.

**IMPORTANT NOTE: The `Device permission` listed below is not currently available through special request. Please [Submit a Support Request using the Developer Portal](https://developer.ringcentral.com/support.html) please reference that you are using the Message-Dispatcher module created by the RingCentral Developer Community, and request access for this permission to be added to your application. Make sure to include your Application Name in your request.

**NOTE:** Since this application is server-side only, this value is not important. The `OAuth Redirect URI` value recommended below is only for development purposes on your local computer. 

1. Login to the Developer Portal [https://developer.ringcentral.com/login.html#/](https://developer.ringcentral.com/login.html#/) if you haven't already.
2. Click on 'Create App' to define a new application, here are the recommended parameters to operate with Message-Dispatcher:
    * **Application Name:** Your choice, but something easy to identify and associate with purpose is good
    * **Application Type:** Private
    * **Platform Type:** Embedded
    * **Permissions Needed:**
        * Read Accounts
        * Read Call Log
        * Read Messages
        * Read Presence
        * SMS
        * Devices 
    * OAuth Redirect URI: http://localhost:3000
3. Once you have successfully defined your application, you will need to obtain the API Credentials for your application to use in Development Environment Setup in the next steps. The `API Key` and `API Secret` values are accessible to you in the Credentials section for your application in the RingCentral Developer Portal.


### Development Environment Setup

Before operating the application for local development and testing, you will need to configure some RingCentral-specific environment variables.

You will need to create a `.env` file in the root directory of this application. We have created a file you can use as a template named `TMP.env`. Below are the steps to setup your development environment:

1. Rename `.env.tmpl` to `.env`. From the terminal in Mac or Linux environments: `mv .env.tmpl .env`
2. Open the `.env` for editing
3. Enter the indicated values:
    * **RC_USERNAME=** Admin user's phone number
    * **RC_PASSWORD=** Admin user's password 
    * **RC_EXTENSION=** Admin user's extension
    * **RC_APP_KEY=** Your application's `app_key`
    * **RC_APP_SECRET=** Your application's `app_secret`
    * **RC_ENVIRONMENT=** Either `sandbox` -OR- `production`
    * **RC_API_BASE_URL=** Only change when your application receives prodction access

## Operation

To start this application locally:
```
npm start
```

To run the unit tests:
```
npm test
```

## Dependencies

Current used RCSDK version for this demo is :
[RCSDK-2.0.4](https://github.com/ringcentral/ringcentral-js/tree/2.0.4)
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

Please report these on [Message-Dispatcher's Issue Tracker in Github](https://github.com/anilkumarbp/Message-Dispatcher/issues).

## License

RingCentral SDK is available under an MIT-style license. See [LICENSE.txt](LICENSE.txt) for details.

RingCentral SDK &copy; 2016 by RingCentral

## FAQ

* What if I do not have a RingCentral account? Don't have an account, no worries: [Become a RingCentral Customer](https://www.ringcentral.com/office/plansandpricing.html)
* I/My company is an Independent Software Vendor (ISV) who would like to integrate with RingCentral, how do I do that? You can apply to [Join the RingCentral Partner Program](http://www.ringcentral.com/partner/isvreseller.html)
