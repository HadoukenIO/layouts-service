const http = require('http')
const os = require('os')
const path = require('path')
const handler =require('serve-handler')
const openfinLauncher = require('hadouken-js-adapter')

const options = {
    public: 'build',
    trailingSlash: true,
    cleanUrls: false,
}

module.exports = async () => {
    await new Promise(async (resolve, reject) => {
        http.createServer((req, res) => handler(req, res, options)).listen(1337, resolve)
    });
    if (os.platform() === 'darwin') {
        console.log("Starting Provider for Mac OS");
        const providerConf = path.resolve('build/SnapDockService/app.json');
        await openfinLauncher.launch({ manifestUrl: providerConf }).catch(err => console.log(err));
    }
};
