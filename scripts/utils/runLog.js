const execa = require('execa')

const run = (...args) => {
    const p = execa(...args)
    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)
    return p
}

module.exports = run;