import { expect } from 'chai';
import { ENVIRONMENT } from 'emscripten-wasm-loader';
import * as nanoid from 'nanoid';
import { HunspellAsmModule } from '../../src/HunspellAsmModule';
import { HunspellFactory } from '../../src/HunspellFactory';
import { hunspellLoader } from '../../src/hunspellLoader';
import { mountBuffer } from '../../src/mountBuffer';
import { mountDirectory } from '../../src/mountDirectory';
import { unmount } from '../../src/unmount';
import { wrapHunspellInterface } from '../../src/wrapHunspellInterface';

jest.mock('../../src/mountDirectory');
jest.mock('../../src/mountBuffer');
jest.mock('../../src/unmount');
jest.mock('../../src/wrapHunspellInterface');
jest.mock('nanoid');

const getAsmModule = () => ({
  cwrap: jest.fn(),
  FS: {
    mkdir: jest.fn()
  }
});

describe('hunspellLoader', () => {
  it('should generate root path for mounting memory buffer file', () => {
    const dummyNanoid = 'meh';
    const asmModule = getAsmModule();
    (nanoid as jest.Mock<any>).mockReturnValueOnce(dummyNanoid);
    hunspellLoader(asmModule as any, ENVIRONMENT.NODE);

    const mkdirMock = asmModule.FS.mkdir.mock;
    expect(mkdirMock.calls.length).to.gte(1);
    expect(mkdirMock.calls[0][0]).to.equal(`/${dummyNanoid}`);
  });

  it('should generate root path for mounting phsyical directory', () => {
    let idCount = 0;
    const asmModule = getAsmModule();
    (nanoid as jest.Mock<any>).mockImplementation(() => `meh${++idCount}`);
    hunspellLoader(asmModule as any, ENVIRONMENT.NODE);

    const mkdirMock = asmModule.FS.mkdir.mock;
    expect(mkdirMock.calls).to.have.lengthOf(2);
    expect(mkdirMock.calls).to.deep.equal([['/meh1'], ['/meh2']]);
  });

  it('should not generate root path for phsyical directory if envoironment is not node', () => {
    let idCount = 0;
    const asmModule = getAsmModule();
    (nanoid as jest.Mock<any>).mockImplementation(() => `meh${++idCount}`);
    hunspellLoader(asmModule as any, ENVIRONMENT.WEB);

    const mkdirMock = asmModule.FS.mkdir.mock;
    expect(mkdirMock.calls).to.have.lengthOf(1);
    expect(mkdirMock.calls).to.deep.equal([['/meh1']]);
  });

  it('should return HunspellFactory instance', () => {
    const asmModule = getAsmModule();
    const value = hunspellLoader(asmModule as any, ENVIRONMENT.NODE);

    expect(value).to.be.a('object');
    expect(Object.keys(value)).to.deep.equal(['mountDirectory', 'mountBuffer', 'unmount', 'create']);
  });
});

describe('HunspellFactory', () => {
  let hunspellFactory: HunspellFactory;
  let asmModule: HunspellAsmModule;
  let mountDirMock: jest.Mock<any>;
  let mountBufferMock: jest.Mock<any>;
  let unmountMock: jest.Mock<any>;
  let mockHunspellInterface: {
    create: jest.Mock<any>;
    spell: jest.Mock<any>;
    suggest: jest.Mock<any>;
    free_list: jest.Mock<any>;
    destroy: jest.Mock<any>;
  };

  beforeAll(() => {
    jest.resetAllMocks();

    let mockIdCount = 0;
    (nanoid as jest.Mock<any>).mockImplementation(() => `${++mockIdCount}`);
  });

  beforeEach(() => {
    mountDirMock = jest.fn();
    (mountDirectory as jest.Mock<any>).mockImplementationOnce(() => mountDirMock);

    mountBufferMock = jest.fn();
    (mountBuffer as jest.Mock<any>).mockImplementationOnce(() => mountBufferMock);

    unmountMock = jest.fn();
    (unmount as jest.Mock<any>).mockImplementationOnce(() => unmountMock);

    mockHunspellInterface = {
      create: jest.fn(),
      spell: jest.fn(),
      suggest: jest.fn(),
      free_list: jest.fn(),
      destroy: jest.fn()
    };

    (wrapHunspellInterface as jest.Mock<any>).mockImplementationOnce(() => mockHunspellInterface);

    asmModule = {
      cwrap: jest.fn(),
      stackAlloc: jest.fn(() => 1111), //dummy ptr number
      stackSave: jest.fn(),
      stackRestore: jest.fn(),
      FS: {
        mkdir: jest.fn()
      },
      getValue: jest.fn(),
      stringToUTF8: jest.fn(),
      Pointer_stringify: jest.fn()
    } as any;

    hunspellFactory = hunspellLoader(asmModule, ENVIRONMENT.NODE);
  });

  it('should export mount functions', () => {
    expect((mountBuffer as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    expect((mountBuffer as jest.Mock<any>).mock.calls[0]).to.deep.equal([asmModule.FS, '/1']);

    expect((mountDirectory as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    expect((mountDirectory as jest.Mock<any>).mock.calls[0]).to.deep.equal([asmModule.FS, '/2', ENVIRONMENT.NODE]);

    expect((unmount as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    expect((unmount as jest.Mock<any>).mock.calls[0]).to.deep.equal([asmModule.FS, '/1']);

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
      expect((asmModule.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
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
      expect((asmModule.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
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
      expect((asmModule.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    });

    it('should return empty array if suggestion list is empty', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.suggest.mockReturnValueOnce(0);

      expect(hunspell.suggest('empty')).to.be.empty;

      //empty suggestion still have allocated ptr, need to be freed
      expect(mockHunspellInterface.free_list.mock.calls).to.have.lengthOf(1);

      //should preserve stack after allocating string internally
      expect((asmModule.stackSave as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
      expect((asmModule.stackRestore as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    });
  });
});
