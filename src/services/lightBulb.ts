import {
  PlatformAccessory,
  Logger,
} from 'homebridge';
import { FlexomPlatform } from '../flexomPlatform';
import { bindService, createChildLogger, createPoller } from './helpers';

export type LightBulb = ReturnType<typeof createLightBulb>;

export async function createLightBulb({
  platform,
  accessory,
  name,
  getState,
  setState,
  log: parentLogger,
}: {
  platform: FlexomPlatform,
  accessory: PlatformAccessory,
  name: string,
  getState: () => Promise<boolean>,
  setState: (isOn: boolean) => Promise<void>,
  log: Logger,
}) {
  const {
    Service,
    Characteristic,
  } = platform;
  const log = createChildLogger(parentLogger, 'LightBulb');
  const service = accessory.getService(Service.Lightbulb)
          || accessory.addService(Service.Lightbulb);
  service.setCharacteristic(Characteristic.Name, name);

  let isOn: boolean;

  const refreshLightState = async () => {
    log.debug(`refresh state (current: ${isOn})`);
    const newIsOn = await getState();
    if (newIsOn === isOn) {
      return;
    }
    service.updateCharacteristic(Characteristic.On, newIsOn);
    log.info(`changed from ${isOn} to ${newIsOn}`);
    isOn = newIsOn;
  };
  
  const getLightState = async () => {
    log.debug(`homekit get state ${isOn}`);
    return isOn;
  };

  const setLightState = async (isOn: boolean) => {
    log.debug(`homekit set state ${isOn}`);
    await setState(isOn);
  };

  await createPoller(refreshLightState).start();

  bindService<boolean>({
    characteristic: service.getCharacteristic(Characteristic.On),
    getter: getLightState,
    setter: setLightState,
  });
}