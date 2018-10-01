'use strict';

const { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } = require('./_main');
const lab = exports.lab = Lab.script();
// ESM uncomment the following lines...
// import { expect, Lab, asyncCall, logTest, expectABC, PLAN, TASK_DELAY, TEST_TKO, ASYNC_LOGGER, LOGGER, Asynchro } from './_main.mjs';

const plan = `${PLAN} Promisify Callback`;

// "node_modules/.bin/lab" test/promisify-callback.js -vi 1

const A = 10, B = 20, C = 30;
function callback(error, a, b, c, thiz, cb) {
  cb(error, A * (a || 0), B * (b || 0), C * (c || 0), thiz, cb);
}
class CallbackClass {
  multiply(a, b, c, cb) { // TODO : fails with... (a = 2399/25(3) /* testTheParser () => {} */, b = null, c = null, err = null, cb = null) => { 
    const thiz = this;
    setTimeout(() => {
      callback(thiz.error, a, b, c, thiz, cb);
    }, Math.min(TEST_TKO / 2, 500));
  }
}
const myCallbackClass = new CallbackClass();
const myCallbackObj = { // could also be a class instance
  multiply: (a, b, c, cb) => {
    setTimeout(() => {
      callback(myCallbackObj.error, a, b, c, myCallbackObj, cb);
    }, Math.min(TEST_TKO / 2, 500));
  }
};

lab.experiment(plan, () => {

  lab.test(`${plan}: extracted/named, object, no-error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 2, b = 4, c = 6;
    const promisifier = Asynchro.promisifyCallback(myCallbackObj, 'multiply', callback);
    const rslt = await promisifier(a, b, c);
    logTest(`${plan}: extracted/named, object no-error`, LOGGER, null, rslt);
    expect(rslt).to.be.an.object();
    expect(rslt.a).to.equal(A * a);
    expect(rslt.b).to.equal(B * b);
    expect(rslt.c).to.equal(C * c);
    expect(rslt.thiz).to.equal(myCallbackObj);
  });

  lab.test(`${plan}: named, object, no-error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 2, b = 4, c = 6;
    const promisifier = Asynchro.promisifyCallback(myCallbackObj, 'multiply', [ 'a', 'b', 'c' ]);
    const rslt = await promisifier(a, b, c);
    logTest(`${plan}: named, object no-error`, LOGGER, null, rslt);
    expect(rslt).to.be.an.object();
    expect(rslt.a).to.equal(A * a);
    expect(rslt.b).to.equal(B * b);
    expect(rslt.c).to.equal(C * c);
  });

  lab.test(`${plan}: named, object, error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 2, b = 4, c = 6, testError = new Error(`Test ${plan} named, object, error`);
    var rslt, error;
    const promisifier = Asynchro.promisifyCallback(myCallbackObj, 'multiply', [ 'a', 'b', 'c' ]);
    try {
      myCallbackObj.error = testError; 
      rslt = await promisifier(a, b, c);
    } catch (err) {
      myCallbackObj.error = null; 
      error = err;
    }
    logTest(`${plan}: named, object, error`, LOGGER, null, rslt, error);
    expect(rslt).to.be.an.undefined();
    expect(error).to.equal(testError);
  });

  lab.test(`${plan}: named, class, no-error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 8, b = 10, c = 12;
    const promisifier = Asynchro.promisifyCallback(myCallbackClass, 'multiply', [ 'a', 'b', 'c' ]);
    const rslt = await promisifier(a, b, c);
    logTest(`${plan}: named, class, no-error`, LOGGER, null, rslt);
    expect(rslt).to.be.an.object();
    expect(rslt.a).to.equal(A * a);
    expect(rslt.b).to.equal(B * b);
    expect(rslt.c).to.equal(C * c);
  });

  lab.test(`${plan}: named, class, error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 8, b = 10, c = 12, testError = new Error(`Test ${plan} named, class, error`);
    var rslt, error;
    const promisifier = Asynchro.promisifyCallback(myCallbackClass, 'multiply', [ 'a', 'b', 'c' ]);
    try {
      myCallbackClass.error = testError; 
      rslt = await promisifier(a, b, c);
    } catch (err) {
      myCallbackClass.error = null; 
      error = err;
    }
    logTest(`${plan}: named, class, error`, LOGGER, null, rslt, error);
    expect(rslt).to.be.an.undefined();
    expect(error).to.equal(testError);
  });

  lab.test(`${plan}: un-named, object, no-error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 2, b = 4, c = 6;
    const promisifier = Asynchro.promisifyCallback(myCallbackObj, 'multiply');
    const rslt = await promisifier(a, b, c);
    logTest(`${plan}: un-named, object no-error`, LOGGER, null, rslt);
    expect(rslt).to.be.an.array();
    expect(rslt[0]).to.equal(A * a);
    expect(rslt[1]).to.equal(B * b);
    expect(rslt[2]).to.equal(C * c);
  });

  lab.test(`${plan}: un-named, object, error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 2, b = 4, c = 6, testError = new Error(`Test ${plan} un-named, object, error`);
    var rslt, error;
    const promisifier = Asynchro.promisifyCallback(myCallbackObj, 'multiply');
    try {
      myCallbackObj.error = testError; 
      rslt = await promisifier(a, b, c);
    } catch (err) {
      myCallbackObj.error = null; 
      error = err;
    }
    logTest(`${plan}: un-named, object, error`, LOGGER, null, rslt, error);
    expect(rslt).to.be.an.undefined();
    expect(error).to.equal(testError);
  });

  lab.test(`${plan}: un-named, class, no-error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 8, b = 10, c = 12;
    const promisifier = Asynchro.promisifyCallback(myCallbackClass, 'multiply');
    const rslt = await promisifier(a, b, c);
    logTest(`${plan}: un-named, class, no-error`, LOGGER, null, rslt);
    expect(rslt).to.be.an.array();
    expect(rslt[0]).to.equal(A * a);
    expect(rslt[1]).to.equal(B * b);
    expect(rslt[2]).to.equal(C * c);
  });

  lab.test(`${plan}: un-named, class, error`, { timeout: TEST_TKO }, async (flags) => {
    const a = 8, b = 10, c = 12, testError = new Error(`Test ${plan} un-named, class, error`);
    var rslt, error;
    const promisifier = Asynchro.promisifyCallback(myCallbackClass, 'multiply');
    try {
      myCallbackClass.error = testError; 
      rslt = await promisifier(a, b, c);
    } catch (err) {
      myCallbackClass.error = null; 
      error = err;
    }
    logTest(`${plan}: un-named, class, error`, LOGGER, null, rslt, error);
    expect(rslt).to.be.an.undefined();
    expect(error).to.equal(testError);
  });
});