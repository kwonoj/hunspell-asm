import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as Rx from 'rxjs';
import { loadModule } from '../../src';
import { Hunspell } from '../../src/Hunspell';

const readFile = Rx.Observable.bindNodeCallback(fs.readFile);
/**
 * There are some sets of test around extended ascii chars, utf-ignored chars - we'll excluded those test cases.
 */
const excludedWords = [`apéritif	`, `APÉRITIF	`, `�o��o�`, `k�nnysz�m�t�s`, `hossznyel�s`, `v�zszer`,
  `m��ig`, `M��ig`, `M�SSIG`, `Aussto�`, `Absto�.`, `Au�enabmessung`, `Prozessionsstra�e`, `Au�enma�e`,
  `�r`, `�ram`, `�rach`, `�diter`,
  `c�ur`, `�uvre`, `C�UR`, `�UVRE`,
  `طير	`, `فتحة	`, `ضمة	`, `كسرة	`, `فتحتان	`, `ضمتان	`, `كسرتان	`, `شدة	`, `سكون	`, `𐏑	`, `𐏒	`, `𐏒𐏑	`, `𐏒𐏒	`];

/**
 * Iterate fixture directory, returns array of test for specified type.
 * @param fixturePath path to fixture
 * @param testType type of test by fixture extension. `good` is for matched spell, `wrong` for misspell, `sug` for suggestion.
 */
const getFixtureList = (fixturePath: string, testType: '.good' | '.wrong' | '.sug') =>
  fs.readdirSync(fixturePath).filter((file) => path.extname(file) === testType).map((file) => path.basename(file, testType));

describe('hunspell', async () => {
  //setting up path to fixture
  const baseFixturePath = path.join(__dirname, '../__fixtures__');
  let moduleLoader: (dictionaryPath: string) => Hunspell;

  //load module one time before test begins
  beforeAll(async (done) => {
    moduleLoader = await loadModule();
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
  const assert = (fixture: string, testType: '.good' | '.wrong' | '.sug',
                  assertionValue: (hunspell: Hunspell, word: string) => any, expected: any) => {
    it(`${path.basename(fixture)}`, async () => {
      const hunspell = moduleLoader(`${fixture}.dic`);
      const words: Array<string> =
        await ((readFile as any)(`${fixture}${testType}`, 'utf-8').map((value: string) => value.split('\n').filter(x => !!x)).toPromise());

      words.filter(word => !excludedWords.includes(word)).forEach(word => {
        const base = { word };
        const value = assertionValue(hunspell, word);
        expect({ ...base, value }).to.deep.equal({ ...base, value: expected });
      });

      hunspell.dispose();
    });
  };

  describe('should match correct word', () => {
    const fixtureList = getFixtureList(baseFixturePath, '.good');
    fixtureList.filter(x => x !== 'morph')
      .forEach(fixture => assert(path.join(baseFixturePath, `${fixture}`), '.good', (hunspell: Hunspell, word: string) => hunspell.spell(word), true));
  });

  describe('should match missplled word', () => {
    const fixtureList = getFixtureList(baseFixturePath, '.wrong');
    fixtureList
      .forEach(fixture => assert(path.join(baseFixturePath, `${fixture}`), '.wrong', (hunspell: Hunspell, word: string) => hunspell.spell(word), false));
  });
});