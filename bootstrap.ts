/*tslint:disable:no-console*/

/**
 * Script to download hunspell wasm binary from https://github.com/kwonoj/docker-hunspell-wasm.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { exec, mkdir, rm } from 'shelljs';
import { promisify } from 'util';
//tslint:disable-next-line: no-require-imports no-var-requires
const { config } = require('./package.json');

// Package.json defines `hunspell-version` under `config` section to find corresponding release version
const version = config['hunspell-version'];
const readFile = promisify(fs.readFile);
const asyncExec = promisify(exec);

/**
 * Generate sha512 checksum from given string.
 */
const getChecksum = (content: string) =>
  crypto
    .createHash('sha512')
    .update(content, 'utf8')
    .digest('hex');

/**
 * Download file, and corresponding checksum from release.
 */
const download = async (url: string, fileName: string, dest: string) => {
  await asyncExec(`wget --directory-prefix=${dest} ${url}`);
  const { stdout } = exec(`wget -qO- ${url}.sha512`);
  const sha = stdout.slice(0, stdout.indexOf(' '));

  const downloadedContent = await readFile(path.join(dest, fileName), { encoding: 'utf-8' });
  return {
    downloadedContent,
    sha
  };
};

/**
 * Main script execution
 */
(async () => {
  console.log(`Downloading hunspell wasm binary version '${version}'`);

  const libPath = path.resolve('./src/lib');
  const fileName = 'hunspell.js';
  const url = `https://github.com/kwonoj/docker-hunspell-wasm/releases/download/${version}/${fileName}`;

  // Clear existing path and recreate, always redownload new binary
  rm('-rf', libPath);
  mkdir(libPath);

  // Download file, validate checksum
  const { downloadedContent, sha } = await download(url, fileName, libPath);
  const fileChecksum = getChecksum(downloadedContent);

  if (fileChecksum !== sha) {
    rm('-rf', libPath);
    throw new Error(
      `Hash mismatch between release '${sha}' and actual download ${fileChecksum}, cannot complete bootstrap`
    );
  }
})();
