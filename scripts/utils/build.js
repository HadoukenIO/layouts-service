#! /usr/bin/env node
const execa = require('execa');
const webpack = require('./configWebpack')
const run = require('./runLog')

const main = async (mode = 'development') => {
    console.log('build ' + mode)
    console.log('Linting...')
    // await run('gts', ['fix'])
    
    console.log('Code linted, Transpiling Typescript...')
    await run('tsc', ['-p', mode === 'test' ? 'tsconfig.test.json' : 'tsconfig.json', '--skipLibCheck'])
    
    console.log('Transpilation complete, bundling...')
    await new Promise((resolve, reject) => {
        const compiler = webpack(mode)
        compiler.run((err, stats) => {
            if (err) {
                console.error(err);
                reject();
            }

            console.log(stats.toString({
                chunks: false,  // Makes the build much quieter
                colors: true    // Shows colors in the console
            }));
            resolve()
        });
    })
}

module.exports = main;
