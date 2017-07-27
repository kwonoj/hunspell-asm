import { Hunspell } from './Hunspell';
/**
 * Interface for factory function for mounting files into wasm filesystem
 * and creating hunspell instance.
 *
 */
export interface HunspellFactory {
  /**
   * (Node.js only) Mount physical directory into hunspell loader's in-memory filesystem path.
   * Once it's mounted, hunspell can access physical file with generated in-memory path.
   *
   * @param {string} dirPath Absoulte path to directory to mount.
   *
   * @return {string} In-memory mounted path for given phsysical path.
   *                  This path uses unix separator *regardless of platform*
   */
  mountDirectory: (dirPath: string) => string;
  /**
   * Mount a file into hunspell loader's in-memory filesystem path.
   *
   * @param {ArrayBufferView} contents Contents of file to be mounted.
   * @param {string} [fileName] Name of file. If not specified, will be generated randomly.
   *
   * @return {string} Path to in-memory mounted file.
   *                  This path uses unix separator *regardless of platform*
   */
  mountBuffer: (contents: ArrayBufferView, fileName?: string) => string;
  /**
   * Unmount file / path from in-memory filesystem.
   * If given path is physical directory path, it'll be simply unmounted.
   * If given path is in-memory file mounted via `mountBuffer`, it'll be removed.
   *
   * @param {string} mountedFilePath path to unmount
   */
  unmount: (mountedFilePath: string) => void;

  /**
   * Creates new hunspell dictionary instance.
   *
   * @param {string} affPath In-memory file path to aff file. Path should use unix separator.
   * @param {string} dictPath In-memory file path to dic file. Path should use unix separator.
   *
   * @return {Hunspell} Hunspell dictionary instance created.
   */
  create: (affPath: string, dictPath: string) => Hunspell;
}
