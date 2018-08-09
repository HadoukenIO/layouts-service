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
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/provider/tabbing/tabstrip/Tabstrip.ts");
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
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nclass Api {\r\n    /**\r\n     * @constructor\r\n     * @description Constructor for the Api class\r\n     */\r\n    constructor() {\r\n        this.mEventListeners = [];\r\n    }\r\n    /**\r\n     * @protected\r\n     * @function addEventListener Adds an event listener\r\n     * @param event The Api event to listen to\r\n     * @param callback callback to handle the data received\r\n     */\r\n    addEventListener(event, callback) {\r\n        if (!event) {\r\n            console.error('No event has been passed in');\r\n            return;\r\n        }\r\n        if (!callback) {\r\n            console.error('No callback has been passed in');\r\n            return;\r\n        }\r\n        fin.desktop.InterApplicationBus.subscribe(\"*\", event, callback, () => {\r\n            this.mEventListeners.push({ eventType: event, callback });\r\n        }, (reason) => {\r\n            console.error(reason);\r\n        });\r\n    }\r\n    /**\r\n     * @protected\r\n     * @function removeEventListener Removes an event listener\r\n     * @param event The api event that is being listened to\r\n     * @param callback The callback registered to the event\r\n     */\r\n    removeEventListener(event, callback) {\r\n        const removeApiEvent = event;\r\n        fin.desktop.InterApplicationBus.unsubscribe(\"*\", event, callback, () => {\r\n            const eventToRemove = { eventType: removeApiEvent, callback };\r\n            const index = this.mEventListeners.findIndex((currentEvent) => {\r\n                return currentEvent.eventType === eventToRemove.eventType && currentEvent.callback === eventToRemove.callback;\r\n            });\r\n            delete this.mEventListeners[index];\r\n        }, (reason) => {\r\n            console.error(reason);\r\n        });\r\n    }\r\n    /**\r\n     * @function sendAction sends an action to the\r\n     * @param payload\r\n     */\r\n    sendAction(payload) {\r\n        if (!payload) {\r\n            console.error(\"No payload was passed in\");\r\n            return;\r\n        }\r\n        fin.desktop.InterApplicationBus.send(\"Tabbing_Main\", \"tab-api\", payload);\r\n    }\r\n}\r\nexports.Api = Api;\r\n\n\n//# sourceURL=webpack:///./src/client/Api.ts?");

/***/ }),

/***/ "./src/client/TabbingApi.ts":
/*!**********************************!*\
  !*** ./src/client/TabbingApi.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst APITypes_1 = __webpack_require__(/*! ../shared/APITypes */ \"./src/shared/APITypes.ts\");\r\nconst Api_1 = __webpack_require__(/*! ./Api */ \"./src/client/Api.ts\");\r\nconst TabbingApiWindowActions_1 = __webpack_require__(/*! ./TabbingApiWindowActions */ \"./src/client/TabbingApiWindowActions.ts\");\r\n/**\r\n * @class Client tabbing API\r\n */\r\nclass TabbingApi extends Api_1.Api {\r\n    /**\r\n     * @public\r\n     * @function windowActions Property for getting the window action object\r\n     */\r\n    get windowActions() {\r\n        return this.mWindowActions;\r\n    }\r\n    /**\r\n     * @constructor\r\n     * @description Constructor for the TabbingApi class\r\n     */\r\n    constructor() {\r\n        super();\r\n        this.mWindowActions = new TabbingApiWindowActions_1.TabbingApiWindowActions();\r\n    }\r\n    /**\r\n     * @public\r\n     * @function add Adds an application specified to this tab\r\n     * @param uuid The uuid of the application to be added\r\n     * @param name The name of the application to be added\r\n     */\r\n    addTab(uuid, name, tabProperties) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = {\r\n            action: APITypes_1.TabAPIActions.ADD,\r\n            uuid,\r\n            name,\r\n            properties: tabProperties\r\n        };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function eject Removes the application\r\n     * @param uuid The uuid of the application to eject\r\n     * @param name The name of the application to eject\r\n     */\r\n    ejectTab(uuid, name) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.EJECT, uuid, name };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function activateTab Activates the selected tab and brings to front\r\n     * @param uuid The uuid of the application to activate\r\n     * @param name The name of the application to activate\r\n     */\r\n    activateTab(uuid, name) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.ACTIVATE, uuid, name };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function closeTab Closes the tab and the application along with it\r\n     * @param uuid The uuid of the application\r\n     * @param name The name of the application\r\n     */\r\n    closeTab(uuid, name) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.CLOSE, uuid, name };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function updateTabProperties Updates the tab properties, for example name and icon\r\n     * @param uuid The uuid of the tab to update properties\r\n     * @param name The name of the tab to update properties\r\n     * @param properties The new properties\r\n     */\r\n    updateTabProperties(uuid, name, properties) {\r\n        if (!uuid) {\r\n            console.error(\"No uuid has been passed in\");\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error(\"No name has been passed in\");\r\n            return;\r\n        }\r\n        if (!properties) {\r\n            console.error(\"No properties has been passed in\");\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.UPDATEPROPERTIES, uuid, name, properties };\r\n        super.sendAction(payload);\r\n    }\r\n    startDrag() {\r\n        const payload = { action: APITypes_1.TabAPIActions.STARTDRAG };\r\n        super.sendAction(payload);\r\n    }\r\n    endDrag(event, uuid, name) {\r\n        if (!event) {\r\n            console.error('No drag event has been passed in');\r\n            return;\r\n        }\r\n        if (!uuid) {\r\n            console.error('No uuid has been passed in');\r\n            return;\r\n        }\r\n        if (!name) {\r\n            console.error('No name has been passed in');\r\n            return;\r\n        }\r\n        const payload = { action: APITypes_1.TabAPIActions.ENDDRAG, uuid, name, event: { screenX: event.screenX, screenY: event.screenY } };\r\n        super.sendAction(payload);\r\n    }\r\n}\r\nexports.TabbingApi = TabbingApi;\r\n\n\n//# sourceURL=webpack:///./src/client/TabbingApi.ts?");

