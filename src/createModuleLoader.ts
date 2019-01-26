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

  //tslint:disable-next-line:no-require-imports no-var-requires
  const lookupBinary = locateBinary || ((_filePath: string) => require('./lib/hunspell.wasm'));

  //https://github.com/kwonoj/docker-hunspell-wasm/issues/63
  //apply overridden environment values to custom patched hunspell preamble.
  const baseModule = { ENVIRONMENT: env };

  //Build module object to construct wasm binary module via emscripten preamble.
  //This allows to override default wasm binary resolution in preamble.
  //By default, hunspell-asm overrides to direct require to binary on *browser* environment to allow bundler like webpack resolves it.
  //On node, it relies on default resolution logic.
  const overriddenModule =
    env === ENVIRONMENT.NODE && !locateBinary
      ? baseModule
      : {
          ...baseModule,
          locateFile: (filePath: string) => (filePath.endsWith('.wasm') ? lookupBinary(filePath) : filePath)
        };

  const moduleLoader = await getModuleLoader<HunspellFactory, HunspellAsmModule>(
    (runtime: HunspellAsmModule) => hunspellLoader(runtime, env),
    runtime,
    overriddenModule,
    { timeout }
  );

  return moduleLoader();
};

export { createModuleLoader };
