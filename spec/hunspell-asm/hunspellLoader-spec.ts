import { expect } from 'chai';
import { HunspellAsmModule } from '../../src/HunspellAsmModule';
//tslint:disable-next-line:no-require-imports
import hunspellLoaderType = require('../../src/hunspellLoader');

describe('hunspellLoader', () => {
  let hunspellLoader: typeof hunspellLoaderType.hunspellLoader;
  let asmModule: HunspellAsmModule;
  let cuidMock: jest.Mock<any>;
  let mkdirMock: jest.Mock<any>;

  beforeEach(() => {
    jest.mock('../../src/mountDirectory');
    jest.mock('../../src/mountBuffer');
    jest.mock('../../src/unmount');
    jest.mock('../../src/util/isNode');
    jest.mock('cuid');
    //tslint:disable-next-line:no-require-imports
    cuidMock = require('cuid');
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
    const dummyCuid = 'meh';
    cuidMock.mockReturnValueOnce(dummyCuid);
    hunspellLoader(asmModule);

    expect(mkdirMock.mock.calls.length).to.gte(1);
    expect(mkdirMock.mock.calls[0][0]).to.equal(`/${dummyCuid}`);
  });

  it('should generate root path for mounting phsyical directory', () => {
    //tslint:disable-next-line:no-require-imports
    (require('../../src/util/isNode').isNode as jest.Mock<any>).mockReturnValueOnce(true);

    let cuidCount = 0;
    cuidMock.mockImplementation(() => `meh${++cuidCount}`);
    hunspellLoader(asmModule);

    expect(mkdirMock.mock.calls).to.have.lengthOf(2);
    expect(mkdirMock.mock.calls).to.deep.equal([['/meh1'], ['/meh2']]);
  });

  it('should not generate root path for phsyical directory if envoironment is not node', () => {
    //tslint:disable-next-line:no-require-imports
    (require('../../src/util/isNode').isNode as jest.Mock<any>).mockReturnValueOnce(false);

    let cuidCount = 0;
    cuidMock.mockImplementation(() => `meh${++cuidCount}`);
    hunspellLoader(asmModule);

    expect(mkdirMock.mock.calls).to.have.lengthOf(1);
    expect(mkdirMock.mock.calls).to.deep.equal([['/meh1']]);
  });

  it('should return HunspellFactory instance', () => {
    const value = hunspellLoader(asmModule);

    expect(value).to.be.a('object');
    expect(Object.keys(value)).to.deep.equal(['mountDirectory', 'mountBuffer', 'unmount', 'create']);
  });
});

describe('HunspellFactory', () => {
  //noop
});
