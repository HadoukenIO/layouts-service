const {launch} = require('hadouken-js-adapter');

require('./serve')
    .then(() => require('./utils/build')())
    .then(async () => {
        console.log('Launching openfin...');
        const mode = (process.argv.slice(2).includes('Layouts') ||process.argv.slice(2).includes('layouts')) ? 'Layouts' : 'SnapDock';
        const port = await launch({manifestUrl: `http://localhost:1337/${mode}Demo/app.json`})
        console.log(`Openfin is running on port ${port}`)
    })