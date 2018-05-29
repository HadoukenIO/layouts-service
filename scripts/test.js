const execa = require('execa');
const serve = require('./utils/serve')
const path = require('path')
const {launch} = require('hadouken-js-adapter')
const run = require('./utils/runLog')
const os = require('os')

let port;
let server
require('./build')
    .then(() => require('./serve'))
    .then(async () => {
        port = await launch({manifestUrl: 'http://localhost:1337/test-app.json'})
        return port
    })
    .then(OF_PORT => run('ava', [], {env: {OF_PORT}}))
    .then(async res => {
        if (os.platform().match(/^win/)) {
            const cmd = `for /f "tokens=5" %a in \
('netstat -aon ^| find ":${port}" ^| find "LISTENING"') \
do taskkill /f /pid %a`;
            execa.shellSync(cmd);
        } else {
            const cmd = `lsof -n -i4TCP:${port} | grep LISTEN | awk '{ print $2 }' | xargs kill`;
            execa.shellSync(cmd);
        }
        process.exit(res.code)
    })