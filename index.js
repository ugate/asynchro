'use strict';

const ERROR_TYPES_SYSTEM = Object.freeze([ EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError ]);

/**
 * &#8669; Management for multiple `async function`/`await` tasks that can be ran in **series/sequential** and/or **parallel/concurrent**
 * order in relation to one another
 */
class Asynchro {
// TODO : ESM use... export class Asynchro {

  /**
   * Constructor
   * @param {Object} [result] the object used for storing results (omit to prevent capturing of results)
   * @param {(Boolean|Object|String)} [throws] one of the following values (unless superseded, will be applied to all queued tasks):
   * - `true` to throw any errors and instantly stop any further execution
   * - `false` to catch any errors that are thrown
   * - `Object` an object containing the following properties:
   * - - `invert` true to catch errors when matches are made, false/omit to throw errors when matches are made
   * - - `matches` An array that contains any of the following:
   * - - - `system` A string value equal to "system" that will match when an error is a type within {@link Asynchro.systemErrorTypes}
   * - - - `Object` An object that contains property names/values that will be matched against property name/values in the caught error.
   * When invert is true, all names/values on the caught error must match the names/values on the object in order to be 
   * **caught/captured** in {@link Asynchro.errors}. When invert is false/omitted, all names/values on the caught error must match
   * all of the names/values on the object in order to be **rethrown**.
   * - `system` a single `matches` string (invert defaults to false)
   * 
   * Re-thrown errors will set `Error.cause` to the originally thrown error.
   * @param {Function} [log] `function(tagArray, object)` that will log process output (omit to prevent logging)
   * @param {Function} [includeErrorMsgCheck] a `function(name, operation, error)` that will return true when the error message should be
   * included in the final {@link Asynchro.messages} output (defaults to false)
   */
  constructor(result, throws, log, includeErrorMsgCheck) {
    const asy = internal(this);
    asy.at.status = Asynchro.QUEUEING;
    asy.at.throws = throws;
    asy.at.errorMetaName = Asynchro.name;
    asy.at.includeErrorMsgCheck = includeErrorMsgCheck;
    asy.at.trk = { que: [], waiting: 0, errors: [], rslt: result, log, messages: [], verify: {}, backgrounds: [] };
  }

  /**
   * Queues an `async function` to run in **series** relative to other functions in the queue
   * @param {String} [name] the name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {Function} fn the function to queue for asynchronicity
   * @param {...*} args aguments that will be passed into the queued function
   * @returns {String} the queued name/ID (either passed or generated)
   */
  series(name, fn, ...args) {
    const asy = internal(this);
    return asynchroQueue(asy.this, true, asy.at.throws, name, fn, args);
  }

  /**
   * Queues an `async function` to run in **parallel** relative to other functions in the queue
   * @param {String} [name] the name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {Function} fn the function to queue for asynchronicity
   * @param {...*} args aguments that will be passed into the queued function
   * @returns {String} the queued name/ID (either passed or generated)
   */
  parallel(name, fn, ...args) {
    const asy = internal(this);
    return asynchroQueue(asy.this, false, asy.at.throws, name, fn, args);
  }

  /**
   * Queues an `async function` to run in the **background** (i.e. the queue wont wait for the results and will not be captured).
   * Thrown errors within the scope of specified `throws` flag(s) will be thrown and will stop further execution of the queue.
   * @param {String} [name] the name given for the task that can be used in conjunction with {@link Asynchro.verify}
   * (no results will be set from the function's return value - omit will cause the name/ID will be generated and returned)
   * @param {(Boolean|Object|String)} [throws] one of the following values (supersedes any `throws` parameters passed during construction):
   * - `true` to throw any errors and instantly stop any further execution
   * - `false` to catch any errors that are thrown
   * - `Object` an object containing the following properties:
   * - - `invert` true to catch errors when matches are made, false/omit to throw errors when matches are made
   * - - `matches` An array that contains any of the following:
   * - - - `system` A string value equal to "system" that will match when an error is a type within {@link Asynchro.systemErrorTypes}
   * - - - `Object` An object that contains property names/values that will be matched against property name/values in the caught error.
   * When invert is true, all names/values on the caught error must match the names/values on the object in order to be 
   * **caught/captured** in {@link Asynchro.errors}. When invert is false/omitted, all names/values on the caught error must match
   * all of the names/values on the object in order to be **rethrown**.
   * - `system` a single `matches` string (invert defaults to false)
   * 
   * Re-thrown errors will set `Error.cause` to the originally thrown error.
   * @param {Function} fn the function to queue for asynchronicity
   * @param {...*} args aguments that will be passed into the queued function
   * @returns {String} the queued name/ID (either passed or generated)
   */
  background(name, throws, fn, ...args) {
    const asy = internal(this);
    return asynchroQueue(asy.this, false, throws, name, fn, args, asy.at.trk.errors);
  }

  /**
   * Queues an `async function` to run in **series** relative to other functions in the queue while overriding the `throws` option set during
   * construction.
   * @param {String} [name] the name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {(Boolean|Object|String)} [throws] one of the following values (supersedes any `throws` parameters passed during construction):
   * - `true` to throw any errors and instantly stop any further execution
   * - `false` to catch any errors that are thrown
   * - `Object` an object containing the following properties:
   * - - `invert` true to catch errors when matches are made, false/omit to throw errors when matches are made
   * - - `matches` An array that contains any of the following:
   * - - - `system` A string value equal to "system" that will match when an error is a type within {@link Asynchro.systemErrorTypes}
   * - - - `Object` An object that contains property names/values that will be matched against property name/values in the caught error.
   * When invert is true, all names/values on the caught error must match the names/values on the object in order to be 
   * **caught/captured** in {@link Asynchro.errors}. When invert is false/omitted, all names/values on the caught error must match
   * all of the names/values on the object in order to be **rethrown**.
   * - `system` a single `matches` string (invert defaults to false)
   * 
   * Re-thrown errors will set `Error.cause` to the originally thrown error.
   * @param {Function} fn the function to queue for asynchronicity
   * @param {...*} args aguments that will be passed into the queued function
   * @returns {String} the queued name/ID (either passed or generated)
   */
  seriesThrowOverride(name, throws, fn, ...args) {
    return asynchroQueue(this, true, throws, name, fn, args);
  }

