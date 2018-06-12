const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const copydir = require('copy-dir');


// empties build directory of any existing files
fsExtra.emptyDirSync('dist');

copydir.sync('src/', 'dist/', function(stat, filepath, filename){
    if (stat === 'directory' && filename === 'js') {
      return false;
    }

    if(stat === 'file' && path.extname(filepath) === '.ts' && !filepath.includes("dist")) {
        return false;
    }

    return true;
});
