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
  const {
    cwrap,
    FS,
    _free,
    allocateUTF8,
    stackAlloc,
    getValue,
    Pointer_stringify
  } = asmModule;
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

  return {
    mountDirectory: mountDirectory(FS, nodePathId, environment),
    mountBuffer: mountBuffer(FS, memPathId),
    unmount: unmount(FS, memPathId),
    create: (affPath: string, dictPath: string) => {
      const affPathPtr = allocateUTF8(affPath);
      const dictPathPtr = allocateUTF8(dictPath);
      const hunspellPtr = hunspellInterface.create(affPathPtr, dictPathPtr);
      return {
        dispose: () => {
          hunspellInterface.destroy(hunspellPtr);
          _free(affPathPtr);
          _free(dictPathPtr);
        },
        spell: (word: string) => {
          const wordPtr = allocateUTF8(word);
          const ret = hunspellInterface.spell(hunspellPtr, wordPtr);
          _free(wordPtr);
          return !!ret;
        },
        suggest: (word: string) => {
          const suggestionListPtr = stackAlloc(4);
          const wordPtr = allocateUTF8(word);
          const suggestionCount = hunspellInterface.suggest(hunspellPtr, suggestionListPtr, wordPtr);
          const suggestionListValuePtr = getValue(suggestionListPtr, '*');

          const ret =
            suggestionCount > 0
              ? Array.from(Array(suggestionCount).keys()).map(idx =>
                  Pointer_stringify(getValue(suggestionListValuePtr + idx * 4, '*'))
                )
              : [];

          hunspellInterface.free_list(hunspellPtr, suggestionListPtr, suggestionCount);

          _free(wordPtr);
          return ret;
        }
      };
    }
  };
};