  /**
   * Queues an `async function` to run in **parallel** relative to other functions in the queue while overriding the `throws` option set during
   * construction.
   * @param {String} [name] the name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {(Boolean|Object|String)} [throws] one of the following values (supersedes any `throws` parameters passed during construction):
   * - `true` to throw any errors and instantly stop any further execution
   * - `false` to catch any errors that are thrown
   * - `Object` an object containing the following properties:
   * - - `invert` true to catch errors when matches are made, false/omit to throw errors when matches are made
   * - - `matches` An array that contains any of the following:
   * - - - `system` A string value equal to "system" that will match when an error is a type within {@link Asynchro.systemErrorTypes}
   * - - - `Object` An object that contains property names/values that will be matched against property name/values in the caught error.
   * When invert is true, all names/values on the caught error must match the names/values on the object in order to be 
   * **caught/captured** in {@link Asynchro.errors}. When invert is false/omitted, all names/values on the caught error must match
   * all of the names/values on the object in order to be **rethrown**.
   * - `system` a single `matches` string (invert defaults to false)
   * 
   * Re-thrown errors will set `Error.cause` to the originally thrown error.
   * @param {Function} fn the function to queue for asynchronicity
   * @param {...*} args aguments that will be passed into the queued function
   * @returns {String} the queued name/ID (either passed or generated)
   */
  parallelThrowOverride(name, throws, fn, ...args) {
    return asynchroQueue(this, false, throws, name, fn, args);
  }

  /**
   * Each `verify` is an `async` function that will be called after the queued task that matches the registered _name_ has ran. **It's important to note
   * that _parallel_ tasks will call the registered _verify_ function TWICE. Once when the `async` function is invoked (`isPending === true`) and
   * antoher time when `await` completes (`isPending !== true`).** There is only one _verify_ per registered name. So, registering _verify_ multiple
   * times for the same name will overwrite any _verify_ functions that were set by previous calls.
   * @param {String} name either the name designated as the property name or the `Function.name` from the function used when calling `parallel` or `series`
   * @param {Function} fn an `async function` that will accept a single object argument that contains the follwing properties:
   * 1. `error` A _mutable_ error object that occurred during execution of the queued task (changes to this value will be reflected in the final
   * {@link Asynchro.result} or re-thrown depending on the rules/`throws` set for re-throwing/catching defined on the corresponding queued task).
   * Setting the _error_ will have the same effect as throwing an Error from within the _verify_ function.
   * 2. `result` A _mutable_ result value returned from the queued task execution (changes to this value will be reflected in the final
   * {@link Asynchro.result}).
   * 3. `isPending` An _immutable_ boolean value indicating the task has not yet returned from `await`. The value will always be `false` for **series**
   * tasks since they `await` before calling the _verify_. When a **parallel** task is called, but not yet returned from `await` the value will be `true`.
   * In the subsequent **parallel** call to the _verify_ function the value will be `false` since `await` has completed. When **background** tasks are
   * called the value will always be `true` since they will never `await` on the task to complete.
   * 4. `isParallel` An _immutable_ boolean value indicating if the task was ran in **parallel** or **series**
   * 5. `isBackground` An _immutable_ boolean value indicating if the task was ran in the **background** (i.e. calls the task without `await`)
   * 6. `name` An _immutable_ string value reflecting the original name passed into {@link Asynchro.verify}
   * 7. `operation` An _immutable_ string value reflecting the original function name of the function passed into {@link Asynchro.verify}
   * 8. `message` A write-only _mutable_ string value that will override the default message that will be added to {@link Asynchro.messages}
   * 
   * The return value should be one of the following:
   * 1. `false` will stop execution of pending tasks that have been queued and {@link Asynchro.status} will be set to {@link Asynchro.STOPPED}.
   * 2. Another `Asynchro` instance that will cause the current queue to stop while the new queue will take over via `await` {@link Asynchro.run}.
   * {@link Asynchro.status} will be set to {@link Asynchro.TRANSFERRED} with any {@link Asynchro.messages} and/or {@link Asynchro.errors}
   * being appended to the new queue instance. Also, {@link Asynchro.result} will be merged into the new queue instance.
   * 3. Any other value will have no impact.
   * 
   * The _verify_ `this` reference will point to the {@link Asynchro} instance
   * 
   * **NOTE:** There may be some residuale parallel/concurrent/background functions that were already running prior to the queue being stopped that may still
   * be running after a queue has been stopped/transferred by _verify_.
   */
  verify(name, fn) {
    if (!name || !name.trim()) throw new Error(`Task verify must designate a name that matches a call to parallel/series, not "${name}"`);
    if (!fn || typeof fn !== 'function') throw new Error(`Verify must be a Function, not ${fn}`);
    const asy = internal(this);
    asy.at.trk.verify[name] = fn;
  }

  /**
   * Registers a handler function that will be executed once {@link Asynchro.run} has completed. Only one handler is allowed per instance
   * and will overwrite any end handler that has been previously been set.
   * @param {Function} fn a _synchronous_ `function` that will accept a single argument that will be either set to a new {@link Asynchro} instance when
   * execution is being transferred to a new queue (i.e. {@link Asynchro.status} is set to {@link Asynchro.TRANSFERRED}) or omitted when it's not.
   * `this` will reference the current {@link Asynchro} instance. Any errors that occur within the function will be thrown.
   */
  set endHandler(fn) {
    if (!fn || typeof fn !== 'function') throw new Error(`End handler must be a Function, not ${fn}`);
    const asy = internal(this);
    asy.at.endHandler = fn;
  }

