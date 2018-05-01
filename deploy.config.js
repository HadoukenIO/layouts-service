const cdnPath = 'services/openfin/layouts'
const s3Root = 's3://cdn.openfin.co/'
const s3Loc = s3Root + cdnPath
const cdnRoot = 'https://cdn.openfin.co/'
const remoteOrigin = cdnRoot + cdnPath
const demoPath = 'demos/layouts'

module.exports = {
    cdnPath, s3Loc, remoteOrigin, demoPath, s3Root
}