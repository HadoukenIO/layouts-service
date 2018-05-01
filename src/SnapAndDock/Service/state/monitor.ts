import {MonitorState} from '../../fin';
import {Updater} from './store';

const state: MonitorState = {} as MonitorState;

export const getMonitorState = () => state;

export const updateMonitorState = (f: Updater<MonitorState>) =>
    Object.assign(state, f({...state}));