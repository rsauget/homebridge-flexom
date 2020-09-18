import type {
  CharacteristicValue,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  Service,
  Logger,
} from 'homebridge';
import _ from 'lodash';

type CharacteristicGetter<T> = () => Promise<T>;
type CharacteristicSetter<T> = (
  value: T
) => Promise<void | { aborted: boolean }>;
type CharacteristicListener<T> = (value: T) => Promise<void>;

export async function bindService<T extends CharacteristicValue>({
  service,
  characteristic,
  getState,
  initialValue,
  setState,
  logger,
}: {
  service: Service;
  characteristic: Parameters<Service['updateCharacteristic']>[0];
  initialValue: T;
  getState?: CharacteristicGetter<T>;
  setState?: CharacteristicSetter<T>;
  logger: Logger;
}) {
  const listeners: Array<CharacteristicListener<T>> = [];

  if (initialValue === undefined && getState === undefined) {
    throw new Error('at least one of initialValue or getState required');
  }

  let value: T = initialValue;

  const setValue = async (newValue: T) => {
    const result = await setState?.(newValue);
    if (result?.aborted) {
      logger.info('update aborted');
      return;
    }
    service.updateCharacteristic(characteristic, newValue);
    if (value === newValue) {
      logger.debug(`state unchanged (current: ${value})`);
    } else {
      logger.info(`changed from ${value} to ${newValue}`);
    }
    value = newValue;
    await Promise.all(_.map(listeners, (listener) => listener(value)));
  };

  const refreshValue = async () => {
    if (!getState) return;
    logger.debug(`refresh state (current: ${value})`);
    const newValue = await getState();
    await setValue(newValue);
  };

  await refreshValue();

  service
    .getCharacteristic(characteristic)
    ?.on('get', (callback: CharacteristicGetCallback) => {
      try {
        logger.debug(`homekit get state ${value}`);
        setImmediate(() => refreshValue());
        callback(undefined, value);
      } catch (err: any) {
        logger.error('failed to get state');
        callback(err);
      }
    });

  service
    .getCharacteristic(characteristic)
    ?.on(
      'set',
      async (
        newValue: CharacteristicValue,
        callback: CharacteristicSetCallback
      ) => {
        try {
          logger.debug(`homekit set state ${newValue}`);
          await setValue(newValue as T);
          callback();
        } catch (err: any) {
          logger.error('failed to reach target state');
          callback(err);
        }
      }
    );

  return {
    getValue: () => value,
    setValue,
    onValue: (listener: CharacteristicListener<T>) => listeners.push(listener),
  };
}
