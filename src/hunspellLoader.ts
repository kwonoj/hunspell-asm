import * as cuid from 'cuid';
import * as path from 'path';
import { spellCheckerFactory } from './Hunspell';

export interface HunspellAsmModule {
  cwrap: (fn: string, returnType: string | null, parameterType: Array<string>) => Function;
  FS: any;
  stringToUTF8: Function;
  Runtime: any;
}

export const hunspellLoader = (asmModule: HunspellAsmModule): spellCheckerFactory => {
  //TODO: selectively export fs interface
  const { cwrap, FS, stringToUTF8, Runtime } = asmModule;

  //Hunhandle* Hunspell_create(const char* affpath, const char* dpath)
  const hunspell_create = cwrap('Hunspell_create', 'number', ['number', 'number']);
  //void Hunspell_destroy(Hunhandle* pHunspell)
  const hunspell_destroy = cwrap('Hunspell_destroy', null, ['number']);
  //int Hunspell_spell(Hunhandle* pHunspell, const char*)
  const huspell_spell = cwrap('Hunspell_spell', 'number', ['number', 'number']);
  //const hunspell_suggest = null;

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

    const p = path.relative(process.cwd(), path.dirname(dictionaryPath));
    FS.mount(FS.filesystems.NODEFS, { root: p }, memPathId);

    const basePath = `${memPathId}/${path.basename(dictionaryPath, '.dic')}`;
    const dict = [`${basePath}.aff`, `${basePath}.dic`];

    const hunspellPtr = hunspell_create(...dict.map(allocateString));

    const suggest = (_word: string) => [];
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