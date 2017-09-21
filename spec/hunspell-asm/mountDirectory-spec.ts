//tslint:disable:no-require-imports
import { expect } from 'chai';
import { ENVIRONMENT } from 'emscripten-wasm-loader';
import * as unixify from 'unixify';
import { FS } from '../../src/HunspellAsmModule';

describe('mountDirectory', () => {
  const nodePathId: string = 'nodePathPrefixDummy';
  let fsMock: FS;

  beforeEach(() => {
    jest.mock('path');
    jest.mock('../../src/isMounted');
    //jest.mock('emscripten-wasm-loader', () => ({ isNode: jest.fn() }));
    jest.mock('../../src/mkdirTree');

    fsMock = {
      filesystems: {
        NODEFS: 'nodefs'
      },
      mount: jest.fn()
    } as any;
  });

  it('should throw if environment is not node', () => {
    const mountDirectory = require('../../src/mountDirectory').mountDirectory(fsMock, nodePathId, ENVIRONMENT.WEB);
    expect(() => mountDirectory('/user', ENVIRONMENT.WEB)).to.throw();
  });

  it('should return if path is already mounted', () => {
    //tslint:disable:no-require-imports
    const mountDirectory = require('../../src/mountDirectory').mountDirectory(fsMock, nodePathId, ENVIRONMENT.NODE);
    (require('path').join as jest.Mock<any>).mockImplementationOnce((...args: Array<any>) => args.join('/'));
    (require('path').resolve as jest.Mock<any>).mockImplementationOnce((arg: string) => arg);
    (require('../../src/isMounted').isMounted as jest.Mock<any>).mockReturnValueOnce(true);
    //tslint:enble:no-require-imports

    const dir = '/user/dummy';
    const expected = unixify(`${nodePathId}${dir}`);

    expect(mountDirectory(dir)).to.equal(expected);
    expect((fsMock.mount as jest.Mock<any>).mock.calls).to.have.lengthOf(0);
    expect((require('../../src/mkdirTree').mkdirTree as jest.Mock<any>).mock.calls).to.have.lengthOf(0);
  });

  it('should create and mount for new path provided', () => {
    //tslint:disable:no-require-imports
    const mountDirectory = require('../../src/mountDirectory').mountDirectory(fsMock, nodePathId, ENVIRONMENT.NODE);
    (require('path').join as jest.Mock<any>).mockImplementationOnce((...args: Array<any>) => args.join('/'));
    (require('path').resolve as jest.Mock<any>).mockImplementation((arg: string) => arg);
    (require('../../src/isMounted').isMounted as jest.Mock<any>).mockReturnValueOnce(false);
    const mkdirTreeMock = require('../../src/mkdirTree').mkdirTree as jest.Mock<any>;
    //tslint:enble:no-require-imports
    const mountMock = fsMock.mount as jest.Mock<any>;

    const dir = '/user/dummy';
    const expected = unixify(`${nodePathId}${dir}`);

    expect(mountDirectory(dir)).to.equal(expected);

    expect(mountMock.mock.calls).to.have.lengthOf(1);
    expect(mountMock.mock.calls[0]).to.deep.equal(['nodefs', { root: dir }, expected]);
    expect(mkdirTreeMock.mock.calls).to.have.lengthOf(1);
    expect(mkdirTreeMock.mock.calls[0]).to.deep.equal([fsMock, expected]);
  });
});
//tslint:enable:no-require-imports
