import {connect, Fin} from 'hadouken-js-adapter';
import * as path from 'path';
const connection = connect({address: `ws://localhost:${process.env.OF_PORT}`, uuid: 'TEST'});

export const getConnection = async () => connection;
