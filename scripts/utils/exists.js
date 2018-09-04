const fs = require('fs')

module.exports = (file) => {
    try {
        const stat = fs.statSync(file)
        return Boolean(stat)
    } catch (e) {
        return false
    }
}