  /**
   * A one-time execution run of all queued asynchronous functions in insertion order with parallel/concurrent running simultaneously and series
   * tasks running in succession. Any queued {@link Asynchro.background} tasks will continue to run after {@link Asynchro.run} completes,
   * possibly accumulating additional {@link Asynchro.errors} as those tasks complete (see {@link Asynchro.backgroundWaiter} to wait for
   * any background tasks to finish completing).
   * @async
   * @returns {Object} the result from {@link Asynchro.result}
   */
  async run() {
    const asy = internal(this);
    if (asy.at.status !== Asynchro.QUEUEING) throw new Error(`To respond status must be ${Asynchro.QUEUEING}, not ${asy.at.status}`);
    if (!asy.at.trk.que.length) throw new Error(`Nothing to run/execute`);
    asy.at.status = Asynchro.RUNNING;
    const rtn = await asynchro(asy.at.trk, asy.this), isTrans = rtn && rtn !== asy.this && rtn instanceof Asynchro;
    if (asy.at.trk.errors.length) asy.at.status = Asynchro.FAILED;
    else if (rtn === false || isTrans) asy.at.status = Asynchro.STOPPED;
    else asy.at.status = Asynchro.SUCCEEDED;
    asy.at.trk.que.length = asy.at.trk.waiting = 0; // clear queue/waiting
    asy.at.trk.verify = null; // reset verify functions
    var rslt;
    if (isTrans) { // migrate queue state and run returned queue that execution will be transferred to
      const asyn = internal(rtn);
      const errs = asy.at.trk.errors, nerrs = asyn.at.trk.errors, msgs = asy.at.trk.messages, nmsgs = asyn.at.trk.messages;
      const bgs = asy.at.trk.backgrounds, nbgs = asy.at.trk.backgrounds;
      asyn.at.trk.errors = errs.length ? (nerrs.length && errs.concat(nerrs)) || errs : nerrs;
      asyn.at.trk.messages = msgs.length ? (nmsgs.length && msgs.concat(nmsgs)) || msgs : nmsgs;
      asyn.at.trk.backgrounds = bgs.length ? (nbgs.length && bgs.concat(nbgs)) || bgs : nbgs;
      if (asyn.at.trk.rslt !== asy.at.trk.rslt) merge(asyn.at.trk.rslt, asy.at.trk.rslt, { deep: true });
      asy.at.status = Asynchro.TRANSFERRED;
      if (asy.at.endHandler) asy.at.endHandler.call(asy.this, asyn.this);
      if (arguments.length) await asyn.this.run.apply(asyn.this, arguments) /*<- for extending class args*/
      else await asyn.this.run();
      rslt = asyn.at.trk.rslt;
      asy.at.asyncWaiter = asyn;
    } else {
      if (asy.at.endHandler) asy.at.endHandler.call(asy.this);
      rslt = asy.at.trk.rslt;
      asy.at.asyncWaiter = asy;
    }
    return rslt;
  }

  /**
   * Waits for any pending background functions to complete and captures the results/caught errors.
   * @example
   * const resultObject = {}; // needed so that results are captured
   * const ax = new Asynchro(resultObject, true, ASYNC_LOGGER);
   * ax.background('myBgTask', false, myAsyncFunc, myAsyncFuncArg1, myAsyncFunc2);
   * await ax.run();
   * // now that Asynchro.run has completed we can optionally wait for the background tasks to complete
   * const bgResultObject = {};
   * const errors = await ax.backgroundWaiter(bgResultObject);
   * // if errors are caught, should print out errors thrown from the background async function
   * for (let error of errors) console.error(error);
   * // if no error for myBgTask, should print out the return value from the background async function
   * console.log(bgResultObject.myBgTask);
   * @async
   * @param {Object} result the object where the background results will be set using a property name that matches the _name_ passed into 
   * the original call to {@link Asynchro.background} that queued the _background_ function
   * @returns {Error[]} an array of errors caught due to the original `throws` rules passed into the original call to
   * {@link Asynchro.background} that queued the _background_ function
   */
  async backgroundWaiter(result) {
    const asy = internal(this), asyw = asy.at.asyncWaiter;
    if (!asyw) return asyw.at.trk.errors;
    asy.at.asyncWaiter = null;
    var rslt;
    for (let itm of asyw.at.trk.backgrounds) {
      if (!itm.backgroundPromise) throw new Error(`Missing "backgroundPromise" on item ${itm.name || itm.fn.name || itm.fn.toString()}`);
      rslt = await itm.backgroundPromise;
      if (result && itm.name) result[itm.name] = rslt;
    }
    return asyw.at.trk.errors;
  }

  /**
   * Placeholder used to pass previously completed queue task function results to subsequently queued task functions when executed/ran
   * @example
   * const ax = new Asynchro({});
   * ax.series('one', async () => {
   *  // other async operations here
   *  return { array: [1] };
   * });
   * ax.series('two', async (a) => {
   *  // other async operations here
   *  console.log(a); // prints out 1
   * }, ax.resultArg('one.array[0]'));
   * await ax.run();
   * @param {String} name the name given for the task where the result will be stored as a property of the {@link Asynchro.result} object.
   * Can use dot notation to express a path to other objects (e.g. `someObject.someOtherObject.someValue` would equate to
   * `asynchro.result.someObject.someOtherObject.someValue` once the queued task function is executed)
   * @returns {ResultArg} the {@link ResultArg}
   */
  resultArg(name) {
    if (!name || typeof name !== 'string') throw new Error(`Invlaid name: ${name}`);
    return new ResultArg(name);
  }

