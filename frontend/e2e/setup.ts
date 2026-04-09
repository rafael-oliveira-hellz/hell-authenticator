/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env jest */

const { device } = require('detox');

beforeEach(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: {
      camera: 'YES',
    },
  });

  await device.disableSynchronization();
});