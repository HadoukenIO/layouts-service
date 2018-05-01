const { execSync } = require('child_process');
const { cdnPath, s3Loc, remoteOrigin, demoPath, s3Root } = require('./deploy.config')
const distLoc = './dist';
const demoLoc = './demo';
const demoCmd = `aws s3 cp ${demoLoc} ${s3Root + demoPath}/ --recursive`;
const deployCmd = `aws s3 cp ${distLoc} ${s3Loc}/ --recursive`;
const invalidateCmd = `aws cloudfront create-invalidation --distribution-id E16N7NZUXTHZCF --paths /${cdnPath}/*`;


execSync(deployCmd, { stdio: [0,1,2]});
execSync(demoCmd, { stdio: [0, 1, 2] });
// execSync(invalidateCmd, { stdio: [0,1,2]});