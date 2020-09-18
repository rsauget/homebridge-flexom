import {
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { FlexomPlatform } from '../flexomPlatform';
import { bindService } from './helpers';

const POLLING_INTERVAL = 3000 /* ms */;
const MAX_POLLING_ITERATIONS = 20;
    
export class WindowCovering {
  private service: Service;
  private log: Logger;
  private currentPosition?: number;
  private _targetPosition?: number;
  private get targetPosition() {
    return this._targetPosition ?? this.currentPosition;
  }

  private set targetPosition(value) {
    this._targetPosition = value;
  }

  public constructor(
      private platform: FlexomPlatform,
      accessory: PlatformAccessory,
      private name: string,
      private getState: () => Promise<number>,
      private setState: (targetPosition: number) => Promise<void>,
  ) {
    ({
      log: this.log,
    } = platform);
    this.service = accessory.getService(platform.Service.WindowCovering)
          || accessory.addService(platform.Service.WindowCovering);
    this.service.setCharacteristic(platform.Characteristic.Name, name);
    bindService<number>(
      this.service.getCharacteristic(platform.Characteristic.CurrentPosition),
      this.getWindowCoveringCurrentPosition.bind(this),
    );
    bindService<number>(
      this.service.getCharacteristic(platform.Characteristic.TargetPosition),
      this.getWindowCoveringTargetPosition.bind(this),
      this.setWindowCoveringTargetPosition.bind(this),
    );
    bindService<number>(
      this.service.getCharacteristic(platform.Characteristic.PositionState),
      this.getWindowCoveringPositionState.bind(this));
  }

  private async getWindowCoveringCurrentPosition() {
    this.log.debug(`${this.name}: homekit get window covering current position ${this.currentPosition}`);
    setImmediate(async () => {
      const currentPosition = await this.getState();
      if (currentPosition !== this.currentPosition) {
        this.log.info(`${this.name}: window changed from ${this.currentPosition} to ${currentPosition}`);
        this.currentPosition = currentPosition;
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, currentPosition);
      }
      if (this._targetPosition === undefined) {
        this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, currentPosition);
      }
    });
    return this.currentPosition;
  }

  private async getWindowCoveringTargetPosition() {
    this.log.debug(`${this.name}: homekit get window covering target position ${this.currentPosition}`);
    return this.targetPosition;
  }

  private async setWindowCoveringTargetPosition(targetPosition: number, poll = true) {
    this.log.debug(`${this.name}: homekit set window covering target position ${targetPosition}`);
    this.targetPosition = targetPosition;
    await this.setState(this.targetPosition);
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, targetPosition);
    if (poll) {
      this.pollUntilTargetReached();
    }
  }

  private async getWindowCoveringPositionState() {
    this.log.debug(`${this.name}: homekit get window covering position state ` +
      `(current: ${this.currentPosition} / target: ${this.targetPosition})`);
    const { STOPPED, INCREASING, DECREASING } = this.platform.Characteristic.PositionState;
    if (this.currentPosition === undefined) {
      return;
    }
    if (this.currentPosition < this.targetPosition!) {
      return INCREASING;
    }
    if (this.currentPosition > this.targetPosition!) {
      return DECREASING;
    }
    return STOPPED;
  }

  private pollingTimeout?: NodeJS.Timeout;
  private async pollUntilTargetReached(iteration = 1) {
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
    const currentPosition = await this.getWindowCoveringCurrentPosition();
    this.log.debug(`${this.name}: window polling n.${iteration}/${MAX_POLLING_ITERATIONS} ` +
      `(current: ${ currentPosition } / target: ${ this.targetPosition })`);
    if (currentPosition === this.targetPosition) {
      return;
    }
    if (iteration >= MAX_POLLING_ITERATIONS) {
      this.log.warn(`${this.name}: window failed to reach target ${this.targetPosition} after ${iteration} attempts`);
      if (currentPosition === undefined) {
        return;
      }
      this.log.warn(`${this.name}: window resetting to current value ${currentPosition}`);
      this.targetPosition = currentPosition;
      await this.setWindowCoveringTargetPosition(currentPosition, false);
      return;
    }
    this.pollingTimeout = setTimeout(() => this.pollUntilTargetReached(iteration + 1), POLLING_INTERVAL);
  }
}