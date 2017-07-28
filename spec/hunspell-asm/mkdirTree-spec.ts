import { expect } from 'chai';
import { FS } from '../../src/HunspellAsmModule';
//tslint:disable-next-line:no-require-imports
import mkdirTreeType = require('../../src/mkdirTree');

describe('mkdirTree', () => {
  let mkdirTree: typeof mkdirTreeType.mkdirTree;
  let fsMock: FS;
  let mkdirMock: jest.Mock<any>;

  beforeEach(() => {
    //tslint:disable-next-line:no-require-imports
    mkdirTree = require('../../src/mkdirTree').mkdirTree;
    mkdirMock = jest.fn();
    fsMock = {
      mkdir: mkdirMock
    } as any;
  });

  it('should create single dir', () => {
    mkdirTree(fsMock as any, '/virtual/');

    expect(mkdirMock.mock.calls).to.have.lengthOf(1);
    expect(mkdirMock.mock.calls[0][0]).to.equal('/virtual');
  });

  it('should recursively create nested dir', () => {
    mkdirTree(fsMock as any, '/virtual/test/dir');

    expect(mkdirMock.mock.calls).to.have.lengthOf(3);
    expect(mkdirMock.mock.calls).to.deep.equal([['/virtual'], ['/virtual/test'], ['/virtual/test/dir']]);
  });

  it('should not throw if try to create existing dir', () => {
    mkdirMock.mockImplementationOnce(() => {
      const e = new Error();
      (e as any).errno = 17;
      throw e;
    });

    expect(() => mkdirTree(fsMock as any, '/virtual/')).to.not.throw();
  });

  it('should throw if error occurred while creating dir', () => {
    mkdirMock.mockImplementationOnce(() => {
      throw new Error();
    });

    expect(() => mkdirTree(fsMock as any, '/virtual/')).to.throw();
  });
});
