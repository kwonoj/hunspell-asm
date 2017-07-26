import { HunspellFactory } from './Hunspell';
import { hunspellLoader } from './hunspellLoader';
import { isNode } from './util/isNode';
import { isWasmEnabled } from './util/isWasmEnabled';
import { log } from './util/logger';

/**
 * Asynchronously load and initialize asm module.
 *
 * @param {string} [binaryEndpoint] Provides endpoint to server to download binary module
 * (.wasm, .mem) via fetch when initialize module in a browser environment.
 *
 * @returns {HunspellFactory} Factory function manages lifecycle of hunspell and virtual files.
 */
export const loadModule = async (binaryEndpoint?: string): Promise<HunspellFactory> => {
  const asmType = isWasmEnabled() ? 'wasm' : 'asm';
  log(`loadModule: load hunspell module loader from `, asmType);

  //tslint:disable-next-line:no-require-imports
  const moduleLoader = require(`./lib/${asmType}/hunspell`);
  log(`loadModule: moduleLoader imported`);

  const asmModule = !!binaryEndpoint
    ? moduleLoader({
        locateFile: (fileName: string) =>
          isNode()
            ? //tslint:disable-next-line:no-require-imports
              require('path').join(binaryEndpoint, fileName)
            : `${binaryEndpoint}/${fileName}`
      })
    : moduleLoader();

  await asmModule.initializeRuntime();
  log(`loadModule: initialized hunspell Runtime`);

  return hunspellLoader(asmModule);
};

export { log, enableLogger } from './util/logger';
