//tslint:disable:no-console
import { HunspellFactory } from '../src/HunspellFactory';
const misSpelledWord = '한녕하세요';
const correctWord = '안녕하세요';

const runHunspell = (hunspellFactory: HunspellFactory, affPath: string, dicPath: string) => {
  const hunspell = hunspellFactory.create(affPath, dicPath);

  const misSpell = hunspell.spell(misSpelledWord);
  console.log(`check spell for word '${misSpelledWord}': ${misSpell}`);
  console.assert(misSpell === false);

  const correctSpell = hunspell.spell(correctWord);
  console.log(`check spell for word '${correctWord}': ${correctSpell}`);
  console.assert(correctSpell === true);

  const suggestion = hunspell.suggest(misSpelledWord);
  console.log(`spell suggestion for misspelled word '${misSpelledWord}': ${suggestion}`);
  console.assert(suggestion[0] === correctWord);

  hunspell.dispose();
};

export { runHunspell };
