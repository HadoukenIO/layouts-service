const openfinLauncher = require('openfin-launcher');
const path = require('path');
const express = require('express');
const http = require('http');
const app = express();

const configPath = path.resolve('./app.json');

//Update our config and launch openfin.
function launchOpenFin() {
    openfinLauncher
        .launchOpenFin({ configPath: configPath })
        .catch(err => console.log(err));
}
/*
//Start the server server and launch our app.
*/

app.use(express.static('./src'));

http.createServer(app).listen(9001, () => {
    console.log('Server Created!');
    console.log('Starting Openfin...');
    launchOpenFin();
});

launchOpenFin();