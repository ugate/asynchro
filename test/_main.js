'use strict';

// run tests:
// npm test
// generate jsdoc:
// npm run gen-docs

const { expect } = require('@hapi/code');
exports.expect = expect;
exports.Lab = require('@hapi/lab');
const Asynchro = require('../index.js');
exports.Asynchro = Asynchro;
exports.EventEmitter = require('events');
exports.PLAN = Asynchro.name.split(' ')[0];
exports.TASK_DELAY = 500;
exports.TEST_TKO = 20000;
exports.ASYNC_LOGGER = null;//console.log;
exports.LOGGER = null;//console.log;
exports.asyncCall = asyncCall;
exports.logTest = logTest;
exports.expectABC = expectABC;
// TODO : ESM uncomment the following lines...
// import * as Asynchro from '../index.mjs';
// import { expect } from 'code';
// export { Lab } from 'lab';
// export { expect } from expect;
// export { EventEmitter } from 'events';
// export { Asynchro } from Asynchro;
// export const PLAN = Asynchro.name;
// export const TASK_DELAY = 500;
// export const TEST_TKO = 20000;
// export const ASYNC_LOGGER = console.log;
// export const LOGGER = console.log;

// TODO : ESM uncomment the following line...
// export async function asyncCall(num, val, rtn, rejectIt, delay, log) {
async function asyncCall(num, val, rtn, rejectIt, delay, log) {
  if (log) log(`${num}. Starting value = ${val}`);
  var result, err;
  try {
    result = await promisifyDelay(delay, val, rejectIt);
  } catch (e) {
    err = e;
  }
  if (log) log(`${num}. Ended value = ${val} with ${err ? 'ERROR' : 'RESULT'} (delay = ${delay}): ${err && err.message ? err.message + '\n' + err.stack : result}`);
  if (err) throw err;
  if (rtn) return result;
}

// TODO : ESM uncomment the following line...
//export function logTest(title, ax, rslt, error) {
function logTest(title, log, ax, rslt, error) {
  if (log) log(`${title} - Result =`, rslt || (ax && ax.result), '| Errors =', (ax && ax.errors), '| Thrown Error =', error);
}

// TODO : ESM uncomment the following line...
// export function expectABC(ax, error, testError, throws) {
function expectABC(ax, error, testError, throws) {
  if (throws) {
    expect(error).to.be.an.error(testError.message);
  } else {
    expect(error).to.equal(undefined);
    expect(ax.errors.length).to.equal(1);
    expect(ax.errors[0]).to.be.an.error(testError.message);
    expect(ax.result.three).to.equal('C');
  }
  expect(ax.result.one).to.equal('A');
  expect(ax.result.two).to.equal(undefined);
}

// TODO : ESM uncomment the following line...
// export class TestEventTarget {
exports.TestEventTarget = class {
  constructor() {
    this.listeners = {};
  }
  addListener(type, listener) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  }
  removeListener(type, listener) {
    var idx = -1;
    if (!(type in this.listeners)) idx;
    for (let lsn of this.listeners[type]) if (++idx && lsn === listener) {
       this.listeners[type].splice(idx, 1);
       return idx;
    }
  }
  dispatchEvent(type) {
    if (this.listeners[type]) {
      const args = Array.prototype.slice.call(arguments, 1);
      for (let lsn of this.listeners[type]) lsn.apply(this, args);
    }
  }
}

function promisifyDelay(delay, val, rejectIt) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (rejectIt) reject(val instanceof Error ? val : new Error(val));
      else resolve(val);
    }, delay);
  });
}