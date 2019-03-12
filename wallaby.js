module.exports = (wallaby) => ({
  files: [
    "src/**/*.ts",
    { pattern: 'jest-hunspell-asm.json', instrument: false, load: true }
  ],

  tests: [
    "spec/hunspell-asm/**/*.ts"
  ],

  testFramework: {
    type: "jest"
  },

  env: {
    type: "node"
  },

  workers: {
    initial: 1,
    regular: 1
  },

  preprocessors: {
    '**/*.js?(x)': file =>
      require('@babel/core').transform(file.content, {
        sourceMaps: true,
        filename: file.path,
        presets: ['babel-preset-jest']
      })
  },

  setup: w => {
    const jestConfig = (({ resetMocks }) => ({
      resetMocks
    }))(require('./jest-hunspell-asm.json'));
    w.testFramework.configure(jestConfig);
  }
})