  /**
   * The accumulated message(s) gathered while running queued tasks during a {@link Asynchro.run}
   * @param {String} [delimiter] the delimter to use between messages
   * @returns {String} the cumulative messages
   */
  messages(delimiter) {
    return internal(this).at.trk.messages.join(delimiter);
  }

  /**
   * Determines if an `Error` or a `Function` construct to an `Error` will be thrown when encountered during an execution run
   * @param {(Error|Function)} errorOrType either an `Error` or a `Function` construct to an Error
   * @param {Boolean} [throwWhenTrue] true to actually throw the error when `errorOrType` is an actual `Error` and it is determined that the error should throw
   * @returns {Boolean} returns true if the `Error` or `Function` construct to an `Error` will be thrown when encountered during an execution run
   */
  throwsError(errorOrType, throwWhenTrue) {
    const asy = internal(this);
    return throwsError(asy.at.at.throws, errorOrType, throwWhenTrue, asy.this.systemErrorTypes);
  }

  /**
   * An immutable array of error type constructs that will be thrown when they are encountered during queue execution
   * using `instanceof` on the thrown error (used by `system` values for throwing in {@link Asynchro.throwsError})
   * @type {Function[]}
   */
  get systemErrorTypes() {
    return ERROR_TYPES_SYSTEM;
  }

  /**
   * The result of all of the cumulative execution results that had designated names assigned
   * @type {Object}
   */
  get result() {
    return internal(this).at.trk.rslt;
  }

  /**
   * An immutable array of all the caught errors encountered during execution
   * @type {Error[]}
   */
  get errors() {
    return internal(this).at.trk.errors;
  }

  /**
   * The total number of tasks queued for execution
   * @type {Integer}
   */
  get count() {
    return internal(this).at.trk.que.length;
  }

  /**
   * The number of tasks queued that are _waiting_ for execution
   * @type {Integer}
   */
  get waiting() {
    return internal(this).at.trk.waiting;
  }

  /**
   * The current execution status
   * @type {String}
   */
  get status() {
    return internal(this).at.status;
  }

  /**
   * The status indicating that the queue is available for tasks to be added and is waiting to be ran
   * @type {String}
   */
  static get QUEUEING() {return 'QUEUEING'; }

  /**
   * The status indicating that the queue is sealed from adding new tasks and is waiting to complete
   * @type {String} 
   */
  static get RUNNING() {return 'RUNNING'; }

  /**
   * The status indicating that the queue was ran, but failed to complete
   * @type {String}
   */
  static get FAILED() { return 'FAILED'; }

  /**
   * The status indicating that the queue has successfully ran to completion
   * @type {String}
   */
  static get SUCCEEDED() { return 'SUCCEEDED'; }

  /**
   * The status indicating that the queue has been stopped before completing
   * @type {String}
   */
  static get STOPPED() { return 'STOPPED'; }

  /**
   * The status indicating that the queue has been transferred to another queue before completing
   * @type {String}
   */
  static get TRANSFERRED() { return 'TRANSFERRED'; }

  /**
   * The default system error types that will be used for the `system` error type
   * @type {Function[]}
   */
  static get DEFAULT_SYSTEM_ERROR_TYPES() { return ERROR_TYPES_SYSTEM; }

  /**
  * Promisifies event emitter event(s)
  * @param {EventEmitter} eventEmitter the event emitter that will be listened to
  * @param {(Array|String)} events the event(s) that will be listened for- either an `Object[]`, each containing event
  * properties or a `String[]`/`String` indicating event name(s) (strings will use the passed `tko`)
  * @param {String} [events[].name] the event name
  * @param {Integer} [events[].tko=tko] the timeout delay in milliseconds to wait for the event before _rejecting_ or
  * _resolving_ the promise (set to zero for _unlimited_ timeout)
  * @param {Boolean} [events[].resolveOnTimeout] true to _resolve_ when the `tko` timeout is reached, false to _reject_
  * @param {Integer} [tko=60000] the timeout delay in milliseconds to wait for the event before _rejecting_ or
  * _resolving_ the promise (set to zero for _unlimited_ timeout or override using `events[].tko`)
  * @param {Boolean} [implyError=true] true will automatically listen for an `error` event that will reject or resolve
  * and uses the passed `tko` for the timeout delay
  * @param {Integer} [eventMax=1] the number of events that must be emitted before the promise is resolved
  * @param {Integer} [eventErrorMax=1] the number of events that must be emitted that contain an `Error` as the first argument
  * before the promise is rejected
  * @returns {Promise} the promise for the specified event(s) that resolves with the listener's `arguments` or an array
  * of `arguments` when `eventMax` is greater than one
  */
  static promisifyEvents(eventEmitter, events, tko = 60000, implyError = true, eventMax = 1, eventErrorMax = 1) {
    eventMax = eventMax < 0 ? 1 : eventMax;
    return new Promise((resolve, reject) => {
      var timers = {}, listeners = {}, prm = this, eventCount = 0, errorCnt = 0, errors, results;
      prm.done = false;
      const clearAll = () => {
        for (let handle in timers) clearTimeout(timers[handle]);
        timers = {};
        for (let event in listeners) eventEmitter.removeListener(event, listeners[event]);
        listeners = {};
      };
      const addlistener = (event) => {
        listeners[event.name] = function listener(err) {
          const isError = err && err instanceof Error;
          if ((isError && eventErrorMax && ++errorCnt >= eventErrorMax) || (!isError && eventMax && ++eventCount >= eventMax)) {
            clearAll();
            prm.done = true;
            if (errorCnt > eventErrorMax || eventCount > eventMax) return;
          }
          if (isError && eventErrorMax !== 1) {
            errors = errors || [];
            errors.push(err);
          } else if (!isError && eventMax !== 1) {
            results = results || [];
            results.push(arguments);
          }
          if ((isError && eventErrorMax && errorCnt !== eventErrorMax) || (!isError && eventMax && eventCount !== eventMax)) return;
          if (isError) reject(errors || err);
          else resolve.apply(this, results || arguments);
        };
        eventEmitter[eventMax === 1 ? 'once' : 'on'](event.name, listeners[event.name]);
        if (!event.tko && !tko) return;
        timers[event.name] = setTimeout(() => {
          clearAll();
          if (prm.done) return;
          prm.done = true;
          eventCount = eventMax;
          const err = new Error(`Promisify events for event "${event.name}" timeout at ${event.tko}ms`);
          if (event.resolveOnTimeout) resolve(err);
          else reject(err);
        }, event.hasOwnProperty('tko') ? event.tko : tko);
      };
      for (let i = 0, ln = events.length; i < ln; ++i) {
        addlistener(typeof events[i] === 'string' ? { name: events[i], tko } : events[i]);
      }
      if (implyError) addlistener({ name: 'error', tko });
    });
  }

