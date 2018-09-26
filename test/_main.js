'use strict';

// generate jsdoc:
// "node_modules/.bin/jsdoc" -c jsdoc/conf.json

const { expect } = require('code');
exports.expect = expect;
exports.Lab = require('lab');
const { Asynchro } = require('../index.js');
exports.Asynchro = Asynchro;
exports.EventEmitter = require('events');
exports.PLAN = Asynchro.name.split(' ')[0];
exports.TASK_DELAY = 500;
exports.TEST_TKO = 20000;
exports.ASYNC_LOGGER = console.log;
exports.LOGGER = console.log;
// TODO : ESM uncomment the following lines...
// import { Asynchro } from '../index.mjs';
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
exports.asyncCall = async function asyncCall(num, val, rtn, rejectIt, delay, log) {
  if (log) log(`${num}. Starting`);
  var result, err;
  try {
    result = await Asynchro.promisifyDelay(delay, val, rejectIt);
  } catch (e) {
    err = e;
  }
  if (log) log(`${num}. Ended with ${err ? 'ERROR' : 'RESULT'} (delay = ${delay}): ${err && err.message ? err.message + '\n' + err.stack : result}`);
  if (err) throw err;
  if (rtn) return result;
}

// TODO : ESM uncomment the following line...
//export function logTest(title, ax, rslt, error) {
exports.logTest = function logTest(title, log, ax, rslt, error) {
  if (log) log(`${title} - Result =`, rslt || (ax && ax.result), '| Errors =', (ax && ax.errors), '| Thrown Error =', error);
}

// TODO : ESM uncomment the following line...
// export function expectABC(ax, error, testError, throws) {
exports.expectABC = function expectABC(ax, error, testError, throws) {
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