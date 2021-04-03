import _ from 'lodash';
import {
  API,
  Characteristic,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import * as Flexom from '@rsauget/flexom-lib';

import { createFlexomZone } from './accessories/flexomZone';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export type FlexomPlatformConfig = PlatformConfig & {
  email: string;
  password: string;
  zones: boolean;
  things: boolean;
};

export type FlexomPlatform = {
  flexom: Flexom.Client,
  log: Logger,
  Service: typeof Service,
  Characteristic: typeof Characteristic,
};

export function createFlexomPlatform({
  log,
  config,
  api,
}: {
  log: Logger,
  config: FlexomPlatformConfig,
  api: API,
  }) {
  const { Service, Characteristic, uuid: { generate: generateUuid } } = api.hap;
  const accessories: Record<string, PlatformAccessory> = {};

  log.debug(`Finished initializing platform: ${config.name}`);

  api.on('didFinishLaunching', async () => {
    log.debug('didFinishLaunching');
    const flexom = await Flexom.createClient(config);
    const platform = {
      flexom,
      log,
      Service,
      Characteristic,
    };
    if (config.zones) {
      await discoverZones({ platform });
    }
  });

  const discoverZones = async ({ platform }: { platform: FlexomPlatform }) => {
    const zones = await platform.flexom.getZones();
    log.info(`Found ${zones.length} zones`);
    const activeAccessories = _.compact(
      await Promise.all(
        _.chain(zones)
          .differenceWith(config.excludedZones, (zone, id) => zone.id === id)
          .map(setupZone({ platform }))
          .value(),
      ),
    );
    log.info(`Setup ${activeAccessories.length} zones`);
    _.chain(accessories)
      .values()
      .differenceBy(activeAccessories, 'UUID')
      .map(accessory => {
        log.info(`Unregister accessory: ${accessory.displayName} (UUID: ${accessory.UUID})`);
        api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        _.unset(accessories, accessory.UUID);
      })
      .value();
  };

  const setupZone = ({ platform }: { platform: FlexomPlatform }) => async (zone: Flexom.Zone) => {
    const uuid = generateUuid(zone.id);
    const existingAccessory = _.get(accessories, uuid);
    const accessory = _.merge(
      existingAccessory ?? new api.platformAccessory(zone.name, uuid),
      {
        context: {
          log,
          zone,
        },
      },
    );

    const hasZoneControls = await createFlexomZone({ platform, accessory });
    if (!hasZoneControls) {
      return;
    }

    if (existingAccessory) {
      log.info(`Update accessory: ${zone.name}`);
      api.updatePlatformAccessories([accessory]);
    } else {
      log.info(`Register accessory: ${zone.name}`);
      api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return accessory;
    
  };
  
  return {
    configureAccessory: ({ accessory }: { accessory: PlatformAccessory }) => {
      log.info(`Loading accessory from cache: ${accessory.displayName}`);
      _.set(accessories, accessory.UUID, accessory);
    },
  };
}