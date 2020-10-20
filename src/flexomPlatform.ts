import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import * as Flexom from '@rsauget/flexom-lib';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { FlexomZone } from './accessories/flexomZone';

interface FlexomPlatformConfig extends PlatformConfig {
  email: string;
  password: string;
  zones: boolean;
  things: boolean;
}

export class FlexomPlatform implements DynamicPlatformPlugin {
  
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly config: FlexomPlatformConfig;
  public readonly accessories: PlatformAccessory[] = [];
  
  private _flexom!: Flexom.Client;
  public get flexom() {
    return this._flexom;
  }

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.config = config as FlexomPlatformConfig;
    this.log.debug(`Finished initializing platform: ${this.config.name}`);
    this.api.on('didFinishLaunching', () => {
      if (this.config.zones) {
        this.discoverZones();
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory from cache: ${accessory.displayName}`);
    this.accessories.push(accessory);
  }

  async discoverZones() {
    this._flexom = await Flexom.createClient(this.config.email, this.config.password);
    const zones = await this.flexom.getZones();
    for (const zone of zones) {
      const uuid = this.api.hap.uuid.generate(zone.id);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        this.log.info(`Restoring existing accessory from cache: ${existingAccessory.displayName}`);
        existingAccessory.context = {
          ...existingAccessory.context,
          log: this.log,
          zone,
        };
        const flexomZone = new FlexomZone(this, existingAccessory);
        if (await flexomZone.setupService()) {
          this.api.updatePlatformAccessories([existingAccessory]);
        } else {
          this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        }
      } else {
        this.log.info(`Adding new accessory: ${zone.name}`);
        const accessory = new this.api.platformAccessory(zone.name, uuid);
        accessory.context = {
          ...accessory.context,
          log: this.log,
          zone,
        };
        const flexomZone = new FlexomZone(this, accessory);
        if (await flexomZone.setupService()) {
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]); 
        }
        
      }
    }

  }

}
