const createConfig = require('./jest-default-config');
config = createConfig('int');
config["setupFilesAfterEnv"] = ['<rootDir>/provider/utils/setup.ts'];

module.exports = config;
