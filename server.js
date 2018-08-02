const openfinLauncher = require('openfin-launcher');
const express = require('express');

const app = express();

app.use(express.static('build'));
app.use(express.static('res'));
app.use(express.static('resources'));

console.log("Starting server...");
app.listen(1337, () => {
    console.log("Launching Demo application");
    openfinLauncher
        .launchOpenFin({configPath: "http://localhost:1337/demo/app.json"})
        .catch(err => console.log(err));
});
