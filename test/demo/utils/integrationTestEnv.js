// Had problems with this as a typescript file, so leaving as js for now
const NodeEnvironment = require('jest-environment-node');
const jsAdapter = require('hadouken-js-adapter');

const finPromise = jsAdapter.connect({address: `ws://localhost:${process.env.OF_PORT}`, uuid: 'TEST-jest-env'});

class LayoutsEnvironment extends NodeEnvironment {
    constructor(config) {
        super(config);
    }

    async setup() {
        await super.setup();

        this.global.__FIN__ = await finPromise;
    }
}

module.exports = LayoutsEnvironment;