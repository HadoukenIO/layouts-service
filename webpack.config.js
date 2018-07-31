const path = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");

/**
 * creates a webpack config to be exported when npm run build in run
 * @param {string} projectName The name of the project
 * @param {string} entryPoint The entry point to the application,
 *  usually a js file
 * @return {Object} A webpack module for the project
 */
function createWebpackConfigForProject(projectName, entryPoint) {
	let outputPath = path.resolve(__dirname, `${projectName}/dist`);
	return {
		entry: entryPoint,
		output: {
			path: outputPath,
			filename: "[name]-bundle.js"
		},
		resolve: {
			extensions: [".ts", ".tsx", ".js"]
		},
		module: {
			rules: [
				{
					test: /\.css$/,
					use: ExtractTextPlugin.extract({
						fallback: "style-loader",
						use: "css-loader"
					})
				},
				{
					test: /\.(png|jpg|gif|otf|svg)$/,
					use: [
						{
							loader: "url-loader",
							options: {
								limit: 8192
							}
						}
					]
				},
				{
					test: /\.tsx?$/,
					loader: "ts-loader"
				}
			]
		},
		plugins: [new ExtractTextPlugin({ filename: "bundle.css" }), new CleanWebpackPlugin(outputPath, {})]
	};
}

module.exports = [
	createWebpackConfigForProject("src/tab-ui", {
		ui: "./src/tab-ui/ts/index.ts"
	}),
	createWebpackConfigForProject("src/service", {
		service: "./src/service/ts/index.ts"
	}),
	createWebpackConfigForProject("src/client", {
		client: "./src/client/ts/client.ts",
		tabbingApi: "./src/client/ts/TabbingApi.ts"
	})
];
