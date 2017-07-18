export interface Hunspell {
  dispose: () => void;
  spell: (word: string) => boolean;
  suggest: (word: string) => Array<string>;
}

export interface HunspellFactory {
  mountDirectory: (dirPath: string) => string;
  mountBuffer: (contents: ArrayBufferView, fileName?: string) => string;
  unmount: (mountedFilePath: string) => void;

  create: (affPath: string, dictPath: string) => Hunspell;
}
