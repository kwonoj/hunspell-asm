import { expect } from 'chai';
import { ENVIRONMENT } from 'emscripten-wasm-loader';
import { HunspellAsmModule } from '../../src/HunspellAsmModule';
import { HunspellFactory } from '../../src/HunspellFactory';
//tslint:disable-next-line:no-require-imports
import hunspellLoaderType = require('../../src/hunspellLoader');

describe('hunspellLoader', () => {
  let hunspellLoader: typeof hunspellLoaderType.hunspellLoader;
  let asmModule: HunspellAsmModule;
  let nanoidMock: jest.Mock<any>;
  let mkdirMock: jest.Mock<any>;

  beforeEach(() => {
    jest.mock('../../src/mountDirectory');
    jest.mock('../../src/mountBuffer');
    jest.mock('../../src/unmount');
    jest.mock('nanoid');
    //tslint:disable-next-line:no-require-imports
    nanoidMock = require('nanoid');
    mkdirMock = jest.fn();

    asmModule = {
      cwrap: jest.fn(),
      FS: {
        mkdir: mkdirMock
      }
    } as any;

    //tslint:disable-next-line:no-require-imports
    hunspellLoader = require('../../src/hunspellLoader').hunspellLoader;
  });

  it('should generate root path for mounting memory buffer file', () => {
    const dummyNanoid = 'meh';
    nanoidMock.mockReturnValueOnce(dummyNanoid);
    hunspellLoader(asmModule, ENVIRONMENT.NODE);

    expect(mkdirMock.mock.calls.length).to.gte(1);
    expect(mkdirMock.mock.calls[0][0]).to.equal(`/${dummyNanoid}`);
  });

  it('should generate root path for mounting phsyical directory', () => {
    let idCount = 0;
    nanoidMock.mockImplementation(() => `meh${++idCount}`);
    hunspellLoader(asmModule, ENVIRONMENT.NODE);

    expect(mkdirMock.mock.calls).to.have.lengthOf(2);
    expect(mkdirMock.mock.calls).to.deep.equal([['/meh1'], ['/meh2']]);
  });

  it('should not generate root path for phsyical directory if envoironment is not node', () => {
    let idCount = 0;
    nanoidMock.mockImplementation(() => `meh${++idCount}`);
    hunspellLoader(asmModule, ENVIRONMENT.WEB);

    expect(mkdirMock.mock.calls).to.have.lengthOf(1);
    expect(mkdirMock.mock.calls).to.deep.equal([['/meh1']]);
  });

  it('should return HunspellFactory instance', () => {
    const value = hunspellLoader(asmModule, ENVIRONMENT.NODE);

    expect(value).to.be.a('object');
    expect(Object.keys(value)).to.deep.equal(['mountDirectory', 'mountBuffer', 'unmount', 'create']);
  });
});

