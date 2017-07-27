import { expect } from 'chai';
import { FS } from '../../src/HunspellAsmModule';
//tslint:disable-next-line:no-require-imports
import isMountedType = require('../../src/isMounted');

describe('isMounted', () => {
  let isMounted: typeof isMountedType.isMounted;
  let fsMock: FS;

  beforeEach(() => {
    jest.mock('../../src/util/logger');
    //tslint:disable-next-line:no-require-imports
    isMounted = require('../../src/isMounted').isMounted;
    fsMock = {
      stat: jest.fn(),
      isDir: jest.fn(),
      isFile: jest.fn()
    } as any;
  });

  it('should not throw if stat fails', () => {
    (fsMock.stat as jest.Mock<any>).mockImplementationOnce(() => {
      throw new Error();
    });
    //tslint:disable-next-line:no-require-imports
    const log = require('../../src/util/logger').log;

    expect(() => isMounted(fsMock, 'dummy', 'dir')).to.not.throw();
    expect(log.mock.calls).to.have.lengthOf(1);
    expect(isMounted(fsMock, 'dummy', 'dir')).to.be.false;
  });

  it('should not log fail if stat throws ENOENT', () => {
    (fsMock.stat as jest.Mock<any>).mockImplementationOnce(() => {
      const e = new Error();
      (e as any).code = 'ENOENT';
      throw e;
    });
    //tslint:disable-next-line:no-require-imports
    const log = require('../../src/util/logger').log;

    expect(() => isMounted(fsMock, 'dummy', 'dir')).to.not.throw();
    expect(log.mock.calls).to.have.lengthOf(0);
    expect(isMounted(fsMock, 'dummy', 'dir')).to.be.false;
  });

  it('should check directory', () => {
    (fsMock.stat as jest.Mock<any>).mockReturnValueOnce({});
    isMounted(fsMock, 'dummy', 'dir');

    expect((fsMock.isDir as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
    expect((fsMock.isFile as jest.Mock<any>).mock.calls).to.have.lengthOf(0);
  });

  it('should check file', () => {
    (fsMock.stat as jest.Mock<any>).mockReturnValueOnce({});
    isMounted(fsMock, 'dummy', 'file');

    expect((fsMock.isDir as jest.Mock<any>).mock.calls).to.have.lengthOf(0);
    expect((fsMock.isFile as jest.Mock<any>).mock.calls).to.have.lengthOf(1);
  });

  it('should return true when mounted with directory', () => {
    (fsMock.stat as jest.Mock<any>).mockReturnValueOnce({});
    (fsMock.isDir as jest.Mock<any>).mockReturnValueOnce(true);

    expect(isMounted(fsMock, 'dummy', 'dir')).to.be.true;
  });

  it('should return true when mounted with file', () => {
    (fsMock.stat as jest.Mock<any>).mockReturnValueOnce({});
    (fsMock.isFile as jest.Mock<any>).mockReturnValueOnce(true);

    expect(isMounted(fsMock, 'dummy', 'file')).to.be.true;
  });

  it('should return false when mounted but not directory', () => {
    (fsMock.stat as jest.Mock<any>).mockReturnValueOnce({});
    (fsMock.isDir as jest.Mock<any>).mockReturnValueOnce(false);

    expect(isMounted(fsMock, 'dummy', 'dir')).to.be.false;
  });

  it('should return false when mounted but not file', () => {
    (fsMock.stat as jest.Mock<any>).mockReturnValueOnce({});
    (fsMock.isFile as jest.Mock<any>).mockReturnValueOnce(false);

    expect(isMounted(fsMock, 'dummy', 'file')).to.be.false;
  });
});
