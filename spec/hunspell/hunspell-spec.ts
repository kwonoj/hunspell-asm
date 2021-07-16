import * as fs from 'fs';
import { flatten, includes } from 'lodash';
import * as path from 'path';
import { bindNodeCallback } from 'rxjs';
import { map } from 'rxjs/operators';
import { HunspellFactory } from '../../src/HunspellFactory';
import { loadModule } from '../../src/loadModule';
import { excludedWords } from '../util';

const readFile = bindNodeCallback(fs.readFile);

const mountBufferHunspell = async (factory: HunspellFactory, dirPath: string, fixture: string) => {
  const buffers: Array<string> = [];
  const read = async (filePath: string) => {
    const mountedPath = factory.mountBuffer((await readFile(filePath).toPromise())!);
    buffers.push(mountedPath);
    return mountedPath;
  };

  const aff = await read(path.join(`${dirPath}`, `${fixture}.aff`));
  const dic = await read(path.join(`${dirPath}`, `${fixture}.dic`));
  const hunspell = factory.create(aff, dic);

  return {
    read,
    hunspell,
    dispose: () => {
      hunspell.dispose();
      buffers.forEach((x) => factory.unmount(x));
    },
  };
};

/**
 * Location to fixture files
 */
const baseFixturePath = path.join(__dirname, '../__fixtures__');

enum TestType {
  MatchSpell = '.good',
  MismatchSpell = '.wrong',
  Suggestion = '.sug',
  Stem = '.stem',
}

enum MountType {
  Buffer = 'buffer',
}

/**
 * Iterate fixture directory, returns array of test for specified type.
 * @param fixturePath path to fixture
 * @param testType type of test by fixture extension. `good` is for matched spell, `wrong` for misspell, `sug` for suggestion.
 */
const getFixtureList = (fixturePath: string, testType: TestType, skipList: Array<string> = []) =>
  flatten(
    fs
      .readdirSync(fixturePath)
      .filter((file) => path.extname(file) === testType)
      .map((file) => path.basename(file, testType))
      .filter((x) => {
        if (includes(skipList, x)) {
          console.log(`Skipping test fixture '${x}'`); //tslint:disable-line:no-console
          return false;
        }
        return true;
      })
      .map<Array<[string, MountType, (factory: HunspellFactory) => ReturnType<typeof mountBufferHunspell>]>>(
        (fixture) => [
          [fixture, MountType.Buffer, async (factory) => await mountBufferHunspell(factory, baseFixturePath, fixture)],
        ]
      )
  );

const readWords = async (fixture: string, testType: TestType): Promise<Array<string>> =>
  await (readFile as any)(`${path.join(baseFixturePath, fixture)}${testType}`, 'utf-8')
    .pipe(map((value: string) => value.split('\n').filter((x) => !!x)))
    .toPromise();

/**
 * running original hunspell's spec.
 *
 */
