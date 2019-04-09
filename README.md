# OpenFin Layouts


## Overview
OpenFin Layouts delivers window management and layout user experience across the desktop for OpenFin-based applications.

This project consist of 3 parts:
1. The Layouts Service, which manages the state of windows, tabs and layouts
2. The Layouts Client, which exposes calls to programmatically control snap/dock, tabbing and save/restore
3. Layout Service Demo app, demonstrating the different features of OpenFin Layout

### Dependencies
- OpenFin version for applications using Layouts = 9.61.38.41
- OpenFin version used in the Layouts Service = 9.61.38.41
- RVM >= 4.7

### Features
- Snap & Dock 
   - Windows snap to all sides of other window or group of windows
   - Windows of comparable size will snap and stretch to match the target window
   - Visible feedback on where the dragged window will be snapped/stretched to target window/group
   - Resize windows in group
   - Windows can be undocked by pressing `CTRL+SHIFT+U` or `CMD+SHIFT+U` when the window has focus
   - On inclusion of the client API, windows and groups can also be undocked programmatically
- Tabbing
   - Dropping a window on-top of another window will tab the windows together
   - Dropping a window on-top of an existing tab group will add it to that group
   - Tabs can be reordered and renamed
   - Minimize/maximize/restore/close on the tabstrip affects the whole tab group (tabstrip and tabbed windows)
   - Application developers can provide their own tabstrip - simply by hosting a templated html, initiated on application startup
   - The service comes with a Chrome-like default tabstrip that will be used if no custom tabstrip is defined
- Save & Restore
   - The service has APIs for generating and restoring workspaces
   - The provided demo showcases how a layout manager application could use the APIs to manage layouts
- APIs
   - APIs available to undock, ungroup, tab/un-tab, save/restore workspaces, and opt-out of service functionality
- Hosting
   - The latest production version OpenFin Layouts will by default be served from OpenFin's CDN
   - For testing/dev purposes, customers can specify an absolute version/location of the service by providing the full URL in the services section of the app manifest (see 'Manifest declaration' below)
   - To self-host versions of the service, each release is also deployed to the CDN as a zip file, available at `https://cdn.openfin.co/services/openfin/layouts/<version>/layouts-service.zip`

## Getting Started

Integrating the Layouts Service within an application is done in two steps. Add the service to the application manifest, and import the API:

### Manifest declaration

To ensure the service is running, you must declare it in your application config.

```
"services":
[
   {"name":"layouts"}
]
```
Optionally you can add a URL for specifying a custom location or a specific version:

```
"services":
[
   {
       "name":"layouts",
       "manifestUrl": "https://custom-location/<version>/app.json"
   }
]
```

### Import the Client API

```bash
npm install openfin-layouts
```

The client library is also available as a resource which can be included via `<script>` tag:
```
   <script src="https://cdn.openfin/services/openfin/layouts/<VERSION>/openfin-layouts.js"></script>
```
This will expose the global variable `layouts` with the API methods documented in the link below.  Example:
```
   layouts.snapAndDock.undockWindow();
```

The client module exports a set of functions - [API docs available here](https://cdn.openfin.co/docs/services/layouts/stable/api/).


### Usage

Using Layouts is described in detail in [our tutorial](https://openfin.co/documentation/layouts-tutorial).

## Run Locally

To preview the functionality of the service without integrating it into an existing application - or to start contributing to the service - the service can be ran locally. By checking out this repo and then running the project.

### Setup

After checkout, install project dependencies using `npm install`. The integration tests within the project rely on [robotjs](http://robotjs.io) in order to manipulate windows at the OS-level; this adds some caveats to being able to the standard "`npm install ; npm start`" convention:
- Windows support only.
- Node 8.11 LTS.
- Installing the [pre-requisites](http://robotjs.io/docs/) of robotjs.
  - A simple one-liner alternative is to use [windows-build-tools](https://www.npmjs.com/package/windows-build-tools), by running `npm install -g windows-build-tools` with Administrator privileges.

To setup the project whilst avoiding the above dependencies, can instead be installed with `npm install --ignore-scripts`.

### Startup
Once dependencies are installed, start the "built-in" sample application with `npm start`. This uses `webpack-dev-middleware` to both build and host the application; a custom server script will start the OpenFin application once the server is up and running.

The startup script has optional arguments which can be used to tweak the behavior of the build and the test server. Use `npm start -- -h` for details on the available parameters and their effects.

### Build Process
The service consists of several different components unified into a single project. The `package.json` defines the combined dependencies of all components; anything required for the pre-built client to work within an application is included in the `"dependencies"` section, and the remaining dependencies - used to build the client, and to both build & run the provider and demo application - are included under `"devDependencies"`.

Similarly, there is a single `webpack.config.js` script that will build the above components.

### Testing
To run the full test-suite for layouts-service, run:
```bash
npm install
npm test
```

This will run unit tests followed by the integration tests. These steps can also be ran individually via `npm run test:unit` and `npm run test:int`. When running the tests separately in this way, both test runners support some optional arguments. Append `--help` to either of the above `npm run` commands to see the available options.

### Deployment
Staging and production builds are managed via the Jenkinsfile build script. This will build the project as usual (except with the `--production` argument) and then deploy the client and provider to their respective locations. The demo application exists only within this repo and is not deployed.

The service client is deployed as an NPM module, so that it can be included as a dependency in any application that wishes to integrate with the service.

The service provider is a standard OpenFin application, only its lifecycle is controlled by the RVM (based upon the requirements of user-launched applications) rather than being launched by users. The provider is deployed to the OpenFin CDN; a zip file is also provided to assist with re-deploying the provider to an alternate location. Direct links to each build are listed in the release notes, available on the [services versions page](https://developer.openfin.co/versions/?product=Services).

### Notes
- If using Parallels Desktop, you have to be in a mode where Parallels can control the mouse. Set `Settings>Hardware>Mouse&Keyboard>Mouse` to `Optimize for Games`

## Known Issues
A list of known issues can be found on our [Versions page](https://developer.openfin.co/versions/?product=Services).

## License
This project uses the [Apache2 license](https://www.apache.org/licenses/LICENSE-2.0).

However, if you run this code, it may call on the OpenFin RVM or OpenFin Runtime, which are covered by OpenFin's Developer, Community, and Enterprise licenses. You can learn more about OpenFin licensing at the links listed below or just email us at support@openfin.co with questions.

https://openfin.co/developer-agreement/
https://openfin.co/licensing/

## Support
This is an open source project and all are encouraged to contribute.
Please enter an issue in the repo for any questions or problems. Alternatively, please contact us at support@openfin.co