/***/ }),

/***/ "./src/client/TabbingApiWindowActions.ts":
/*!***********************************************!*\
  !*** ./src/client/TabbingApiWindowActions.ts ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst APITypes_1 = __webpack_require__(/*! ../shared/APITypes */ \"./src/shared/APITypes.ts\");\r\nconst Api_1 = __webpack_require__(/*! ./Api */ \"./src/client/Api.ts\");\r\n/**\r\n * @class Handles window actions for the tab strip\r\n */\r\nclass TabbingApiWindowActions extends Api_1.Api {\r\n    /**\r\n     * @constructor Constructor fot the TabingApiWindowActions\r\n     */\r\n    constructor() {\r\n        super();\r\n    }\r\n    /**\r\n     * @public\r\n     * @function maximize Maximizes the tab client window.\r\n     */\r\n    maximize() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.MAXIMIZE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function minmize Minimizes the tab client window.\r\n     */\r\n    minimize() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.MINIMIZE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function restore Restores the tab client from a minimized or maximized state.\r\n     */\r\n    restore() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.RESTORE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function close Closes the tab client window.\r\n     */\r\n    close() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.CLOSE };\r\n        super.sendAction(payload);\r\n    }\r\n    /**\r\n     * @public\r\n     * @function toggleMaximize Restores if the window is maximized, if not will maximize.\r\n     */\r\n    toggleMaximize() {\r\n        const payload = { action: APITypes_1.TabAPIWindowActions.TOGGLEMAXIMIZE };\r\n        super.sendAction(payload);\r\n    }\r\n}\r\nexports.TabbingApiWindowActions = TabbingApiWindowActions;\r\n\n\n//# sourceURL=webpack:///./src/client/TabbingApiWindowActions.ts?");

/***/ }),

