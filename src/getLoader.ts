import { ENVIRONMENT, getModuleLoader, isNode } from 'emscripten-wasm-loader';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { hunspellLoader } from './hunspellLoader';
import { log } from './util/logger';

/**
 * @internal
 * Creates loadModule function.
 *
 * @param {binaryPath} string Path to import wasm / asm.js binary via `require`
 * @param {binaryEndpoint} [string] For overring path to wasm binary on node.js or browser.
 * @param {environment} [ENVIRONMENT] For overriding running environment
 *
 * @returns {(binaryEndpoint?: string, environment?: ENVIRONMENT) => Promise<HunspellFactory>} Function to load module
 */
const getLoader = async (binaryPath: string, binaryEndpoint?: string, environment?: ENVIRONMENT) => {
  log(`loadModule: load hunspell module loader from `, binaryPath);

  //imports MODULARIZED emscripten preamble
  //tslint:disable-next-line:no-require-imports no-var-requires
  const runtimeModule = require(`${binaryPath}/hunspell`);
  //do not supply this into moduleLoader, emscripten-wasm-loader does its own job to get environment
  const env = environment ? environment : isNode() ? ENVIRONMENT.NODE : ENVIRONMENT.WEB;

  const moduleLoader = await getModuleLoader<HunspellFactory, HunspellAsmModule>(
    (runtime: HunspellAsmModule, env: ENVIRONMENT) => hunspellLoader(runtime, env),
    {
      //tslint:disable-next-line:no-require-imports
      dir: env === ENVIRONMENT.NODE ? require('path').dirname(require.resolve(`${binaryPath}/hunspell`)) : null,
      runtimeModule
    }
  );

  return moduleLoader(binaryEndpoint, environment);
};

export { getLoader };
