/*let hunspellLoader;
if (typeof module !== 'undefined' && module.exports) {
  hunspellLoader = import('./node/index');
} else {

}*/

import { isWasmEnabled } from './util/isWasmEnabled';

export const loadModule = async () => {
  //tslint:disable-next-line:no-require-imports
  const hunspellModule = isWasmEnabled() ? require('./lib/wasm/hunspell') : null;
  console.log(hunspellModule);
};
