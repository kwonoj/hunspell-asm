import { getModuleLoader as getModuleLoaderMock, isNode } from 'emscripten-wasm-loader';
import * as hunspellMock from '../../src/lib/node/hunspell';
import { loadModule } from '../../src/loadModule';

jest.mock('../../src/lib/node/hunspell', () => jest.fn());
jest.mock('emscripten-wasm-loader', () => ({
  isWasmEnabled: jest.fn(),
  isNode: jest.fn(),
  getModuleLoader: jest.fn(),
  mountBuffer: jest.fn(),
  unmount: jest.fn()
}));

const getModuleMock = () => ({
  cwrap: jest.fn(),
  FS: { mkdir: jest.fn() },
  Runtime: jest.fn(),
  getValue: jest.fn(),
  UTF8ToString: jest.fn()
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
});
