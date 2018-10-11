'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Branches`;

// "node_modules/.bin/lab" test/branches.js -vi 1

lab.experiment(plan, () => {

  lab.test(`${plan}: throws = true`, { timeout: TEST_TKO }, async (flags) => {
    const afn = asyncCall;
    var delay = TASK_DELAY, count = 0, rslt, error;

    const msg = 'Test throws = true', testError = new Error(msg);
    const ax = new Asynchro({}, true, ASYNC_LOGGER);
    ax.series('one', afn, ++count, 'A', true, false, delay -= 10);
    ax.parallel('two', afn, ++count, testError, true, true, delay -= 10);
    ax.parallel('three', afn, ++count, 'C', true, false, delay -= 10);
    try {
      rslt = await ax.run();
    } catch (err) {
      error = err;
    }
    logTest(`${plan}: throws = true`, LOGGER, ax, rslt, error);
    expectABC(ax, error, testError, true);
  });

  lab.test(`${plan}: parallel stop`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 9); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY;

    // decrement delay in order to force the natrual order of execution is reversed, yet asyncs order should still be maintained by Asynchro
    const ax = new Asynchro({}, false, ASYNC_LOGGER), verifyValue = 'Value from test verify', verifyStopValue = 'Value from stop test verify';
    ax.series('one', afn, 1, 'A', true, false, delay -= 10);
    ax.series('two', afn, 2, null, false, false, delay -= 10);
    ax.series('three', afn, 3, 'B', true, false, delay -= 10);
    ax.parallel('four', afn, 4, null, false, false, delay -= 10);
    ax.parallel('five', afn, 5, 'C', true, false, delay -= 10);
    ax.parallel('six', afn, 6, 'D', true, false, delay -= 10);
    ax.series('seven', afn, 7, null, false, false, delay -= 10);
    ax.series('eight', afn, 8, 'E', true, false, delay -= 10);
    ax.parallel('nine', afn, 9, null, false, false, delay -= 10);
    ax.parallel('shouldNotRun', afn, 10, 'F', true, true, delay -= 10);
    ax.series('shouldNotRun2', afn, 11, 'G', true, false, delay -= 10);
    ax.verify('four', async it => {
      it.result = verifyValue;
    });
    ax.verify('nine', async it => {
      it.result = verifyStopValue;
      return false; // stop the queue from continuing to process/run
    });
    expect(ax.status).to.equal(Asynchro.QUEUEING);
    const rslt = await ax.run();

    logTest(`${plan}: parallel stop`, LOGGER, ax, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.two).to.equal(undefined);
    expect(rslt.three).to.equal('B');
    expect(rslt.four).to.equal(verifyValue);
    expect(rslt.five).to.equal('C');
    expect(rslt.six).to.equal('D');
    expect(rslt.seven).to.equal(undefined);
    expect(rslt.eight).to.equal('E');
    expect(rslt.nine).to.equal(verifyStopValue);
    expect(rslt.shouldNotRun).to.equal(undefined);
    expect(rslt.shouldNotRun2).to.equal(undefined);
    expect(ax.status).to.equal(Asynchro.STOPPED);
  });

  lab.test(`${plan}: series stop, synchronous series function`, { timeout: TEST_TKO }, async (flags) => {
    const afn = flags.mustCall(asyncCall, 8); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY;

    // decrement delay in order to force the natrual order of execution is reversed, yet asyncs order should still be maintained by Asynchro
    const ax = new Asynchro({}, false, ASYNC_LOGGER), verifyValue = 'Override value from test verify';
    const verifyStopValue = 'Override value from stop test verify', syncArg = 'synchronous series arg';
    ax.series('one', afn, 1, 'A', true, false, delay -= 10);
    ax.series('sync', function testSyncFunc(arg) {
      return arg;
    }, syncArg);
    ax.series('two', afn, 2, null, false, false, delay -= 10);
    ax.series('three', afn, 3, 'B', true, false, delay -= 10);
    ax.parallel('four', afn, 4, null, false, false, delay -= 10);
    ax.parallel('five', afn, 5, 'C', true, false, delay -= 10);
    ax.parallel('six', afn, 6, 'D', true, false, delay -= 10);
    ax.series('seven', afn, 7, null, false, false, delay -= 10);
    ax.series('eight', afn, 8, 'E', true, false, delay -= 10);
    ax.parallel('nine', afn, 9, null, false, false, delay -= 10);
    ax.parallel('shouldNotRun', afn, 10, 'F', true, false, delay -= 10);
    ax.series('shouldNotRun2', afn, 11, 'G', true, false, delay -= 10);
    ax.verify('four', async it => {
      it.result = verifyValue;
    });
    ax.verify('eight', async it => {
      it.result = verifyStopValue;
      return false; // stop the queue from continuing to process/run
    });
    expect(ax.status).to.equal(Asynchro.QUEUEING);
    const rslt = await ax.run();

    logTest(`${plan}: series stop`, LOGGER, ax, rslt);
    expect(rslt).to.equal(ax.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.sync).to.equal(syncArg);
    expect(rslt.two).to.be.undefined();
    expect(rslt.three).to.equal('B');
    expect(rslt.four).to.equal(verifyValue);
    expect(rslt.five).to.equal('C');
    expect(rslt.six).to.equal('D');
    expect(rslt.seven).to.be.undefined();
    expect(rslt.eight).to.equal(verifyStopValue);
    expect(rslt.nine).to.be.undefined();
    expect(rslt.shouldNotRun).to.be.undefined();
    expect(rslt.shouldNotRun2).to.be.undefined();
    //expect(ax.errors.length).to.equal(1);
    expect(ax.status).to.equal(Asynchro.STOPPED);
  });

  lab.test(`${plan}: 1x transfer with background waiter`, { timeout: TEST_TKO }, async (flags) => {
    const afn = asyncCall;//flags.mustCall(asyncCall, 7); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, num = 0, cnt1 = 0, cnt2 = 0, cntBg1 = 0, cntBg2 = 0;

    // decrement delay in order to force the natrual order of execution is reversed, yet asyncs order should still be maintained by Asynchro
    const origResult = {};
    const ax = new Asynchro(origResult, false, ASYNC_LOGGER), verifyValue = 'Override value from test verify', verifyStopValue = 'Override value from transfer test verify';
    const axt = new Asynchro(origResult, false, ASYNC_LOGGER);
    ax.background('one', afn, ++cntBg1 && ++num, 'A', true, false, delay -= 10);
    ax.series('two', afn, ++cnt1 && ++num, 'B', true, false, delay -= 10);
    ax.parallel('three', afn, ++cnt1 && ++num, 'C', true, false, delay -= 10);
    ax.parallel('four', afn, ++cnt1 && ++num, 'D', true, false, delay -= 10);
    ax.parallel('five', afn, ++cnt1 && ++num, 'E', true, false, delay -= 10);
    ax.series('six', afn, ++cnt1 && ++num, 'F', false, false, delay -= 10);
    ax.series('seven', afn, ++cnt1 && ++num, 'G', false, false, delay -= 10);
    ax.parallel('eight', afn, ++cnt1 && ++num, 'H', true, false, delay -= 10);
    ax.verify('three', flags.mustCall(async it => {
      expect(ax.status).to.equal(Asynchro.RUNNING);
      expect(axt.status).to.equal(Asynchro.QUEUEING);
      if (it.isPending) {
        expect(ax.waiting).to.equal(cnt1 - 1); // exclude the current task: once executed the count decrements
        expect(ax.waitingBackground).to.equal(cntBg1);
      } else it.result = verifyValue;
    }, 2));
    ax.verify('four', flags.mustCall(async it => {
      expect(ax.status).to.equal(Asynchro.RUNNING);
      expect(axt.status).to.equal(Asynchro.QUEUEING);
      if (it.isPending) { // execute when parallel function is first called (called 2x, 1st for function call, 2nd for await on the promise)
        axt.background('twelve', afn, ++cntBg2 && ++num, 'L', true, false, delay -= 10);
        axt.series('nine', afn, ++cnt2 && ++num, 'I', true, false, delay -= 10);
        axt.parallel('ten', afn, ++cnt2 && ++num, 'J', true, true, delay -= 10);
        axt.parallel('eleven', afn, ++cnt2 && ++num, 'K', true, false, delay -= 10);
        expect(axt.waiting).to.equal(cnt2);
        expect(axt.waitingBackground).to.equal(cntBg2);
        return axt; // stop the queue from continuing to process/run and transfer/run the new one
      } else it.result = verifyStopValue;
    }, 2));
    expect(ax.status).to.equal(Asynchro.QUEUEING);
    expect(axt.status).to.equal(Asynchro.QUEUEING);
    expect(ax.waiting).to.equal(cnt1);
    expect(ax.waitingBackground).to.equal(cntBg1);
    const rslt = await ax.run();

    logTest(`${plan}: 1x transfer with background waiter`, LOGGER, ax, rslt, ax.errors);
    expect(ax.waiting).to.equal(0);
    expect(axt.waiting).to.equal(0);
    expect(ax.waitingBackground).to.equal(cntBg1);
    expect(axt.waitingBackground).to.equal(cntBg2);
    expect(origResult).to.equal(ax.result);
    expect(origResult).to.equal(axt.result);
    expect(rslt).to.equal(ax.result);
    expect(rslt).to.equal(axt.result);
    expect(rslt.one).to.be.undefined();
    expect(rslt.two).to.equal('B');
    expect(rslt.three).to.equal(verifyValue);
    expect(rslt.four).to.equal(verifyStopValue);
    expect(rslt.five).to.be.undefined();
    expect(rslt.six).to.be.undefined();
    expect(rslt.seven).to.be.undefined();
    expect(rslt.eight).to.be.undefined();
    expect(rslt.nine).to.equal('I');
    expect(rslt.ten).to.be.undefined();
    expect(rslt.eleven).to.equal('K');
    expect(rslt.twelve).to.be.undefined();
    expect(ax.errors).to.be.empty();
    expect(ax.status).to.equal(Asynchro.TRANSFERRED);
    expect(axt.status).to.equal(Asynchro.FAILED);
    expect(axt.errors.length).to.equal(1);
    expect(axt.errors[0]).to.be.an.error('J');
    
    const abx = await ax.backgroundWaiter();
    expect(abx).to.equal(axt);
    expect(ax.waiting).to.equal(0);
    expect(abx.waiting).to.equal(0);
    expect(ax.waitingBackground).to.equal(0);
    expect(abx.waitingBackground).to.equal(0);
    expect(rslt).to.equal(abx.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.twelve).to.equal('L');
    expect(abx.errors.length).to.equal(1);
    expect(abx.errors[0]).to.be.an.error('J');
  });

  lab.test(`${plan}: pre-queued 2x transfers with 3x background waiters`, { timeout: TEST_TKO }, async (flags) => {
    const afn = asyncCall;//flags.mustCall(asyncCall, 7); // some errors will be hidden when using this: comment out to view
    var delay = TASK_DELAY, num = 0, cnt1 = 0, cnt2 = 0, cnt3 = 0, cntBg1 = 0, cntBg2 = 0, cntBg3 = 0;

    // decrement delay in order to force the natrual order of execution is reversed, yet asyncs order should still be maintained by Asynchro
    const origResult = {};
    const ax = new Asynchro(origResult, false, ASYNC_LOGGER), verifyStopValue = 'Override value from transfer test verify';
    const axt = new Asynchro(origResult, false, ASYNC_LOGGER);
    const axt2 = new Asynchro(origResult, false, ASYNC_LOGGER);
    ax.background('one', afn, ++cntBg1 && ++num, 'A', true, false, delay -= 10);
    ax.series('two', afn, ++cnt1 && ++num, 'B', true, false, delay -= 10);
    ax.parallel('three', afn, ++cnt1 && ++num, 'C', true, false, delay -= 10);
    ax.verify('three', flags.mustCall(async it => it.isPending ? axt : !(it.result = verifyStopValue), 2));
    ax.parallel('four', afn, ++cnt1 && ++num, 'D', true, false, delay -= 10);
    axt.background('five', afn, ++cntBg2 && ++num, 'E', true, false, delay -= 10);
    axt.series('six', afn, ++cnt2 && ++num, 'F', true, true, delay -= 10);
    axt.verify('six', flags.mustCall(async it => it.error ? axt2 : null, 1));
    axt.parallel('seven', afn, ++cnt2 && ++num, 'G', true, false, delay -= 10);
    axt2.series('eight', afn, ++cnt3 && ++num, 'H', true, false, delay -= 10);
    axt2.background('nine', afn, ++cntBg3 && ++num, 'I', true, false, delay -= 10);
    axt2.series('ten', afn, ++cnt3 && ++num, 'J', true, true, delay -= 10);
    expect(ax.status).to.equal(Asynchro.QUEUEING);
    expect(axt.status).to.equal(Asynchro.QUEUEING);
    expect(axt2.status).to.equal(Asynchro.QUEUEING);
    expect(ax.waiting).to.equal(cnt1);
    expect(axt.waiting).to.equal(cnt2);
    expect(axt2.waiting).to.equal(cnt3);
    expect(ax.waitingBackground).to.equal(cntBg1);
    expect(axt.waitingBackground).to.equal(cntBg2);
    expect(axt2.waitingBackground).to.equal(cntBg3);
    const rslt = await ax.run();

    logTest(`${plan}: pre-queued 2x transfers with 3x background waiters`, LOGGER, ax, rslt, ax.errors);
    expect(ax.waiting).to.equal(0);
    expect(axt.waiting).to.equal(0);
    expect(axt2.waiting).to.equal(0);
    expect(ax.waitingBackground).to.equal(cntBg1);
    expect(axt.waitingBackground).to.equal(cntBg2);
    expect(axt2.waitingBackground).to.equal(cntBg3);
    expect(origResult).to.equal(rslt);
    expect(origResult).to.equal(ax.result);
    expect(origResult).to.equal(axt.result);
    expect(origResult).to.equal(axt2.result);
    expect(rslt.one).to.be.undefined();
    expect(rslt.two).to.equal('B');
    expect(rslt.three).to.equal(verifyStopValue);
    expect(rslt.four).to.be.undefined();
    expect(rslt.five).to.be.undefined();
    expect(rslt.six).to.be.undefined();
    expect(rslt.seven).to.be.undefined();
    expect(rslt.eight).to.equal('H');
    expect(rslt.nine).to.be.undefined();
    expect(rslt.ten).to.be.undefined();
    expect(ax.errors).to.be.empty();
    expect(ax.status).to.equal(Asynchro.TRANSFERRED);
    expect(axt.status).to.equal(Asynchro.TRANSFERRED);
    expect(axt2.status).to.equal(Asynchro.FAILED);
    expect(axt2.errors.length).to.equal(2);
    expect(axt.errors[0]).to.be.an.error('F');
    expect(axt.errors[1]).to.be.an.error('J');
    
    const abx = await ax.backgroundWaiter();
    expect(abx).to.equal(axt2);
    expect(ax.waiting).to.equal(0);
    expect(axt.waiting).to.equal(0);
    expect(abx.waiting).to.equal(0);
    expect(ax.waitingBackground).to.equal(0);
    expect(axt.waitingBackground).to.equal(0);
    expect(abx.waitingBackground).to.equal(0);
    expect(rslt).to.equal(abx.result);
    expect(rslt.one).to.equal('A');
    expect(rslt.five).to.equal('E');
    expect(rslt.nine).to.equal('I');
    expect(abx.errors.length).to.equal(2);
    expect(abx.errors[0]).to.be.an.error('F');
    expect(abx.errors[1]).to.be.an.error('J');
  });
});