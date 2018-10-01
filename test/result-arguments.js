'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Passing/Resolving Result Arguments`;

// "node_modules/.bin/lab" test/result-arguments.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${plan}: dot, single`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 2);

    const ax = new Asynchro({}, false, ASYNC_LOGGER), one = { object: { array: [123, { object: { value: 456 } } ] } };
    ax.series('one', afn, 1, one, true, false, 300);
    ax.series('two', afn, 2, ax.arg('one.object.array[1].object.value'), true, false, 100);
    const rslt = await ax.run();

    logTest(`${plan}: dot, single`, LOGGER, null, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal(one);
    expect(rslt.two).to.equal(one.object.array[1].object.value);
  });

  lab.test(`${plan}: indexes, multiple`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 1);
    const mfn = flags.mustCall(async (two, c) => {
      return [ two, c ];
    }, 1);

    const ax = new Asynchro({}, false, ASYNC_LOGGER), one = { _object123: { two: [ { value: 2 } ], a:  { b: { c: [false] } } } };
    ax.series('one', afn, 1, one, true, false, 300);
    ax.series('two', mfn, ax.arg('one._object123.two[0].value'), ax.arg(`one["_object123"]['a'][\`b\`].c[0]`));
    const rslt = await ax.run();

    logTest(`${plan}: indexes, multiple`, LOGGER, null, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal(one);
    expect(rslt.two).to.be.array();
    expect(rslt.two[0]).to.equal(one._object123.two[0].value);
    expect(rslt.two[1]).to.equal(one["_object123"]['a'][`b`].c[0]);
  });
});