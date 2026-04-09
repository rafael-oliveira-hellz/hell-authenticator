/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env jest */

const { by, element, expect: detoxExpect, waitFor } = require('detox');

describe('Smoke', () => {
  it('launches the app', async () => {
    await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(30000);
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });
});
