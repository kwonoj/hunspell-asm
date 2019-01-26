import { ENVIRONMENT, getModuleLoader, isNode, runtimeModuleType } from 'emscripten-wasm-loader';
import { HunspellAsmModule } from './HunspellAsmModule';
import { HunspellFactory } from './HunspellFactory';
import { hunspellLoader } from './hunspellLoader';
import { log } from './util/logger';

const createModuleLoader = async (
  {
    timeout,
    locateBinary,
    environment
  }: Partial<{
    timeout: number;
    locateBinary: (filePath: string) => string | object;
    environment?: ENVIRONMENT;
  }> = {},
  runtime: runtimeModuleType
) => {
  const env = environment ? environment : isNode() ? ENVIRONMENT.NODE : ENVIRONMENT.WEB;

  log(`module loader configured`, { env, timeout });

  //https://github.com/kwonoj/docker-hunspell-wasm/issues/63
  //Build module object to construct wasm binary module via emscripten preamble.
  //apply overridden environment values to custom patched hunspell preamble.
  const overriddenModule = { locateFile: locateBinary, ENVIRONMENT: env };

  const moduleLoader = await getModuleLoader<HunspellFactory, HunspellAsmModule>(
    (runtime: HunspellAsmModule) => hunspellLoader(runtime, env),
    runtime,
    overriddenModule,
    { timeout }
  );

  return moduleLoader();
};

export { createModuleLoader };
