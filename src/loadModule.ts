import { ENVIRONMENT, getModuleLoader, isNode } from 'emscripten-wasm-loader';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { hunspellLoader } from './hunspellLoader';
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
  //imports MODULARIZED emscripten preamble
  //tslint:disable-next-line:no-require-imports no-var-requires
  const runtime = require(`./lib/hunspell`);

  const { locateBinary, environment, timeout } = initOptions;
  const env = environment ? environment : isNode() ? ENVIRONMENT.NODE : ENVIRONMENT.WEB;

  log(`loadModule: loading hunspell wasm binary`, { initOptions });

  //Override default wasm binary resolution in preamble if needed.
  //By default, hunspell-asm overrides to direct require to binary on *browser* environment to allow bundler like webpack resolves it.
  //On node, it relies on default resolution logic.
  const lookupBinary =
    env === ENVIRONMENT.NODE && !locateBinary
      ? undefined
      : locateBinary ||
        //tslint:disable-next-line:no-require-imports no-var-requires
        ((filePath: string) => (filePath.endsWith('.wasm') ? require('./lib/hunspell.wasm') : filePath));

  //https://github.com/kwonoj/docker-hunspell-wasm/issues/63
  //Build module object to construct wasm binary module via emscripten preamble.
  //apply overridden environment values to custom patched hunspell preamble.
  const overriddenModule = { locateFile: lookupBinary, ENVIRONMENT: env };

  const moduleLoader = await getModuleLoader<HunspellFactory, HunspellAsmModule>(
    (runtime: HunspellAsmModule) => hunspellLoader(runtime, env),
    runtime,
    overriddenModule,
    { timeout }
  );

  return moduleLoader();
};

export { loadModule };
