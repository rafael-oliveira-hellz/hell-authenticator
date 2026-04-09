/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env jest */

const { by, element, expect: detoxExpect, waitFor } = require('detox');

describe('Auth flow', () => {
  it('navigates from login to register and back', async () => {
    await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(30000);
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();

    await element(by.id('login-register-link')).tap();
    await waitFor(element(by.id('register-screen'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('register-screen'))).toBeVisible();

    await element(by.id('register-login-link')).tap();
    await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(10000);
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });
});
