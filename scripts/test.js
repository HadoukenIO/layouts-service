const execa = require('execa');
const serve = require('./utils/serve')
const path = require('path')

const run = require('./utils/runLog')


require('./build')
    .then(() => require('./serve'))
    .then(() => run('ava'))
    .then(res => {
        process.exit(res.code)
    })