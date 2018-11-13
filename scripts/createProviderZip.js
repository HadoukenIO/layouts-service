var fs = require('fs');
var path = require('path');
var archiver = require('archiver');

var output = fs.createWriteStream(path.resolve(__dirname,'..','dist','provider','layouts-service.zip'));
var archive = archiver('zip', {zlib: {level: 9}});

output.on('close', () => {
    console.log(`Zip file created at 'dist/provider/layouts-service.zip`);
    console.log(`${archive.pointer()} total bytes written`);
})

archive.pipe(output);

// Include all provider res files except app.json (which is also in dist)
archive.glob('**/*.!(json)', {cwd: path.resolve(__dirname, '..', 'res', 'provider')});
// Include all provider dist files except the zip itself
archive.glob('**/*.!(zip)', {cwd: path.resolve(__dirname, '..', 'dist', 'provider')});

archive.finalize();
