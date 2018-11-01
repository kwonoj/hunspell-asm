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
   * @returns {boolean} false for misspelled, true otherwise.
   */
  spell: (word: string) => boolean;

  /**
   * Get suggestion list for given word using current hunspell instance.
   * This'll return suggestion list only if word is misspelled one, otherwise
   * returns empty array.
   */
  suggest: (word: string) => Array<string>;

  /**
   * Load additional dictionaries into existing hunspell instance.
   * This only loads dictionaries, cannot load affix.
   *
   * @param {string} dictPath In-memory file path to dic file. Path should use unix separator.
   *
   * @return {boolean} false if internal available slot for dict are full and can't add any more.
   */
  addDictionary: (dictPath: string) => boolean;

  /**
   * Add word to the run-time dictionary
   */
  addWord: (word: string) => void;

  /**
   * Add word to the run-time dictionary with affix flags of
   * the example (a dictionary word): Hunspell will recognize
   * affixed forms of the new word, too.
   */
  addWordWithAffix: (word: string, affix: string) => void;

  /**
   * Remove word from the run-time dictionary.
   */
  removeWord: (word: string) => void;
}
