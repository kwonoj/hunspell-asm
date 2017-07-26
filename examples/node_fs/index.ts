//tslint:disable:no-console
import * as path from 'path';
import * as unixify from 'unixify';
import { loadModule } from '../../src';
import { runHunspell } from '../runHunspell';

const dictPath = path.resolve('../../spec/__fixtures__');

const runNodeFileHunspell = async () => {
  const hunspellFactory = await loadModule();
  const mountedPath = hunspellFactory.mountDirectory(dictPath);

  console.log(`path '${dictPath}' mounted to '${mountedPath}'`);

  const dictFile = unixify(path.join(mountedPath, 'korean.dic'));
  const affFile = unixify(path.join(mountedPath, 'korean.aff'));

  runHunspell(hunspellFactory, affFile, dictFile);

  hunspellFactory.unmount(mountedPath);
};

runNodeFileHunspell();
