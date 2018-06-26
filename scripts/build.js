#! /usr/bin/env node

const build = require('./utils/build')
const arg = process.argv.slice(2)
const mode = arg.includes('test') ? 'test' : (arg.includes('prod') ? 'production' : 'development')

module.exports = build(mode)