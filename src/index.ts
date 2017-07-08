import { spellCheckerFactory } from './Hunspell';
import { hunspellLoader } from './hunspellLoader';
import { isWasmEnabled } from './util/isWasmEnabled';

export const loadModule = async (): Promise<spellCheckerFactory> => {
  //tslint:disable-next-line:no-require-imports
  const moduleLoader = isWasmEnabled() ? require('./lib/wasm/hunspell') : null;
  const asmModule = moduleLoader();

  //TODO: need to move into preprocessor
  const initialize = new Promise((resolve) => asmModule.onRuntimeInitialized = () => resolve());
  await initialize;

  return hunspellLoader(asmModule);
};
