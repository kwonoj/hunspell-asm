[![Build Status](https://travis-ci.org/kwonoj/hunspell-asm.svg?branch=master)](https://travis-ci.org/kwonoj/hunspell-asm)
[![Build status](https://ci.appveyor.com/api/projects/status/7s0r599r9h6r682g/branch/master?svg=true)](https://ci.appveyor.com/project/kwonoj/hunspell-asm/branch/master)
[![codecov](https://codecov.io/gh/kwonoj/hunspell-asm/branch/master/graph/badge.svg)](https://codecov.io/gh/kwonoj/hunspell-asm)
[![npm](https://img.shields.io/npm/v/hunspell-asm.svg)](https://www.npmjs.com/package/hunspell-asm)

# Hunspall-asm

# Install

```sh
npm install hunspall-asm
```

# Usage


# Building / Testing

Few npm scripts are supported for build / test code.

- `build`: Transpiles code to ES5 commonjs to `dist`.
- `test`: Run `hunspell` / `hunspell-asm` test both. Does not require `build` before execute test.
- `test:hunspell`: Run integration test for actual hunspell wasm binary, using [hunspell's test case](https://github.com/hunspell/hunspell/tree/97d7d559f621176685695fbd51e5d8d3f9e005e3/tests) as-is.
- `test:hunspell-asm`: Run unit test against `hunspell-asm` interface
- `lint`: Run lint over all codebases
- `lint:staged`: Run lint only for staged changes. This'll be executed automatically with precommit hook.
- `commit`: Commit wizard to write commit message