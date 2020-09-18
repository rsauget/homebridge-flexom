import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { FlexomPlatform } from './flexomPlatform'; 

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, FlexomPlatform);
}
