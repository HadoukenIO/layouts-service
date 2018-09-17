/*
 * Script accepts the following optional parameters:
 * --file-path [String] : Specifies the name of the file containing the tests to run. 
 *     Example: --file-path undock will run tests in the file undock.test.ts
 * --filter [String] : Filters the tests that will be run. 
 *     Valid filter syntax is described in the ava documentation: https://github.com/avajs/ava#running-tests-with-matching-titles.
 *     Example: --filter *vertical* will run all tests containing the word 'vertical'
 * Any other command line parameters will be passed through to ava as-is. 
 *     A list of valid command line parameters can be found in the ava documentation: https://github.com/avajs/ava#cli
 *     NOTE: --match is not supported, use --filter instead
 */

const execa = require('execa');
const os = require('os');
const express = require('express');

const {launch} = require('hadouken-js-adapter');

let port;

let testFileName = '*';
let testNameFilter;
let args = process.argv.splice(2);

let fileNameIndex = args.indexOf('--file-name')
if (fileNameIndex > -1) {
    testFileName = args[fileNameIndex + 1];
    args.splice(fileNameIndex, 2);
}
let testFilterIndex = args.indexOf('--filter')
if (testFilterIndex > -1) {
    testNameFilter = args[testFilterIndex + 1];
    args.splice(testFilterIndex, 2);
}

const testCommand = `ava --serial build/test/**/${testFileName}.test.js ${testNameFilter? '--match ' + testNameFilter: ''} ${args.join(' ')}`;

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
    .then(OF_PORT => run(testCommand , { env: { OF_PORT } }))
    .then(cleanup)
    .catch(cleanup);
    