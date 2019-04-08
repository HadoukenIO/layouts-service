/**
 * Import this file anywhere you need the global puppeteer or openfin connections.
 *
 * We use a custom jest environment to avoid needing to connect to puppeteer/openfin in every test.
 * The connection objects are mounted in the global scope for running tests, and as such we they
 * need to be included in the global type definitons.
 */
declare module NodeJS {
    interface Global {
        __FIN__: import('hadouken-js-adapter').Fin;
    }
}