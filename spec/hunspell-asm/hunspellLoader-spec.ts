import * as nanoid from 'nanoid';
import { HunspellAsmModule } from '../../src/HunspellAsmModule';
import { HunspellFactory } from '../../src/HunspellFactory';
import { hunspellLoader } from '../../src/hunspellLoader';
import { mountBuffer } from '../../src/mountBuffer';
import { unmount } from '../../src/unmount';
import { wrapHunspellInterface } from '../../src/wrapHunspellInterface';

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
    hunspellLoader(asmModule as any);

    const mkdirMock = asmModule.FS.mkdir.mock;
    expect(asmModule.FS.mkdir).toHaveBeenCalledTimes(1);
    expect(mkdirMock.calls[0][0]).toEqual(`/${dummyNanoid}`);
  });

  it('should generate root path for mounting phsyical directory', () => {
    let idCount = 0;
    const asmModule = getAsmModule();
    (nanoid as jest.Mock<any>).mockImplementation(() => `meh${++idCount}`);
    hunspellLoader(asmModule as any);

    const mkdirMock = asmModule.FS.mkdir.mock;
    expect(asmModule.FS.mkdir).toHaveBeenCalledTimes(1);
    expect(mkdirMock.calls).toEqual([['/meh1']]);
  });

  it('should not generate root path for phsyical directory if envoironment is not node', () => {
    let idCount = 0;
    const asmModule = getAsmModule();
    (nanoid as jest.Mock<any>).mockImplementation(() => `meh${++idCount}`);
    hunspellLoader(asmModule as any);

    const mkdirMock = asmModule.FS.mkdir.mock;
    expect(asmModule.FS.mkdir).toHaveBeenCalledTimes(1);
    expect(mkdirMock.calls).toEqual([['/meh1']]);
  });

  it('should return HunspellFactory instance', () => {
    const asmModule = getAsmModule();
    const value = hunspellLoader(asmModule as any);

    expect(value).toBeDefined();
    expect(Object.keys(value)).toEqual(['mountBuffer', 'unmount', 'create']);
  });
});

