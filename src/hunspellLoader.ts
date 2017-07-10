import * as cuid from 'cuid';
import * as path from 'path';
import { spellCheckerFactory } from './Hunspell';

/**
 * https://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
 */
export interface HunspellAsmModule {
  cwrap: (fn: string, returnType: string | null, parameterType: Array<string>) => Function;
  FS: any;
  stringToUTF8: (str: string, outPtr: number, maxBytesToWrite: number) => void;
  Runtime: any;
  getValue: (ptr: number, type: string, nosafe?: boolean) => any;
  Pointer_stringify: (ptr: number) => string;
}

export const hunspellLoader = (asmModule: HunspellAsmModule): spellCheckerFactory => {
  //TODO: selectively export fs interface
  const { cwrap, FS, stringToUTF8, Runtime, getValue, Pointer_stringify } = asmModule;

  //Hunhandle* Hunspell_create(const char* affpath, const char* dpath)
  const hunspell_create = cwrap('Hunspell_create', 'number', ['number', 'number']);
  //void Hunspell_destroy(Hunhandle* pHunspell)
  const hunspell_destroy = cwrap('Hunspell_destroy', null, ['number']);
  //int Hunspell_spell(Hunhandle* pHunspell, const char*)
  const huspell_spell = cwrap('Hunspell_spell', 'number', ['number', 'number']);
  //int Hunspell_suggest(Hunhandle* pHunspell, char*** slst, const char* word);
  const hunspell_suggest = cwrap('Hunspell_suggest', 'number', ['number', 'number', 'number']);
  //void Hunspell_free_list(Hunhandle* pHunspell, char*** slst, int n);
  const hunspell_free_list = cwrap('Hunspell_free_list', null, ['number', 'number', 'number']);

  const allocateString = (str: string) => {
    const len = (str.length << 2) + 1;
    const ret = Runtime.stackAlloc(len);
    stringToUTF8(str, ret, len);
    return ret;
  };

  return (dictionaryPath: string) => {
    const memPathId = `/${cuid()}`;
    FS.mkdir(memPathId);
    FS.stat(memPathId);

    const p = path.relative(process.cwd(), path.dirname(dictionaryPath)) || './';
    FS.mount(FS.filesystems.NODEFS, { root: p }, memPathId);

    const basePath = `${memPathId}/${path.basename(dictionaryPath, '.dic')}`;
    const dict = [`${basePath}.aff`, `${basePath}.dic`];

    const hunspellPtr = hunspell_create(...dict.map(allocateString));

    const suggest = (word: string) => {
      const stack = Runtime.stackSave();
      const suggestionListPtr = Runtime.stackAlloc(4);
      const suggestionCount = hunspell_suggest(hunspellPtr, suggestionListPtr, allocateString(word));
      const suggestionListValuePtr = getValue(suggestionListPtr, '*');

      const ret =
        suggestionCount > 0
          ? Array.from(Array(suggestionCount).keys()).map(idx =>
              Pointer_stringify(getValue(suggestionListValuePtr + idx * 4, '*'))
            )
          : [];

      hunspell_free_list(hunspellPtr, suggestionListPtr, suggestionCount);
      Runtime.stackRestore(stack);

      return ret;
    };
    const spell = (word: string) => {
      //let allocated string volatile via manually save / restore stacks, instead of malloc / free
      const stack = Runtime.stackSave();
      const ret = huspell_spell(hunspellPtr, allocateString(word));
      Runtime.stackRestore(stack);
      return !!ret;
    };

    const dispose = () => {
      //destruct hunspell instance
      hunspell_destroy(hunspellPtr);

      FS.unmount(memPathId);
      FS.rmdir(memPathId);
    };

    return {
      suggest,
      spell,
      dispose
    };
  };
};
