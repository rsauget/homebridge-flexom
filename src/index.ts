import { API, PlatformAccessory, Logging, PlatformConfig } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { createFlexomPlatform, FlexomPlatformConfig } from './flexomPlatform'; 

export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, class {
    platform: ReturnType<typeof createFlexomPlatform>;
    constructor(log: Logging, config: PlatformConfig, api: API) {
      this.platform = createFlexomPlatform({ log, config: config as FlexomPlatformConfig, api });
    }

    configureAccessory(accessory: PlatformAccessory) {
      this.platform.configureAccessory({ accessory });
    }
  });
};

