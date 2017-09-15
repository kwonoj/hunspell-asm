import { ENVIRONMENT, getModuleLoader, isNode, isWasmEnabled } from 'emscripten-wasm-loader';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { hunspellLoader } from './hunspellLoader';
import { log } from './util/logger';

const asmPath = `./lib/${isWasmEnabled() ? 'wasm' : 'asm'}`;
log(`loadModule: load hunspell module loader from `, asmPath);

//imports MODULARIZED emscripten preamble
//tslint:disable-next-line:no-require-imports no-var-requires
const runtimeModule = require(`${asmPath}/hunspell`);

export const loadModule: (
  binaryEndpoint?: string,
  environment?: ENVIRONMENT
) => Promise<HunspellFactory> = getModuleLoader<HunspellFactory, HunspellAsmModule>(
  (runtime: HunspellAsmModule) => hunspellLoader(runtime),
  {
    //tslint:disable-next-line:no-require-imports
    dir: isNode() ? require('path').dirname(require.resolve(`${asmPath}/hunspell`)) : null,
    runtimeModule
  }
);
