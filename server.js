const openfinLauncher = require("openfin-launcher");
const path = require("path");
const express = require("express");
const http = require("http");
const app = express();

const configPath1 = path.resolve("./app.json");
const configPath2 = path.resolve("./src/demo/app.json");
//Update our config and launch openfin.
function launchOpenFin(configPath) {
	openfinLauncher.launchOpenFin({ configPath: configPath }).catch(err => console.log(err));
}
/*
//Start the server server and launch our app.
*/

app.use(express.static("./src"));

try {
	http.createServer(app).listen(9001, () => {
		console.log("Server Created!");
		console.log("Starting Openfin...");
		launchOpenFin(configPath1);
		launchOpenFin(configPath2);
	});
} catch (e) {
	launchOpenFin();
}
