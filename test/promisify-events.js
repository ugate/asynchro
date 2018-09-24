'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro, EventEmitter } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro, EventEmitter } from './_main.mjs';

const plan = `${PLAN} Promisify Events`;

// "node_modules/.bin/lab" test/stops.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${plan}: no-error`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, rslt, error;
    const evm = new EventEmitter(), val = 123;
    const promise = Asynchro.promisifyEvents(evm, ['promisifyEvents'], TEST_TKO);
    setTimeout(() => {
      evm.emit('promisifyEvents', val);
    }, delay);
    try {
      rslt = await promise;
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: no-error`, LOGGER, null, rslt, error);
    expect(error).to.equal(undefined);
    expect(rslt).to.equal(val);
  });

  lab.test(`${plan}: error`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, rslt, error;
    const evm = new EventEmitter(), testError = new Error('Promisify error');
    const promise = Asynchro.promisifyEvents(evm, ['promisifyEvents'], TEST_TKO);
    setTimeout(() => {
      evm.emit('error', testError);
    }, delay);
    try {
      rslt = await promise;
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: error`, LOGGER, null, rslt, error);
    expect(rslt).to.be.undefined();
    expect(error).to.be.an.error(testError.message);
  });
});