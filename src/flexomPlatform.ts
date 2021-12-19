import _ from 'lodash';
import type {
  API,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';
import * as Flexom from '@rsauget/flexom-lib';

import { createFlexomZone } from './accessories/flexomZone';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { loggerAdapter, toLogJson } from './utils';

export type FlexomPlatformConfig = PlatformConfig & {
  email: string;
  password: string;
  zones: boolean;
  tolerance: number;
  excludeZones: boolean;
  excludedZones: {
    id: string;
    light: boolean;
    window: boolean;
  }[];
  things: boolean;
};

export function createFlexomPlatform({
  logger,
  config,
  api,
}: {
  logger: Logger;
  config: FlexomPlatformConfig;
  api: API;
}) {
  const accessories: Record<string, PlatformAccessory> = {};

  logger.debug(`Finished initializing platform: ${config.name}`);

  const cleanup = async ({
    activeAccessories = [],
  }: {
    activeAccessories?: PlatformAccessory[];
  } = {}) => {
    _.chain(accessories)
      .values()
      .differenceBy(activeAccessories, 'UUID')
      .forEach((accessory) => {
        logger.info(
          `Unregister accessory: ${accessory.displayName} (UUID: ${accessory.UUID})`
        );
        api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
        _.unset(accessories, accessory.UUID);
      })
      .value();
  };

  const setupZone: (args: {
    excludedZones: _.Dictionary<FlexomPlatformConfig['excludedZones'][number]>;
    tolerance: number;
    zone: Flexom.Zone;
    flexom: Flexom.Client;
  }) => Promise<PlatformAccessory | undefined> = async ({
    excludedZones,
    tolerance,
    zone,
    flexom,
  }) => {
    const uuid = api.hap.uuid.generate(zone.id);
    const existingAccessory = _.get(accessories, uuid);
    const accessory =
      // eslint-disable-next-line new-cap
      existingAccessory ?? new api.platformAccessory(zone.name, uuid);

    try {
      const hasZoneControls = await createFlexomZone({
        api,
        accessory,
        logger,
        zone,
        flexom,
        tolerance,
        exclusions: _.chain(excludedZones)
          .find({ id: zone.id })
          .pick(['light', 'window'])
          .value(),
      });
      if (!hasZoneControls) {
        return undefined;
      }

      if (existingAccessory) {
        logger.info(`Update accessory: ${zone.name}`);
        api.updatePlatformAccessories([accessory]);
      } else {
        logger.info(`Register accessory: ${zone.name}`);
        api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
      return accessory;
    } catch (err: any) {
      logger.error(`Failed to setup zone ${zone.name}: ${toLogJson(err)}`);
      return existingAccessory;
    }
  };

  const discoverZones = async ({ flexom }: { flexom: Flexom.Client }) => {
    const zones = await flexom.getZones();
    logger.info(`Found ${zones.length} zones`);
    const excludedZones = config.excludeZones
      ? _.keyBy(config.excludedZones, 'id')
      : {};
    const activeAccessories = _.compact(
      await Promise.all(
        _.map(zones, async (zone) =>
          setupZone({
            tolerance: config.tolerance,
            excludedZones,
            zone,
            flexom,
          })
        )
      )
    );
    logger.info(`Setup ${activeAccessories.length} zones`);
    await cleanup({ activeAccessories });
  };

  api.on('didFinishLaunching', async () => {
    logger.debug('didFinishLaunching');
    const flexom = await Flexom.createClient({
      email: config.email,
      password: config.password,
      logger: loggerAdapter({ logger }),
    });
    if (config.zones) {
      await discoverZones({ flexom });
    } else {
      logger.warn('"Show Flexom Zones" is disabled in config, nothing to do');
      await cleanup();
    }
  });

  return {
    configureAccessory: ({ accessory }: { accessory: PlatformAccessory }) => {
      logger.info(`Loading accessory from cache: ${accessory.displayName}`);
      _.set(accessories, accessory.UUID, accessory);
    },
  };
}
