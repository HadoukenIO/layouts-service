window["main"] =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/client/Api.ts":
/*!***************************!*\
  !*** ./src/client/Api.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nclass Api {\r\n    /**\r\n     * @constructor\r\n     * @description Constructor for the Api class\r\n     */\r\n    constructor() {\r\n        this.mEventListeners = [];\r\n    }\r\n    /**\r\n     * @protected\r\n     * @function addEventListener Adds an event listener\r\n     * @param event The Api event to listen to\r\n     * @param callback callback to handle the data received\r\n     */\r\n    addEventListener(event, callback) {\r\n        if (!event) {\r\n            console.error('No event has been passed in');\r\n            return;\r\n        }\r\n        if (!callback) {\r\n            console.error('No callback has been passed in');\r\n            return;\r\n        }\r\n        fin.desktop.InterApplicationBus.subscribe(\"*\", event, callback, () => {\r\n            this.mEventListeners.push({ eventType: event, callback });\r\n        }, (reason) => {\r\n            console.error(reason);\r\n        });\r\n    }\r\n    /**\r\n     * @protected\r\n     * @function removeEventListener Removes an event listener\r\n     * @param event The api event that is being listened to\r\n     * @param callback The callback registered to the event\r\n     */\r\n    removeEventListener(event, callback) {\r\n        const removeApiEvent = event;\r\n        fin.desktop.InterApplicationBus.unsubscribe(\"*\", event, callback, () => {\r\n            const eventToRemove = { eventType: removeApiEvent, callback };\r\n            const index = this.mEventListeners.findIndex((currentEvent) => {\r\n                return currentEvent.eventType === eventToRemove.eventType && currentEvent.callback === eventToRemove.callback;\r\n            });\r\n            delete this.mEventListeners[index];\r\n        }, (reason) => {\r\n            console.error(reason);\r\n        });\r\n    }\r\n    /**\r\n     * @function sendAction sends an action to the\r\n     * @param payload\r\n     */\r\n    sendAction(payload) {\r\n        if (!payload) {\r\n            console.error(\"No payload was passed in\");\r\n            return;\r\n        }\r\n        fin.desktop.InterApplicationBus.send(\"Tabbing_Main\", \"tab-api\", payload);\r\n    }\r\n}\r\nexports.Api = Api;\r\n\n\n//# sourceURL=webpack://%5Bname%5D/./src/client/Api.ts?");

/***/ }),

/***/ "./src/client/AppApi.ts":
/*!******************************!*\
  !*** ./src/client/AppApi.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst Api_1 = __webpack_require__(/*! ./Api */ \"./src/client/Api.ts\");\r\nconst APITypes_1 = __webpack_require__(/*! ../shared/APITypes */ \"./src/shared/APITypes.ts\");\r\nconst types_1 = __webpack_require__(/*! ../shared/types */ \"./src/shared/types.ts\");\r\nclass AppApi extends Api_1.Api {\r\n    constructor() {\r\n        super();\r\n        this._ID = {\r\n            uuid: fin.desktop.Application.getCurrent().uuid,\r\n            name: fin.desktop.Window.getCurrent().name\r\n        };\r\n        // Give the frame back if our service dies\r\n        fin.desktop.Window.wrap(\"Tabbing_Main\", \"Tabbing_Main\").addEventListener(\"closed\", () => {\r\n            fin.desktop.Window.getCurrent().updateOptions({ frame: true });\r\n        });\r\n    }\r\n    init(url, height) {\r\n        fin.desktop.InterApplicationBus.send(\"Tabbing_Main\", \"Tabbing_Main\", types_1.ServiceIABTopics.CLIENTINIT, { url, height });\r\n    }\r\n    deregister() {\r\n        fin.desktop.InterApplicationBus.send(\"Tabbing_Main\", \"Tabbing_Main\", APITypes_1.AppApiEvents.DEREGISTER, {});\r\n    }\r\n}\r\nexports.AppApi = AppApi;\r\nwindow.TabClient = new AppApi();\r\n\n\n//# sourceURL=webpack://%5Bname%5D/./src/client/AppApi.ts?");

/***/ }),

