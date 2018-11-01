import { expect } from 'chai';
import { getModuleLoader as getModuleLoaderMock, isNode } from 'emscripten-wasm-loader';
import { loadModule } from '../../src/loadModule';

jest.mock('../../src/lib/hunspell_web.wasm', () => jest.fn(), { virtual: true });
jest.mock('../../src/lib/hunspell_web', () => jest.fn(), { virtual: true });
jest.mock('../../src/lib/hunspell_node', () => jest.fn(), { virtual: true });
jest.mock('emscripten-wasm-loader', () => ({
  isWasmEnabled: jest.fn(),
  isNode: jest.fn(),
  getModuleLoader: jest.fn(),
  ENVIRONMENT: {
    WEB: 'WEB',
    NODE: 'NODE'
  }
}));

const webhunspellMock = require('../../src/lib/hunspell_web'); //tslint:disable-line:no-require-imports no-var-requires
const nodehunspellMock = require('../../src/lib/hunspell_node'); //tslint:disable-line:no-require-imports no-var-requires

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

    expect((getModuleLoaderMock as jest.Mock).mock.calls[0][1]).to.equal(webhunspellMock);
  });

  it('should create module on node', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(true);

    (getModuleLoaderMock as jest.Mock).mockReturnValueOnce(mockModuleLoader);
    await loadModule();

    expect((getModuleLoaderMock as jest.Mock).mock.calls[0][1]).to.equal(nodehunspellMock);
  });

  it('should use lookupBinary on browser', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(false);
    (getModuleLoaderMock as jest.Mock).mockReturnValueOnce(mockModuleLoader);
    await loadModule({ locateBinary: () => 'dummy' });

    expect((getModuleLoaderMock as jest.Mock).mock.calls[0][2].locateFile('test.wasm')).to.equal('dummy');
  });

  it('should use lookupBinary on node', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(true);

    (getModuleLoaderMock as jest.Mock).mockReturnValueOnce(mockModuleLoader);
    await loadModule({ locateBinary: () => 'dummy' });

    const { locateFile } = (getModuleLoaderMock as jest.Mock).mock.calls[0][2];
    expect(locateFile('test.wasm')).to.equal('dummy');
  });

  it('should not override path for wasm binary on node', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(true);

    (getModuleLoaderMock as jest.Mock).mockImplementationOnce((cb: Function) => {
      cb(getModuleMock());
      return mockModuleLoader;
    });
    await loadModule();

    expect((getModuleLoaderMock as jest.Mock).mock.calls[0][2]).to.be.undefined;
  });

  it('should override path for wasm binary on browser', async () => {
    const mockModuleLoader = jest.fn();
    (isNode as jest.Mock).mockReturnValue(false);

    (getModuleLoaderMock as jest.Mock).mockImplementationOnce((cb: Function) => {
      cb(getModuleMock());
      return mockModuleLoader;
    });
    await loadModule();

    const { locateFile } = (getModuleLoaderMock as jest.Mock).mock.calls[0][2];

    //tslint:disable-next-line:no-require-imports no-var-requires
    expect(locateFile('cld3_web.wasm')).to.deep.equal(require('../../src/lib/hunspell_web.wasm'));
    expect(locateFile('other.wast')).to.equal('other.wast');
  });
});
