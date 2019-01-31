import { ENVIRONMENT, getModuleLoader, isNode } from 'emscripten-wasm-loader';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { hunspellLoader } from './hunspellLoader';
import { log } from './util/logger';

/**
 * Load, initialize wasm binary to use actual hunspell wasm instances.
 *
 * @param [InitOptions] Options to initialize hunspell wasm binary.
 * @param {number} [InitOptions.timeout] - timeout to wait wasm binary compilation & load.
 * @param {string | object} [InitOptions.locateBinary] - custom resolution logic for wasm binary. (not supported)
 * @param {ENVIRONMENT} [InitOptions.environment] For overriding running environment
 * It could be either remote endpoint url, or loader-returned object for bundler. Check examples/browser_* for references.
 *
 * @returns {() => Promise<HunspellFactory>} Function to load module
 */
const loadModule = async (
  initOptions: Partial<{
    timeout: number;
    environment?: ENVIRONMENT;
  }> = {}
) => {
  //imports MODULARIZED emscripten preamble
  //tslint:disable-next-line:no-require-imports no-var-requires
  const runtime = require(`./lib/hunspell-asm`);

  const { environment, timeout } = initOptions;
  const env = environment ? environment : isNode() ? ENVIRONMENT.NODE : ENVIRONMENT.WEB;

  log(`loadModule: loading hunspell wasm binary`, { initOptions });

  //https://github.com/kwonoj/docker-hunspell-wasm/issues/63
  //Build module object to construct wasm binary module via emscripten preamble.
  //apply overridden environment values to custom patched hunspell preamble.
  const overriddenModule = { ENVIRONMENT: env };

  const moduleLoader = await getModuleLoader<HunspellFactory, HunspellAsmModule>(
    (runtime: HunspellAsmModule) => hunspellLoader(runtime, env),
    runtime,
    overriddenModule,
    { timeout }
  );

  return moduleLoader();
};

export { loadModule };
