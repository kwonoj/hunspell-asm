import { isMounted } from '../../src/isMounted';
import { unmount } from '../../src/unmount';

jest.mock('../../src/isMounted');
const memPathId: string = 'memPathPrefixDummy';
const getFsMock = () => ({
  unlink: jest.fn(),
  unmount: jest.fn(),
  rmdir: jest.fn()
});

describe('unmount', () => {
  let unmountFn: (mountedPath: string) => void;
  let fsMock: {
    unlink: jest.Mock<any>;
    unmount: jest.Mock<any>;
    rmdir: jest.Mock<any>;
  };

  beforeEach(() => {
    fsMock = getFsMock();
    unmountFn = unmount(fsMock as any, memPathId);
  });

  it('should return if path is not mounted', () => {
    (isMounted as jest.Mock<any>).mockReturnValue(false);

    unmountFn('dummyValue');
    Object.keys(fsMock)
      .map(key => fsMock[key])
      .forEach((mock: jest.Mock<any>) => expect(mock).not.toHaveBeenCalled());
  });

  it('should unmount physical path', () => {
    const mountPath = `${memPathId}/dummydirPath`;
    (isMounted as jest.Mock<any>).mockImplementation(
      (_fs: any, path: string, type: string) => path === mountPath && type === 'dir'
    );

    unmountFn(mountPath);

    const unmountMock = fsMock.unmount as jest.Mock<any>;
    const rmdirMock = fsMock.rmdir as jest.Mock<any>;

    expect(fsMock.unlink).not.toHaveBeenCalled();
    expect(unmountMock).toHaveBeenCalledTimes(1);
    expect(unmountMock.mock.calls[0]).toEqual([mountPath]);
    expect(rmdirMock).toHaveBeenCalledTimes(1);
    expect(rmdirMock.mock.calls[0]).toEqual([mountPath]);

    jest.resetAllMocks();
  });

  it('should unmount and delete bufferFile', () => {
    const mountPath = `${memPathId}/dummyFile.aff`;
    (isMounted as jest.Mock<any>).mockImplementation(
      (_fs: any, path: string, type: string) => path === mountPath && type === 'file'
    );

    unmountFn(mountPath);

    const unlinkMock = fsMock.unlink as jest.Mock<any>;
    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect(unlinkMock.mock.calls[0]).toEqual([mountPath]);

    expect(fsMock.unmount).not.toHaveBeenCalled();
    expect(fsMock.rmdir).not.toHaveBeenCalled();

    jest.resetAllMocks();
  });
});
