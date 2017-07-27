/**
 * Interface for hunspell spellchecker.
 *
 */
export interface Hunspell {
  /**
   * Dispose current instance.
   * This should be called to free object created via `HunspellFactory::create`
   * once it's not being used anymore.
   *
   */
  dispose: () => void;

  /**
   * Check spell for given word using current hunspell instance.
   *
   */
  spell: (word: string) => boolean;

  /**
   * Get suggestion list for given word using current hunspell instance.
   * This'll return suggestion list only if word is misspelled one, otherwise
   * returns empty array.
   */
  suggest: (word: string) => Array<string>;
}
