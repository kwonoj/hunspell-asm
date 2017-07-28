import { expect } from 'chai';
import { FS } from '../../src/HunspellAsmModule';

describe('unmount', () => {
  const memPathId: string = 'memPathPrefixDummy';
  let unmount: (mountedPath: string) => void;
  let fsMock: FS;

  beforeEach(() => {
    jest.mock('../../src/isMounted');

    fsMock = {
      unlink: jest.fn(),
      unmount: jest.fn(),
      rmdir: jest.fn()
    } as any;

    //tslint:disable-next-line:no-require-imports
    unmount = require('../../src/unmount').unmount(fsMock, memPathId);
  });

  it('should return if path is not mounted', () => {
    //tslint:disable-next-line:no-require-imports
    (require('../../src/isMounted').isMounted as jest.Mock<any>).mockReturnValue(false);

    unmount('dummyValue');
    Object.keys(fsMock)
      .map(key => fsMock[key])
      .forEach((mock: jest.Mock<any>) => expect(mock.mock.calls).to.have.lengthOf(0));
  });

  it('should unmount physical path', () => {
    const mountPath = `${memPathId}/dummydirPath`;
    //tslint:disable-next-line:no-require-imports
    (require('../../src/isMounted').isMounted as jest.Mock<any>).mockImplementation(
      (_fs: any, path: string, type: string) => path === mountPath && type === 'dir'
    );

    unmount(mountPath);

    const unmountMock = fsMock.unmount as jest.Mock<any>;
    const rmdirMock = fsMock.rmdir as jest.Mock<any>;

    expect((fsMock.unlink as jest.Mock<any>).mock.calls).to.have.lengthOf(0);
    expect(unmountMock.mock.calls).to.have.lengthOf(1);
    expect(unmountMock.mock.calls[0]).to.deep.equal([mountPath]);
    expect(rmdirMock.mock.calls).to.have.lengthOf(1);
    expect(rmdirMock.mock.calls[0]).to.deep.equal([mountPath]);
  });

  it('should unmount and delete bufferFile', () => {
    const mountPath = `${memPathId}/dummyFile.aff`;
    //tslint:disable-next-line:no-require-imports
    (require('../../src/isMounted').isMounted as jest.Mock<any>).mockImplementation(
      (_fs: any, path: string, type: string) => path === mountPath && type === 'file'
    );

    unmount(mountPath);

    const unlinkMock = fsMock.unlink as jest.Mock<any>;
    expect(unlinkMock.mock.calls).to.have.lengthOf(1);
    expect(unlinkMock.mock.calls[0]).to.deep.equal([mountPath]);

    expect((fsMock.unmount as jest.Mock<any>).mock.calls).to.have.lengthOf(0);
    expect((fsMock.rmdir as jest.Mock<any>).mock.calls).to.have.lengthOf(0);
  });
});
