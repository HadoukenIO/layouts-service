const run = require('./runLog');


module.exports = () => new Promise((resolve, reject) => {
    const cp = run('serve', ['dist', '-p 1337', '-c'])

    cp.stdout.on('data', b => {
        const str = b.toString().trim().trimLeft()
        if (str === `serve: Running on port 1337`) {
            resolve()
        }
    })

    setTimeout(() => reject('Serve did not start on correct port'), 3000);
})