/***/ "./src/provider/tabbing/tabstrip/TabItem.ts":
/*!**************************************************!*\
  !*** ./src/provider/tabbing/tabstrip/TabItem.ts ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst TabManager_1 = __webpack_require__(/*! ./TabManager */ \"./src/provider/tabbing/tabstrip/TabManager.ts\");\r\nclass Tab {\r\n    /**\r\n     * Constructor for the Tab class.\r\n     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.\r\n     */\r\n    constructor(tabID, tabProperties) {\r\n        this._ID = tabID;\r\n        this._properties = tabProperties;\r\n    }\r\n    /**\r\n     * Initializes the Tab class\r\n     */\r\n    init() {\r\n        this._render();\r\n    }\r\n    /**\r\n     * Removes the Tab from DOM.\r\n     */\r\n    remove() {\r\n        this._domNode.remove();\r\n    }\r\n    /**\r\n     * Sets the Active class on the Tab DOM.\r\n     */\r\n    setActive() {\r\n        this._domNode.classList.add(\"active\");\r\n    }\r\n    /**\r\n     * Removes the Active class from the Tab DOM.\r\n     */\r\n    unsetActive() {\r\n        this._domNode.classList.remove(\"active\");\r\n    }\r\n    /**\r\n     * Updates the icon of this tab.\r\n     * @param {string} icon The URL to the icon image.\r\n     */\r\n    updateIcon(icon = \"\") {\r\n        const iconNode = this._domNode.querySelectorAll(\".tab-favicon\")[0];\r\n        iconNode.style.backgroundImage = `url(\"${icon}\")`;\r\n        this._properties.icon = icon;\r\n    }\r\n    /**\r\n     * Updates the text of the tab.\r\n     * @param {string} text Text to update with.\r\n     */\r\n    updateText(text) {\r\n        const textNode = this._domNode.querySelectorAll(\".tab-content\")[0];\r\n        textNode.textContent = text;\r\n        this._properties.title = text;\r\n    }\r\n    /**\r\n     * Handles the HTML5 DragEvent onStart\r\n     * @param {DragEvent} e DragEvent\r\n     */\r\n    _onDragStart(e) {\r\n        e.dataTransfer.effectAllowed = \"move\";\r\n        TabManager_1.TabManager.tabAPI.startDrag();\r\n    }\r\n    /**\r\n     * Handles the HTML5 DragEvent onDragEnd\r\n     * @param {DragEvent} e DragEvent\r\n     */\r\n    _onDragEnd(e) {\r\n        // @ts-ignore\r\n        TabManager_1.TabManager.tabAPI.endDrag(e, this._ID.uuid, this._ID.name);\r\n    }\r\n    /**\r\n     * Renders the Tab to the DOM from generation.\r\n     */\r\n    _render() {\r\n        this._domNode = this._generateDOM();\r\n        TabManager_1.TabManager.tabContainer.appendChild(this._domNode);\r\n        this.updateText(this._properties.title);\r\n        this.updateIcon(this._properties.icon);\r\n    }\r\n    /**\r\n     * Handles all click events from this Tab DOM.\r\n     * @param {MouseEvent} e MouseEvent\r\n     */\r\n    _onClickHandler(e) {\r\n        switch (e.target.className) {\r\n            case \"tab-exit\": {\r\n                TabManager_1.TabManager.tabAPI.closeTab(this._ID.uuid, this._ID.name);\r\n                break;\r\n            }\r\n            default: {\r\n                TabManager_1.TabManager.tabAPI.activateTab(this._ID.uuid, this._ID.name);\r\n            }\r\n        }\r\n    }\r\n    /**\r\n     * Handles all double click events from this Tab DOM.\r\n     * @param {MouseEvent} e MouseEvent\r\n     */\r\n    _onDblClickHandler(e) {\r\n        switch (e.target.className) {\r\n            case \"tab-content\":\r\n            case \"tab-content-wrap\": {\r\n                this._handlePropertiesInput();\r\n                break;\r\n            }\r\n            default: {\r\n                // @ts-ignore\r\n                window.Tab.activateTab(this._ID.uuid, this._ID.name);\r\n            }\r\n        }\r\n    }\r\n    /**\r\n     * Generates the DOM for this tab.\r\n     * @returns {HTMLElement} DOM Node\r\n     */\r\n    _generateDOM() {\r\n        // Get tab template from HTML (index.html)\r\n        const tabTemplate = document.getElementById(\"tab-template\");\r\n        const tabTemplateDocFrag = document.importNode(tabTemplate.content, true);\r\n        const tab = tabTemplateDocFrag.firstElementChild;\r\n        // Set the onclick, drag events to top tab DOM.\r\n        tab.onclick = this._onClickHandler.bind(this);\r\n        tab.ondblclick = this._onDblClickHandler.bind(this);\r\n        tab.addEventListener(\"dragstart\", this._onDragStart.bind(this), false);\r\n        tab.addEventListener(\"dragend\", this._onDragEnd.bind(this), false);\r\n        return tab;\r\n    }\r\n    /**\r\n     * Creates the input field on the tab and handles events on it.\r\n     */\r\n    _handlePropertiesInput() {\r\n        const textNode = this._domNode.querySelectorAll(\".tab-content\")[0];\r\n        const textNodeValue = textNode.textContent;\r\n        textNode.textContent = \"\";\r\n        const inputNode = document.createElement(\"input\");\r\n        inputNode.value = textNodeValue || \"\";\r\n        function _onBlur() {\r\n            try {\r\n                inputNode.remove();\r\n                // @ts-ignore\r\n                window.Tab.updateTabProperties(this._ID.uuid, this._ID.name, { title: inputNode.value });\r\n            }\r\n            catch (e) { }\r\n        }\r\n        inputNode.addEventListener(\"keypress\", keyEvent => {\r\n            const key = keyEvent.which || keyEvent.keyCode;\r\n            if (key === 13) {\r\n                _onBlur();\r\n            }\r\n        });\r\n        inputNode.addEventListener(\"blur\", _onBlur.bind(this));\r\n        textNode.insertAdjacentElement(\"afterbegin\", inputNode);\r\n        inputNode.focus();\r\n    }\r\n    /**\r\n     * Returns tab identifier object consisting of UUID, Name\r\n     * @returns {TabIdentifier} {uuid, name}\r\n     */\r\n    get ID() {\r\n        return {\r\n            uuid: this._ID.uuid,\r\n            name: this._ID.name\r\n        };\r\n    }\r\n    /**\r\n     * Returns the DOM Node for the tab\r\n     * @returns {HTMLElement} DOM Node\r\n     */\r\n    get DOM() {\r\n        return this._domNode;\r\n    }\r\n}\r\nexports.Tab = Tab;\r\n\n\n//# sourceURL=webpack:///./src/provider/tabbing/tabstrip/TabItem.ts?");

