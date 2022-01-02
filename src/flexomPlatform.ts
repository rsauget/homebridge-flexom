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

async function cleanup({
  accessories,
  activeAccessories = [],
  logger,
  api,
}: {
  accessories: Record<string, PlatformAccessory>;
  activeAccessories?: PlatformAccessory[];
  logger: Logger;
  api: API;
}) {
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
}

async function setupZone({
  accessories,
  logger,
  excludedZones,
  tolerance,
  zone,
  flexom,
  api,
}: {
  accessories: Record<string, PlatformAccessory>;
  excludedZones: _.Dictionary<FlexomPlatformConfig['excludedZones'][number]>;
  tolerance: number;
  zone: Flexom.Zone;
  flexom: Flexom.Client;
  logger: Logger;
  api: API;
}): Promise<PlatformAccessory | undefined> {
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
      api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return accessory;
  } catch (err: unknown) {
    logger.error(`Failed to setup zone ${zone.name}: ${toLogJson(err)}`);
    return existingAccessory;
  }
}

async function discoverZones({
  accessories,
  api,
  flexom,
  logger,
  config,
}: {
  accessories: Record<string, PlatformAccessory>;
  api: API;
  flexom: Flexom.Client;
  logger: Logger;
  config: FlexomPlatformConfig;
}) {
  const zones = await flexom.getZones();
  logger.info(`Found ${zones.length} zones`);
  const excludedZones = config.excludeZones
    ? _.keyBy(config.excludedZones, 'id')
    : {};
  const activeAccessories = _.compact(
    await Promise.all(
      _.map(zones, async (zone) =>
        setupZone({
          accessories,
          tolerance: config.tolerance,
          excludedZones,
          zone,
          flexom,
          logger,
          api,
        })
      )
    )
  );
  logger.info(`Setup ${activeAccessories.length} zones`);
  await cleanup({ accessories, activeAccessories, logger, api });
}

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

  api.on('didFinishLaunching', async () => {
    try {
      if (!config.zones) {
        logger.warn('"Show Flexom Zones" is disabled in config, nothing to do');
        await cleanup({ accessories, api, logger });
        return;
      }

      if (_.isEmpty(config.email) || _.isEmpty(config.password)) {
        logger.warn('Flexom email and password are required');
        return;
      }

      const flexom = await Flexom.createClient({
        email: config.email,
        password: config.password,
        logger: loggerAdapter({ logger }),
      });

      await discoverZones({ accessories, api, logger, config, flexom });
    } catch (err: unknown) {
      if (_.get(err, 'response.status') === 401) {
        logger.error('Incorrect Flexom email or password');
      } else {
        logger.error(`Flexom initialization error: ${toLogJson(err)}`);
      }
    }
  });

  return {
    configureAccessory: ({ accessory }: { accessory: PlatformAccessory }) => {
      logger.info(`Loading accessory from cache: ${accessory.displayName}`);
      _.set(accessories, accessory.UUID, accessory);
    },
  };
}
