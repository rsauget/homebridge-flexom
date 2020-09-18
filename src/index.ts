import type {
  API,
  PlatformAccessory,
  Logging,
  PlatformConfig,
} from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { createFlexomPlatform, FlexomPlatformConfig } from './flexomPlatform';

export default (homebridgeApi: API) => {
  homebridgeApi.registerPlatform(
    PLATFORM_NAME,
    class {
      platform: ReturnType<typeof createFlexomPlatform>;

      constructor(logger: Logging, config: PlatformConfig, api: API) {
        this.platform = createFlexomPlatform({
          logger,
          config: config as FlexomPlatformConfig,
          api,
        });
      }

      configureAccessory(accessory: PlatformAccessory) {
        this.platform.configureAccessory({ accessory });
      }
    }
  );
};
