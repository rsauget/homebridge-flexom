import _ from 'lodash';
import {
  PlatformAccessory,
} from 'homebridge';

import * as Flexom from '@rsauget/flexom-lib';
import { FlexomPlatform } from '../flexomPlatform';
import { FlexomAccessory } from '../flexomAccessory';
import { LightBulb, WindowCovering } from '../services';

export class FlexomZone extends FlexomAccessory {
  private static readonly DEBOUNCE_DELAY = 1000 /* ms */;
  
  private zone: Flexom.Zone;
  private lightBulb?: LightBulb;
  private windowCovering?: WindowCovering;
  
  constructor(platform: FlexomPlatform, accessory: PlatformAccessory) {
    super(platform, accessory);
    this.zone = this.accessory.context.zone;
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, 'Zone')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.zone.id);
    this.setupService();
  }

  private async setupService() {
    ({ settings: this.zone.settings } = await this.flexom.getZone(this.zone.id));
    if (this.zone.settings.BRI) {
      this.lightBulb = new LightBulb(
        this.platform,
        this.accessory,
        this.zone.name,
        async () => {
          await this.refreshZone();
          return this.zone.settings.BRI!.value > 0;
        },
        async (isOn: boolean) => {
          await this.updateZoneBRI(isOn ? 1 : 0);
        });
    }
    if (this.zone.settings.BRIEXT) {
      this.windowCovering = new WindowCovering(
        this.platform,
        this.accessory,
        this.zone.name,
        async () => {
          await this.refreshZone();
          return this.zone.settings.BRIEXT!.value * 100;
        },
        async (value: number) => {
          await this.updateZoneBRIEXT(value / 100);
        },
      );
    }
  }

  private async refreshZone() {
    this.log.debug(`${this.zone.name}: flexom request getZone`);
    const { settings } = await this.flexom.getZone(this.zone.id);
    this.zone.settings = {
      ...this.zone.settings,
      ...settings,
    };
  }
    
  private updateZoneBRI = _.debounce(
    async (value) => {
      this.log.debug(`${this.zone.name}: flexom request setZoneFactor BRI ${value}`);
      await this.flexom.setZoneFactor(this.zone.id, 'BRI', value);
    },
    FlexomZone.DEBOUNCE_DELAY,
  );

  private updateZoneBRIEXT = _.debounce(
    async (value) => {
      this.log.debug(`${this.zone.name}: flexom request setZoneFactor BRIEXT ${value}`);
      await this.flexom.setZoneFactor(this.zone.id, 'BRIEXT', value);
    },
    FlexomZone.DEBOUNCE_DELAY,
  );
}