/***/ }),

/***/ "./src/provider/tabbing/tabstrip/TabManager.ts":
/*!*****************************************************!*\
  !*** ./src/provider/tabbing/tabstrip/TabManager.ts ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\r\n    return new (P || (P = Promise))(function (resolve, reject) {\r\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\r\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\r\n        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }\r\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\r\n    });\r\n};\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst TabbingApi_1 = __webpack_require__(/*! ../../../client/TabbingApi */ \"./src/client/TabbingApi.ts\");\r\nconst APITypes_1 = __webpack_require__(/*! ../../../shared/APITypes */ \"./src/shared/APITypes.ts\");\r\nconst TabItem_1 = __webpack_require__(/*! ./TabItem */ \"./src/provider/tabbing/tabstrip/TabItem.ts\");\r\n/**\r\n * Handles the management of tabs and some of their functionality.\r\n */\r\nclass TabManager {\r\n    /**\r\n     * Constructs the TabManager class.\r\n     */\r\n    constructor() {\r\n        /**\r\n         * An array of the tabs present in the window.\r\n         */\r\n        this.tabs = [];\r\n        TabManager.tabContainer = document.getElementById(\"tabs\");\r\n        this._setupListeners();\r\n    }\r\n    /**\r\n     * Creates a new Tab and renders.\r\n     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.\r\n     */\r\n    addTab(tabID, tabProps) {\r\n        return __awaiter(this, void 0, void 0, function* () {\r\n            if (this._getTabIndex(tabID) === -1) {\r\n                const tab = new TabItem_1.Tab(tabID, tabProps);\r\n                yield tab.init();\r\n                this.tabs.push(tab);\r\n            }\r\n        });\r\n    }\r\n    /**\r\n     * Removes a Tab.\r\n     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.\r\n     */\r\n    removeTab(tabID, closeApp = false) {\r\n        const index = this._getTabIndex(tabID);\r\n        const tab = this.getTab(tabID);\r\n        // if tab was found\r\n        if (tab && index !== -1) {\r\n            tab.remove();\r\n            this.tabs.splice(index, 1);\r\n        }\r\n    }\r\n    /**\r\n     * Unsets the active tab\r\n     * @method unsetActiveTab Removes the active status from the current active Tab.\r\n     */\r\n    unsetActiveTab() {\r\n        if (!this.activeTab) {\r\n            return;\r\n        }\r\n        this.activeTab.unsetActive();\r\n    }\r\n    /**\r\n     * Sets a specified tab as active.  If no tab is specified then the first tab will be chosen.\r\n     * @param {TabIdentifier | null} tabID An object containing the uuid, name for the external application/window or null.\r\n     */\r\n    setActiveTab(tabID = null) {\r\n        if (tabID) {\r\n            const tab = this.getTab(tabID);\r\n            if (tab) {\r\n                if (tab !== this.activeTab) {\r\n                    this.lastActiveTab = this.activeTab;\r\n                    this.unsetActiveTab();\r\n                    tab.setActive();\r\n                    this.activeTab = tab;\r\n                }\r\n            }\r\n        }\r\n    }\r\n    /**\r\n     * Finds and gets the Tab object.\r\n     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.\r\n     */\r\n    getTab(tabID) {\r\n        return this.tabs.find((tab) => {\r\n            return tab.ID.name === tabID.name && tab.ID.uuid === tabID.uuid;\r\n        });\r\n    }\r\n    /**\r\n     * Creates listeners for various IAB + Window Events.\r\n     */\r\n    _setupListeners() {\r\n        TabManager.tabAPI.addEventListener(APITypes_1.TabApiEvents.TABADDED, (tabInfo) => {\r\n            console.log(\"TABADDED\", tabInfo);\r\n            this.addTab(tabInfo.tabID, tabInfo.tabProps);\r\n        });\r\n        TabManager.tabAPI.addEventListener(APITypes_1.TabApiEvents.TABREMOVED, (tabInfo) => {\r\n            console.log(\"TABREMOVED\", tabInfo);\r\n            this.removeTab(tabInfo);\r\n        });\r\n        TabManager.tabAPI.addEventListener(APITypes_1.TabApiEvents.TABACTIVATED, (tabInfo) => {\r\n            console.log(\"TABACTIVATED\", tabInfo);\r\n            this.setActiveTab(tabInfo);\r\n        });\r\n        TabManager.tabAPI.addEventListener(APITypes_1.TabApiEvents.PROPERTIESUPDATED, (tabInfo) => {\r\n            console.log(\"TABPROPERTIESUPDATED\", tabInfo);\r\n            const tab = this.getTab(tabInfo.tabID);\r\n            if (tab && tabInfo.tabProps) {\r\n                if (tabInfo.tabProps.icon) {\r\n                    tab.updateIcon(tabInfo.tabProps.icon);\r\n                }\r\n                if (tabInfo.tabProps.title) {\r\n                    tab.updateText(tabInfo.tabProps.title);\r\n                }\r\n            }\r\n        });\r\n    }\r\n    /**\r\n     * Gets the Tab index from the array.\r\n     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.\r\n     */\r\n    _getTabIndex(tabID) {\r\n        return this.tabs.findIndex((tab) => {\r\n            return tab.ID.name === tabID.name && tab.ID.uuid === tabID.uuid;\r\n        });\r\n    }\r\n    /**\r\n     * Returns an array of all the tabs.\r\n     * @returns {Tab[]}\r\n     */\r\n    get getTabs() {\r\n        return this.tabs;\r\n    }\r\n    /**\r\n     * Returns the last active tab.\r\n     * @returns {Tab | null} Last Active Tab\r\n     */\r\n    get getLastActiveTab() {\r\n        return this.lastActiveTab;\r\n    }\r\n    /**\r\n     * Returns the active tab.\r\n     * @returns {Tab} Active Tab\r\n     */\r\n    get getActiveTab() {\r\n        return this.activeTab;\r\n    }\r\n}\r\n/**\r\n *  The HTML Element container for the tabs.\r\n */\r\nTabManager.tabContainer = document.getElementById(\"tabs\");\r\n/**\r\n * Handle to the Tabbing API\r\n */\r\nTabManager.tabAPI = new TabbingApi_1.TabbingApi();\r\nexports.TabManager = TabManager;\r\n\n\n//# sourceURL=webpack:///./src/provider/tabbing/tabstrip/TabManager.ts?");

