'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Verify`;

// "node_modules/.bin/lab" test/verify.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${plan}: message override`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 1);

    const ax = new Asynchro({}, false, ASYNC_LOGGER), msg = 'An overridden task message', val = 'A';
    ax.series('one', afn, 1, val, true, false, 300);
    ax.verify('one', it => {
      it.message = msg;
    });
    const rslt = await ax.run();

    logTest(`${plan}: message override`, LOGGER, ax, rslt);
    expect(ax.errors.length).to.equal(0);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal(val);
    expect(ax.messages()).to.equal(msg);
  });
});