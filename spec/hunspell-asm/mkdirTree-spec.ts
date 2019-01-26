import { mkdirTree } from '../../src/mkdirTree';

const getFsMock = () => ({
  mkdir: jest.fn()
});

describe('mkdirTree', () => {
  it('should create single dir', () => {
    const fsMock = getFsMock();
    mkdirTree(fsMock as any, '/virtual/');

    expect(fsMock.mkdir).toHaveBeenCalledTimes(1);
    expect(fsMock.mkdir.mock.calls[0][0]).toEqual('/virtual');
  });

  it('should recursively create nested dir', () => {
    const fsMock = getFsMock();
    mkdirTree(fsMock as any, '/virtual/test/dir');

    expect(fsMock.mkdir).toHaveBeenCalledTimes(3);
    expect(fsMock.mkdir.mock.calls).toEqual([['/virtual'], ['/virtual/test'], ['/virtual/test/dir']]);
  });

  it('should not throw if try to create existing dir', () => {
    const fsMock = getFsMock();
    fsMock.mkdir.mockImplementationOnce(() => {
      const e = new Error();
      (e as any).errno = 17;
      throw e;
    });

    expect(() => mkdirTree(fsMock as any, '/virtual/')).not.toThrow();
  });

  it('should throw if error occurred while creating dir', () => {
    const fsMock = getFsMock();
    fsMock.mkdir.mockImplementationOnce(() => {
      throw new Error();
    });

    expect(() => mkdirTree(fsMock as any, '/virtual/')).toThrow();
  });
});
