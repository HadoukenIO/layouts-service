//const openfinLauncher = require("openfin-launcher");
//const path = require("path");
//const express = require("express");
//const http = require("http");
//const app = express();

//const configPath1 = path.resolve("./app.json");
//const configPath2 = path.resolve("./src/demo/app.json");
////Update our config and launch openfin.
//function launchOpenFin(configPath) {
//	openfinLauncher.launchOpenFin({ configPath: configPath }).catch(err => console.log(err));
//}
///*
////Start the server server and launch our app.
//*/

//app.use(express.static("./src"));

//try {
//	http.createServer(app).listen(9001, () => {
//		console.log("Server Created!");
//		console.log("Starting Openfin...");
//		launchOpenFin(configPath1);
//		launchOpenFin(configPath2);
//	});
//} catch (e) {
//	launchOpenFin();
//}




const { launch } = require('hadouken-js-adapter');
const express = require('express');
const os = require('os');
const path = require('path');

const app = express();

app.use(express.static('build'));

console.log("Starting server...");
app.listen(1337, async () => {
    console.log("Launching service");

    if (os.platform() === 'darwin') {
        console.log("Starting Provider for Mac OS");
        const providerConf = path.resolve('build/provider/app.json');
        await launch({ manifestUrl: providerConf }).catch(console.log);
    }

    launch({ manifestUrl: "http://localhost:1337/tabProvider/app.json" }).catch(console.log);

    console.log("Launching demo application")
    await launch({ manifestUrl: "http://localhost:1337/demo/tabbing/app.json" }).catch(console.log);
});
