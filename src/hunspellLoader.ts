import * as cuid from 'cuid';
import * as path from 'path';
import * as unixify from 'unixify';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { isMounted } from './isMounted';
import { mkdirTree } from './mkdirTree';
import { isNode } from './util/isNode';
import { log } from './util/logger';
import { wrapHunspellInterface } from './wrapHunspellInterface';

const mountDirectory = (FS: any, nodePathId: string) => (dirPath: string) => {
  if (!isNode()) {
    throw new Error('Mounting physical directory is not supported other than node.js environment');
  }

  const mountedDirPath = unixify(path.join(nodePathId, unixify(path.resolve(dirPath))));
  if (isMounted(FS, mountedDirPath, 'dir')) {
    log(`mountNodeFile: file is already mounted, return it`);
  } else {
    mkdirTree(FS, mountedDirPath);
    FS.mount(FS.filesystems.NODEFS, { root: path.resolve(dirPath) }, mountedDirPath);
  }

  return mountedDirPath;
};

/**
 *
 * @param FS
 * @param memPathId
 */
const mountBuffer = (FS: any, memPathId: string) => (contents: ArrayBufferView, fileName?: string) => {
  const file = fileName || cuid();
  const mountedFilePath = `${memPathId}/${file}`;

  if (isMounted(FS, mountedFilePath, 'file')) {
    log(`mountTypedArrayFile: file is already mounted, return it`);
  } else {
    FS.writeFile(mountedFilePath, contents, { encoding: 'binary' });
  }

  return mountedFilePath;
};

const unmount = (FS: any, memPathId: string) => (mountedPath: string) => {
  if (isMounted(FS, mountedPath, 'file') && mountedPath.indexOf(memPathId) > -1) {
    log(`unmount: ${mountedPath} is typedArrayFile, unlink from memory`);
    FS.unlink(mountedPath);
  }

  if (isMounted(FS, mountedPath, 'dir')) {
    FS.unmount(mountedPath);
    FS.rmdir(mountedPath);
  }
};

/** @internal */
export const hunspellLoader = (asmModule: HunspellAsmModule): HunspellFactory => {
  const { cwrap, FS, stringToUTF8, Runtime, getValue, Pointer_stringify } = asmModule;
  const hunspellInterface = wrapHunspellInterface(cwrap);

  //creating top-level path to mount files
  const memPathId = `/${cuid()}`;
  FS.mkdir(memPathId);
  log(`hunspellLoader: mount path for bufferFile created at ${memPathId}`);

  const nodePathId = `/${cuid()}`;
  if (isNode()) {
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
