//tslint:disable:no-console
import { HunspellFactory } from '../src/HunspellFactory';
const misSpelledWord = '들어오세';
const correctWord = '들어오세요';

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
  console.assert(suggestion.length === 1);
  console.assert(suggestion[0] === correctWord);

  hunspell.dispose();
};

export { runHunspell };
