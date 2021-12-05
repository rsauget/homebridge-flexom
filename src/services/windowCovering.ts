import type {
  Characteristic,
  PlatformAccessory,
  Logger,
  API,
} from 'homebridge';
import { createChildLogger } from '../utils';
import { bindService } from './helpers';

type PositionState =
  | typeof Characteristic.PositionState.INCREASING
  | typeof Characteristic.PositionState.DECREASING
  | typeof Characteristic.PositionState.STOPPED;

export type WindowCovering = ReturnType<typeof createWindowCovering>;

export async function createWindowCovering({
  api,
  accessory,
  name,
  tolerance,
  getState,
  setState,
  logger: parentLogger,
}: {
  api: API;
  accessory: PlatformAccessory;
  name: string;
  tolerance: number;
  getState: () => Promise<number>;
  setState: (targetPosition: number) => Promise<void | { aborted: boolean }>;
  logger: Logger;
}) {
  const logger = createChildLogger({ parentLogger, prefix: 'WindowCovering' });
  const service =
    accessory.getService(api.hap.Service.WindowCovering) ||
    accessory.addService(api.hap.Service.WindowCovering);
  service.setCharacteristic(api.hap.Characteristic.Name, name);

  const currentPositionService = await bindService<number>({
    service,
    characteristic: api.hap.Characteristic.CurrentPosition,
    initialValue: await getState(),
    getState,
    logger,
  });

  const targetPositionService = await bindService<number>({
    service,
    characteristic: api.hap.Characteristic.TargetPosition,
    initialValue: currentPositionService.getValue(),
    setState,
    logger,
  });

  targetPositionService.onValue(async (value) =>
    currentPositionService.setValue(value)
  );

  const { STOPPED, INCREASING, DECREASING } =
    api.hap.Characteristic.PositionState;

  const getPositionState = async () => {
    const currentPosition = currentPositionService.getValue();
    const targetPosition = targetPositionService.getValue();
    logger.debug(
      'homekit get position state ' +
        `(current: ${currentPosition} / target: ${targetPosition})`
    );
    if (Math.abs(currentPosition - targetPosition) < tolerance) {
      return STOPPED;
    }
    if (currentPosition < targetPosition) {
      return INCREASING;
    }
    return DECREASING;
  };

  await bindService<PositionState>({
    service,
    characteristic: api.hap.Characteristic.PositionState,
    initialValue: STOPPED,
    getState: getPositionState,
    logger,
    dependencies: [currentPositionService, targetPositionService],
  });
}
