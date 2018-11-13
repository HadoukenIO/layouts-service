var fs = require('fs');
var path = require('path');
var archiver = require('archiver');

var output = fs.createWriteStream(path.resolve(__dirname,'..','dist','provider','layouts-service.zip'));
var archive = archiver('zip', {zlib: {level: 9}});

output.on('close', () => {
    console.log(`Zip file created at 'dist/provider/layouts-service.zip`);
    console.log(`${archive.pointer()} total bytes written`);
})

// Docs recommend explicitly handling this response (https://archiverjs.com/docs/)
archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
        // log warning
    } else {
        // throw error
        throw err;
    }
});

// Docs recommend explicitly handling this response
archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);

// Include all provider res files except app.json (which is also in dist)
archive.glob('**/*.!(json)', {cwd: path.resolve(__dirname, '..', 'res', 'provider')});
// Include all provider dist files except the zip itself
archive.glob('**/*.!(zip)', {cwd: path.resolve(__dirname, '..', 'dist', 'provider')});
// Include the docs
archive.directory('dist/docs/', 'docs')

archive.finalize();