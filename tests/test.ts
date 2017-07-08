import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { loadModule } from '../src';
import { Hunspell } from '../src/Hunspell';

const correctAssertionExclude = [
  `�r`, `�ram`, `�rach`
];

const readdir: (path: string) => Promise<Array<string>> = util.promisify(fs.readdir) as any;
const exists: (path: string) => Promise<boolean> = util.promisify(fs.exists) as any;
const readFile: (path: string, encoding: string) => Promise<string> = util.promisify(fs.readFile) as any;

const basePath = path.join(__dirname, 'fixtures');

const getFixtureList = async () =>
  (await readdir(basePath)).filter((file) => path.extname(file) === '.dic').map((file) => path.basename(file, '.dic'));

const runCorrectAssertion = async (hunspell: Hunspell, fixture: string) => {
  const fixtureSetupFile = path.join(basePath, `${fixture}.good`);
  const exist = await exists(fixtureSetupFile);
  if (!exist) {
    return;
  }

  const assertions = (await readFile(fixtureSetupFile, 'utf-8')).split('\n').filter((x) => !!x);
  assertions.filter((word) => !(correctAssertionExclude as any).includes(word)).forEach((word) => {
    const expectedOutput = `${fixtureSetupFile} - ${word}: true`;
    expect(expectedOutput).to.be.equal(`${fixtureSetupFile} - ${word}: ${hunspell.spell(word)}`);
  });
};

/*const runIncorrectAssertion = (_fixture: string) => {
  //noop
};

const runSuggestionAssertion = (_fixture: string) => {
  //noop
};*/

const runner = async () => {
  const loader = await loadModule();
  const fixtures = await getFixtureList();

  fixtures.forEach(async (fixture) => {
    const hunspell = loader(`${basePath}/${fixture}.dic`);

    await runCorrectAssertion(hunspell, fixture);

    //runIncorrectAssertion(fixture);
    //runSuggestionAssertion(fixture);

    hunspell.dispose();
  });
};

runner();