import { expect } from 'chai';
import { isMounted } from '../../src/isMounted';

const getFsMock = () => ({
  stat: jest.fn(),
  isDir: jest.fn(),
  isFile: jest.fn()
});

describe('isMounted', () => {
  it('should not throw if stat fails', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockImplementationOnce(() => {
      throw new Error();
    });

    expect(() => isMounted(fsMock as any, 'dummy', 'dir')).to.not.throw();
    expect(isMounted(fsMock as any, 'dummy', 'dir')).to.be.false;
  });

  it('should not log fail if stat throws ENOENT', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockImplementationOnce(() => {
      const e = new Error();
      (e as any).code = 'ENOENT';
      throw e;
    });

    expect(() => isMounted(fsMock as any, 'dummy', 'dir')).to.not.throw();
    expect(isMounted(fsMock as any, 'dummy', 'dir')).to.be.false;
  });

  it('should check directory', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    isMounted(fsMock as any, 'dummy', 'dir');

    expect(fsMock.isDir.mock.calls).to.have.lengthOf(1);
    expect(fsMock.isFile.mock.calls).to.have.lengthOf(0);
  });

  it('should check file', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    isMounted(fsMock as any, 'dummy', 'file');

    expect(fsMock.isDir.mock.calls).to.have.lengthOf(0);
    expect(fsMock.isFile.mock.calls).to.have.lengthOf(1);
  });

  it('should return true when mounted with directory', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isDir.mockReturnValueOnce(true);

    expect(isMounted(fsMock as any, 'dummy', 'dir')).to.be.true;
  });

  it('should return true when mounted with file', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isFile.mockReturnValueOnce(true);

    expect(isMounted(fsMock as any, 'dummy', 'file')).to.be.true;
  });

  it('should return false when mounted but not directory', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isDir.mockReturnValueOnce(false);

    expect(isMounted(fsMock as any, 'dummy', 'dir')).to.be.false;
  });

  it('should return false when mounted but not file', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isFile.mockReturnValueOnce(false);

    expect(isMounted(fsMock as any, 'dummy', 'file')).to.be.false;
  });
});
