/**
 * @hidden
 */

/**
 *
 *
 */
import {LayoutsEvent} from '../client/connection';
import {WorkspaceAPI} from '../client/internal';
import {WindowIdentity} from '../client/main';
import {WorkspaceApp} from '../client/workspaces';

/**
 * Sets the channel topic used to send events to the windows.  All windows which include the client will be listening to this topic name.
 */
export const EVENT_CHANNEL_TOPIC = 'event';

export type MessageMap = {
    [WorkspaceAPI.RESTORE_HANDLER]: WorkspaceApp,
    [WorkspaceAPI.GENERATE_HANDLER]: WorkspaceApp,
    [EVENT_CHANNEL_TOPIC]: LayoutsEvent
};

export enum ErrorType {
    /**
     * Window not found
     */
    NO_WINDOW,
    /**
     * No tab group found
     */
    NO_TAB_GROUP,
    /**
     * Unexpected Error
     */
    UNEXPECTED
}

type ErrorMessageArgs = {
    [ErrorType.NO_WINDOW]: WindowIdentity;[ErrorType.NO_TAB_GROUP]: WindowIdentity;[ErrorType.UNEXPECTED]: {action: string, error: string}
};

/**
 * Generates a templated error message.  Does not throw an error.
 */
export function getErrorMessage<T extends keyof ErrorMessageArgs>(msg: T, args: ErrorMessageArgs[T]): string {
    if (isMsg(ErrorType.NO_WINDOW, msg, args)) {
        return `Cannot find window ${args.uuid}/${args.name}.  It may be deregistered.`;
    } else if (isMsg(ErrorType.NO_TAB_GROUP, msg, args)) {
        return `Cannot find tab group for window ${args.uuid}/${args.name}.`;
    } else if (isMsg(ErrorType.UNEXPECTED, msg, args)) {
        return `Unexpected error when ${args.action}: ${args.error}`;
    }

    return 'Unknown Error';
}

function isMsg<T extends keyof ErrorMessageArgs>(expectedType: T, msgType: ErrorType, args: ErrorMessageArgs[keyof ErrorMessageArgs]): args is ErrorMessageArgs[T] {
    return msgType === expectedType;
}
