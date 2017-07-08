import { spellCheckerFactory } from './Hunspell';

export interface HunspellAsmModule {
  cwrap: (fn: string, returnType: string, parameterType: Array<string>) => void;
}

export const hunspellLoader = (_asmModule: HunspellAsmModule): spellCheckerFactory => {
  //const { cwrap } = asmModule;

  //Hunhandle* Hunspell_create(const char* affpath, const char* dpath);
  //const hunspell_create = cwrap('Hunspell_create', 'number', ['number', 'number']);
  //const huspell_spell = null;
  //const hunspell_suggest = null;

  return (_dictionaryPath: string) => {
    const suggest = (_word: string) => [];
    const spell = (_word: string) => false;
    const dispose = () => {
      //noop
    };

    return {
      suggest,
      spell,
      dispose
    };
  };
};