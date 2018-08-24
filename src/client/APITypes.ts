export enum TabApiEvents {
	TABADDED = "TABADDED",
	TABREMOVED = "TABREMOVED",
	PROPERTIESUPDATED = "PROPERTIESUPDATED",
	TABACTIVATED = "TABACTIVATED"
}

export enum AppApiEvents {
    CLIENTINIT = "CLIENTINIT",
    SETTABCLIENT = "SETTABCLIENT",
	TABBED = "TABBED",
	UNTABBED = "UNTABBED",
	DEREGISTER = "DEREGISTER"
}

/**
 * @description The action the tab client api will send to the service,
 * this will determine which action to execute on service side
 */
export enum TabAPIActions {
	STARTDRAG = "STARTDRAG",
	ENDDRAG = "ENDDRAG",
	ADD = "ADD",
	EJECT = "EJECT",
	CLOSE = "CLOSE",
	ACTIVATE = "ACTIVATE",
	UPDATEPROPERTIES = "UPDATEPROPERTIES",
	INIT = "TABINIT",
	TABSREORDERED = "TABSREORDERED"
}

export enum TabAPIWindowActions {
	MAXIMIZE = "MAXIMIZEWINDOW",
	MINIMIZE = "MINIMIZEWINDOW",
	RESTORE = "RESTOREWINDOW",
	CLOSE = "CLOSEWINDOW",
	TOGGLEMAXIMIZE = "TOGGLEMAXIMIZE"
}

export enum SaveAndRestoreActions {
	GETBLOB = "SARGETBLOB",
	SENDBLOB = "SARSENDBLOB"
}

export enum SaveAndRestoreEvents {
	GETBLOBRETURN = "SARRETURNBLOB"
}
