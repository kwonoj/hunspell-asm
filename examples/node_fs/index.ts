//tslint:disable:no-console
import * as assert from 'assert';
import * as path from 'path';
import * as unixify from 'unixify';
import { loadModule } from '../../src';

const dictPath = path.resolve('./');
const misSpelledWord = '들어오세';
const correctWord = '들어오세요';

const runHunspell = async () => {
  const hunspellFactory = await loadModule();
  const mountedPath = hunspellFactory.mountDirectory(dictPath);

  console.log(`path '${dictPath}' mounted to '${mountedPath}'`);

  const dictFile = unixify(path.join(mountedPath, 'korean.dic'));
  const affFile = unixify(path.join(mountedPath, 'korean.aff'));

  const hunspell = hunspellFactory.create(affFile, dictFile);

  const misSpell = hunspell.spell(misSpelledWord);
  console.log(`check spell for word '${misSpelledWord}': ${misSpell}`);
  assert(misSpell === false);

  const correctSpell = hunspell.spell(correctWord);
  console.log(`check spell for word '${correctWord}': ${correctSpell}`);
  assert(correctSpell === true);

  const suggestion = hunspell.suggest(misSpelledWord);
  console.log(`spell suggestion for misspelled word '${misSpelledWord}': ${suggestion}`);
  assert(suggestion.length === 1);
  assert(suggestion[0] === correctWord);

  hunspell.dispose();
  hunspellFactory.unmount(mountedPath);
};

runHunspell();
