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

function hasErr(args: object): args is { err: object } {
  return 'err' in args && typeof args === 'object' && args != null;
}

export function toLogJson(args: unknown) {
  if (!args || typeof args !== 'object') return JSON.stringify(args);
  return JSON.stringify({
    ...args,
    err:
      hasErr(args) &&
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

function loggerParamsAdapter(
  log: (msg: string) => void
): (argsOrMsg: string | unknown, msg?: string) => void {
  return (argsOrMsg, msg) => {
    if (_.isString(argsOrMsg)) {
      log(argsOrMsg);
      return;
    }

    if (!msg) {
      log(toLogJson(argsOrMsg));
      return;
    }

    log(`${msg} ${toLogJson(argsOrMsg)}`);
  };
}

type SupportedLogLevels = 'info' | 'warn' | 'error' | 'debug';

export function loggerAdapter({ logger }: { logger: Logger }): {
  [key in SupportedLogLevels]: (
    argsOrMsg: string | unknown,
    msg?: string
  ) => void;
} {
  return {
    info: loggerParamsAdapter(logger.info?.bind(logger)),
    warn: loggerParamsAdapter(logger.warn?.bind(logger)),
    error: loggerParamsAdapter(logger.error?.bind(logger)),
    debug: loggerParamsAdapter(logger.debug?.bind(logger)),
  };
}

export function realError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return Object.assign(new Error('Unknown error'), { cause: error });
}
