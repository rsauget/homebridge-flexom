import _ from 'lodash';
import { Characteristic, PlatformAccessory } from 'homebridge';
import { Logger } from 'homebridge/lib/logger';
import { FlexomPlatform } from '../flexomPlatform';
import { bindService, createPoller, Poller } from './helpers';

const POLLING_INTERVAL = 3000 /* ms */;
const POLLING_TIMEOUT = 60000 /* ms */;

type PositionState = typeof Characteristic.PositionState.INCREASING
  | typeof Characteristic.PositionState.DECREASING
  | typeof Characteristic.PositionState.STOPPED

export type WindowCovering = ReturnType<typeof createWindowCovering>;

export async function createWindowCovering({
  platform,
  accessory,
  name,
  getState,
  setState,
  log: parentLogger,
}: {
  platform: FlexomPlatform,
  accessory: PlatformAccessory,
  name: string,
  getState: () => Promise<number>,
    setState: (targetPosition: number) => Promise<void>,
  log?: Logger,
}) {
  const {
    Service,
    Characteristic,
  } = platform;
  const log = Logger.withPrefix(`${(parentLogger ?? platform.log).prefix}:WindowCovering`);
  const service = accessory.getService(Service.WindowCovering)
        || accessory.addService(Service.WindowCovering);
  service.setCharacteristic(Characteristic.Name, name);

  let currentPosition: number;
  let targetPosition: number;
  
  const refreshWindowCoveringCurrentPosition = async () => {
    log.debug(`refresh state (current: ${currentPosition})`);
    const newPosition = await getState();
    if (_.isNil(targetPosition)) {
      log.info(`initial target: ${newPosition}`);
      service.updateCharacteristic(Characteristic.TargetPosition, newPosition);
      targetPosition = newPosition;
    }
    if (newPosition === currentPosition) {
      return;
    }
    service.updateCharacteristic(Characteristic.CurrentPosition, newPosition);
    service.updateCharacteristic(Characteristic.PositionState, await getWindowCoveringPositionState());
    log.info(`changed from ${currentPosition} to ${newPosition}`);
    currentPosition = newPosition;
  };

  const getWindowCoveringTargetPosition = async () => {
    log.debug(`homekit get target position ${targetPosition}`);
    return targetPosition;
  };

  const setWindowCoveringTargetPosition = async (newTargetPosition: number, { poll = true } = {}) => {
    log.debug(`homekit set target position ${newTargetPosition}`);
    targetPosition = newTargetPosition;
    await setState(newTargetPosition);
    service.updateCharacteristic(Characteristic.TargetPosition, newTargetPosition);
    if (poll) {
      pollUntilTargetReached();
    }
  };

  const getWindowCoveringCurrentPosition = async () => {
    log.debug(`homekit get current position ${currentPosition}`);
    return currentPosition;
  };

  const getWindowCoveringPositionState = async () => {
    log.debug('homekit get position state ' +
      `(current: ${currentPosition} / target: ${targetPosition})`);
    const { STOPPED, INCREASING, DECREASING } = Characteristic.PositionState;
    if (currentPosition === undefined) {
      return STOPPED;
    }
    if (currentPosition < targetPosition) {
      return INCREASING;
    }
    if (currentPosition > targetPosition) {
      return DECREASING;
    }
    return STOPPED;
  };

  let shortPoller: Poller;
  const pollUntilTargetReached = async () => {
    if (shortPoller) {
      shortPoller.cancel();
    }
    let iteration = 1;
    shortPoller = await createPoller(async (cancel) => {
      const currentPosition = await getWindowCoveringCurrentPosition();
      log.debug(`polling n.${iteration} ` +
        `(current: ${currentPosition} / target: ${targetPosition})`);
      if (currentPosition === targetPosition) {
        return cancel();
      }
      iteration++;
    }, {
      delay: POLLING_INTERVAL,
      timeout: POLLING_TIMEOUT,
      onTimeout: async () => {
        log.warn(`failed to reach target ${targetPosition} after ${iteration} attempts`);
        log.warn(`resetting to current value ${currentPosition}`);
        await setWindowCoveringTargetPosition(currentPosition, { poll: false });
      },
    }).start();
  };

  await createPoller(refreshWindowCoveringCurrentPosition).start();

  bindService<number>({
    characteristic: service.getCharacteristic(Characteristic.CurrentPosition),
    getter: getWindowCoveringCurrentPosition,
  });

  bindService<number>({
    characteristic: service.getCharacteristic(Characteristic.TargetPosition),
    getter: getWindowCoveringTargetPosition,
    setter: setWindowCoveringTargetPosition,
  });

  bindService<PositionState>({
    characteristic: service.getCharacteristic(Characteristic.PositionState),
    getter: getWindowCoveringPositionState,
  });
}


