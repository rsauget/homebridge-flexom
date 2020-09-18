import {
  PlatformAccessory,
  Logger,
} from 'homebridge';

import * as Flexom from '@rsauget/flexom-lib';
import { FlexomPlatform } from './flexomPlatform';

export abstract class FlexomAccessory {
  protected log: Logger;
  protected flexom: Flexom.Client;

  constructor(
    protected readonly platform: FlexomPlatform,
    protected readonly accessory: PlatformAccessory,
  ) {
    ({
      log: this.log,
      flexom: this.flexom,
    } = this.platform);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Flexom');
  }
}