  /**
   * Takes an object's function with the last argument being a callback function which accepts __multiple parameter arguments__ (1st argument being
   * an `Error`) and converts it to a promise. Rejects when an `Error` is passed in as the first argument or resolves using the arguments passed
   * into the callback (excluding the 1st error parameter). Also supports `this` reference within the passed function (set to the passed `obj`) 
   * @param {Object} obj the object that contains the function that will be promisfied
   * @param {String} fname the name of the function property in the `obj`
   * @param {String[]} [fparams] an array of parameter names for the given function that will be used as the property names on the resolved promise
   * object (should not include the error or callback parameter names) or omit to simply use an array of argument values when resolving the promise
   * @returns {Function} a function that returns a promise
   */
  static promisifyCallback(obj, fname, fparams) {
    return function promisifier() {
      const args = Array.prototype.slice.call(arguments);
      // callback needs to be in the correct position regardless of what was passed
      for (let ai = arguments.length, ln = obj[fname].length - 1; ai < ln; ++ai) args.push(undefined);
      return new Promise((resolve, reject) => {
        args.push(function promisifierCb(err) {
          if (err) reject(err);
          else if (fparams) {
            const rtn = {};
            var fni = 0; // skip error argument
            for (let name of fparams) rtn[name] = arguments[++fni];
            resolve(rtn);
          } else resolve(Array.prototype.slice.call(arguments, 1)); // remove error argument and return array
        });
        obj[fname].apply(obj, args);
      });
    };
  }

  /**
   * Delays for a period then resolves or rejects the promise
   * @param {Integer} delay the number of milliseconds to delay before resolving/rejecting
   * @param {*} val the value to use when resolving/rejecting
   * @param {*} rejectIt true to reject, false to resolve after the delay expires
   * @returns {Promise} the delayed promise
   */
  static promisifyDelay(delay, val, rejectIt) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (rejectIt) reject(val instanceof Error ? val : new Error(val));
        else resolve(val);
      }, delay);
    });
  }
}

// TODO : ESM remove the following line...
exports.Asynchro = Asynchro;

/**
 * Queues a promise for **series/paralel** relative to other promises in the queue
 * @private
 * @ignore
 * @param {Asynchro} asyi the `async` processor
 * @param {Boolean} series true to run in **series** relative to other tasks, false to run in **parallel**
 * @param {(Boolean|Object|String)} [throws] one of the following values (supersedes any `throws` parameters passed during construction):
 * - `true` to throw any errors and instantly stop any further execution
 * - `false` to catch any errors that are thrown
 * - `Object` an object containing the following properties:
 * - - `invert` true to catch errors when matches are made, false/omit to throw errors when matches are made
 * - - `matches` An array that contains any of the following:
 * - - - `system` A string value equal to "system" that will match when an error is a type within {@link Asynchro.systemErrorTypes}
 * - - - `Object` An object that contains property names/values that will be matched against property name/values in the caught error.
 * When invert is true, all names/values on the caught error must match the names/values on the object in order to be 
 * **caught/captured** in {@link Asynchro.errors}. When invert is false/omitted, all names/values on the caught error must match
 * all of the names/values on the object in order to be **rethrown**.
 * - `system` a single `matches` string (invert defaults to false)
 * 
 * Re-thrown errors will set `Error.cause` to the originally thrown error.
 * @param {String} [name] the name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
 * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
 * @param {Function} fn the function to queue for asynchronicity
 * @param {*} args aguments that will be passed into the queued function
 * @param {Error[]} [bgErrors] an array that will store caught errors from queued background functions. The queued task function will __not__
 * wait before contining to the next task in the queue (omit when the function is __not__ a background task).
 * @returns {String} the queued name/ID (either passed or generated)
 */
function asynchroQueue(asyi, series, throws, name, fn, args, bgErrors) {
  const asy = internal(asyi);
  if (!fn || typeof fn !== 'function') throw new Error(`A ${series ? 'series' : 'parallel'} task must be a Function, but found ${typeof fn} (${fn})`);
  if (asy.at.status !== Asynchro.QUEUEING) throw new Error(`A ${series ? 'series' : 'parallel'} must be in status ${Asynchro.QUEUEING}, not ${asy.at.status}`);
  throws = throws === true || throws === false ? throws : (throws && typeof throws === 'object' && throws) || (throws && { matches: throws });
  const noResult = (!name || !name.trim()) && (name = guid()) || bgErrors ? true : false;
  const itm = { series, noAwait: !!bgErrors, throws, name, fn, args, noResult, errorMetaName: asy.at.errorMetaName }; // TODO : should async allow "this" to be passed?
  if (bgErrors && itm.throws !== true) setBackgroundFunction(itm, asyi.systemErrorTypes, bgErrors);
  asy.at.trk.que.push(itm);
  asy.at.trk.waiting++;
  return name;
}

