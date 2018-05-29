const http = require('http')

const handler =require('serve-handler')

const public = 'dist'

module.exports = () => new Promise((resolve, reject) => {
    http.createServer((req, res) => handler(req, res, {public})).listen(1337, resolve)
})
