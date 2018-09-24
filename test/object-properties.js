'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Object Properties`;

// "node_modules/.bin/lab" test/stops.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${plan}: match (throw)`, { timeout: TEST_TKO }, async (flags) => {
    const afn = asyncCall;
    var delay = TASK_DELAY, count = 0, rslt, error;

    const msg = `Test ${plan} match (throw)`, testError = new Error(msg);
    const ax = new Asynchro({}, { matches: { message: msg } }, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.parallel('two', afn, ++count, testError, true, true, delay -= 10);
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    try {
      rslt = await ax.run();
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: match (throw)`, LOGGER, ax, rslt, error);
    expectABC(ax, error, testError, true);
  });

  lab.test(`${plan}: no-match (catch)`, { timeout: TEST_TKO }, async (flags) => {
    const afn = asyncCall;
    var delay = TASK_DELAY, count = 0, rslt, error;

    const msg = `Test ${plan} no-match (catch)`, testError = new Error(msg);
    const ax = new Asynchro({}, { matches: { message: 'Non-matching error message' } }, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.parallel('two', afn, ++count, testError, true, true, delay -= 10);
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    try {
      rslt = await ax.run();
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: no-match (catch)`, LOGGER, ax, rslt, error);
    expectABC(ax, error, testError);
  });

  lab.test(`${plan}: invert match (catch)`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, count = 0, rslt, error;

    const msg = `Test ${plan} invert match (catch)`, testError = new Error(msg);
    const ax = new Asynchro({}, { invert: true, matches: { message: msg } }, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.parallel('two', afn, ++count, testError, true, true, delay -= 10);
    ax.series('three', afn, ++count, 'C', true, false, delay -= 10);
    try {
      rslt = await ax.run();
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: invert match (catch)`, LOGGER, ax, rslt, error);
    expectABC(ax, error, testError);
  });

  lab.test(`${plan}: invert no-match (throw)`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, count = 0, rslt, error;

    const msg = `Test ${plan} invert no-match (throw)`, testError = new Error(msg);
    const ax = new Asynchro({}, { invert: true, matches: { message: 'Non-matching error message' } }, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.parallel('two', afn, ++count, testError, true, true, delay -= 10);
    ax.series('three', afn, ++count, 'C', true, false, delay -= 10);
    try {
      rslt = await ax.run();
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: invert no-match (throw)`, LOGGER, ax, rslt, error);
    expectABC(ax, error, testError, true);
  });
});