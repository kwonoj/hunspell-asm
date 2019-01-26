import * as fs from 'fs';
import { includes } from 'lodash';
import * as path from 'path';
import { bindNodeCallback } from 'rxjs';
import { map } from 'rxjs/operators';
import * as unixify from 'unixify';
import { Hunspell } from '../../src/Hunspell';
import { HunspellFactory } from '../../src/HunspellFactory';
import { loadAsmModule } from '../../src/loadAsmModule';
import { loadModule } from '../../src/loadModule';
import { excludedWords } from '../util';

const readFile = bindNodeCallback(fs.readFile);

const mountDirHunspell = (factory: HunspellFactory, dirPath: string, fixture: string) => {
  const dir = factory.mountDirectory(dirPath);
  const read = (fileName: string) => unixify(path.join(dir, fileName));
  const hunspell = factory.create(read(`${fixture}.aff`), read(`${fixture}.dic`));

  return {
    read,
    hunspell,
    dispose: () => {
      hunspell.dispose();
      factory.unmount(dir);
    }
  };
};

const mountBufferHunspell = async (factory: HunspellFactory, dirPath: string, fixture: string) => {
  const buffers: Array<string> = [];
  const read = async (filePath: string) => {
    const mountedPath = factory.mountBuffer(await readFile(filePath).toPromise());
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
      buffers.forEach(x => factory.unmount(x));
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
  let hunspellAsmFactory: HunspellFactory;

  //load module one time before test begins
  beforeAll(async done => {
    hunspellFactory = await loadModule();
    hunspellAsmFactory = await loadAsmModule();
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
        .pipe(map((value: string) => value.split('\n').filter(x => !!x)))
        .toPromise();

      words
        .filter(word => !includes(excludedWords, word))
        .forEach(word => {
          const base = { word };
          const value = assertionValue(hunspell, word);
          expect({ ...base, value }).toEqual({ ...base, value: expected });
        });
    };

    it(`${path.basename(fixture)} when mount directory`, async () => {
      const { hunspell, dispose } = mountDirHunspell(hunspellFactory, dirPath, fixture);
      await runAssert(hunspell);
      dispose();
    });

    it(`${path.basename(fixture)} when mount directory with asmjs`, async () => {
      const { hunspell, dispose } = mountDirHunspell(hunspellAsmFactory, dirPath, fixture);
      await runAssert(hunspell);
      dispose();
    });

    it(`${path.basename(fixture)} when mount buffer`, async () => {
      const { hunspell, dispose } = await mountBufferHunspell(hunspellFactory, dirPath, fixture);
      await runAssert(hunspell);
      dispose();
    });

    it(`${path.basename(fixture)} when mount buffer with asmjs`, async () => {
      const { hunspell, dispose } = await mountBufferHunspell(hunspellAsmFactory, dirPath, fixture);
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
    fixtureList
      .filter(x => !includes(['1463589', 'i54633', 'map'], x))
      .forEach(fixture => {
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
            .pipe(map((value: string) => value.split('\n').filter(x => !!x)))
            .toPromise();

          const suggested: Array<string | Array<string>> = [];
          //run suggestion, construct results into Array<string|Array<string>>
          words
            .filter(word => !includes(excludedWords, word))
            .forEach(word => {
              const ret = hunspell.suggest(word);
              if (ret.length > 0) {
                suggested.push(ret.length > 1 ? ret : ret[0]);
              }
            });

          //fixture should equal to actual suggestion
          expect(suggested).toEqual(suggestions);
        };

        it(`${path.basename(fixture)} when mount directory`, async () => {
          const { hunspell, dispose } = mountDirHunspell(hunspellFactory, baseFixturePath, fixture);
          await runAssert(hunspell);
          dispose();
        });

        it(`${path.basename(fixture)} when mount directory with asmjs`, async () => {
          const { hunspell, dispose } = mountDirHunspell(hunspellAsmFactory, baseFixturePath, fixture);
          await runAssert(hunspell);
          dispose();
        });

        it(`${path.basename(fixture)} when mount buffer`, async () => {
          const { hunspell, dispose } = await mountBufferHunspell(hunspellFactory, baseFixturePath, fixture);
          await runAssert(hunspell);
          dispose();
        });

        it(`${path.basename(fixture)} when mount buffer with asmjs`, async () => {
          const { hunspell, dispose } = await mountBufferHunspell(hunspellAsmFactory, baseFixturePath, fixture);
          await runAssert(hunspell);
          dispose();
        });
      });
  });

  describe('add words or dictionary in runtime', () => {
    const getHunspell = (buffer: boolean) =>
      (buffer ? mountBufferHunspell : mountDirHunspell)(hunspellFactory, baseFixturePath, 'base');

    it.each([true, false])(
      'should able to add new dictionary into existing dictionary (useBufferMount: %s)',
      async (useBuffer: boolean) => {
        const { hunspell, dispose, read } = await getHunspell(useBuffer);

        expect(hunspell.spell('foo')).toBe(false);

        if (useBuffer) {
          hunspell.addDictionary(await read(path.join(baseFixturePath, 'break.dic')));
        } else {
          hunspell.addDictionary(read('break.dic'));
        }

        expect(hunspell.spell('foo')).toBe(true);
        dispose();
      }
    );

    it.each([true, false])(
      'should able to add new word into existing dictionary (useBufferMount: %s)',
      async (useBuffer: boolean) => {
        const { hunspell, dispose } = await getHunspell(useBuffer);

        expect(hunspell.spell('nonexistword')).toBe(false);

        hunspell.addWord('nonexistword');
        expect(hunspell.spell('nonexistword')).toBe(true);

        dispose();
      }
    );

    it.each([true, false])(
      'should able to add new word with affix into existing dictionary (useBufferMount: %s)',
      async (useBuffer: boolean) => {
        const { hunspell, dispose } = await getHunspell(useBuffer);

        expect(hunspell.spell('tre')).toBe(false);

        hunspell.addWordWithAffix('tre', 'uncreate');

        expect(hunspell.spell('tre')).toBe(true);
        expect(hunspell.spell('trive')).toBe(true);

        dispose();
      }
    );

    it.each([true, false])(
      'should able to remove word from existing dictionary (useBufferMount: %s)',
      async (useBuffer: boolean) => {
        const { hunspell, dispose } = await getHunspell(useBuffer);

        expect(hunspell.spell('seven')).toBe(true);

        hunspell.removeWord('seven');
        expect(hunspell.spell('seven')).toBe(false);

        dispose();
      }
    );
  });
});
