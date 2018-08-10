const {launch} = require('hadouken-js-adapter');
const express = require('express');
const os = require('os');
const path = require('path');

const app = express();

app.use(express.static('build'));

console.log("Starting server...");
app.listen(1337, async () => {
    console.log("Launching Demo application");

    if (os.platform() === 'darwin') {
        console.log("Starting Provider for Mac OS");
        const providerConf = path.resolve('build/provider/app.json');
        await launch({ manifestUrl: providerConf }).catch(console.log);
    }

    await launch({manifestUrl: "http://localhost:1337/demo/app.json"}).catch(console.log);

    console.log("Launching tabbing Demo application")
    await launch({ manifestUrl: "http://localhost:1337/demo/tabbing/app.json" }).catch(console.log);
});
