export type spellCheckerFactory = (dictionaryPath: string) => Hunspell;

export interface Hunspell {
  spell(word: string): boolean;
  suggest(word: string): Array<string>;
  dispose(): void;
}