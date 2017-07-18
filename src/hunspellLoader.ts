import * as cuid from 'cuid';
import * as path from 'path';
import { HunspellFactory } from './Hunspell';
import { log } from './logger';

//naïve detection for running environment
const isNode = typeof module !== 'undefined' && module.exports;
export type stringToUTF8Signature = (str: string, outPtr: number, maxBytesToWrite: number) => void;
export type cwrapSignature = <T = Function>(fn: string, returnType: string | null, parameterType: Array<string>) => T;
/**
 * https://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
 */
export interface HunspellAsmModule {
  cwrap: cwrapSignature;
  FS: any;
  stringToUTF8: stringToUTF8Signature;
  Runtime: any;
  getValue: (ptr: number, type: string, nosafe?: boolean) => any;
  Pointer_stringify: (ptr: number) => string;
}

/**
 * Wrap hunspell exported interfaces via cwrap for resuable mannter.
 *
 */
const wrapHunspellInterface = (cwrap: cwrapSignature) => ({
  //Hunhandle* Hunspell_create(const char* affpath, const char* dpath)
  create: cwrap<(affPath: number, dicPath: number) => number>('Hunspell_create', 'number', ['number', 'number']),
  //void Hunspell_destroy(Hunhandle* pHunspell)
  destroy: cwrap<(hunspellPtr: number) => void>('Hunspell_destroy', null, ['number']),
  //int Hunspell_spell(Hunhandle* pHunspell, const char*)
  spell: cwrap<(hunspellPtr: number, value: number) => number>('Hunspell_spell', 'number', ['number', 'number']),
  //int Hunspell_suggest(Hunhandle* pHunspell, char*** slst, const char* word);
  suggest: cwrap<
    (hunspellPtr: number, outSuggestionListPtr: number, value: number) => number
  >('Hunspell_suggest', 'number', ['number', 'number', 'number']),
  //void Hunspell_free_list(Hunhandle* pHunspell, char*** slst, int n);
  free_list: cwrap<
    (hunspellPtr: number, suggestionListPtr: number, count: number) => void
  >('Hunspell_free_list', null, ['number', 'number', 'number'])
});

const isFileMounted = (FS: any, filePath: string): boolean => {
  try {
    const stat = FS.stat(filePath);
    if (!!stat && FS.isFile(stat.mode)) {
      return true;
    }
  } catch (e) {
    log(`isFileMounted`, e);
  }

  return false;
};

const isDirMounted = (FS: any, dirPath: string): boolean => {
  try {
    const stat = FS.stat(dirPath);
    if (!!stat && FS.isDir(stat.mode)) {
      return true;
    }
  } catch (e) {
    log(`isDirMounted`, e);
  }

  return false;
};

const mkdirTree = (FS: any, dirPath: string) => {
  const dirs = dirPath.split('/');
  let d = '';
  for (let i = 0; i < dirs.length; ++i) {
    d += '/' + dirs[i];
    try {
      FS.mkdir(d);
    } catch (e) {
      //throw if not ERRNO_CODES.EEXIST
      if (e.errno != 17) {
        throw e;
      }
    }
  }
};

const mountDirectory = (FS: any, nodePathId: string) => (dirPath: string) => {
  if (!isNode) {
    throw new Error('Mounting physical directory is not supported other than node.js environment');
  }

  const mountedDirPath = path.join(nodePathId, path.resolve(dirPath));
  if (isDirMounted(FS, mountedDirPath)) {
    log(`mountNodeFile: file is already mounted, return it`);
  } else {
    mkdirTree(FS, mountedDirPath);
    FS.mount(FS.filesystems.NODEFS, { root: dirPath }, mountedDirPath);
  }

  return mountedDirPath;
};

/**
 *
 * @param FS
 * @param memPathId
 */
const mountBuffer = (FS: any, memPathId: string) => (contents: Uint8Array, fileName: string) => {
  const mountedFilePath = path.join(memPathId, fileName);

  if (isFileMounted(FS, mountedFilePath)) {
    log(`mountTypedArrayFile: file is already mounted, return it`);
  } else {
    FS.writeFile(mountedFilePath, contents); //arrayBuffer?
  }

  return mountedFilePath;
};

const unmount = (FS: any, memPathId: string) => (mountedPath: string) => {
  if (isFileMounted(FS, mountedPath) && mountedPath.indexOf(memPathId) > -1) {
    log(`unmount: ${mountedPath} is typedArrayFile, unlink from memory`);
    FS.unlink(mountedPath);
  }

  if (isDirMounted(FS, mountedPath)) {
    FS.unmount(mountedPath);
    FS.rmdir(mountedPath);
  }
};

/** @internal */
export const hunspellLoader = (asmModule: HunspellAsmModule): HunspellFactory => {
  //TODO: selectively export fs interface
  const { cwrap, FS, stringToUTF8, Runtime, getValue, Pointer_stringify } = asmModule;
  const hunspellInterface = wrapHunspellInterface(cwrap);

  //creating top-level path to mount files
  const memPathId = `/${cuid()}`;
  const nodePathId = `/${cuid()}`;
  FS.mkdir(memPathId);
  FS.mkdir(nodePathId);

  const allocString = (value: string) => {
    const len = (value.length << 2) + 1;
    const ret = Runtime.stackAlloc(len);
    stringToUTF8(value, ret, len);
    return ret;
  };

  return {
    mountDirectory: mountDirectory(FS, nodePathId),
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
