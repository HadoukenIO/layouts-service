const config = require('../webpack.config');
const runnablePlugins = [];

/**
 * Small Node script to run code generation without having to do a full build.
 * 
 * Will extract code generation plugins from the main webpack config, and then invoke those plugins from "manually",
 * without using webpack.
 */
(async () => {
    // Push any code generation plugins into the 'generatePlugins' list
    config.forEach((step) => {
        runnablePlugins.push.apply(runnablePlugins, step.plugins.filter(isValidPlugin));
    });

    // Expect at least one plugin
    if (runnablePlugins.length === 0) {
        throw new Error("Didn't find any schema-related plugins within the webpack config");
    }

    // Run all found plugins (outside of webpack - will generate code without any other build steps)
    await Promise.all(runnablePlugins.map(p => p.run())).catch((err) => {
        console.error("One or more plugins failed:");
        console.error(err);
        throw err;
    });
})();


function isValidPlugin(plugin) {
    return (typeof plugin.run === 'function') && (plugin.run.length === 0);
}
