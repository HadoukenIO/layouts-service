# OpenFin Layouts


## Overview
OpenFin Layouts delivers window management and layout user experience across the desktop for OpenFin-based applications.

OpenFin Layouts uses the new Services framework to expose its API to consuming applications.  You can see the documentation for these APIs here:  http://cdn.openfin.co/jsdocs/alpha/fin.desktop.Service.html.

This project consist of 2 parts:
1. The Layouts Service, which manages the state of windows.
2. The Layouts Client, which exposes calls to undock and opt-out of snapping behavior.

### Dependencies
- OpenFin version >= 8.56.30.55
- RVM >= 4.2.0.33.

### Features
- Windows snap to the right or bottom edges of window or group.
- API available to undock or opt-out of snapping.
- On inclusion of plugin script undocking with `CTRL+SHIFT+U` or `CMD+SHIFT+U`.
- A window will not snap if it detects a collision. It will not try to find a more suitable point.

### Run Locally
- To run the project locally the npm scripts require git bash.
- Windows support only. 
- Node 8.11 LTS.
- RVM >=[4.4.0.8](https://cdn.openfin.co/release/rvm/4.4.0.8)
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
### Import the Client API

```bash
npm install openfin-layouts
```

The client module exports two functions: `undock` and `deregister`.

Both have the same signature, they take an optional OpenFin Window Identity (an object with uuid and name). This defaults to the identity of the current window.

*Deregister* opts the given window out of snapping behavior. *Undock* removes the given window from its group.

Both functions are asynchronous and return a promise.

[Docs](docs.md)


### Usage
```javascript
import {undock, deregister} from 'openfin-layouts';

undock().then(() => console.log('successfully undocked myself'));
undock({uuid: 'otherWindow', name: 'otherWindow'}).then(() => console.log('successfully undocked otherWindow'));
deregister().then(() => console.log('successfully deregistered myself'));
deregister({uuid: 'otherWindow', name: 'otherWindow'}).then(() => console.log('successfully deregistered otherWindow'));
```
## Testing

```bash
npm install
npm test
```

### Notes
- Testing runtime version must be >= 9.*
- alpha RVM
- If using Parallels Desktop, you have to be in a mode where Parallels can control the mouse. Set `Settings>Hardware>Mouse&Keyboard>Mouse` to `Optimize for Games`
- Other setups haven't been tested

## Roadmap
This is a WIP. Items on our immediate roadmap include:
- Support for saving and recreating layouts
- Cross-runtime support
- Z-index management of windows

## Known Issues
- Apps in a layout need to be in the same runtime
- Windows Aero Shake is not supported

## License
This project uses the [Apache2 license](https://www.apache.org/licenses/LICENSE-2.0)

## Support
This is an open source project and all are encouraged to contribute.
Please enter an issue in the repo for any questions or problems. For further inqueries, please contact us at support@openfin.co
