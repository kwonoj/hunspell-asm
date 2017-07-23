//tslint:disable:no-console
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as Rx from 'rxjs';
import { loadModule } from '../../src';

const readFile = Rx.Observable.bindNodeCallback(fs.readFile);

const dictPath = path.resolve('./');
const misSpelledWord = '들어오세';
const correctWord = '들어오세요';

const runHunspell = async () => {
  const hunspellFactory = await loadModule();

  const affBuffer = await readFile(path.join(dictPath, 'korean.aff')).toPromise();
  const dicBuffer = await readFile(path.join(dictPath, 'korean.dic')).toPromise();

  const affFile = hunspellFactory.mountBuffer(affBuffer, 'korean.aff');
  const dictFile = hunspellFactory.mountBuffer(dicBuffer, 'korean.dic');

  console.log(`mounted aff to '${affFile}'`);
  console.log(`mounted dic to '${dictFile}'`);

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
  hunspellFactory.unmount(affFile);
  hunspellFactory.unmount(dictFile);
};

runHunspell();
