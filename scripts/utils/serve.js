const http = require('http')

const handler =require('serve-handler')

const options = {
    public: 'build',
    trailingSlash: true,
    cleanUrls: false,
}

module.exports = () => new Promise((resolve, reject) => {
    http.createServer((req, res) => handler(req, res, options)).listen(1337, resolve)
})
