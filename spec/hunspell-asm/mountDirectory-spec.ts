import { ENVIRONMENT } from 'emscripten-wasm-loader';
import { join, resolve } from 'path';
import * as unixify from 'unixify';
import { isMounted } from '../../src/isMounted';
import { mkdirTree } from '../../src/mkdirTree';
import { mountDirectory } from '../../src/mountDirectory';

jest.mock('path');
jest.mock('../../src/isMounted');
jest.mock('../../src/mkdirTree');

const nodePathId: string = 'nodePathPrefixDummy';
const getFsMock = () => ({
  filesystems: {
    NODEFS: 'nodefs'
  },
  mount: jest.fn()
});

describe('mountDirectory', () => {
  let fsMock: { mount: jest.Mock<any> };
  beforeEach(() => (fsMock = getFsMock()));

  it('should throw if environment is not node', () => {
    const mountDirectoryFn = mountDirectory(fsMock as any, nodePathId, ENVIRONMENT.WEB);
    expect(() => mountDirectoryFn('/user')).toThrow();
  });

  it('should return if path is already mounted', () => {
    const mountDirectoryFn = mountDirectory(fsMock as any, nodePathId, ENVIRONMENT.NODE);

    (join as jest.Mock<any>).mockImplementationOnce((...args: Array<any>) => args.join('/'));
    (resolve as jest.Mock<any>).mockImplementationOnce((arg: string) => arg);
    (isMounted as jest.Mock<any>).mockReturnValueOnce(true);

    const dir = '/user/dummy';
    const expected = unixify(`${nodePathId}${dir}`);

    expect(mountDirectoryFn(dir)).toEqual(expected);
    expect(fsMock.mount).not.toHaveBeenCalled();
    expect(mkdirTree).not.toHaveBeenCalled();

    jest.resetAllMocks();
  });

  it('should create and mount for new path provided', () => {
    const mountDirectoryFn = mountDirectory(fsMock as any, nodePathId, ENVIRONMENT.NODE);

    (join as jest.Mock<any>).mockImplementationOnce((...args: Array<any>) => args.join('/'));
    (resolve as jest.Mock<any>).mockImplementation((arg: string) => arg);
    (isMounted as jest.Mock<any>).mockReturnValueOnce(false);
    const mountMock = fsMock.mount as jest.Mock<any>;

    const dir = '/user/dummy';
    const expected = unixify(`${nodePathId}${dir}`);

    expect(mountDirectoryFn(dir)).toEqual(expected);

    expect(mountMock).toHaveBeenCalledTimes(1);
    expect(mountMock.mock.calls[0]).toEqual(['nodefs', { root: dir }, expected]);
    expect(mkdirTree as jest.Mock<any>).toHaveBeenCalledTimes(1);
    expect((mkdirTree as jest.Mock<any>).mock.calls[0]).toEqual([fsMock, expected]);

    jest.resetAllMocks();
  });
});
