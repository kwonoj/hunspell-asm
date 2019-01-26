import * as index from '../../src/index';

describe('index', () => {
  it('should export correctly', () => {
    const { enableLogger, log, loadModule } = index;

    expect(enableLogger).toBeDefined();
    expect(log).toBeDefined();
    expect(loadModule).toBeDefined();
  });
});
