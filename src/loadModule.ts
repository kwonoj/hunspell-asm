import { ENVIRONMENT, getModuleLoader } from 'emscripten-wasm-loader';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { hunspellLoader } from './hunspellLoader';
import { log } from './util/logger';

/**
 * Load, initialize wasm / asm.js binary to use actual cld wasm instances.
 *
 * @param {environment} [ENVIRONMENT] For overriding running environment
 *
 * @param {initializeTimeout} [number] Custom timeout to pass for the initialization of the module
 *
 * @returns {Promise<HunspellFactory>} Factory function of cld to allow create instance of hunspell.
 */
const loadModule: (environment?: ENVIRONMENT) => Promise<HunspellFactory> = async (
  environment?: ENVIRONMENT,
  initializeTimeout?: number
) => {
  log(`loadModule: loading hunspell module`);

  //imports MODULARIZED emscripten preamble
  const runtimeModule = require(`./lib/hunspell`); //tslint:disable-line:no-require-imports no-var-requires
  const moduleLoader = await getModuleLoader<HunspellFactory, HunspellAsmModule>(
    (runtime: HunspellAsmModule, env: ENVIRONMENT) => hunspellLoader(runtime, env),
    runtimeModule,
    undefined,
    { timeout: initializeTimeout }
  );

  return moduleLoader(environment);
};

export { loadModule };