/***/ "./src/client/SaveAndRestoreApi.ts":
/*!*****************************************!*\
  !*** ./src/client/SaveAndRestoreApi.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst APITypes_1 = __webpack_require__(/*! ../shared/APITypes */ \"./src/shared/APITypes.ts\");\r\nconst types_1 = __webpack_require__(/*! ../shared/types */ \"./src/shared/types.ts\");\r\nclass SaveAndRestoreAPI {\r\n    static getTabBlob() {\r\n        return new Promise((res, rej) => {\r\n            const listener = (message) => {\r\n                fin.desktop.InterApplicationBus.unsubscribe(types_1.TabServiceID.UUID, types_1.TabServiceID.NAME, APITypes_1.SaveAndRestoreEvents.GETBLOBRETURN, listener);\r\n                res(message);\r\n            };\r\n            fin.desktop.InterApplicationBus.subscribe(types_1.TabServiceID.UUID, types_1.TabServiceID.NAME, APITypes_1.SaveAndRestoreEvents.GETBLOBRETURN, listener);\r\n            fin.desktop.InterApplicationBus.send(types_1.TabServiceID.UUID, types_1.TabServiceID.NAME, { action: APITypes_1.SaveAndRestoreActions.GETBLOB });\r\n        });\r\n    }\r\n}\r\n// tslint:disable-next-line:no-any\r\nwindow.SARAPI = SaveAndRestoreAPI;\r\n\n\n//# sourceURL=webpack://%5Bname%5D/./src/client/SaveAndRestoreApi.ts?");

/***/ }),

/***/ "./src/client/TabbingApi.ts":
/*!**********************************!*\
  !*** ./src/client/TabbingApi.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst APITypes_1 = __webpack_require__(/*! ../shared/APITypes */ \"./src/shared/APITypes.ts\");\r\nconst Api_1 = __webpack_require__(/*! ./Api */ \"./src/client/Api.ts\");\r\nconst TabbingApiWindowActions_1 = __webpack_require__(/*! ./TabbingApiWindowActions */ \"./src/client/TabbingApiWindowActions.ts\");\r\n/**\r\n * @class Client tabbing API\r\n */\r\nclass TabbingApi extends Api_1.Api {\r\n    /**\r\n     * @public\r\n     * @function windowActions Property for getting the window action object\r\n     */\r\n    get windowActions() {\r\n        return this.mWindowActions;\r\n    }\r\n    /**\r\n     * @constructor\r\n     * @description Constructor for the TabbingApi class\r\n     */\r\n    constructor() {\r\n        super();\r\n        this.mWindowActions = new TabbingApiWindowActions_1.TabbingApiWindowActions();\r\n    }\r\n    /**\r\n     * @public\r\n     * @function add Adds an application specified to this tab\r\n     * @param uuid The uuid of the application to be added\r\n     * @param name The name of the application to be added\r\n     */\r\n    addTab(uuid, name, tabProperties) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = {\r\n            action: APITypes_1.TabAPIActions.ADD,\r\n            uuid,\r\n            name,\r\n            properties: tabProperties\r\n        };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function eject Removes the application\r\n     * @param uuid The uuid of the application to eject\r\n     * @param name The name of the application to eject\r\n     */\r\n    ejectTab(uuid, name) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.EJECT, uuid, name };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function activateTab Activates the selected tab and brings to front\r\n     * @param uuid The uuid of the application to activate\r\n     * @param name The name of the application to activate\r\n     */\r\n    activateTab(uuid, name) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.ACTIVATE, uuid, name };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function closeTab Closes the tab and the application along with it\r\n     * @param uuid The uuid of the application\r\n     * @param name The name of the application\r\n     */\r\n    closeTab(uuid, name) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.CLOSE, uuid, name };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function updateTabProperties Updates the tab properties, for example name and icon\r\n     * @param uuid The uuid of the tab to update properties\r\n     * @param name The name of the tab to update properties\r\n     * @param properties The new properties\r\n     */\r\n    updateTabProperties(uuid, name, properties) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        if (!properties) {\r\n            console.error(\"No properties has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.UPDATEPROPERTIES, uuid, name, properties };\r\n        super.sendAction(payload);\r\n    }\r\n    startDrag() {\r\n        const payload = { action: APITypes_1.TabAPIActions.STARTDRAG };\r\n        super.sendAction(payload);\r\n    }\r\n    endDrag(event, uuid, name) {\r\n        if (!event) {\r\n            console.error('No drag event has been passed in');\r\n            return;\r\n        }\r\n        if (!uuid) {\r\n            console.error('No uuid has been passed in');\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error('No name has been passed in');\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.ENDDRAG, uuid, name, event: { screenX: event.screenX, screenY: event.screenY } };\r\n        super.sendAction(payload);\r\n    }\r\n}\r\nexports.TabbingApi = TabbingApi;\r\n\n\n//# sourceURL=webpack://%5Bname%5D/./src/client/TabbingApi.ts?");

