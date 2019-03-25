module.exports = function createConfig(testType) {
  return {
      rootDir: "test",
      transform: {
        "^.+\\.tsx?$": "<rootDir>/../node_modules/ts-jest"
      },
      testRegex: "." + testType + ".ts$",
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
          "outputName": 'results-' + testType + '.xml',
          "classNameTemplate": (vars) => {
            const filePathTokens = vars.filepath.split('\\');
            
            let fileName = filePathTokens[filePathTokens.length - 1];
            fileName = fileName.split('.')[0];
            filePathTokens[filePathTokens.length - 1] = fileName;
  
            return testType + '.' + filePathTokens.join('.');
          },
          "titleTemplate": (vars) => {
            if (vars.classname) {
              return vars.classname + ' > ' + vars.title;
            } else {
              return vars.title;
            }
          },
          "ancestorSeparator": " > "
        }]
      ]
  }
};