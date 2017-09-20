import { ENVIRONMENT } from 'emscripten-wasm-loader';
import * as nanoid from 'nanoid';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { mountBuffer } from './mountBuffer';
import { mountDirectory } from './mountDirectory';
import { unmount } from './unmount';
import { log } from './util/logger';
import { wrapHunspellInterface } from './wrapHunspellInterface';

/**
 * Creates a factory function for mounting files into wasm filesystem
 * and creating hunspell instance.
 *
 * @param {HunspellAsmModule} asmModule wasm / asm module loaded into memory.
 *
 * @return {HunspellFactory} factory function for mounting files and creating hunspell instance.
 */

/** @internal */
export const hunspellLoader = (asmModule: HunspellAsmModule, environment: ENVIRONMENT): HunspellFactory => {
  const { cwrap, FS, stringToUTF8, Runtime, getValue, Pointer_stringify } = asmModule;
  const hunspellInterface = wrapHunspellInterface(cwrap);

  //creating top-level path to mount files
  const memPathId = `/${nanoid(45)}`;
  FS.mkdir(memPathId);
  log(`hunspellLoader: mount path for bufferFile created at ${memPathId}`);

  const nodePathId = `/${nanoid(45)}`;
  if (environment === ENVIRONMENT.NODE) {
    FS.mkdir(nodePathId);
    log(`hunspellLoader: mount path for directory created at ${nodePathId}`);
  }

  const allocString = (value: string) => {
    const len = (value.length << 2) + 1;
    const ret = Runtime.stackAlloc(len);
    stringToUTF8(value, ret, len);
    return ret;
  };

  return {
    mountDirectory: mountDirectory(FS, nodePathId, environment),
    mountBuffer: mountBuffer(FS, memPathId),
    unmount: unmount(FS, memPathId),
    create: (affPath: string, dictPath: string) => {
      const hunspellPtr = hunspellInterface.create(allocString(affPath), allocString(dictPath));
      return {
        dispose: () => hunspellInterface.destroy(hunspellPtr),
        spell: (word: string) => {
          //let allocated string volatile via manually save / restore stacks, instead of malloc / free
          const stack = Runtime.stackSave();
          const ret = hunspellInterface.spell(hunspellPtr, allocString(word));
          Runtime.stackRestore(stack);
          return !!ret;
        },
        suggest: (word: string) => {
          const stack = Runtime.stackSave();
          const suggestionListPtr = Runtime.stackAlloc(4);
          const suggestionCount = hunspellInterface.suggest(hunspellPtr, suggestionListPtr, allocString(word));
          const suggestionListValuePtr = getValue(suggestionListPtr, '*');

          const ret =
            suggestionCount > 0
              ? Array.from(Array(suggestionCount).keys()).map(idx =>
                  Pointer_stringify(getValue(suggestionListValuePtr + idx * 4, '*'))
                )
              : [];

          hunspellInterface.free_list(hunspellPtr, suggestionListPtr, suggestionCount);
          Runtime.stackRestore(stack);

          return ret;
        }
      };
    }
  };
};
