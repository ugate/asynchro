'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Background`;

// "node_modules/.bin/lab" test/background.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${PLAN}: waiter, delayed error`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, count = 0, bgIdx = -1, bgVals = [new Error('Background test error')];

    const ax = new Asynchro({}, true, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.backgroundThrowsOverride('two', false, afn, ++count, bgVals[++bgIdx], true, true, TASK_DELAY); // delay longer than other tasks in order to validate
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    const rslt = await ax.run();

    logTest(`${PLAN}: waiter, delayed error (pending)`, LOGGER, ax, rslt, ax.errors && ax.errors[0]);
    expect(rslt).to.be.object();
    expect(rslt).to.be.equal(ax.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.hasOwnProperty('two')).to.be.false();
    expect(rslt.three).to.equal('C');
    expect(ax.errors).to.be.array();
    expect(ax.errors).to.be.empty();

    const abx = await ax.backgroundWaiter(ax.result);
    logTest(`${PLAN}: waiter, delayed error`, LOGGER, abx, abx.result, abx.errors && abx.errors[0]);
    expect(rslt.one).to.equal('A');
    expect(rslt.hasOwnProperty('two')).to.be.true();
    expect(rslt.two).to.be.undefined();
    expect(rslt.three).to.equal('C');
    expect(abx.errors).to.be.equal(ax.errors);
    expect(abx.errors).to.be.array();
    expect(abx.errors).to.be.length(1);
    expect(abx.errors[0]).to.be.equal(bgVals[0]);
    expect(abx.errors[0][Asynchro.name]).to.be.object();
    expect(abx.errors[0][Asynchro.name].isPending).to.be.false();
    expect(abx.errors[0][Asynchro.name].isParallel).to.be.false();
    expect(abx.errors[0][Asynchro.name].isBackground).to.be.true();
    expect(abx.errors[0][Asynchro.name].name).to.equal('two');
  });

  lab.test(`${plan}: waiter, multiple caught errors`, { timeout: TEST_TKO }, async (flags) => {
    const ax = new Asynchro({}, false, ASYNC_LOGGER);
    ax.series('one', multiply, 1, 2, 3); // multiply from previous examples
    ax.background('two', multiply, 4, 5, 6);
    ax.background('three', multiply, 0);
    ax.background('four', multiply, 1, 2, 3, { reject: true });
    ax.background('five', multiply, 1, 0, 3, { reject: true });
    expect(ax.waiting).to.equal(1);
    expect(ax.waitingBackground).to.equal(4);
    var rslt = await ax.run();

    logTest(`${PLAN}: waiter, multiple caught errors (pending)`, LOGGER, ax, rslt);
    expect(ax.waiting).to.equal(0);
    expect(ax.waitingBackground).to.equal(4);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.be.object();
    expect(rslt.one.m1).to.equal(10);
    expect(rslt.one.m2).to.equal(40);
    expect(rslt.one.m3).to.equal(90);
    expect(rslt.two).to.be.undefined();
    expect(rslt.three).to.be.undefined();
    expect(rslt.four).to.be.undefined();
    expect(rslt.five).to.be.undefined();
    expect(ax.errors).to.be.array();
    expect(ax.errors).to.be.length(1);
    expect(ax.errors[0]).to.be.error();
  
    const abx = await ax.backgroundWaiter();
    logTest(`${PLAN}: waiter, multiple caught errors`, LOGGER, ax, rslt);
    expect(ax.waiting).to.equal(0);
    expect(ax.waitingBackground).to.equal(0);
    expect(rslt.one).to.be.object();
    expect(rslt.one.m1).to.equal(10);
    expect(rslt.one.m2).to.equal(40);
    expect(rslt.one.m3).to.equal(90);
    expect(rslt.two).to.be.object();
    expect(rslt.two.m1).to.equal(40);
    expect(rslt.two.m2).to.equal(100);
    expect(rslt.two.m3).to.equal(180);
    expect(rslt.three).to.be.undefined();
    expect(rslt.four).to.be.undefined();
    expect(rslt.five).to.be.undefined();
    expect(abx.errors).to.be.equal(ax.errors);
    expect(abx.errors).to.be.array();
    expect(abx.errors).to.be.length(2);
    var idx = -1;
    for (let err of abx.errors) {
      idx++;
      expect(err).to.be.error();
      expect(err[Asynchro.name]).to.be.object();
      expect(err[Asynchro.name].isPending).to.be.false();
      expect(err[Asynchro.name].isParallel).to.be.false();
      expect(err[Asynchro.name].isBackground).to.be.true();
      expect(err[Asynchro.name].operation).to.be.equal(multiply.name);
      if (idx === 0) {
        expect(err[Asynchro.name].name).to.be.equal('three');
      } else if (idx === 1) {
        expect(err[Asynchro.name].name).to.be.equal('four');
      }
    }
  });

  lab.test(`${plan}: no-error`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, count = 0, bgIdx = -1, bgs = [{ name: 'two', value: 'B' }];

    const ax = new Asynchro({}, true, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.backgroundThrowsOverride(bgs[++bgIdx].name, false, afn, ++count, bgs[bgIdx].value, true, false, TASK_DELAY); // delay longer than other tasks in order to validate
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    const rslt = await ax.run();

    logTest(`${plan}: no-error`, LOGGER, ax, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.two).to.equal(undefined);
    expect(rslt.three).to.equal('C');

    const abx = await ax.backgroundWaiter();
    expect(rslt).to.equal(ax.result);
    expect(abx.errors).to.be.empty();
    for (let itm of bgs) expect(itm.value).to.equal(rslt[itm.name]);
  });

  lab.test(`${plan}: error`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, count = 0, bgIdx = -1, bgs = [{ name: 'two', value: new Error('Background test error') }];

    const ax = new Asynchro({}, true, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.backgroundThrowsOverride(bgs[++bgIdx].name, false, afn, ++count, bgs[bgIdx].value, true, true, TASK_DELAY); // delay longer than other tasks in order to validate
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    const rslt = await ax.run();

    logTest(`${plan}: error`, LOGGER, ax, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.two).to.equal(undefined);
    expect(rslt.three).to.equal('C');

    const abx = await ax.backgroundWaiter();
    expect(rslt).to.equal(abx.result);
    expect(abx.errors).not.to.be.empty();
    expect(abx.errors).to.be.length(bgs.length);
    bgIdx = -1;
    for (let err of abx.errors) {
      expect(err).to.equal(bgs[++bgIdx].value);
    }
  });
});

