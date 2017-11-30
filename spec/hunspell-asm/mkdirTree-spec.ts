import { expect } from 'chai';
import { mkdirTree } from '../../src/mkdirTree';

const getFsMock = () => ({
  mkdir: jest.fn()
});

describe('mkdirTree', () => {
  it('should create single dir', () => {
    const fsMock = getFsMock();
    mkdirTree(fsMock as any, '/virtual/');

    expect(fsMock.mkdir.mock.calls).to.have.lengthOf(1);
    expect(fsMock.mkdir.mock.calls[0][0]).to.equal('/virtual');
  });

  it('should recursively create nested dir', () => {
    const fsMock = getFsMock();
    mkdirTree(fsMock as any, '/virtual/test/dir');

    expect(fsMock.mkdir.mock.calls).to.have.lengthOf(3);
    expect(fsMock.mkdir.mock.calls).to.deep.equal([['/virtual'], ['/virtual/test'], ['/virtual/test/dir']]);
  });

  it('should not throw if try to create existing dir', () => {
    const fsMock = getFsMock();
    fsMock.mkdir.mockImplementationOnce(() => {
      const e = new Error();
      (e as any).errno = 17;
      throw e;
    });

    expect(() => mkdirTree(fsMock as any, '/virtual/')).to.not.throw();
  });

  it('should throw if error occurred while creating dir', () => {
    const fsMock = getFsMock();
    fsMock.mkdir.mockImplementationOnce(() => {
      throw new Error();
    });

    expect(() => mkdirTree(fsMock as any, '/virtual/')).to.throw();
  });
});
