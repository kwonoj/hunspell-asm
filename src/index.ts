import { spellCheckerFactory } from './Hunspell';
import { hunspellLoader } from './hunspellLoader';
import { log } from './logger';
import { isWasmEnabled } from './util/isWasmEnabled';

export const loadModule = async (): Promise<spellCheckerFactory> => {
  const asmType = isWasmEnabled() ? 'wasm' : 'asm';
  log(`loadModule: load hunspell module loader from `, asmType);

  //tslint:disable-next-line:no-require-imports
  const moduleLoader = require(`./lib/${asmType}/hunspell`);
  log(`loadModule: moduleLoader imported`);

  const asmModule = moduleLoader();
  await asmModule.initializeRuntime();
  log(`loadModule: initialized hunspell Runtime`);

  return hunspellLoader(asmModule);
};
