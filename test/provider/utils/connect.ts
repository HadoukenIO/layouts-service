import {connect} from 'hadouken-js-adapter';

export const TESTSUITE_SANDBOX_PREFIX = 'testsuite-sandbox-';

const testAppUuid = `${TESTSUITE_SANDBOX_PREFIX}${Math.random().toString(36).substr(2, 16)}`;
const connection = connect({address: `ws://localhost:${process.env.OF_PORT}`, uuid: testAppUuid});

export const getConnection = async () => connection;