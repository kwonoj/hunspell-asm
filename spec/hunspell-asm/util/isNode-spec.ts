//tslint:disable:no-require-imports
import { expect } from 'chai';
import isNodeType = require('../../../src/util/isNode');

describe('isNode', () => {
  let isNode: typeof isNodeType.isNode;
  let root: any;

  beforeEach(() => {
    jest.mock('../../../src/util/root', () => ({ root: {} }));
    isNode = require('../../../src/util/isNode').isNode;
    root = require('../../../src/util/root').root;
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  it('should return true if node specific object found', () => {
    root.process = {
      versions: {
        node: 7
      }
    };

    expect(isNode()).to.be.true;
  });

  it('should return false if node specific object not found', () => {
    root.process = {};

    expect(isNode()).to.be.false;
  });
});
