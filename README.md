# OpenFin Layouts


## Overview
OpenFin Layouts delivers window management and layout user experience across the desktop for OpenFin-based applications.

OpenFin Layouts uses the new Services framework to expose its API to consuming applications.  You can see the documentation for these APIs here:  http://cdn.openfin.co/jsdocs/alpha/fin.desktop.Service.html.

This project consist of 3 parts:
1. The Layouts Service, which manages the state of windows, tabs and layouts
2. The Layouts Client, which exposes calls to programatically control snap/dock, tabbing and save/restore.
3. Layout Service Demo app, demonstrating the different features of OpenFin Layout

### Dependencies
- OpenFin version for applications using Layouts = 9.61.34.25
- OpenFin version used in the Layouts Service = 9.61.34.25
- RVM >=  4.4.1.1

### Features
- Snap & Dock 
   - Windows snap to all sides of other window or group of windows
   - Windows of comparable size will snap and stretch to match the target window
   - Visible feedback on where the dragged window will be snapped/stretched to target window/group
   - Resize windows in group
   - On inclusion of the client API, undocking can be done with `CTRL+SHIFT+U` or `CMD+SHIFT+U`. (Global hotkey support ETA September '18)
- Tabbing
   - Dropping a window ontop of another window will create tabbed windows with a tabstrip on top
   - Tabs can be reorder and renamed.
   - Minimize / maximize / restore / close on the tabstrip affects the whole tabgroup (tabstrip and tabbed windows)
   - Application developers can provide their own tabstrip - simply by hosting a templated html, initiated on application startup
   - The service comes with a win10 like default tabstrip that will used if no custom tabstrip is defined
- Save and restore
   - The service has APIs for getting and restoring layouts
   - The provided demo showcases how a layout manager application could use the APIs to manage layouts
- APIs
   - API available to undock, ungroup, tab / untab , save / restore a layout or opt-out of tabbing and snapping.
- Hosting
   - The lastest production version OpenFin Layouts will by default be served from OpenFin's CDN
   - For testing / dev purposes, a customers can specify an absolute version/location of a the service by providing the full URL in the services section of the app manifest (se Manifest declaration below)

### Run Locally
- Windows support only. 
- Node 8.11 LTS.
- Testing requires [robotjs](http://robotjs.io/docs/) and you may need to build it. See their docs for info on building if you are testing. `npm install--ignore-scripts` is fine if you are not running the tests.

```bash
npm install --ignore-scripts
npm run dev
```
## Getting Started

Using the Layouts service is done in two steps, add the service to application manifest and import the API:

### Manifest declaration

To ensure the service is running, you must declare it in your application config.

```
"services" :
[
   {
   "name":"layouts"
   }
]
```
Optionally you can add a URL for specifying a custom location or a specific version:

```
"services" :
[
   {
   "name":"layouts",
   "manifestUrl": "https://custom-location/0.9/app.json"
   }
]
```

### Import the Client API

```bash
npm install openfin-layouts
```

The client module exports a set of functions - API doc available at [tsdoc link to be inserted]


### Usage

Using Layouts is described in detail in our tutorial - available at [tutorial link goes here]

## Testing

```bash
npm install
npm test
```

### Notes
- If using Parallels Desktop, you have to be in a mode where Parallels can control the mouse. Set `Settings>Hardware>Mouse&Keyboard>Mouse` to `Optimize for Games`

## Known Issues
- Apps in a layout need to be in the same runtime
- Aero Shake (win7) and Windows Snap Assist(win10) are not supported
- Window can be misalignment on Windows 10, scheduled to be fixed in OpenFin Runtime .35 
- "deregister" opts out of snap/dock & tabbing, but currently not save/restore
- Tabbed windows currently cannot be snapped
- Changing monitor and/or screen resolution is currently not supported
- Minimizing one window in a snap group only minimizes the window not the group

## License
This project uses the [Apache2 license](https://www.apache.org/licenses/LICENSE-2.0)

## Support
This is an open source project and all are encouraged to contribute.
Please enter an issue in the repo for any questions or problems. For further inqueries, please contact us at support@openfin.co
