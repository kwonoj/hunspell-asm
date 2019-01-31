import { ENVIRONMENT, getModuleLoader as getModuleLoaderMock, isNode } from 'emscripten-wasm-loader';
import { loadModule } from '../../src/loadModule';

jest.mock('../../src/lib/hunspell-asm', () => jest.fn(), { virtual: true });
jest.mock('emscripten-wasm-loader', () => ({
  isWasmEnabled: jest.fn(),
  isNode: jest.fn(),
  getModuleLoader: jest.fn(),
  ENVIRONMENT: {
    WEB: 'WEB',
    NODE: 'NODE'
  }
}));

const hunspellMock = require('../../src/lib/hunspell-asm'); //tslint:disable-line:no-require-imports no-var-requires

const getModuleMock = () => ({
  cwrap: jest.fn(),
  FS: { mkdir: jest.fn() },
  Runtime: jest.fn(),
  getValue: jest.fn(),
  Pointer_stringify: jest.fn()
});

describe('loadModule', () => {
  it('should create moduleLoader on browser', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(false);

    (getModuleLoaderMock as jest.Mock).mockImplementationOnce((cb: Function) => {
      cb(getModuleMock());
      return mockModuleLoader;
    });
    await loadModule();

    expect((getModuleLoaderMock as jest.Mock).mock.calls[0][1]).toEqual(hunspellMock);
  });

  it('should create module on node', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(true);

    (getModuleLoaderMock as jest.Mock).mockReturnValueOnce(mockModuleLoader);
    await loadModule();

    expect((getModuleLoaderMock as jest.Mock).mock.calls[0][1]).toEqual(hunspellMock);
  });

  it('should not override path for wasm binary on node', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(true);

    (getModuleLoaderMock as jest.Mock).mockImplementationOnce((cb: Function) => {
      cb(getModuleMock());
      return mockModuleLoader;
    });
    await loadModule();

    expect((getModuleLoaderMock as jest.Mock).mock.calls[0][2]).toEqual({ ENVIRONMENT: ENVIRONMENT.NODE });
  });
});
