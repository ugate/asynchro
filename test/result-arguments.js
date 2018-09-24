'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Passing/Resolving Result Arguments`;

// "node_modules/.bin/lab" test/stops.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${plan}: no-error`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 2);

    const ax = new Asynchro({}, false, ASYNC_LOGGER), one = { object: { array: [123, { object: { value: 456 } } ] } };
    ax.series('one', afn, 1, one, true, false, 300);
    ax.series('two', afn, 1, ax.resultArg('one.object.array[1].object.value'), true, false, 100);
    const rslt = await ax.run();

    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal(one);
    expect(rslt.two).to.equal(one.object.array[1].object.value);
  });
});