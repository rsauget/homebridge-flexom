import _ from 'lodash';
import {
  PlatformAccessory,
} from 'homebridge';
import { FlexomPlatform } from '../flexomPlatform';
import { createLightBulb } from '../services/lightBulb';
import { createWindowCovering } from '../services/windowCovering';
import { createChildLogger } from '../services/helpers';

const DEBOUNCE_DELAY = 1000 /* ms */;

export type FlexomZone = ReturnType<typeof createFlexomZone>;

export async function createFlexomZone({
  platform,
  accessory,
  exclusions = {},
}: {
  platform: FlexomPlatform,
  accessory: PlatformAccessory,
  exclusions: Partial<{
    light: boolean,
    window: boolean
  }>
}) {
  const {
    Service,
    Characteristic,
    flexom,
  } = platform;
  const { zone, log: parentLogger } = accessory.context;
  const log = createChildLogger(parentLogger, zone.name);

  accessory.getService(Service.AccessoryInformation)!
    .setCharacteristic(Characteristic.Manufacturer, 'Flexom');
  
  accessory.getService(Service.AccessoryInformation)!
    .setCharacteristic(Characteristic.Model, 'Zone')
    .setCharacteristic(Characteristic.SerialNumber, zone.id);
  
  const refreshZone = async () => {
    log.debug('flexom request getZone');
    const { settings } = await flexom.getZone(zone);
    _.merge(zone, { settings });
  };
    
  const updateZoneBRI = _.debounce(
    async (value) => {
      log.debug(`flexom request setZoneFactor BRI ${value}`);
      await flexom.setZoneFactor({ id: zone.id, factor: 'BRI', value });
    },
    DEBOUNCE_DELAY,
  );

  const updateZoneBRIEXT = _.debounce(
    async (value) => {
      log.debug(`flexom request setZoneFactor BRIEXT ${value}`);
      await flexom.setZoneFactor({ id: zone.id, factor: 'BRIEXT', value });
    },
    DEBOUNCE_DELAY,
  );

  const { settings } = await flexom.getZone(zone);
  _.merge(zone, { settings });
  
  const isLightEnabled = zone.settings.BRI && !exclusions.light;
  const isWindowEnabled = zone.settings.BRIEXT && !exclusions.window;

  if (!isLightEnabled && !isWindowEnabled) {
    return false;
  }
  if (isLightEnabled) {
    log.info('Create light bulb');
    await createLightBulb({
      log,
      platform,
      accessory,
      name: zone.name,
      getState: async () => {
        await refreshZone();
        return zone.settings.BRI!.value > 0;
      },
      setState: async (isOn: boolean) => {
        await updateZoneBRI(isOn ? 1 : 0);
      },
    });
  } else {
    const service = accessory.getService(Service.Lightbulb);
    if (service) {
      accessory.removeService(service);
    }
  }
  if (isWindowEnabled) {
    log.info('Create window covering');
    await createWindowCovering({
      log,
      platform,
      accessory,
      name: zone.name,
      getState: async () => {
        await refreshZone();
        return zone.settings.BRIEXT!.value * 100;
      },
      setState: async (value: number) => {
        await updateZoneBRIEXT(value / 100);
      },
    });
  } else {
    const service = accessory.getService(Service.WindowCovering);
    if (service) {
      accessory.removeService(service);
    }
  }
  return true;
} 