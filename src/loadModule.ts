import { ENVIRONMENT, isNode } from 'emscripten-wasm-loader';
import { createModuleLoader } from './createModuleLoader';
import { log } from './util/logger';

/**
 * Load, initialize wasm binary to use actual cld wasm instances.
 *
 * @param [InitOptions] Options to initialize cld3 wasm binary.
 * @param {number} [InitOptions.timeout] - timeout to wait wasm binary compilation & load.
 * @param {string | object} [InitOptions.locateBinary] - custom resolution logic for wasm binary.
 * @param {ENVIRONMENT} [InitOptions.environment] For overriding running environment
 * It could be either remote endpoint url, or loader-returned object for bundler. Check examples/browser_* for references.
 *
 * @returns {() => Promise<CldFactory>} Function to load module
 */
const loadModule = async (
  initOptions: Partial<{
    timeout: number;
    locateBinary: (filePath: string) => string | object;
    environment?: ENVIRONMENT;
  }> = {}
) => {
  log(`loadModule: loading hunspell wasm binary`);

  //imports MODULARIZED emscripten preamble
  //tslint:disable-next-line:no-require-imports no-var-requires
  const runtime = require(`./lib/hunspell`);

  const { locateBinary, environment } = initOptions;
  const env = environment ? environment : isNode() ? ENVIRONMENT.NODE : ENVIRONMENT.WEB;

  //Override default wasm binary resolution in preamble if needed.
  //By default, hunspell-asm overrides to direct require to binary on *browser* environment to allow bundler like webpack resolves it.
  //On node, it relies on default resolution logic.
  const lookupBinary =
    env === ENVIRONMENT.NODE && !locateBinary
      ? undefined
      : locateBinary ||
        //tslint:disable-next-line:no-require-imports no-var-requires
        ((filePath: string) => (filePath.endsWith('.wasm') ? require('./lib/hunspell.wasm') : filePath));

  return createModuleLoader(
    {
      locateBinary: lookupBinary,
      ...initOptions
    },
    runtime
  );
};

export { loadModule };
