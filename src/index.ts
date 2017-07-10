import { spellCheckerFactory } from './Hunspell';
import { hunspellLoader } from './hunspellLoader';
import { isWasmEnabled } from './util/isWasmEnabled';

export const loadModule = async (): Promise<spellCheckerFactory> => {
  const modulePath = `./lib/${isWasmEnabled() ? 'wasm' : 'asm'}/hunspell`;
  //tslint:disable-next-line:no-require-imports
  const moduleLoader = require(modulePath);
  const asmModule = moduleLoader();

  await asmModule.initializeRuntime();

  return hunspellLoader(asmModule);
};
