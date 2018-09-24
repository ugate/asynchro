'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Background`;

// "node_modules/.bin/lab" test/stops.js -vi 1

lab.experiment(plan, () => {

  // lab.test(`${PLAN}: background (error)`, { timeout: TEST_TKO }, async (flags) => {
  //   const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
  //   var delay = TASK_DELAY, count = 0, bgIdx = -1, bgVals = [new Error('Background test error')];

  //   const ax = new Asynchro({}, true, ASYNC_LOGGER);
  //   ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
  //   ax.background('two', false, afn, ++count, bgVals[++bgIdx], true, true, TASK_DELAY); // delay longer than other tasks in order to validate
  //   ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
  //   const rslt = await ax.run();

  //   logTest(`${PLAN}: background`, ax, rslt);
  //   const bgps = ax.backgroundPromises;
  //   expect(bgps).not.to.be.empty();
  //   expect(rslt.one).to.equal('A');
  //   expect(rslt.two).to.equal(undefined);
  //   expect(rslt.three).to.equal('C');

  //   bgIdx = -1;
  //   for (let bgr of bgps) {
  //     try {
  //       bgr = await bgr;
  //     } catch (err) {
  //       bgr = err;
  //     }
  //     expect(bgr).to.equal(bgVals[++bgIdx]);
  //   }
  // });

  lab.test(`${plan}: no-error`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, count = 0, bgIdx = -1, bgs = [{ name: 'two', value: 'B' }];

    const ax = new Asynchro({}, true, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.background(bgs[++bgIdx].name, false, afn, ++count, bgs[bgIdx].value, true, false, TASK_DELAY); // delay longer than other tasks in order to validate
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    const rslt = await ax.run();

    logTest(`${plan}: no-error`, LOGGER, ax, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.two).to.equal(undefined);
    expect(rslt.three).to.equal('C');

    const bgr = {};
    const errors = await ax.backgroundWaiter(bgr);
    expect(errors).to.be.empty();
    for (let itm of bgs) expect(itm.value).to.equal(bgr[itm.name]);
  });

  lab.test(`${plan}: error`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 3); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, count = 0, bgIdx = -1, bgs = [{ name: 'two', value: new Error('Background test error') }];

    const ax = new Asynchro({}, true, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.background(bgs[++bgIdx].name, false, afn, ++count, bgs[bgIdx].value, true, true, TASK_DELAY); // delay longer than other tasks in order to validate
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    const rslt = await ax.run();

    logTest(`${plan}: error`, LOGGER, ax, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.two).to.equal(undefined);
    expect(rslt.three).to.equal('C');

    const bgr = {};
    const errors = await ax.backgroundWaiter(bgr);
    expect(errors).not.to.be.empty();
    expect(errors.length).to.be.equal(bgs.length);
    bgIdx = -1;
    for (let err of errors) expect(err).to.equal(bgs[++bgIdx].value);
    expect(bgIdx).to.equal(bgs.length - 1);
    bgIdx = -1;
    for (let nm in bgr) {
      bgIdx++;
      expect(bgr[nm]).to.equal(undefined);
    }
    expect(bgIdx).to.equal(bgs.length - 1);
  });
});