/**
 * Runs/Executes all queued asynchronous functions in insertion order with parallel/concurrent running simultaneously
 * @private
 * @ignore
 * @param {Object} trk the tracking object from {@link Asynchro}
 * @param {Asynchro} [asyi] the {@link Asynchro} instance
 * @returns {(Boolean|Asynchro)} `true` when ran to completion, `false` when the process has been stopped before finishing
 * or an `Asynchro` instance that should be
 */
async function asynchro(trk, asyi) {
  var itm, pends = [], idx = -1, rtn = true, hdl;
  while (itm = trk.que[++idx]) {
    hdl = await asyncHandler(trk, asyi, itm, pends); // execute the queued tasks
    if (!itm.promise) trk.waiting--;
    if (hdl === false || (asyi !== hdl && hdl instanceof Asynchro)) { // stop
      rtn = hdl;
      break;
    }
  }
  idx = -1;
  while (itm = pends[++idx]) {
    hdl = await asyncHandler(trk, asyi, itm, pends); // wait for pending parallel/concurrent executions to complete
    trk.waiting--;
    if (rtn === false || rtn instanceof Asynchro) continue; // do not override first stop
    if (hdl === false || (asyi !== hdl && hdl instanceof Asynchro)) rtn = hdl;
  }
  return rtn;
}

/**
 * Processes a queued `async function` from {@link Asynchro}
 * @private
 * @ignore
 * @param {Object} trk the _private_ tracking object from {@link Asynchro}
 * @param {Asynchro} asyi the `Asynchro` instance
 * @param {Object} itm the queued `async` item from {@link asynchroQueue}
 * @param {Object[]} pends the pending parallel/concurrent items- each originating from {@link asynchroQueue}
 * @returns {(Boolean|Asynchro)} `false` or another `Asynchro` instance should **stop** iteration
 */
async function asyncHandler(trk, asyi, itm, pends) { // return false or another Asynchro instance should stop iteration
  var rtn = true, msg;
  const it = {}, type = itm.series ? 'series' : 'parallel';
  if (itm.throws === true && itm.noAwait) handleAsync(asyi, itm, pends, trk.backgrounds);
  else if (itm.throws === true) it.result = await handleAsync(asyi, itm, pends, trk.backgrounds);
  else try {
    it.result = await handleAsync(asyi, itm, pends, trk.backgrounds);
  } catch (err) {
    defineItemMeta(err, itm, itm.promise instanceof Promise, itm.errorMetaName);
    if (itm.throws) throwsError(itm.throws, err, true, asyi.systemErrorTypes);
    it.error = err;
  }
  const pendPromise = itm.promise instanceof Promise;
  if (itm.name && trk.verify[itm.name]) try { // verify functions should only be called once the promise is await is performed
    defineItemMeta(it, itm, pendPromise);
    Object.defineProperty(it, 'message', { set: msgOrErr => msg = msgOrErr, enumerable: true });
    rtn = await trk.verify[itm.name].call(asyi, it);
    rtn = asyi !== rtn && rtn instanceof Asynchro ? rtn : rtn !== false;
  } catch (verifyError) {
    defineItemMeta(verifyError, itm, pendPromise, itm.errorMetaName);
    if (itm.throws) throwsError(itm.throws, verifyError, true, asyi.systemErrorTypes);
    if (verifyError !== it.error) {
      Object.defineProperty(verifyError[itm.errorMetaName], 'cause', { value: it.error, enumerable: true });
      if (trk.log) trk.log(['asynchro', 'warn', 'verify'], { stack: verifyError.stack, error: verifyError });
      it.error = verifyError;
    }
  }
  if (it.error) {
    if (trk.log && (!it.error[itm.errorMetaName] || !it.error[itm.errorMetaName].cause)) {
      trk.log(['asynchro', 'warn'], { stack: it.error.stack, error: it.error });
    }
    trk.errors.push(it.error);
  }
  if (pendPromise) return rtn; // need to wait for the promise to complete
  if (!itm.noResult && itm.name && trk.rslt && typeof it.result !== 'undefined') trk.rslt[itm.name] = it.result;
  if (!it.error && trk.log) trk.log(['asynchro', 'result', 'debug'], { type, name: itm.name, operation: itm.fn.name, result: it.result });
  appendMessage(asyi, itm.name, itm.fn.name, msg || it.error || it.result);
  return rtn;
}

/**
 * Executes an `async function` queued from {@link asyncHandler}
 * @private
 * @ignore
 * @param {Asynchro} asyi the `Asynchro` instance
 * @param {Object} itm the queued `async` item from {@link asynchroQueue}
 * @param {Object[]} pends the pending parallel/concurrent items- each originating from {@link asynchroQueue}
 * @param {Promise[]} [backgrounds] where background promises are kept
 * @returns {*} the result from the function execution or `undefined` when the `item.promise` has been set/generated
 */
async function handleAsync(asyi, itm, pends, backgrounds) {
  var rslt;
  if (!itm.noResult && itm.args && asyi && asyi.result) resolveArgs(asyi, itm);
  if (itm.series) rslt = await itm.fn.apply(itm.thiz, itm.args);
  else if (itm.promise) {
    rslt = await itm.promise;
    itm.promise = true;
  } else {
    itm.promise = false; // in case the function fails
    itm.promise = itm.fn.apply(itm.thiz, itm.args);
    if (!(itm.promise instanceof Promise)) {
      const msg = `Call to ${itm.name || ''}/${itm.fn.name} must return a Promise, not ${itm.promise}`;
      itm.promise = false;
      throw new Error(msg);
    }
    if (itm.noAwait) { // run in background, don't wait for promise
      if (backgrounds) {
        itm.backgroundPromise = itm.promise;
        backgrounds.push(itm);
      }
      itm.promise = false;
    } else pends.push(itm);
  }
  return rslt;
}

