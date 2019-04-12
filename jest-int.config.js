const createConfig = require('./jest-default-config');
config = createConfig('int');
config['setupFilesAfterEnv'] = ['<rootDir>/provider/utils/setup.ts'];
config['testEnvironment'] = '<rootDir>/demo/utils/integrationTestEnv.js';

module.exports = config;