describe('hunspell', () => {
  let hunspellFactory: HunspellFactory;

  //load module one time before test begins
  beforeAll(async () => {
    hunspellFactory = await loadModule();
  });

  /**
   * Function to generate test case for each test fixtures.
   * Test case reads fixture setup (*.good, *.wrong, *.sug), run assertion function to compare with expected value.
   * @param fixture name of fixture, in absolute path form without extension of file.
   * @param testType type of test by fixture extension. `good` is for matched spell, `wrong` for misspell, `sug` for suggestion.
   * @param assertionValue function to get value to assert
   * @param expected expected value to compare with assertionValue.
   */
  const buildSpellAssertion = (testType: TestType, expectedValue: any, skipList: Array<string> = []) => {
    const fixtureList = getFixtureList(baseFixturePath, testType, skipList);

    it.each(fixtureList)(`fixture '%s' for %s`, async (fixture, _mountType, factory) => {
      const { hunspell, dispose } = await factory(hunspellFactory);
      const words = await readWords(fixture, testType);

      words
        .filter((word) => !includes(excludedWords, word))
        .forEach((word) => {
          const value = hunspell.spell(word);
          expect({ word, value }).toEqual({ word, value: expectedValue });
        });

      dispose();
    });
  };

  describe('should match correct word', () => {
    const matchCorrectWordFixtureSkipList = ['morph'];
    buildSpellAssertion(TestType.MatchSpell, true, matchCorrectWordFixtureSkipList);
  });

  describe('should match missplled word', () => {
    buildSpellAssertion(TestType.MismatchSpell, false);
  });

  describe('should suggest misspelled word-refactor', () => {
    const suggestionFixtureSkipList = ['1463589', 'i54633', 'map'];
    const fixtureList = getFixtureList(baseFixturePath, TestType.Suggestion, suggestionFixtureSkipList);

    it.each(fixtureList)(`fixture '%s' for %s`, async (fixture, _mountType, factory) => {
      const { hunspell, dispose } = await factory(hunspellFactory);

      const base = path.join(baseFixturePath, `${fixture}`);
      const expectedSuggestions = (
        [
          ...fs
            .readFileSync(`${base}.sug`, 'utf-8')
            .split('\n')
            .filter((x) => !!x)
            .map((x) => {
              const splitted = x.split(', ');
              if (splitted.length === 1 && !includes(excludedWords, splitted[0])) {
                return splitted[0];
              }
              const filtered = splitted.filter((word) => !includes(excludedWords, word));
              if (filtered.length > 0) {
                return filtered;
              }
              return null;
            }),
        ] || []
      ).filter((x) => !!x);

      const words = await readWords(fixture, TestType.MismatchSpell);

      //run suggestion, construct results into Array<string|Array<string>>
      const suggested: Array<string | Array<string>> = [];
      words
        .filter((word) => !includes(excludedWords, word))
        .forEach((word) => {
          const ret = hunspell.suggest(word);
          if (ret.length > 0) {
            suggested.push(ret.length > 1 ? ret : ret[0]);
          }
        });

      //fixture should equal to actual suggestion
      expect(suggested).toEqual(expectedSuggestions);
      dispose();
    });
  });

  describe('should suggest stems', () => {
    const testType = TestType.Stem;

    const fixtureList = getFixtureList(baseFixturePath, testType, []);

    it.each(fixtureList)(`fixture '%s' for %s`, async (fixture, _mountType, factory) => {
      const { hunspell, dispose } = await factory(hunspellFactory);

      const base = path.join(baseFixturePath, `${fixture}`);
      const expectedStems = (
        [
          ...fs
            .readFileSync(`${base}${testType}`, 'utf-8')
            .split('\n')
            .filter((x) => !!x)
            .map((x) => {
              const splitted = x.split(', ');
              if (splitted.length === 1 && !includes(excludedWords, splitted[0])) {
                return splitted[0];
              }
              const filtered = splitted.filter((word) => !includes(excludedWords, word));
              if (filtered.length > 0) {
                return filtered;
              }
              return null;
            }),
        ] || []
      ).filter((x) => !!x);

      const words = await readWords(fixture, TestType.MatchSpell);

      //run stem, construct results into Array<string|Array<string>>
      const stemmed: Array<string | Array<string>> = [];
      words
        .filter((word) => !includes(excludedWords, word))
        .forEach((word) => {
          const ret = hunspell.stem(word);
          if (ret.length > 0) {
            stemmed.push(ret.length > 1 ? ret : ret[0]);
          }
        });

      //fixture should equal to actual suggestion
      expect(stemmed).toEqual(expectedStems);
      dispose();
    });
  });

  describe('add words or dictionary in runtime', () => {
    const getHunspell = () => mountBufferHunspell(hunspellFactory, baseFixturePath, 'base');

    it.each([MountType.Buffer])('should able to add new dictionary into existing dictionary for %s', async () => {
      const { hunspell, dispose, read } = await getHunspell();

      expect(hunspell.spell('foo')).toBe(false);

      hunspell.addDictionary(await read(path.join(baseFixturePath, 'break.dic')));

      expect(hunspell.spell('foo')).toBe(true);
      dispose();
    });

    it.each([MountType.Buffer])('should able to add new word into existing dictionary for %s', async () => {
      const { hunspell, dispose } = await getHunspell();

      expect(hunspell.spell('nonexistword')).toBe(false);

      hunspell.addWord('nonexistword');
      expect(hunspell.spell('nonexistword')).toBe(true);

      dispose();
    });

    it.each([MountType.Buffer])('should able to add new word with affix into existing dictionary for %s', async () => {
      const { hunspell, dispose } = await getHunspell();

      expect(hunspell.spell('tre')).toBe(false);

      hunspell.addWordWithAffix('tre', 'uncreate');

      expect(hunspell.spell('tre')).toBe(true);
      expect(hunspell.spell('trive')).toBe(true);

      dispose();
    });

    it.each([MountType.Buffer])('should able to remove word from existing dictionary for %s', async () => {
      const { hunspell, dispose } = await getHunspell();

      expect(hunspell.spell('seven')).toBe(true);

      hunspell.removeWord('seven');
      expect(hunspell.spell('seven')).toBe(false);

      dispose();
    });
  });
});