/**
 * Multiplies numeric values in an asynchronous manner with various validations
 * @param {Integer} a a non-zero value to multiple with `10`
 * @param {Integer} [b] a non-zero value to multiply with `20`
 * @param {Integer} [c] a value to multiply with `30`
 * @param {Object} [obj] object for determining rejection (can be set after call, but before `10` milliseconds elapses)
 * @param {Boolean} [obj.reject] `true` to reject after time elapses
 * @returns {(Promise|undefined)} either the promise that resolves/rejects after `10` milliseconds or `undefined` when
 * `b` is falsy
 */
function multiply(a, b, c, obj) {
  if (!a) throw new Error(`"a" must be a number greater than zero, but received: ${a}`);
  if (!b) return;
  return multiplier(a, b, c, obj)
}

/**
 * Multiplies numeric values in an asynchronous manner
 * @param {Integer} a a non-zero value to multiple with `10`
 * @param {Integer} b a non-zero value to multiply with `20`
 * @param {Integer} [c=0] a value to multiply with `30`
 * @param {Object} [obj] object for determining rejection (can be set after call, but before `10` milliseconds elapses)
 * @param {Boolean} [obj.reject] `true` to reject after time elapses
 * @returns {Promise} the promise that resolves/rejects after `10` milliseconds
 */
function multiplier(a, b, c = 0, obj) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (obj && obj.reject) reject(new Error('Example error after timeout'));
      else resolve({ m1: 10 * a, m2: 20 * b, m3: 30 * (c || 0) });
    }, 10);
  });
}