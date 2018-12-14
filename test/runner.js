/*
 * Script accepts various command-line arguments. Run with -h or --help for more information, or see help text below.
 * 
 * NOTE: When invoking via 'npm test', NPM will consume any arguments passed to it. Prepend '--' to signal to NPM that any additional arguments should be 
 * passed-through to the invoked application. For example: 'npm test -- --help'
 * 
 * Any additional command line parameters (arguments that are not described within the help text) will be passed through to ava as-is.
 *     A list of valid command line parameters can be found in the ava documentation: https://github.com/avajs/ava#cli
 *     NOTE: --match is not supported, use --filter instead
 */

const execa = require('execa');
const os = require('os');
const express = require('express');
const fs = require('fs');
const path = require('path');

const {launch} = require('hadouken-js-adapter');

let port;

/**
 * Simple command-line parser. Returns the named argument from the list of process arguments.
 * 
 * @param {string} name Argument name, including any hyphens
 * @param {boolean} hasValue If this argument requires a value. Accepts "--name value" and "--name=value" syntax.
 * @param {any} defaultValue Determines return value, if an argument with the given name doesn't exist. Only really makes sense when 'hasValue' is true.
 */
function getArg(name, hasValue = false, defaultValue = hasValue ? null : false) {
    let value = defaultValue;
    let argIndex = unusedArgs.indexOf(name);

    if (argIndex >= 0 && argIndex < unusedArgs.length - (hasValue ? 1 : 0)) {
        if (hasValue) {
            // Take the argument after this as being the value
            value = unusedArgs[argIndex + 1];
            unusedArgs.splice(argIndex, 2);
        } else {
            // Only consume the one argument
            value = true;
            unusedArgs.splice(argIndex, 1);
        }
    } else if (hasValue) {
        argIndex = unusedArgs.findIndex((arg) => arg.indexOf(name + '=') === 0);
        if (argIndex >= 0) {
            value = unusedArgs[argIndex].substr(unusedArgs[argIndex].indexOf('=') + 1);
            unusedArgs.splice(argIndex, 1);
        }
    }

    return value;
}
const unusedArgs = process.argv.slice(2);

const testFileNames = ['*'];
const testNameFilter = getArg('--filter', true);
const showHelp = getArg('--help') || getArg('-h');
const skipBuild = getArg('--run') || getArg('-r');
const debugMode = getArg('--debug') || getArg('-d');
const runtimeVersion = getArg('--runtime-version', true);

let testFileName;
while(testFileName = getArg('--file-name', true)) {
    testFileNames.push(testFileName);
}

if (showHelp) {
    console.log(`Test runner accepts the following arguments. Any additional arguments will be passed-through to the test runner, see "ava --help" for details.

NOTE: When running through 'npm test', pass -- before any test runner options, to stop NPM from consuming those arguments. For example, 'npm test -- -b'.

Options:
--file-name <file>              Runs all tests in the given file
--filter <pattern>              Only runs tests whose names match the given pattern. Can be used with --file-name.
--runtime-version <version>     Runs the tests on a specified runtime version.
--help | -h                     Displays this help
--run | -r                      Skips the build step, and will *only* run the tests - rather than the default 'build & run' behaviour.
--debug | -d                    Builds the test/application code using 'development' webpack mode for easier debugging. Has no effect when used with -r.
`);
    process.exit();
}

const fileNamesArg = testFileNames.slice(testFileNames.length > 1 ? 1 : 0).map(testFileName => `dist/test/**/${testFileName}.test.js`).join(" ");
const testCommand = `ava --serial ${fileNamesArg} ${testNameFilter ? '--match ' + testNameFilter: ''} ${unusedArgs.join(' ')}`;

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
    await run('npm', ['run', debugMode ? 'build:dev' : 'build']);
    await run('tsc', ['-p', 'test', '--skipLibCheck']);
}

/**
 * Starts a local server for hosting the test windows
 */
async function serve() {
    return new Promise((resolve, reject) => {
        const app = express();
        
        // Intercepts requests for app manifests and replaces the runtime version with the one
        // given as a command line parameter.
        app.get('/*/*.json', (req, res) => {
            let configData = JSON.parse(fs.readFileSync(path.join('res', req.path.substr(1))));
            if (runtimeVersion && configData.runtime && configData.runtime.version) {
                configData.runtime.version = runtimeVersion;
            }
            res.json(configData);
        });

        app.use(express.static('dist'));
        app.use(express.static('res'));

        // Add route to dynamically generate app manifests
        app.use('/create-manifest', (() => (req, res) => {
            const { uuid, url, defaultTop } = req.query;

            res.contentType('application/json')
            res.json({
                "devtools_port": 9090,
                "runtime": {
                    "arguments": "--v=1 --enable-crash-reporting",
                    "version": "9.61.37.42"
                },
                "services": [{ "name": "layouts", "manifestUrl": "http://localhost:1337/test/provider.json" }],
                "startup_app": {
                    "uuid": uuid || 'save-restore-test-app-' + Math.random().toString(36).substring(2),                    
                    "url": url || 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false',
                    "autoShow": true,
                    "saveWindowState": false,
                    "defaultTop": defaultTop ? JSON.parse(defaultTop): 100,
                    "defaultLeft": 100,
                    "defaultHeight": 225,
                    "defaultWidth": 225
                }
            });
        })());
        
        console.log("Starting test server...");
        app.listen(1337, resolve);
    });
}

const buildStep = skipBuild ? Promise.resolve() : build();

buildStep
    .then(() => serve())
    .then(async () => {
        port = await launch({manifestUrl: 'http://localhost:1337/test/app.json'});
        console.log('Openfin running on port ' + port);
        return port
    })
    .catch(fail)
    .then(OF_PORT => run(testCommand , { env: { OF_PORT } }))
    .then(cleanup)
    .catch(cleanup);
