import { expect } from 'chai';
import { loggerAdapter } from '../utils';

describe('utils', () => {
  describe('loggerAdapter', () => {
    const makeLogger: () => any = () => {
      const calls: unknown[][] = [];

      const log = (...args: unknown[]) => {
        calls.push(args);
      };

      return { info: log, calls };
    };

    it('only message', () => {
      const logger = makeLogger();
      loggerAdapter({ logger }).info('test');
      expect(logger.calls).to.deep.eql([['test']]);
    });

    it('args and message', () => {
      const logger = makeLogger();
      loggerAdapter({ logger }).info({ a: 1 }, 'test');
      expect(logger.calls).to.deep.eql([['test {"a":1}']]);
    });

    it('empty args and message', () => {
      const logger = makeLogger();
      loggerAdapter({ logger }).info({}, 'test');
      expect(logger.calls).to.deep.eql([['test {}']]);
    });

    it('args and no message', () => {
      const logger = makeLogger();
      loggerAdapter({ logger }).info({ a: 1 });
      expect(logger.calls).to.deep.eql([['{"a":1}']]);
    });
  });
});