describe('HunspellFactory', () => {
  let hunspellFactory: HunspellFactory;
  let asmModule: HunspellAsmModule;
  let mountDirMock: jest.Mock<any>;
  let mockMountDirFactory: jest.Mock<any>;
  let mountBufferMock: jest.Mock<any>;
  let mockMountBufferFactory: jest.Mock<any>;
  let unmountMock: jest.Mock<any>;
  let mockUnmountFactory: jest.Mock<any>;
  let mockHunspellInterface: {
    create: jest.Mock<any>;
    spell: jest.Mock<any>;
    suggest: jest.Mock<any>;
    free_list: jest.Mock<any>;
    destroy: jest.Mock<any>;
  };

  beforeEach(() => {
    let mockIdCount = 0;
    mountDirMock = jest.fn();
    mockMountDirFactory = jest.fn(() => mountDirMock);
    jest.mock('../../src/mountDirectory', () => ({ mountDirectory: mockMountDirFactory }));

    mountBufferMock = jest.fn();
    mockMountBufferFactory = jest.fn(() => mountBufferMock);
    jest.mock('../../src/mountBuffer', () => ({ mountBuffer: mockMountBufferFactory }));

    unmountMock = jest.fn();
    mockUnmountFactory = jest.fn(() => unmountMock);
    jest.mock('../../src/unmount', () => ({ unmount: mockUnmountFactory }));
    jest.mock('nanoid', () => jest.fn(() => `${++mockIdCount}`));

    mockHunspellInterface = {
      create: jest.fn(),
      spell: jest.fn(),
      suggest: jest.fn(),
      free_list: jest.fn(),
      destroy: jest.fn()
    };

    jest.mock('../../src/wrapHunspellInterface', () => ({ wrapHunspellInterface: () => mockHunspellInterface }));

    asmModule = {
      Runtime: {
        stackAlloc: jest.fn(() => 1111), //dummy ptr number
        stackSave: jest.fn(),
        stackRestore: jest.fn()
      },
      FS: {
        mkdir: jest.fn()
      },
      getValue: jest.fn(),
      stringToUTF8: jest.fn(),
      Pointer_stringify: jest.fn()
    } as any;

    //tslint:disable-next-line:no-require-imports
    hunspellFactory = require('../../src/hunspellLoader').hunspellLoader(asmModule, ENVIRONMENT.NODE);
  });

  it('should export mount functions', () => {
    expect(mockMountBufferFactory.mock.calls).to.have.lengthOf(1);
    expect(mockMountBufferFactory.mock.calls[0]).to.deep.equal([asmModule.FS, '/1']);

    expect(mockMountDirFactory.mock.calls).to.have.lengthOf(1);
    expect(mockMountDirFactory.mock.calls[0]).to.deep.equal([asmModule.FS, '/2', ENVIRONMENT.NODE]);

    expect(mockUnmountFactory.mock.calls).to.have.lengthOf(1);
    expect(mockUnmountFactory.mock.calls[0]).to.deep.equal([asmModule.FS, '/1']);

    expect(hunspellFactory.mountBuffer).to.equal(mountBufferMock);
    expect(hunspellFactory.mountDirectory).to.equal(mountDirMock);
    expect(hunspellFactory.unmount).to.equal(unmountMock);
  });

  it('should create hunspell instance', () => {
    hunspellFactory.create('aff', 'dic');

    expect(mockHunspellInterface.create.mock.calls).to.have.lengthOf(1);
  });

  describe('Hunspell', () => {
    it('should destroy when dispose', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      hunspell.dispose();

      expect(mockHunspellInterface.destroy.mock.calls).to.have.lengthOf(1);
    });

    it('should return true if spell is correct', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.spell.mockReturnValueOnce(1);

      expect(hunspell.spell('correct')).to.be.true;
      expect(mockHunspellInterface.spell.mock.calls).to.have.lengthOf(1);

      expect((asmModule.stringToUTF8 as jest.Mock<any>).mock.calls[2]).to.deep.equal([
        'correct',
        1111,
        (`correct`.length << 2) + 1
      ]);

      //should preserve stack after allocating string internally
      expect((asmModule.Runtime.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.Runtime.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    });

    it('should return true if spell is incorrect', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.spell.mockReturnValueOnce(0);

      expect(hunspell.spell('incorrect')).to.be.false;
      expect(mockHunspellInterface.spell.mock.calls).to.have.lengthOf(1);

      expect((asmModule.stringToUTF8 as jest.Mock<any>).mock.calls[2]).to.deep.equal([
        'incorrect',
        1111,
        (`incorrect`.length << 2) + 1
      ]);

      //should preserve stack after allocating string internally
      expect((asmModule.Runtime.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.Runtime.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    });

    it('should suggest word for misspelled', () => {
      const suggestion = ['word1', 'word2'];
      let count = 0;
      (asmModule.Pointer_stringify as jest.Mock<any>).mockImplementation(() => suggestion[count++]);

      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.suggest.mockReturnValueOnce(2);

      const suggested = hunspell.suggest('word');
      expect(suggested).to.have.lengthOf(2);
      expect(suggested).to.deep.equal(suggestion);

      expect(mockHunspellInterface.free_list.mock.calls).to.have.lengthOf(1);

      //should preserve stack after allocating string internally
      expect((asmModule.Runtime.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.Runtime.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    });

    it('should return empty array if suggestion list is empty', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.suggest.mockReturnValueOnce(0);

      expect(hunspell.suggest('empty')).to.be.empty;

      //empty suggestion still have allocated ptr, need to be freed
      expect(mockHunspellInterface.free_list.mock.calls).to.have.lengthOf(1);

      //should preserve stack after allocating string internally
      expect((asmModule.Runtime.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.Runtime.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    });
  });
});