/***/ }),

/***/ "./src/provider/tabbing/tabstrip/Tabstrip.ts":
/*!***************************************************!*\
  !*** ./src/provider/tabbing/tabstrip/Tabstrip.ts ***!
  \***************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst TabManager_1 = __webpack_require__(/*! ./TabManager */ \"./src/provider/tabbing/tabstrip/TabManager.ts\");\r\nconst tabManager = new TabManager_1.TabManager();\r\nconst minimizeElem = document.getElementById('window-button-minimize');\r\nconst maximizeElem = document.getElementById('window-button-maximize');\r\nconst closeElem = document.getElementById('window-button-exit');\r\nif (TabManager_1.TabManager.tabAPI && TabManager_1.TabManager.tabAPI.windowActions) {\r\n    minimizeElem.onclick = TabManager_1.TabManager.tabAPI.windowActions.minimize;\r\n    maximizeElem.onclick = TabManager_1.TabManager.tabAPI.windowActions.maximize;\r\n    closeElem.onclick = TabManager_1.TabManager.tabAPI.windowActions.close;\r\n}\r\n\n\n//# sourceURL=webpack:///./src/provider/tabbing/tabstrip/Tabstrip.ts?");

/***/ }),

/***/ "./src/shared/APITypes.ts":
/*!********************************!*\
  !*** ./src/shared/APITypes.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nvar TabApiEvents;\r\n(function (TabApiEvents) {\r\n    TabApiEvents[\"TABADDED\"] = \"TABADDED\";\r\n    TabApiEvents[\"TABREMOVED\"] = \"TABREMOVED\";\r\n    TabApiEvents[\"PROPERTIESUPDATED\"] = \"PROPERTIESUPDATED\";\r\n    TabApiEvents[\"TABACTIVATED\"] = \"TABACTIVATED\";\r\n})(TabApiEvents = exports.TabApiEvents || (exports.TabApiEvents = {}));\r\nvar AppApiEvents;\r\n(function (AppApiEvents) {\r\n    AppApiEvents[\"CLIENTINIT\"] = \"CLIENTINIT\";\r\n    AppApiEvents[\"TABBED\"] = \"TABBED\";\r\n    AppApiEvents[\"UNTABBED\"] = \"UNTABBED\";\r\n    AppApiEvents[\"DEREGISTER\"] = \"DEREGISTER\";\r\n})(AppApiEvents = exports.AppApiEvents || (exports.AppApiEvents = {}));\r\n/**\r\n * @description The action the tab client api will send to the service,\r\n * this will determine which action to execute on service side\r\n */\r\nvar TabAPIActions;\r\n(function (TabAPIActions) {\r\n    TabAPIActions[\"STARTDRAG\"] = \"STARTDRAG\";\r\n    TabAPIActions[\"ENDDRAG\"] = \"ENDDRAG\";\r\n    TabAPIActions[\"ADD\"] = \"ADD\";\r\n    TabAPIActions[\"EJECT\"] = \"EJECT\";\r\n    TabAPIActions[\"CLOSE\"] = \"CLOSE\";\r\n    TabAPIActions[\"ACTIVATE\"] = \"ACTIVATE\";\r\n    TabAPIActions[\"UPDATEPROPERTIES\"] = \"UPDATEPROPERTIES\";\r\n    TabAPIActions[\"INIT\"] = \"TABINIT\";\r\n})(TabAPIActions = exports.TabAPIActions || (exports.TabAPIActions = {}));\r\nvar TabAPIWindowActions;\r\n(function (TabAPIWindowActions) {\r\n    TabAPIWindowActions[\"MAXIMIZE\"] = \"MAXIMIZEWINDOW\";\r\n    TabAPIWindowActions[\"MINIMIZE\"] = \"MINIMIZEWINDOW\";\r\n    TabAPIWindowActions[\"RESTORE\"] = \"RESTOREWINDOW\";\r\n    TabAPIWindowActions[\"CLOSE\"] = \"CLOSEWINDOW\";\r\n    TabAPIWindowActions[\"TOGGLEMAXIMIZE\"] = \"TOGGLEMAXIMIZE\";\r\n})(TabAPIWindowActions = exports.TabAPIWindowActions || (exports.TabAPIWindowActions = {}));\r\nvar SaveAndRestoreActions;\r\n(function (SaveAndRestoreActions) {\r\n    SaveAndRestoreActions[\"GETBLOB\"] = \"SARGETBLOB\";\r\n    SaveAndRestoreActions[\"SENDBLOB\"] = \"SARSENDBLOB\";\r\n})(SaveAndRestoreActions = exports.SaveAndRestoreActions || (exports.SaveAndRestoreActions = {}));\r\nvar SaveAndRestoreEvents;\r\n(function (SaveAndRestoreEvents) {\r\n    SaveAndRestoreEvents[\"GETBLOBRETURN\"] = \"SARRETURNBLOB\";\r\n})(SaveAndRestoreEvents = exports.SaveAndRestoreEvents || (exports.SaveAndRestoreEvents = {}));\r\n\n\n//# sourceURL=webpack:///./src/shared/APITypes.ts?");

/***/ })

/******/ });