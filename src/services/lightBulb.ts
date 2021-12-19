import type { PlatformAccessory, Logger, API } from 'homebridge';
import { createChildLogger } from '../utils';
import { bindService } from './helpers';

export type LightBulb = Awaited<ReturnType<typeof createLightBulb>>;

export async function createLightBulb({
  api,
  accessory,
  name,
  getState,
  setState,
  logger: parentLogger,
}: {
  api: API;
  accessory: PlatformAccessory;
  name: string;
  getState: () => Promise<boolean>;
  setState: (isOn: boolean) => Promise<void | { aborted: boolean }>;
  logger: Logger;
}) {
  const logger = createChildLogger({ parentLogger, prefix: 'LightBulb' });
  const service =
    accessory.getService(api.hap.Service.Lightbulb) ||
    accessory.addService(api.hap.Service.Lightbulb);
  service.setCharacteristic(api.hap.Characteristic.Name, name);

  const lightOnService = await bindService<boolean>({
    service,
    characteristic: api.hap.Characteristic.On,
    initialValue: await getState(),
    getState,
    setState,
    logger,
  });

  return { lightOnService };
}
