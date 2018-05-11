import { expect } from 'chai';
import * as fs from 'fs';
import { includes } from 'lodash-es';
import * as path from 'path';
import * as Rx from 'rxjs';
import * as unixify from 'unixify';
import { loadModule } from '../../src';
import { Hunspell } from '../../src/Hunspell';
import { HunspellFactory } from '../../src/HunspellFactory';
import { excludedWords } from '../util';

const readFile = Rx.Observable.bindNodeCallback(fs.readFile);

const mountDirHunspell = (factory: HunspellFactory, dirPath: string, fixture: string) => {
  const dir = factory.mountDirectory(dirPath);
  const hunspell = factory.create(unixify(path.join(dir, `${fixture}.aff`)), unixify(path.join(dir, `${fixture}.dic`)));

  return {
    hunspell,
    dispose: () => {
      hunspell.dispose();
      factory.unmount(dir);
    }
  };
};

const mountBufferHunspell = async (factory: HunspellFactory, dirPath: string, fixture: string) => {
  const aff = factory.mountBuffer(await readFile(path.join(`${dirPath}`, `${fixture}.aff`)).toPromise());
  const dic = factory.mountBuffer(await readFile(path.join(`${dirPath}`, `${fixture}.dic`)).toPromise());
  const hunspell = factory.create(aff, dic);

  return {
    hunspell,
    dispose: () => {
      hunspell.dispose();
      factory.unmount(aff);
      factory.unmount(dic);
    }
  };
};

/**
 * Iterate fixture directory, returns array of test for specified type.
 * @param fixturePath path to fixture
 * @param testType type of test by fixture extension. `good` is for matched spell, `wrong` for misspell, `sug` for suggestion.
 */
const getFixtureList = (fixturePath: string, testType: '.good' | '.wrong' | '.sug') =>
  fs
    .readdirSync(fixturePath)
    .filter(file => path.extname(file) === testType)
    .map(file => path.basename(file, testType));

/**
 * running original hunspell's spec using `mountDir` via FS.NODEFS.
 *
 */
describe('hunspell', async () => {
  //setting up path to fixture
  const baseFixturePath = path.join(__dirname, '../__fixtures__');
  let hunspellFactory: HunspellFactory;

  //load module one time before test begins
  beforeAll(async done => {
    hunspellFactory = await loadModule();
    done();
  });

  /**
   * Function to generate test case for each test fixtures.
   * Test case reads fixture setup (*.good, *.wrong, *.sug), run assertion function to compare with expected value.
   * @param fixture name of fixture, in absolute path form without extension of file.
   * @param testType type of test by fixture extension. `good` is for matched spell, `wrong` for misspell, `sug` for suggestion.
   * @param assertionValue function to get value to assert
   * @param expected expected value to compare with assertionValue.
   */
  const assert = (
    dirPath: string,
    fixture: string,
    testType: '.good' | '.wrong' | '.sug',
    assertionValue: (hunspell: Hunspell, word: string) => any,
    expected: any
  ) => {
    const runAssert = async (hunspell: Hunspell) => {
      const words: Array<string> = await (readFile as any)(`${path.join(dirPath, fixture)}${testType}`, 'utf-8')
        .map((value: string) => value.split('\n').filter(x => !!x))
        .toPromise();

      words.filter(word => !includes(excludedWords, word)).forEach(word => {
        const base = { word };
        const value = assertionValue(hunspell, word);
        expect({ ...base, value }).to.deep.equal({ ...base, value: expected });
      });
    };

    it(`${path.basename(fixture)} when mount directory`, async () => {
      const { hunspell, dispose } = mountDirHunspell(hunspellFactory, dirPath, fixture);
      await runAssert(hunspell);
      dispose();
    });

    it(`${path.basename(fixture)} when mount buffer`, async () => {
      const { hunspell, dispose } = await mountBufferHunspell(hunspellFactory, dirPath, fixture);
      await runAssert(hunspell);
      dispose();
    });
  };

  describe('should match correct word', () => {
    const fixtureList = getFixtureList(baseFixturePath, '.good');
    fixtureList
      .filter(x => x !== 'morph')
      .forEach(fixture =>
        assert(baseFixturePath, fixture, '.good', (hunspell: Hunspell, word: string) => hunspell.spell(word), true)
      );
  });

  describe('should match missplled word', () => {
    const fixtureList = getFixtureList(baseFixturePath, '.wrong');
    fixtureList.forEach(fixture =>
      assert(baseFixturePath, fixture, '.wrong', (hunspell: Hunspell, word: string) => hunspell.spell(word), false)
    );
  });

  describe('should suggest missplled word', () => {
    const fixtureList = getFixtureList(baseFixturePath, '.sug');
    fixtureList.filter(x => !includes(['1463589', 'i54633', 'map'], x)).forEach(fixture => {
      const base = path.join(baseFixturePath, `${fixture}`);
      const suggestions = (
        [
          ...fs
            .readFileSync(`${base}.sug`, 'utf-8')
            .split('\n')
            .filter(x => !!x)
            .map(x => {
              const splitted = x.split(', ');
              if (splitted.length === 1 && !includes(excludedWords, splitted[0])) {
                return splitted[0];
              }
              const filtered = splitted.filter(word => !includes(excludedWords, word));
              if (filtered.length > 0) {
                return filtered;
              }
              return null;
            })
        ] || []
      ).filter(x => !!x);

      const runAssert = async (hunspell: Hunspell) => {
        const words: Array<string> = await (readFile as any)(`${path.join(baseFixturePath, fixture)}.wrong`, 'utf-8')
          .map((value: string) => value.split('\n').filter(x => !!x))
          .toPromise();

        const suggested: Array<string | Array<string>> = [];
        //run suggestion, construct results into Array<string|Array<string>>
        words.filter(word => !includes(excludedWords, word)).forEach(word => {
          const ret = hunspell.suggest(word);
          if (ret.length > 0) {
            suggested.push(ret.length > 1 ? ret : ret[0]);
          }
        });

        //fixture should equal to actual suggestion
        expect(suggested).to.deep.equal(suggestions);
      };

      it(`${path.basename(fixture)} when mount directory`, async () => {
        const { hunspell, dispose } = mountDirHunspell(hunspellFactory, baseFixturePath, fixture);
        await runAssert(hunspell);
        dispose();
      });

      it(`${path.basename(fixture)} when mount buffer`, async () => {
        const { hunspell, dispose } = await mountBufferHunspell(hunspellFactory, baseFixturePath, fixture);
        await runAssert(hunspell);
        dispose();
      });
    });
  });
});
