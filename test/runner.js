const execa = require('execa');
const os = require('os');
const express = require('express');

const {launch} = require('hadouken-js-adapter');

let port;

let args = process.argv.slice(2);
let testFileName = args.shift() || '*';
let testNameFilter = args.shift();

const cleanup = async res => {
    if (os.platform().match(/^win/)) {
        const cmd = 'taskkill /F /IM openfin.exe /T';
        execa.shellSync(cmd);
    } else {
        const cmd = `lsof -n -i4TCP:${port} | grep LISTEN | awk '{ print $2 }' | xargs kill`;
        execa.shellSync(cmd);
    }
    process.exit((res.failed===true) ? 1 : 0);
}

const fail = err => {
    console.error(err);
    process.exit(1);
}

const run = (...args) => {
    const p = execa(...args)
    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)
    return p
}

/**
 * Performs a clean build of the application and tests
 */
async function build() {
    await run('npm', ['run', 'clean']);
    await run('npm', ['run', 'build']);
    await run('tsc', ['-p', 'test', '--skipLibCheck']);
}

/**
 * Starts a local server for hosting the test windows
 */
async function serve() {
    return new Promise((resolve, reject) => {
        const app = express();
        
        app.use(express.static('build'));
        app.use(express.static('res'));
        
        console.log("Starting test server...");
        app.listen(1337, resolve);
    });
}

build()
    .then(() => serve())
    .then(async () => {
        port = await launch({manifestUrl: 'http://localhost:1337/test/app.json'});
        console.log('Openfin running on port ' + port);
        return port
    })
    .catch(fail)
    //Had to restrict pattern to only include 'provider' as we now have a mix of ava and jest based tests.
    //Will need to port one to the other at some point - needs some discussion first.
    .then(OF_PORT => run(`ava --serial build/test/**/${testFileName}.test.js ${testNameFilter? '--match ' + testNameFilter: ''}`, { env: { OF_PORT } }))
    .then(cleanup)
    .catch(cleanup);
    