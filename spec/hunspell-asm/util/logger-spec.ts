import { enableLogger, log } from '../../../src/util/logger';

describe('logger', () => {
  it('should do nothing by default', () => {
    expect(() => log('')).not.toThrowError();
  });

  it('should allow override logger', () => {
    const mock = jest.fn();
    enableLogger(mock);

    const message = 'message';
    const value = { value: 'value' };

    log(message, value);

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0]).toEqual([`hunspell::${message}`, value]);
  });
});