describe('HunspellFactory', () => {
  let hunspellFactory: HunspellFactory;
  let asmModule: HunspellAsmModule;
  let mountBufferMock: jest.Mock;
  let unmountMock: jest.Mock;
  let mockHunspellInterface: {
    create: jest.Mock;
    spell: jest.Mock;
    suggest: jest.Mock;
    free_list: jest.Mock;
    destroy: jest.Mock;
    add_dic: jest.Mock;
    add: jest.Mock;
    add_with_affix: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    let mockIdCount = 0;
    (nanoid as jest.Mock<any>).mockImplementation(() => `${++mockIdCount}`);

    mountBufferMock = jest.fn();
    (mountBuffer as jest.Mock<any>).mockImplementationOnce(() => mountBufferMock);

    unmountMock = jest.fn();
    (unmount as jest.Mock<any>).mockImplementationOnce(() => unmountMock);

    mockHunspellInterface = {
      create: jest.fn(),
      spell: jest.fn(),
      suggest: jest.fn(),
      free_list: jest.fn(),
      destroy: jest.fn(),
      add_dic: jest.fn(),
      add: jest.fn(),
      add_with_affix: jest.fn(),
      remove: jest.fn()
    };

    (wrapHunspellInterface as jest.Mock<any>).mockImplementationOnce(() => mockHunspellInterface);

    asmModule = {
      cwrap: jest.fn(),
      _malloc: jest.fn(() => 1111), //dummy ptr number,
      FS: {
        mkdir: jest.fn()
      },
      getValue: jest.fn(),
      _free: jest.fn(),
      allocateUTF8: jest.fn(),
      UTF8ToString: jest.fn()
    } as any;

    hunspellFactory = hunspellLoader(asmModule);
  });

  it('should export mount functions', () => {
    expect(mountBuffer as jest.Mock<any>).toHaveBeenCalledTimes(1);
    expect((mountBuffer as jest.Mock<any>).mock.calls[0]).toEqual([asmModule.FS, '/1']);

    expect(unmount as jest.Mock<any>).toHaveBeenCalledTimes(1);
    expect((unmount as jest.Mock<any>).mock.calls[0]).toEqual([asmModule.FS, '/1']);

    expect(hunspellFactory.mountBuffer).toEqual(mountBufferMock);
    expect(hunspellFactory.unmount).toEqual(unmountMock);
  });

  it('should create hunspell instance', () => {
    hunspellFactory.create('aff', 'dic');

    expect(mockHunspellInterface.create).toHaveBeenCalledTimes(1);
  });

  describe('Hunspell', () => {
    it('should destroy when dispose', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      hunspell.dispose();

      expect(mockHunspellInterface.destroy).toHaveBeenCalledTimes(1);
      expect(asmModule._free).toHaveBeenCalledTimes(2);
    });

    it('should free pointer correctly', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.spell.mockReturnValueOnce(1);

      //each time param's passed, expect to call _free
      [1, 2, 3].forEach(x => {
        hunspell.spell(x.toString());
        expect(asmModule._free).toHaveBeenCalledTimes(x);
      });
    });

    it('should free multiple param pointer correctly', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.spell.mockReturnValueOnce(1);

      //each time param's passed, expect to call _free
      [1, 2, 3].forEach(x => {
        hunspell.addWordWithAffix(x.toString(), x.toString());
        expect(asmModule._free).toHaveBeenCalledTimes(x * 2);
      });
    });

    it('should return true if spell is correct', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.spell.mockReturnValueOnce(1);

      expect(hunspell.spell('correct')).toBe(true);
      expect(mockHunspellInterface.spell).toHaveBeenCalledTimes(1);

      expect((asmModule.allocateUTF8 as jest.Mock<any>).mock.calls[2]).toEqual(['correct']);
    });

    it('should return false if spell is incorrect', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.spell.mockReturnValueOnce(0);

      expect(hunspell.spell('incorrect')).toBe(false);
      expect(mockHunspellInterface.spell).toHaveBeenCalledTimes(1);

      expect((asmModule.allocateUTF8 as jest.Mock<any>).mock.calls[2]).toEqual(['incorrect']);
    });

    it('should suggest word for misspelled', () => {
      const suggestion = ['word1', 'word2'];
      let count = 0;
      (asmModule.UTF8ToString as jest.Mock<any>).mockImplementation(() => suggestion[count++]);

      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.suggest.mockReturnValueOnce(2);

      const suggested = hunspell.suggest('word');
      expect(suggested).toHaveLength(2);
      expect(suggested).toEqual(suggestion);

      expect(mockHunspellInterface.free_list).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if suggestion list is empty', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.suggest.mockReturnValueOnce(0);

      expect(hunspell.suggest('empty')).toEqual([]);

      //empty suggestion still have allocated ptr, need to be freed
      expect(mockHunspellInterface.free_list).toHaveBeenCalledTimes(1);
    });

    it('should return true when able to add additional dictionary', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.add_dic.mockReturnValueOnce(0);
      const ret = hunspell.addDictionary('dic');

      expect(ret).toBe(true);
      expect(mockHunspellInterface.add_dic).toHaveBeenCalledTimes(1);
    });

    it('should return false when not able to add additional dictionary', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      mockHunspellInterface.add_dic.mockReturnValueOnce(1);
      const ret = hunspell.addDictionary('dic');

      expect(ret).toBe(false);
      expect(mockHunspellInterface.add_dic).toHaveBeenCalledTimes(1);
    });

    it('should able to add word', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      (asmModule.allocateUTF8 as jest.Mock).mockReturnValueOnce(111);
      hunspell.addWord('wordother');

      expect(mockHunspellInterface.add).toHaveBeenCalledTimes(1);
      expect(mockHunspellInterface.add.mock.calls[0][1]).toEqual(111);
    });

    it('should able to add word with affix', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      (asmModule.allocateUTF8 as jest.Mock).mockImplementation((x: string) => (x.startsWith('word') ? 111 : 222));
      hunspell.addWordWithAffix('wordother', 'affixother');

      expect(mockHunspellInterface.add_with_affix).toHaveBeenCalledTimes(1);
      expect(mockHunspellInterface.add_with_affix.mock.calls[0].slice(1)).toEqual([111, 222]);
    });

    it('should able to remove word', () => {
      const hunspell = hunspellFactory.create('aff', 'dic');
      (asmModule.allocateUTF8 as jest.Mock).mockReturnValueOnce(111);
      hunspell.removeWord('wordother');

      expect(mockHunspellInterface.remove).toHaveBeenCalledTimes(1);
      expect(mockHunspellInterface.remove.mock.calls[0][1]).toEqual(111);
    });
  });
});
