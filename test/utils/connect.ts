import {connect, Fin} from 'hadouken-js-adapter';
import * as path from 'path';
const connection =
    connect({manifestUrl: 'http://localhost:1337/test-app.json', uuid: 'TEST'});

export const getConnection = async () => connection;
