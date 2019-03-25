module.exports = function createConfig(filter, output) {
    return {
        rootDir: "test",
        transform: {
          "^.+\\.tsx?$": "<rootDir>/../node_modules/ts-jest"
        },
        testRegex: "." + filter + ".ts$",
        testRunner: "jest-circus/runner",
        modulePaths: [
          "<rootDir>/../node_modules"
        ],
        moduleFileExtensions: [
          "ts",
          "tsx",
          "js",
          "jsx",
          "json",
          "node"
        ],
        reporters: [
          "default",
            ["jest-junit", {
            "outputDirectory": "./dist/test",
            "outputName": output,
            "classNameTemplate": (vars) => {
              const filePathTokens = vars.filepath.split('\\');
              
              let fileName = filePathTokens[filePathTokens.length - 1];
              fileName = fileName.split('.')[0];
              filePathTokens[filePathTokens.length - 1] = fileName;
    
              return filePathTokens.join('.');
            },
            "titleTemplate": (vars) => {
              return vars.classname;
            },
            "ancestorSeparator": " > "
          }]
        ]
    }
};