/***/ }),

/***/ "./src/client/TabbingApiWindowActions.ts":
/*!***********************************************!*\
  !*** ./src/client/TabbingApiWindowActions.ts ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst APITypes_1 = __webpack_require__(/*! ../shared/APITypes */ \"./src/shared/APITypes.ts\");\r\nconst Api_1 = __webpack_require__(/*! ./Api */ \"./src/client/Api.ts\");\r\n/**\r\n * @class Handles window actions for the tab strip\r\n */\r\nclass TabbingApiWindowActions extends Api_1.Api {\r\n    /**\r\n     * @constructor Constructor fot the TabingApiWindowActions\r\n     */\r\n    constructor() {\r\n        super();\r\n    }\r\n    /**\r\n     * @public\r\n     * @function maximize Maximizes the tab client window.\r\n     */\r\n    maximize() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.MAXIMIZE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function minmize Minimizes the tab client window.\r\n     */\r\n    minimize() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.MINIMIZE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function restore Restores the tab client from a minimized or maximized state.\r\n     */\r\n    restore() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.RESTORE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function close Closes the tab client window.\r\n     */\r\n    close() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.CLOSE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function toggleMaximize Restores if the window is maximized, if not will maximize.\r\n     */\r\n    toggleMaximize() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.TOGGLEMAXIMIZE };\r\n        super.sendAction(payload);\r\n    }\r\n}\r\nexports.TabbingApiWindowActions = TabbingApiWindowActions;\r\n\n\n//# sourceURL=webpack://%5Bname%5D/./src/client/TabbingApiWindowActions.ts?");

/***/ }),

