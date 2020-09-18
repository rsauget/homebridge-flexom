import {
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { FlexomPlatform } from '../flexomPlatform';
import { bindService } from './helpers';

export class LightBulb {
  private service: Service;
  private log: Logger;
  private isOn?: boolean;

  public constructor(
    private platform: FlexomPlatform,
    accessory: PlatformAccessory,
    private name: string,
    private getState: () => Promise<boolean>,
    private setState: (isOn: boolean) => Promise<void>,
  ) {
    ({
      log: this.log,
    } = platform);
    this.service = accessory.getService(platform.Service.Lightbulb)
          || accessory.addService(platform.Service.Lightbulb);
    this.service.setCharacteristic(platform.Characteristic.Name, name);
    bindService<boolean>(
      this.service.getCharacteristic(platform.Characteristic.On),
      this.getLightState.bind(this),
      this.setLightState.bind(this),
    );
  }

  async getLightState() {
    this.log.debug(`${this.name}: homekit get light state ${this.isOn}`);
    setImmediate(async () => {
      const isOn = await this.getState();
      this.log.info(`${this.name}: light changed from ${this.isOn} to ${isOn}`);
      this.isOn = isOn;
      this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
    });
    return this.isOn;
  }

  async setLightState(isOn: boolean) {
    this.log.debug(`${this.name}: homekit set light state ${isOn}`);
    await this.setState(isOn);
  }
}