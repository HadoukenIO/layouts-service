import {connect, Fin} from 'hadouken-js-adapter';
import * as path from 'path';

const testAppUuid = `test-app-${Math.random().toString(36).substr(2, 16)}`;
const connection = connect({address: `ws://localhost:${process.env.OF_PORT}`, uuid: testAppUuid});

export const getConnection = async () => connection;
export const getTestAppUuid = () => testAppUuid;
