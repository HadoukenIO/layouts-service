#! /usr/bin/env node
const execa = require('execa');
const webpack = require('./utils/configWebpack')
const run = require('./utils/runLog')

const main = async () => {
    const mode = process.argv.slice(2).includes('prod') ? 'production' : 'development'
    console.log('Linting...')
    await run('gts', ['fix'])
    console.log('Code linted, Transpiling Typescript...')
    await run('tsc', ['-p', '.', '--skipLibCheck'])
    console.log('Transpilation complete, bundling...')
    await new Promise((resolve, reject) => {
        const compiler = webpack(mode, resolve)
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

module.exports = main()
