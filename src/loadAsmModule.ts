import { ENVIRONMENT } from 'emscripten-wasm-loader';
import { createModuleLoader } from './createModuleLoader';
import { log } from './util/logger';

/**
 * Same interface to loadModule, but for asm.js fallback binary.
 * Explicitly separated instead of runtime flag support in loadModule to allow tree shaking
 * when bundle code, avoids unnecessary binaries increases bundle size.
 *
 * @param [InitOptions] Options to initialize cld3 asm binary.
 * @param {number} [InitOptions.timeout] - timeout to wait wasm binary compilation & load.
 * @param {ENVIRONMENT} [InitOptions.environment] For overriding running environment
 * It could be either remote endpoint url, or loader-returned object for bundler. Check examples/browser_* for references.
 *
 * @returns {() => Promise<CldFactory>} Function to load module
 */
const loadAsmModule = async (
  initOptions: Partial<{
    timeout: number;
    environment?: ENVIRONMENT;
  }> = {}
) => {
  log(`loadModule: loading hunspell asm.js binary`);

  //imports MODULARIZED emscripten preamble
  //tslint:disable-next-line:no-require-imports no-var-requires
  const runtime = require(`./lib/hunspell-asm`);

  return createModuleLoader(initOptions, runtime);
};

export { loadAsmModule };
