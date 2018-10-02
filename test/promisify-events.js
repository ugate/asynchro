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
    const listenAsync = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    setTimeout(() => {
      trg.dispatchEvent('event-1', val[0]);
    }, delay);

    try {
      rslt = await listenAsync('event-1');
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: 1 event, 1 result`, LOGGER, null, rslt, error);
    expect(error).to.equal(undefined);
    expect(rslt).to.be.equal(val[0]);
  });

  lab.test(`${plan}: 1 error`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, rslt, error;
    const trg = new TestEventTarget(), testError = new Error('Promisify error');
    const listenAsync = Asynchro.promisifyEventTarget(trg, TEST_TKO);
    const promise = listenAsync('event-1');
  
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
    const listenAsync = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    setTimeout(() => {
      trg.dispatchEvent('event-1', val[0], val[1], val[2]);
    }, delay);

    try {
      rslt = await listenAsync('event-1');
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
    const listenAsync = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    setTimeout(() => {
      for (let i = 1, vi = i; i <= cnt; ++i) {
        vi = dispatchDelay(trg, `event-${i}`, vi, 0) + 1;
      }
    }, delay);

    try {
      for (let i = 1, enm; i <= cnt; ++i) {
        enm = `event-${i}`;
        rslts.push({ event: enm, value: listenAsync(enm) });
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

  lab.test(`${plan}: combos`, { timeout: TEST_TKO }, async (flags) => {
    const trg = new TestEventTarget();
    const listenAsync = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    setTimeout(() => {
      trg.dispatchEvent('my-event-1', 'done');
      trg.dispatchEvent('my-event-2', 1, 2, 3);
      trg.dispatchEvent('my-event-2', 4, 5, 6);
      // my-event-2 will never set the following since it exceeds event max of 1
      trg.dispatchEvent('my-event-2', 'not set');
      trg.dispatchEvent('my-event-3', 1, 2, 3);
      trg.dispatchEvent('my-event-4', 'a', 'b', 'c');
      trg.dispatchEvent('my-event-4', 'd', 'e', 'f');
     }, 10);
     // run in parallel
     const p1 = listenAsync('my-event-1');
     const p2 = listenAsync({ name: 'my-event-2', eventMax: 2 });
     const p3 = listenAsync('my-event-3', ['one', 'two', 'three']);
     const p4 = listenAsync({ name: 'my-event-4', eventMax: 2 }, ['name1', 'name2', 'name3']);
     const p4x = listenAsync({ name: 'my-event-4', eventMax: 2 }, function demoNames(name1, name2, name3){});
     
     const r1 = await p1; // done
     const r2 = await p2; // [[1, 2, 3], [4, 5, 6]]
     const r3 = await p3; // { one: 1, two: 2, three: 3 }
     const r4 = await p4; // [{ name1: 'a', name2: 'b', name3: 'c' }, { name1: 'd', name2: 'e', name3: 'f' }]
     const r4x = await p4x; // [{ name1: 'a', name2: 'b', name3: 'c' }, { name1: 'd', name2: 'e', name3: 'f' }]
    
    logTest(`${plan}: combos`, LOGGER, null, { r1, r2, r3, r4, r4x });
    expect(r1).to.be.equal('done');
    expect(r2).to.be.array();
    expect(r2).to.be.length(2);
    expect(r3).to.be.object();
    expect(r3.one).to.be.equal(1);
    expect(r3.two).to.be.equal(2);
    expect(r3.three).to.be.equal(3);
    for (let i = 0, idx = 0; i < 2; ++i) {
      expect(r2[i]).to.be.array();
      expect(r2[i]).to.be.length(3);
      for (let j = 0; j < 3; ++j) {
        expect(r2[i][j]).to.be.equal(++idx);
      }
      expect(r4[i]).to.be.object();
      expect(r4x[i]).to.be.object();
      expect(r4[i].name1).to.be.equal(i === 0 ? 'a' : 'd');
      expect(r4[i].name2).to.be.equal(i === 0 ? 'b' : 'e');
      expect(r4[i].name3).to.be.equal(i === 0 ? 'c' : 'f');
      expect(r4x[i].name1).to.be.equal(i === 0 ? 'a' : 'd');
      expect(r4x[i].name2).to.be.equal(i === 0 ? 'b' : 'e');
      expect(r4x[i].name3).to.be.equal(i === 0 ? 'c' : 'f');
    }
  });

  lab.test(`${plan}: in queue`, { timeout: TEST_TKO }, async (flags) => {
    var delay = 10, one = 1, two = 2, three = 3, four = 4;
    const trg = new TestEventTarget();
    const listenAsync = Asynchro.promisifyEventTarget(trg, TEST_TKO);

    const ax = new Asynchro({}, false, ASYNC_LOGGER);
    ax.parallel('one', asyncCall, 1, one, true, false, delay);
    ax.series('two', listenAsync, 'event-1');
    ax.series('three', asyncCall, 3, three, true, false, delay);
    ax.parallel('four', listenAsync, 'event-2');

    setTimeout(() => {
      trg.dispatchEvent('event-1', two);
      setTimeout(() => {
        trg.dispatchEvent('event-2', four);
      }, delay * 2); // delay must be between delay on "three" and TEST_TKO
    }, delay); // delay must be between delay on "one" and TEST_TKO
    
    const rslt = await ax.run();
    
    logTest(`${plan}: in queue`, LOGGER, null, rslt);
    expect(rslt).to.be.object();
    expect(rslt.one).to.equal(one);
    expect(rslt.two).to.equal(two);
    expect(rslt.three).to.equal(three);
    expect(rslt.four).to.equal(four);
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