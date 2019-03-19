import {connect, Fin} from 'hadouken-js-adapter';
import * as path from 'path';


const testUuid = Math.random().toString(36).substr(2, 12);

const connection = connect({address: `ws://localhost:${process.env.OF_PORT}`, uuid: testUuid});

export const getConnection = async () => connection;
export const getTestUuid = () => testUuid;

