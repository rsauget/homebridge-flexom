import {
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicValue,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  Logger,
} from 'homebridge';
import _ from 'lodash';

type CharacteristicGetter<T> = () => Promise<T>;
type CharacteristicSetter<T> = (value: T) => Promise<void>;

export function bindService<T extends CharacteristicValue>({
  characteristic,
  getter,
  setter,
}: {
  characteristic: Characteristic,
  getter: CharacteristicGetter<T>,
  setter?: CharacteristicSetter<T>,
}) {
  characteristic.on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
    try {
      callback(undefined, await getter());
    } catch (err) {
      callback(err);
    }
  });
  
  if (setter) {
    characteristic.on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
      try {
        await setter(value as T);
        callback();
      } catch (err) {
        callback(err);
      }
    });
  }
}

export type Poller = ReturnType<typeof createPoller>;

export function createPoller(
  fn: (cancel: () => void, ...args: unknown[]) => Promise<unknown>,
  {
    delay: initialDelay = 60000,
    factor = 1,
    timeout,
    onTimeout = _.noop,
    onError = _.stubTrue,
  }: Partial<{
    delay: number,
    factor: number,
    timeout: number,
    onTimeout: () => void,
    onError: (err: Error) => boolean,
  }> = {},
) {
  if (factor <= 0) {
    throw new Error('factor must be strictly positive');
  }

  let endTimestamp: number;
  let isCancelled = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  const start = async (...args: unknown[]) => {
    if (endTimestamp) {
      throw new Error('poller already started');
    }
    if (!_.isNil(timeout)) {
      endTimestamp = Date.now() + timeout;
    }
    await poll({ delay: initialDelay, args });

    return poller;
  };

  const cancel = () => {
    isCancelled = true;
    clearTimeout(timeoutId);
  };

  const poller = {
    start,
    cancel,
  };

  const schedule = ({ delay, args }) => {
    timeoutId = setTimeout(() => poll({ delay: delay * factor, args: _.castArray(args) }), delay);
  };

  const poll = async ({ delay, args }) => {
    if (isCancelled) {
      return;
    }
    if (endTimestamp && Date.now() > endTimestamp) {
      return onTimeout();
    }
    try {
      const newArgs = await fn(cancel, ...args);
      schedule({ delay, args: newArgs });
    } catch (err) {
      const shouldContinue = onError(err);
      if (shouldContinue) {
        schedule({ delay, args });
      } else {
        cancel();
      }
    }
  };

  return poller;
}

export function createChildLogger(parentLogger: Logger, prefix: string) {
  return _.merge(
    {},
    parentLogger,
    {
      prefix: _.chain([parentLogger.prefix, prefix])
        .compact()
        .join(':')
        .value(),
    },
  );
}