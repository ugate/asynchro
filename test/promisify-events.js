'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro, TestEventTarget } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro, TestEventTarget } from './_main.mjs';

const plan = `${PLAN} Promisify Events`;

// "node_modules/.bin/lab" test/promisify-events.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${plan}: 1 event, 1 result`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, rslt, error;
    const trg = new TestEventTarget(), val = [123];
    const fn = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    setTimeout(() => {
      trg.dispatchEvent('event-1', val[0]);
    }, delay);

    try {
      rslt = await fn('event-1');
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: 1 event, 1 result`, LOGGER, null, rslt, error);
    expect(error).to.equal(undefined);
    expect(rslt).to.be.array();
    expect(rslt).to.be.length(val.length);
    for (let i = 0; i < rslt.length; ++i) expect(rslt[i]).to.be.equal(val[i]);
  });

  lab.test(`${plan}: 1 error`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, rslt, error;
    const trg = new TestEventTarget(), testError = new Error('Promisify error');
    const fn = Asynchro.promisifyEventTarget(trg, TEST_TKO);
    const promise = fn('event-1');
  
    setTimeout(() => {
      trg.dispatchEvent('error', testError);
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

  lab.test(`${plan}: 1 event, 3 results`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, rslt, error;
    const trg = new TestEventTarget(), val = [1, 2, 3];
    const fn = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    setTimeout(() => {
      trg.dispatchEvent('event-1', val[0], val[1], val[2]);
    }, delay);

    try {
      rslt = await fn('event-1');
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: 1 event, 3 results`, LOGGER, null, rslt, error);
    expect(error).to.equal(undefined);
    expect(rslt).to.be.array();
    expect(rslt).to.be.length(val.length);
    for (let i = 0; i < rslt.length; ++i) expect(rslt[i]).to.be.equal(val[i]);
  });

  lab.test(`${plan}: 3 events, 3 results`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, error;
    const trg = new TestEventTarget(), cnt = 3, rslts = [];
    const fn = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    setTimeout(() => {
      for (let i = 1, vi = i; i <= cnt; ++i) {
        vi = dispatchDelay(trg, `event-${i}`, vi, 0) + 1;
      }
    }, delay);

    try {
      for (let i = 1, enm; i <= cnt; ++i) {
        enm = `event-${i}`;
        rslts.push({ event: enm, value: fn(enm) });
      }
      for (let itm of rslts) itm.value = await itm.value;
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: 1 event, 3 results`, LOGGER, null, rslts, error);
    expect(error).to.equal(undefined);
    for (let i = 0, vi = 0; i < cnt; ++i) {
      expect(rslts[i].value).to.be.array();
      expect(rslts[i].value).to.be.length(cnt);
      for (let j = 0; j < cnt; ++j) {
        expect(rslts[i].value[j]).to.be.equal(++vi);
      }
    }
  });

  lab.test(`${plan}: in queue`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, one = 1, two = 2, three = 3, four = 4;
    const trg = new TestEventTarget();
    const fn = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    const ax = new Asynchro({}, false, ASYNC_LOGGER);
    ax.parallel('one', asyncCall, 1, one, true, false, delay);
    ax.series('two', fn, 'event-1');
    ax.series('three', asyncCall, 3, three, true, false, delay);
    ax.parallel('four', fn, 'event-2');

    setTimeout(() => {
      trg.dispatchEvent('event-1', two);
      trg.dispatchEvent('event-2', four);
    }, delay * 4); // delay must be between delay on "one" and TEST_TKO
    
    const rslt = await ax.run();
    
    logTest(`${plan}: in queue`, LOGGER, null, rslt);
    // expect(rslt).to.be.object();
    // expect(rslt.one).to.equal(one);
    // expect(rslt.two).to.equal(two);
    // expect(rslt.three).to.equal(three);
  });
});

function dispatchDelay(trg, event, value, delay) {
  const val1 = value, val2 = val1 + 1, val3 = val2 + 1;
  if (!delay) trg.dispatchEvent(event, val1, val2, val3);
  else setTimeout(() => {
    trg.dispatchEvent(event, val1, val2, val3);
  }, delay);
  return val1 + 2;
}