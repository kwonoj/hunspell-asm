module.exports = (wallaby) => ({
  files: [
    "src/**/*.ts"
  ],

  tests: [
    "spec/hunspell-asm/**/*.ts"
  ],

  testFramework: {
    type: "jest"
  },

  env: {
    type: "node",
    params: {
      runner: `-r ${require.resolve('esm')}`
    }
  },

  workers: {
    initial: 1,
    regular: 1
  },

  preprocessors: {
    '**/*.js?(x)': file =>
      require('babel-core').transform(file.content, {
        sourceMap: true,
        filename: file.path,
        presets: ['babel-preset-jest']
      })
  }
})