/***/ "./src/shared/APITypes.ts":
/*!********************************!*\
  !*** ./src/shared/APITypes.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nvar TabApiEvents;\r\n(function (TabApiEvents) {\r\n    TabApiEvents[\"TABADDED\"] = \"TABADDED\";\r\n    TabApiEvents[\"TABREMOVED\"] = \"TABREMOVED\";\r\n    TabApiEvents[\"PROPERTIESUPDATED\"] = \"PROPERTIESUPDATED\";\r\n    TabApiEvents[\"TABACTIVATED\"] = \"TABACTIVATED\";\r\n})(TabApiEvents = exports.TabApiEvents || (exports.TabApiEvents = {}));\r\nvar AppApiEvents;\r\n(function (AppApiEvents) {\r\n    AppApiEvents[\"CLIENTINIT\"] = \"CLIENTINIT\";\r\n    AppApiEvents[\"TABBED\"] = \"TABBED\";\r\n    AppApiEvents[\"UNTABBED\"] = \"UNTABBED\";\r\n    AppApiEvents[\"DEREGISTER\"] = \"DEREGISTER\";\r\n})(AppApiEvents = exports.AppApiEvents || (exports.AppApiEvents = {}));\r\n/**\r\n * @description The action the tab client api will send to the service,\r\n * this will determine which action to execute on service side\r\n */\r\nvar TabAPIActions;\r\n(function (TabAPIActions) {\r\n    TabAPIActions[\"STARTDRAG\"] = \"STARTDRAG\";\r\n    TabAPIActions[\"ENDDRAG\"] = \"ENDDRAG\";\r\n    TabAPIActions[\"ADD\"] = \"ADD\";\r\n    TabAPIActions[\"EJECT\"] = \"EJECT\";\r\n    TabAPIActions[\"CLOSE\"] = \"CLOSE\";\r\n    TabAPIActions[\"ACTIVATE\"] = \"ACTIVATE\";\r\n    TabAPIActions[\"UPDATEPROPERTIES\"] = \"UPDATEPROPERTIES\";\r\n    TabAPIActions[\"INIT\"] = \"TABINIT\";\r\n})(TabAPIActions = exports.TabAPIActions || (exports.TabAPIActions = {}));\r\nvar TabAPIWindowActions;\r\n(function (TabAPIWindowActions) {\r\n    TabAPIWindowActions[\"MAXIMIZE\"] = \"MAXIMIZEWINDOW\";\r\n    TabAPIWindowActions[\"MINIMIZE\"] = \"MINIMIZEWINDOW\";\r\n    TabAPIWindowActions[\"RESTORE\"] = \"RESTOREWINDOW\";\r\n    TabAPIWindowActions[\"CLOSE\"] = \"CLOSEWINDOW\";\r\n    TabAPIWindowActions[\"TOGGLEMAXIMIZE\"] = \"TOGGLEMAXIMIZE\";\r\n})(TabAPIWindowActions = exports.TabAPIWindowActions || (exports.TabAPIWindowActions = {}));\r\nvar SaveAndRestoreActions;\r\n(function (SaveAndRestoreActions) {\r\n    SaveAndRestoreActions[\"GETBLOB\"] = \"SARGETBLOB\";\r\n    SaveAndRestoreActions[\"SENDBLOB\"] = \"SARSENDBLOB\";\r\n})(SaveAndRestoreActions = exports.SaveAndRestoreActions || (exports.SaveAndRestoreActions = {}));\r\nvar SaveAndRestoreEvents;\r\n(function (SaveAndRestoreEvents) {\r\n    SaveAndRestoreEvents[\"GETBLOBRETURN\"] = \"SARRETURNBLOB\";\r\n})(SaveAndRestoreEvents = exports.SaveAndRestoreEvents || (exports.SaveAndRestoreEvents = {}));\r\n\n\n//# sourceURL=webpack://%5Bname%5D/./src/shared/APITypes.ts?");

/***/ }),

/***/ "./src/shared/types.ts":
/*!*****************************!*\
  !*** ./src/shared/types.ts ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nvar TabServiceID;\r\n(function (TabServiceID) {\r\n    TabServiceID[\"NAME\"] = \"TABBING_MAIN\";\r\n    TabServiceID[\"UUID\"] = \"TABBING_MAIN\";\r\n})(TabServiceID = exports.TabServiceID || (exports.TabServiceID = {}));\r\nvar ServiceIABTopics;\r\n(function (ServiceIABTopics) {\r\n    ServiceIABTopics[\"CLIENTINIT\"] = \"CLIENTINIT\";\r\n    ServiceIABTopics[\"TABEJECTED\"] = \"TABEJECTED\";\r\n    ServiceIABTopics[\"UPDATETABPROPERTIES\"] = \"UPDATETABPROPERTIES\";\r\n})(ServiceIABTopics = exports.ServiceIABTopics || (exports.ServiceIABTopics = {}));\r\n\n\n//# sourceURL=webpack://%5Bname%5D/./src/shared/types.ts?");

/***/ }),

/***/ 0:
/*!*************************************************************************************************!*\
  !*** multi ./src/client/AppApi.ts ./src/client/SaveAndRestoreApi.ts ./src/client/TabbingApi.ts ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("__webpack_require__(/*! ./src/client/AppApi.ts */\"./src/client/AppApi.ts\");\n__webpack_require__(/*! ./src/client/SaveAndRestoreApi.ts */\"./src/client/SaveAndRestoreApi.ts\");\nmodule.exports = __webpack_require__(/*! ./src/client/TabbingApi.ts */\"./src/client/TabbingApi.ts\");\n\n\n//# sourceURL=webpack://%5Bname%5D/multi_./src/client/AppApi.ts_./src/client/SaveAndRestoreApi.ts_./src/client/TabbingApi.ts?");

/***/ })

/******/ });