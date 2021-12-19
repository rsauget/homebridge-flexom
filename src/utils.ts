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

export function toLogJson(args: any) {
  return JSON.stringify({
    ...args,
    err:
      args?.err &&
      Object.defineProperties(args.err, {
        message: {
          enumerable: true,
        },
        code: {
          enumerable: true,
        },
        stack: {
          enumerable: true,
        },
      }),
  });
}

export function loggerAdapter({ logger }: { logger: Logger }) {
  return {
    info: (args: unknown, msg: string | undefined) =>
      logger.info(`${msg} ${toLogJson(args)}`),
    warn: (args: unknown, msg: string | undefined) =>
      logger.warn(`${msg} ${toLogJson(args)}`),
    error: (args: unknown, msg: string | undefined) =>
      logger.error(`${msg} ${toLogJson(args)}`),
    debug: (args: unknown, msg: string | undefined) =>
      logger.debug(`${msg} ${toLogJson(args)}`),
  };
}
