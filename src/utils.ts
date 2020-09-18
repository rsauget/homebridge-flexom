import _ from 'lodash';

import type { Logger } from 'homebridge';

export function createChildLogger({
  parentLogger,
  prefix,
}: {
  parentLogger: Logger;
  prefix: string;
}) {
  return _.merge({}, parentLogger, {
    prefix: _.chain([parentLogger.prefix, prefix]).compact().join(':').value(),
  });
}

export function loggerAdapter({ logger }: { logger: Logger }) {
  return {
    info: (args: unknown, msg: string | undefined) =>
      logger.info(`${msg} ${JSON.stringify(args)}`),
    warn: (args: unknown, msg: string | undefined) =>
      logger.warn(`${msg} ${JSON.stringify(args)}`),
    error: (args: unknown, msg: string | undefined) =>
      logger.error(`${msg} ${JSON.stringify(args)}`),
    debug: (args: unknown, msg: string | undefined) =>
      logger.debug(`${msg} ${JSON.stringify(args)}`),
  };
}
