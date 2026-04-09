/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env jest */

const { expect: jestExpect } = require('@jest/globals');

describe('Detox bootstrap', () => {
  it('keeps e2e scaffold healthy', async () => {
    jestExpect(true).toBe(true);
  });
});
