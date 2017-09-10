import { expect } from 'chai';
import { FS } from '../../src/HunspellAsmModule';

describe('mountBuffer', () => {
  const memPathId: string = 'memPathPrefixDummy';
  let mountBuffer: (contents: ArrayBufferView, fileName?: string) => string;
  let fsMock: FS;

  beforeEach(() => {
    jest.mock('nanoid');
    jest.mock('../../src/isMounted');

    fsMock = {
      writeFile: jest.fn()
    } as any;

    //tslint:disable-next-line:no-require-imports
    mountBuffer = require('../../src/mountBuffer').mountBuffer(fsMock, memPathId);
  });

  it('should return path if file is already mounted', () => {
    //tslint:disable-next-line:no-require-imports
    (require('../../src/isMounted').isMounted as jest.Mock<any>).mockReturnValueOnce(true);
    const fileName = 'vFile.bin';
    const value = mountBuffer(new Buffer(''), fileName);

    expect(value).to.equal(`${memPathId}/${fileName}`);
  });

  it('should write file in memory filesystem', () => {
    //tslint:disable-next-line:no-require-imports
    (require('../../src/isMounted').isMounted as jest.Mock<any>).mockReturnValueOnce(false);
    const writeFileMock = fsMock.writeFile as jest.Mock<any>;

    const fileName = 'vFile.bin';
    const contents = new Buffer('dummy');
    const value = mountBuffer(contents, fileName);
    const expectedMountPath = `${memPathId}/${fileName}`;

    expect(value).to.equal(expectedMountPath);
    expect(writeFileMock.mock.calls).to.have.lengthOf(1);
    expect(writeFileMock.mock.calls[0]).to.deep.equal([expectedMountPath, contents, { encoding: 'binary' }]);
  });

  it('should generate file name if not provided', () => {
    //tslint:disable-next-line:no-require-imports
    const nanoIdMock = require('nanoid') as jest.Mock<any>;
    const dummyId = '_dummy_id';
    nanoIdMock.mockReturnValueOnce(dummyId);

    const value = mountBuffer(new Buffer(''));

    expect(value).to.equal(`${memPathId}/${dummyId}`);
    expect(nanoIdMock.mock.calls).to.have.lengthOf(1);
  });
});