/**
 * Proxies an `itm.fn` in order to handle re-throwing/catching the desired errors
 * @private
 * @ignore
 * @param {Object} itm the queued `async` item from {@link asynchroQueue}
 * @param {*} systemErrorTypes the {@link Asynchro.systemErrorTypes} that will be applied to the background function check
 * @param {Error[]} errors the {@link Asynchro.errors} where caught errors will be added
 */
function setBackgroundFunction(itm, systemErrorTypes, errors) {
  const func = itm.fn;
  itm.fn = new Proxy(func, {
    async apply(func, thiz, args) {
      try {
        return await (args.length ? func.apply(thiz, args) : thiz ? func.call(thiz) : func());
      } catch (err) {
        defineItemMeta(err, itm, false, itm.errorMetaName);
        if (itm.throws) throwsError(itm.throws, err, true, systemErrorTypes);
        errors.push(err);
      }
    },
    get(trg, prop) {
      return prop === 'name' ? func.name : Reflect.get(...arguments); 
    }
  });
}

/**
 * Defines read-only item metadata on a task object
 * @private
 * @ignore
 * @param {Object} it the object to define the item metadata on
 * @param {Object} itm the item where metadata will be extracted from
 * @param {Boolean} pendPromise true when a promise is pending/waiting
 * @param {String} [name] instead of defining properties/values directly on `it` they will be set on a newly defined `it[name] = {}`
 */
function defineItemMeta(it, itm, pendPromise, name) {
  var obj = it;
  if (name) {
    if (!obj[name]) Object.defineProperty(obj, name, { value: {}, enumerable: true });
    obj = obj[name];
  }
  Object.defineProperty(obj, 'isPending', { value: !!pendPromise, enumerable: true });
  Object.defineProperty(obj, 'isParallel', { value: !itm.series, enumerable: true });
  Object.defineProperty(obj, 'isBackground', { value: itm.noAwait, enumerable: true });
  Object.defineProperty(obj, 'name', { value: itm.name, enumerable: true });
  Object.defineProperty(obj, 'operation', { value: itm.fn.name, enumerable: true });
}

/**
 * Resolves any arguments that are set in an item that are a {@link ResultArg} to the corresponding {@link Asynchro.result}
 * path resolved value
 * @private
 * @ignore
 * @param {Asynchro} asyi the {@link Asynchro} instance
 * @param {Object} itm the queued `async` item from {@link asynchroQueue}
 */
