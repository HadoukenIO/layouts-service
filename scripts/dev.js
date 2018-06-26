const {launch} = require('hadouken-js-adapter');

require('./serve')
    .then(require('./utils/build')())
    .then(async () => {
        console.log('Launching openfin...')
        const port = await launch({manifestUrl: 'http://localhost:1337/SnapDockDemo/app.json'})
        console.log(`Openfin is running on port ${port}`)
    })