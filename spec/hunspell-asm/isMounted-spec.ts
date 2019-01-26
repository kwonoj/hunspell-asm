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

    expect(() => isMounted(fsMock as any, 'dummy', 'dir')).not.toThrow();
    expect(isMounted(fsMock as any, 'dummy', 'dir')).toBe(false);
  });

  it('should not log fail if stat throws ENOENT', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockImplementationOnce(() => {
      const e = new Error();
      (e as any).code = 'ENOENT';
      throw e;
    });

    expect(() => isMounted(fsMock as any, 'dummy', 'dir')).not.toThrow();
    expect(isMounted(fsMock as any, 'dummy', 'dir')).toBe(false);
  });

  it('should check directory', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    isMounted(fsMock as any, 'dummy', 'dir');

    expect(fsMock.isDir).toHaveBeenCalledTimes(1);
    expect(fsMock.isFile).not.toHaveBeenCalled();
  });

  it('should check file', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    isMounted(fsMock as any, 'dummy', 'file');

    expect(fsMock.isDir).not.toHaveBeenCalled();
    expect(fsMock.isFile).toHaveBeenCalledTimes(1);
  });

  it('should return true when mounted with directory', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isDir.mockReturnValueOnce(true);

    expect(isMounted(fsMock as any, 'dummy', 'dir')).toBe(true);
  });

  it('should return true when mounted with file', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isFile.mockReturnValueOnce(true);

    expect(isMounted(fsMock as any, 'dummy', 'file')).toBe(true);
  });

  it('should return false when mounted but not directory', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isDir.mockReturnValueOnce(false);

    expect(isMounted(fsMock as any, 'dummy', 'dir')).toBe(false);
  });

  it('should return false when mounted but not file', () => {
    const fsMock = getFsMock();
    fsMock.stat.mockReturnValueOnce({});
    fsMock.isFile.mockReturnValueOnce(false);

    expect(isMounted(fsMock as any, 'dummy', 'file')).toBe(false);
  });
});
