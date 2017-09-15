module.exports = (wallaby) => ({
  files: [
    "src/**/*.ts",
    "src/lib/asm/hunspell.js",
    "src/lib/wasm/hunspell.js"
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

  setup: function (w) {
    jestConfig = {
      resetMocks: true,
      resetModules: true,
      clearMocks: true
    };

    w.testFramework.configure(jestConfig);
  }
})