function resolveArgs(asyi, itm) {
  var argi = 0, names, mtch, val;
  for (let arg of itm.args) {
    if (arg instanceof ResultArg) {
      if (!names) names = arg.name.split('.');
      for (let nm of names) {
        val = !val ? asyi.result : val;
        if (typeof val !== 'object') break;
        mtch = nm.match(/^([^\[]+)\[(\d+)\]$/);
        nm = (mtch && mtch[1]) || nm;
        if (mtch && mtch[2]) val = val[nm][parseInt(mtch[2])]; // should be an array with index
        else val = val[nm];
      }
      itm.args[argi] = val; // argument should be resolved to the Asynchro result property value
    }
    argi++;
  }
}

/**
 * Adds a specified message to the commulative `message` on the {@link Asynchro.result} object
 * @private
 * @ignore
 * @param {Asynchro} asyi the {@link Asynchro} instance
 * @param {String} [name] the name of the task that was ran
 * @param {(Error|Object|String)} [errorOrMessage] either an `Error`, `{ message }` or message string that wil be appended to the overall messages
 * @param {String} [operation] an operation name that ran the task, typically a function name
 * @returns {String} the message added to the commulative messages
 */
function appendMessage(asyi, name, operation, errorOrMessage) {
  const asy = internal(asyi);
  if (asy.at.status !== Asynchro.RUNNING) throw new Error(`Message can only be added when status is ${Asynchro.RUNNING}, not ${asy.at.status}`);
  const isError = errorOrMessage && errorOrMessage instanceof Error;
  const includeErrorMsg = isError && asy.at.includeErrorMsgCheck ? asy.at.includeErrorMsgCheck(name, operation, errorOrMessage) : false;
  const msg = (errorOrMessage && (!isError || includeErrorMsg) && (errorOrMessage.message || typeof errorOrMessage === 'string' ? errorOrMessage : '').replace(/"/g, "'"))
    || (isError && `Internal ERROR${name ? ` for ${name}` : ''}${operation && operation !== name ? `on operation: ${operation}`: ''}`) || '';
  if (msg) asy.at.trk.messages.push(msg);
  return msg;
}

/**
 * Determines if an `Error` or a `Function` construct to an `Error` will be thrown when encountered during an execution run
 * @private
 * @ignore
 * @param {(Boolean|Object|String)} [throws] one of the following values (supersedes any `throws` parameters passed during construction):
 * - `true` to throw any errors and instantly stop any further execution
 * - `false` to catch any errors that are thrown
 * - `Object` an object containing the following properties:
 * - - `invert` true to catch errors when matches are made, false/omit to throw errors when matches are made
 * - - `matches` An array that contains any of the following:
 * - - - `system` A string value equal to "system" that will match when an error is a type within {@link Asynchro.systemErrorTypes}
 * - - - `Object` An object that contains property names/values that will be matched against property name/values in the caught error.
 * When invert is true, all names/values on the caught error must match the names/values on the object in order to be 
 * **caught/captured** in {@link Asynchro.errors}. When invert is false/omitted, all names/values on the caught error must match
 * all of the names/values on the object in order to be **rethrown**.
 * - `system` a single `matches` string (invert defaults to false)
 * @param {(Error|Function)} errorOrType either an `Error` or a `Function` construct to an Error
 * @param {Boolean} [throwWhenTrue] true to actually throw the error when `errorOrType` is an actual `Error` and it is determined that the error should throw
 * @param {Function[]} systemErrorTypes value from {@link Asynchro.systemErrorTypes}
 * @returns {Boolean} returns true if the `Error` or `Function` construct to an `Error` will be thrown when encountered during an execution run
 */
function throwsError(throws, errorOrType, throwWhenTrue, systemErrorTypes) {
  const isError = errorOrType instanceof Error, isErrorType = !isError && typeof errorOrType === 'function', throType = typeof throws;
  if (!isError && !isErrorType) return false;
  if (throType === 'boolean') {
    if (throws && throwWhenTrue && isError) throw errorOrType;
    return throws;
  }
  if (throws.matches === 'system') {
    if (Array.isArray(systemErrorTypes)) {
      for (let stype of systemErrorTypes) {
        if (errorOrType instanceof stype) {
          if (throws.invert) return false; // any system error will capture
          if (throwWhenTrue && isError) throw errorOrType; // any system error will throw
          return true;
        }
      }
    }
    if (throws.invert) { // if not captured by prior checks, must be throw
      if (throwWhenTrue && isError) throw errorOrType;
      return true;
    }
  } else if (typeof throws.matches === 'object') {
    for (let prop in throws.matches) {
      if (errorOrType[prop] !== throws.matches[prop]) {
        //console.log(`Property "${prop}" (invert = ${!!throws.invert}): "${errorOrType[prop]}" !== "${throws.matches[prop]}"`)
        if (throws.invert) { // if not captured by prior checks, must be throw
          if (throwWhenTrue && isError) throw errorOrType;
          return true;
        }
        return false; // does not meet the throw criteria
      }
    }
    if (!throws.invert) { // if not captured by prior checks, must be throw
      if (throwWhenTrue && isError) throw errorOrType;
      return true;
    }
  }
  return false;
}

/**
 * Result argument wrapper
 * @private
 * @ignore
 */
class ResultArg {

  /**
   * Constructor
   * @param {String} name the name of the property in the {@link Asynchro} `result` object
   */
  constructor(name) {
    const rsa = internal(this);
    rsa.at.name = name;
  }

  /**
   * @returns {String} the name of the result argument
   */
  get name() {
    return internal(this).at.name;
  }
}

/**
 * Merges an object with the properties of another object *USE WITH CAUTION - merging can be an expensive operation depending on the
 * source/destination objects
 * @private
 * @ignore
 * @param {Object} dest the destination object where the properties will be added
 * @param {Object} src the source object that will be used for adding new properties to the destination
 * @param {Object} [opts] merge options
 * @param {Boolean} [opts.ctyp] flag that ensures that source values are constrained to the same type as the destination values when present
 * @param {Boolean} [opts.nou] flag that prevents merge of undefined values
 * @param {Boolean} [opts.non] flag that prevents merge of null values
 * @param {Boolean} [opts.deep] flag that indicates that any objects/arrays found will be cloned instead of referenced
 * @param {(Object[] | String[])} [opts.exc] properties to exclude from the merge
 * @param {(Object | String)} [opts.exc[]] either object describing a property or a property name
 * @param {String} [opts.exc[].prop] the property name to exclude
 * @param {Integer} [opts.exc[].depth=Infinity] the depth level to exclude
 * @param {Integer} [depth=1] the initial object depth used for exclusions
 * @returns {Object} the destination object
 */
function merge(dest, src, opts, depth) {
  if (!src || typeof src !== 'object') return dest;
  opts = opts || {};
  if (isNaN(depth)) depth = 1;
  var keys = Object.keys(src);
  var i = keys.length, dt, st;
  while (i--) {
    st = typeof src[keys[i]];
    if (isNaN(keys[i]) && src.hasOwnProperty(keys[i]) &&
    (!opts.nou || st !== 'undefined') &&
    (!opts.non || src[keys[i]] !== null) &&
    !(opts.ctyp && dest[keys[i]] != null && (dt = typeof dest[keys[i]]) !== 'undefined' && dt !== typeof src[keys[i]]) &&
    (!opts.exc || !exclude(opts.exc, keys[i], depth))) {
      if (opts.deep && src[keys[i]] !== null && st === 'object') {
        if (Array.isArray(src[keys[i]])) dest[keys[i]] = src[keys[i]].slice();
        else merge(dest[keys[i]] = {}, src[keys[i]], opts, depth + 1);
      } else dest[keys[i]] = src[keys[i]];
    }
  }
  return dest;
}

/**
 * Generates formats a GUID
 * @private
 * @ignore
 * @param {String} [value] when present, will add any missing hyphens (if `hyphenate=true`) instead of generating a new value
 * @param {Boolean} [hyphenate=true] true to include hyphens in generated result
 * @returns {String} the generated GUID
 */
function guid(value, hyphenate = true) {
  const hyp = hyphenate ? '-' : '';
  if (value) return hyphenate ? value.replace(/(.{8})-?(.{4})-?(.{4})-?(.{4})-?(.{12})/gi, `$1${hyp}$2${hyp}$3${hyp}$4${hyp}$5`) : value;
  return `xxxxxxxx${hyp}xxxx${hyp}4xxx${hyp}yxxx${hyp}xxxxxxxxxxxx`.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// private mapping
let map = new WeakMap();
let internal = function(object) {
  if (!map.has(object)) {
    map.set(object, {});
  }
  return {
    at: map.get(object),
    this: object
  };
};