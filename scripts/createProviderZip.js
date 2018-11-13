var fs = require('fs');
var path = require('path');
var archiver = require('archiver');

var output = fs.createWriteStream(path.resolve(__dirname,'..','dist','provider','layouts-service.zip'));
var archive = archiver('zip', {zlib: {level: 9}});

archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
        // log warning
    } else {
        // throw error
        throw err;
    }
});

archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);

archive.glob('**/*.!(json)', {cwd: path.resolve(__dirname, '..', 'res', 'provider')});
archive.glob('**/*.!(zip)', {cwd: path.resolve(__dirname, '..', 'dist', 'provider')});
archive.directory('dist/docs/', 'docs')

archive.finalize();