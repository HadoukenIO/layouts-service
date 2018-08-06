const {launch} = require('hadouken-js-adapter');
const express = require('express');
const os = require('os');

const app = express();

app.use(express.static('build'));
app.use(express.static('res'));
app.use(express.static('resources'));

console.log("Starting server...");
app.listen(1337, async () => {
    console.log("Launching Demo application");

    if (os.platform() === 'darwin') {
        console.log("Starting Provider for Mac OS");
        const providerConf = path.resolve('res/provider/app.json');
        await launch({ manifestUrl: providerConf }).catch(console.log);
    }

    await launch({manifestUrl: "http://localhost:1337/demo/app.json"}).catch(console.log);
});
