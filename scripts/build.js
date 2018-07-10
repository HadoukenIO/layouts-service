#! /usr/bin/env node

const build = require('./utils/build')
const args = process.argv.slice(2)
const mode = args.includes('test') ? 'test' : (args.includes('prod') ? 'production' : 'development')

if (mode === 'production') {
    if (!process.env.GIT_SHORT_SHA){
        throw new Error('Must include sha for production build')
    }
}

module.exports = build(mode)