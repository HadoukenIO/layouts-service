const createConfig = require('./jest-default-config');
const config = createConfig('int');
config['testRegex'] = 'preview[a-zA-Z]+.inttest.ts';
config['setupFilesAfterEnv'] = ['<rootDir>/provider/utils/setup.ts'];
config['testEnvironment'] = '<rootDir>/demo/utils/integrationTestEnv.js';

module.exports = config;
