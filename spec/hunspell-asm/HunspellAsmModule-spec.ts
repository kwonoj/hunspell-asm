import { expect } from 'chai';
import { FILESYSTEMS } from '../../src/HunspellAsmModule';

describe('FILESYSTEMS', () => {
  it('should export available filesystem', () => {
    expect(Object.keys(FILESYSTEMS)).to.have.lengthOf(2);
    expect(FILESYSTEMS.MEMFS).to.equal('MEMFS');
    expect(FILESYSTEMS.NODEFS).to.equal('NODEFS');
  });
});
