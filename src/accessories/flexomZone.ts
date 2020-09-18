import _ from 'lodash';
import * as Flexom from '@rsauget/flexom-lib';
import type { PlatformAccessory, Logger, API } from 'homebridge';
import { createLightBulb } from '../services/lightBulb';
import { createWindowCovering } from '../services/windowCovering';
import { createChildLogger } from '../utils';

const DEBOUNCE_DELAY = 1000; /* ms */

export async function createFlexomZone({
  api,
  accessory,
  exclusions = {},
  flexom,
  zone,
  tolerance,
  logger: parentLogger,
}: {
  api: API;
  accessory: PlatformAccessory;
  exclusions: Partial<{
    light: boolean;
    window: boolean;
  }>;
  flexom: Flexom.Client;
  zone: Flexom.Zone;
  logger: Logger;
  tolerance: number;
}) {
  const logger = createChildLogger({ parentLogger, prefix: zone.name });

  accessory
    .getService(api.hap.Service.AccessoryInformation)
    ?.setCharacteristic(api.hap.Characteristic.Manufacturer, 'Flexom');

  accessory
    .getService(api.hap.Service.AccessoryInformation)
    ?.setCharacteristic(api.hap.Characteristic.Model, 'Zone')
    .setCharacteristic(api.hap.Characteristic.SerialNumber, zone.id);

  let settings: Flexom.Zone['settings'] = await flexom.getZoneSettings(zone);

  const refreshZone = _.throttle(async () => {
    logger.debug('flexom request getZone');
    settings = await flexom.getZoneSettings(zone);
  }, DEBOUNCE_DELAY);

  const updateZoneBRI = _.debounce(async (value) => {
    logger.debug(`flexom request setZoneFactor BRI ${value}`);
    return flexom.setZoneFactor({
      id: zone.id,
      factor: 'BRI',
      value,
      tolerance,
    });
  }, DEBOUNCE_DELAY);

  const updateZoneBRIEXT = _.debounce(async (value) => {
    logger.debug(`flexom request setZoneFactor BRIEXT ${value}`);
    return flexom.setZoneFactor({
      id: zone.id,
      factor: 'BRIEXT',
      value,
      tolerance,
    });
  }, DEBOUNCE_DELAY);

  const isLightEnabled = settings.BRI && !exclusions.light;
  const isWindowEnabled = settings.BRIEXT && !exclusions.window;

  if (!isLightEnabled && !isWindowEnabled) {
    return false;
  }
  if (isLightEnabled) {
    logger.info('Create light bulb');
    await createLightBulb({
      api,
      logger,
      accessory,
      name: zone.name,
      getState: async () => {
        await refreshZone();
        return settings.BRI.value > 0;
      },
      setState: async (isOn: boolean) => updateZoneBRI(isOn ? 1 : 0),
    });
  } else {
    const service = accessory.getService(api.hap.Service.Lightbulb);
    if (service) {
      accessory.removeService(service);
    }
  }
  if (isWindowEnabled) {
    logger.info('Create window covering');
    await createWindowCovering({
      api,
      logger,
      accessory,
      name: zone.name,
      tolerance: tolerance * 100,
      getState: async () => {
        await refreshZone();
        return settings.BRIEXT.value * 100;
      },
      setState: async (value: number) => updateZoneBRIEXT(value / 100),
    });
  } else {
    const service = accessory.getService(api.hap.Service.WindowCovering);
    if (service) {
      accessory.removeService(service);
    }
  }
  return true;
}
