/**
 * Returns the current directory path when running in the web.  See node __dirname
 * @returns {string} dirname
 */
export function getHrefDirectory(): string {
    return location.href.slice(0, location.href.lastIndexOf('/'));
}
