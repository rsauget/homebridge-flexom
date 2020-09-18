import {
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicValue,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
} from 'homebridge';

type CharacteristicGetter<T> = () => Promise<T | undefined>;
type CharacteristicSetter<T> = (value: T) => Promise<void>;

export function bindService<T extends CharacteristicValue | undefined>(
  characteristic,
  getter: CharacteristicGetter<T>,
  setter?: CharacteristicSetter<T>,
) {
  characteristic.on(CharacteristicEventTypes.GET, wrapCharacteristicGetter(getter));
  if (setter) {
    characteristic.on(CharacteristicEventTypes.SET, wrapCharacteristicSetter(setter));
  }
}

export function wrapCharacteristicGetter<T extends CharacteristicValue | undefined>(getter: CharacteristicGetter<T>) {
  return async (callback: CharacteristicGetCallback) => {
    try {
      callback(undefined, await getter());
    } catch (err) {
      callback(err);
    }
  };
}
export function wrapCharacteristicSetter<T extends CharacteristicValue | undefined>(setter: CharacteristicSetter<T>) {
  return async (value: T, callback: CharacteristicSetCallback) => {
    try {
      await setter(value);
      callback();
    } catch (err) {
      callback(err);
    }
  };
}