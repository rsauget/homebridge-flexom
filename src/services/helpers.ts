import type {
  CharacteristicValue,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  Service,
  Logger,
} from 'homebridge';
import _ from 'lodash';
import { realError, toLogJson } from '../utils';

type CharacteristicGetter<T> = () => Promise<T>;
type CharacteristicSetter<T> = (
  value: T
) => Promise<void | { aborted: boolean }>;
type CharacteristicListener<T> = (value: T) => Promise<void>;

type CharacteristicService<
  T extends CharacteristicValue = CharacteristicValue
> = {
  getValue: () => T;
  setValue: (newValue: T) => Promise<void>;
  setInternalValue: (newValue: T) => void;
  refreshValue: () => Promise<void>;
  onValue: (listener: CharacteristicListener<T>) => number;
};

export async function bindService<T extends CharacteristicValue>({
  service,
  characteristic,
  getState,
  initialValue,
  setState,
  logger,
  dependencies,
}: {
  service: Service;
  characteristic: Parameters<Service['updateCharacteristic']>[0];
  initialValue: T;
  getState?: CharacteristicGetter<T>;
  setState?: CharacteristicSetter<T>;
  logger: Logger;
  dependencies?: Array<Pick<CharacteristicService, 'onValue'>>;
}): Promise<CharacteristicService<T>> {
  const listeners: Array<CharacteristicListener<T>> = [];

  if (initialValue === undefined && getState === undefined) {
    throw new Error('at least one of initialValue or getState required');
  }

  let internalValue: T = initialValue;

  const setInternalValue = (newValue: T) => {
    service.updateCharacteristic(characteristic, newValue);
    if (internalValue === newValue) {
      logger.debug(`state unchanged (current: ${internalValue})`);
    } else {
      logger.info(`changed from ${internalValue} to ${newValue}`);
    }
    internalValue = newValue;
  };

  const refreshValue = async () => {
    if (!getState) return;
    logger.debug(`refresh state (current: ${internalValue})`);
    const newValue = await getState();
    setInternalValue(newValue);
  };

  const setValue = async (newValue: T) => {
    const result = await setState?.(newValue);
    if (result?.aborted) {
      logger.info('update aborted');
      await refreshValue();
      return;
    }
    setInternalValue(newValue);
    await Promise.all(_.map(listeners, (listener) => listener(newValue)));
  };

  await refreshValue();

  service
    .getCharacteristic(characteristic)
    ?.on('get', (callback: CharacteristicGetCallback) => {
      try {
        logger.debug(`homekit get state ${internalValue}`);
        setImmediate(() => refreshValue());
        callback(undefined, internalValue);
      } catch (err: unknown) {
        logger.error(`failed to get state: ${toLogJson(err)}`);
        callback(realError(err));
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
        } catch (err: unknown) {
          logger.error(`failed to reach target state: ${toLogJson(err)}`);
          callback(realError(err));
        }
      }
    );

  await Promise.all(
    _.map(dependencies, async (dependency) =>
      dependency.onValue(async () => refreshValue())
    )
  );

  return {
    getValue: () => internalValue,
    setValue,
    setInternalValue,
    refreshValue,
    onValue: (listener: CharacteristicListener<T>) => listeners.push(listener),
  };
}
