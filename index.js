'use strict';

const ERROR_TYPES_SYSTEM = Object.freeze([ EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError ]);
const FN_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const FN_ARROWS = /\(?([^\)]*?)\)?=>.*$/mg;
const FN_DEFAULT_PARAMS = /=[^>][^,]+/mg;
const FN_PARAMS_SEP = /([^\s,]+)/g;

/**
 * &#8669; Manages multiple `async function`/`await` tasks that can be ran in **series/sequential** and/or **parallel/concurrent**
 * order in relation to one another. See {@tutorial started} for more details.
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
   * @param {Function} [includeErrorMsgCheck] A `function(name, operation, error)` that will return true when the error message should be
   * included in the final {@link Asynchro.messages} output (defaults to false)
   */
  constructor(result, throws, log, includeErrorMsgCheck) {
    const asy = internal(this);
    asy.at.status = Asynchro.QUEUEING;
    asy.at.throws = throws;
    asy.at.errorMetaName = Asynchro.name;
    asy.at.includeErrorMsgCheck = includeErrorMsgCheck;
    asy.at.trk = { que: [], waiting: 0, errors: [], rslt: result, log, messages: [], verify: {}, backgrounds: [], waitingBackground: 0 };
  }

  /**
   * Queues an `async function` to run in **series** relative to other functions in the queue
   * @param {String} [name] The name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {Function} fn The function to queue for asynchronicity (can also be a synchronous function)
   * @param {...*} args Aguments that will be passed into the queued function
   * @returns {String} The queued name/ID (either passed or generated)
   */
  series(name, fn, ...args) {
    const asy = internal(this);
    return asynchroQueue(asy.this, true, asy.at.throws, name, fn, args);
  }

  /**
   * Queues an `async function` to run in **parallel** relative to other functions in the queue
   * @param {String} [name] The name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {Function} fn The function to queue for asynchronicity
   * @param {...*} args Aguments that will be passed into the queued function
   * @returns {String} The queued name/ID (either passed or generated)
   */
  parallel(name, fn, ...args) {
    const asy = internal(this);
    return asynchroQueue(asy.this, false, asy.at.throws, name, fn, args);
  }

  /**
   * Queues an `async function` to run in the **background** (i.e. the queue wont wait for the results and will not be captured).
   * Thrown errors within the scope of specified `throws` flag(s) will be thrown and will stop further execution of the queue.
   * @param {String} [name] The name given for the task that can be used in conjunction with {@link Asynchro.verify}
   * (no results will be set from the function's return value - omit will cause the name/ID will be generated and returned)
   * @param {Function} fn The function to queue for asynchronicity
   * @param {...*} args Aguments that will be passed into the queued function
   * @returns {String} The queued name/ID (either passed or generated)
   */
  background(name, fn, ...args) {
    const asy = internal(this);
    return asynchroQueue(asy.this, false, asy.at.throws, name, fn, args, asy.at.trk.errors);
  }

  /**
   * Queues an `async function` to run in **series** relative to other functions in the queue while overriding the `throws` option set during
   * construction.
   * @param {String} [name] The name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {(Boolean|Object|String)} [throws] One of the following values (supersedes any `throws` parameters passed during construction):
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
   * @param {Function} fn The function to queue for asynchronicity
   * @param {...*} args Aguments that will be passed into the queued function
   * @returns {String} The queued name/ID (either passed or generated)
   */
  seriesThrowOverride(name, throws, fn, ...args) {
    return asynchroQueue(this, true, throws, name, fn, args);
  }

  /**
   * Queues an `async function` to run in **parallel** relative to other functions in the queue while overriding the `throws` option set during
   * construction.
   * @param {String} [name] The name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
   * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
   * @param {(Boolean|Object|String)} [throws] One of the following values (supersedes any `throws` parameters passed during construction):
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
   * @param {Function} fn The function to queue for asynchronicity
   * @param {...*} args Aguments that will be passed into the queued function
   * @returns {String} The queued name/ID (either passed or generated)
   */
  parallelThrowOverride(name, throws, fn, ...args) {
    return asynchroQueue(this, false, throws, name, fn, args);
  }

  /**
   * Queues an `async function` to run in the **background** (i.e. the queue wont wait for the results and will not be captured).
   * Thrown errors within the scope of specified `throws` flag(s) will be thrown and will stop further execution of the queue.
   * @param {String} [name] The name given for the task that can be used in conjunction with {@link Asynchro.verify}
   * (no results will be set from the function's return value - omit will cause the name/ID will be generated and returned)
   * @param {(Boolean|Object|String)} [throws] One of the following values (supersedes any `throws` parameters passed during construction):
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
   * @param {Function} fn The function to queue for asynchronicity
   * @param {...*} args Aguments that will be passed into the queued function
   * @returns {String} The queued name/ID (either passed or generated)
   */
  backgroundThrowsOverride(name, throws, fn, ...args) {
    const asy = internal(this);
    return asynchroQueue(asy.this, false, throws, name, fn, args, asy.at.trk.errors);
  }

  /**
   * Each `verify` is an `async` function that will be called after the queued task that matches the registered _name_ has ran. **It's important to note
   * that _parallel_ tasks will call the registered _verify_ function TWICE. Once when the `async` function is invoked (`isPending === true`) and
   * antoher time when `await` completes (`isPending !== true`).** There is only one _verify_ per registered name. So, registering _verify_ multiple
   * times for the same name will overwrite any _verify_ functions that were set by previous calls.
   * @param {String} name Either the name designated as the property name or the `Function.name` from the function used when calling `parallel` or `series`
   * @param {Function} fn An `async function` that will accept a single object argument that contains the follwing properties:
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
   * 6. `event` An _immutable_ event name defined when the task originated from the function returned by {@link Asynchro.promisifyEventTarget}
   * 7. `name` An _immutable_ string value reflecting the original name passed into {@link Asynchro.verify}
   * 8. `operation` An _immutable_ string value reflecting the original function name of the function passed into {@link Asynchro.verify}
   * 9. `message` A write-only _mutable_ string value that will override the default message that will be added to {@link Asynchro.messages}
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
   * **NOTE:** There may be some residuale parallel/concurrent/background functions that were already running prior to the queue being stopped that
   * may still be running after a queue has been stopped/transferred by _verify_.
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
   * @param {Function} fn A _synchronous_ `function` that will accept a single argument that will be either set to a new {@link Asynchro} instance when
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
   * @returns {Object} The result from {@link Asynchro.result}
   */
  async run() {
    const asy = internal(this);
    if (asy.at.status !== Asynchro.QUEUEING) throw new Error(`To respond status must be ${Asynchro.QUEUEING}, not ${asy.at.status}`);
    if (!asy.at.trk.que.length) throw new Error(`Nothing to run/execute`);
    asy.at.status = Asynchro.RUNNING;
    const rtn = await asynchro(asy.at.trk, asy.this);
    if (asy.at.trk.errors.length) asy.at.status = Asynchro.FAILED;
    else if (rtn.done === false || rtn.tx) asy.at.status = Asynchro.STOPPED;
    else asy.at.status = Asynchro.SUCCEEDED;
    asy.at.trk.que.length = 0; // clear queue since the queue is stopped before completing
    asy.at.trk.verify = null; // reset verify functions
    var rslt;
    if (rtn.tx) { // migrate queue state and run returned queue that execution will be transferred to
      asy.at.trk.waiting = 0; // clear waiting since there may be some tasks waiting before transfer
      const asyn = internal(rtn.tx);
      const errs = asy.at.trk.errors, nerrs = asyn.at.trk.errors, msgs = asy.at.trk.messages, nmsgs = asyn.at.trk.messages;
      asyn.at.trk.errors = errs.length ? (nerrs.length && errs.concat(nerrs)) || errs : nerrs;
      asyn.at.trk.messages = msgs.length ? (nmsgs.length && msgs.concat(nmsgs)) || msgs : nmsgs;
      //const bgs = asy.at.trk.backgrounds, nbgs = asyn.at.trk.backgrounds;
      //asyn.at.trk.backgrounds = bgs.length ? (nbgs.length && [...new Set(bgs.concat(nbgs))]) || bgs.slice() : nbgs;
      if (asyn.at.trk.rslt !== asy.at.trk.rslt) merge(asyn.at.trk.rslt, asy.at.trk.rslt, { deep: true });
      asy.at.status = Asynchro.TRANSFERRED;
      if (asy.at.endHandler) asy.at.endHandler.call(asy.this, asyn.this);
      // need to accumulate the transfer instances before the the next run
      if (asy.at.trk.brchs) asy.at.trk.brchs.push(asyn);
      else asy.at.trk.brchs = [asy, asyn];
      asyn.at.trk.brchs = asy.at.trk.brchs;
      if (arguments.length) await asyn.this.run.apply(asyn.this, arguments) /*<- for extending class args*/
      else await asyn.this.run();
      rslt = asyn.at.trk.rslt;
    } else {
      if (asy.at.endHandler) asy.at.endHandler.call(asy.this);
      rslt = asy.at.trk.rslt;
    }
    return rslt;
  }

  /**
   * Waits for any pending {@link Asynchro.background} functions to complete and captures the results/caught errors.
   * @example
   * const ax = new Asynchro({});
   * ax.background('myBgTask', myAsyncFunc, myAsyncFuncArg1, myAsyncFunc2);
   * // ...other queued tasks?
   * await ax.run();
   * // now that Asynchro.run has completed we can optionally wait for the background tasks to complete
   * // NOTE: awlays use return Asynchro instance in case branching took place
   * const abx = await ax.backgroundWaiter();
   * // if errors are caught, should print out errors thrown from the background async function
   * for (let error of abx.errors) console.error(error);
   * // if no error for myBgTask, should print out the return value from the background async function
   * console.log(abx.result.myBgTask);
   * @async
   * @param {(Object|Boolean)} [resultObj=true] Either the object where the background results will be set or `true` to use the 
   * {@link Asynchro.result} (may be from a different {@link Asynchro} instance when branching). Each property name that matches the
   * _name_ passed into the original call to {@link Asynchro.background} that queued the _background_ function will be set on the
   * _result_ object.
   * @returns {Asynchro} Either the {@link Asynchro} instance that the `backgroundWaiter` was called from, or the __last__
   * {@link Asynchro} instance returned in the chain of branching/transfer operations using {@link Asynchro.verify}
   */
  async backgroundWaiter(resultObj = true) {
    const asy = internal(this), brchs = asy.at.trk.brchs || [asy];
    if (!brchs || !brchs.length) return;
    var rslt, result, thiz;
    for (let tx of brchs) {
      thiz = tx.this;
      result = resultObj === true ? tx.this.result : resultObj;
      for (let itm of tx.at.trk.backgrounds) {
        if (!itm.backgroundPromise) throw new Error(`Missing "backgroundPromise" on item ${itm.name || itm.fn.name || itm.fn.toString()}`);
        rslt = await itm.backgroundPromise;
        if (result && itm.name) result[itm.name] = rslt;
        tx.at.trk.waitingBackground--;
      }
      tx.at.trk.backgrounds.length = 0; // wipe all background queues
    }
    brchs.length = 0; // wipe all transfer instances
    return thiz;
  }

  /**
   * Resolves to a previously completed result value from a queued task function so the results from one task can be passed into subsequent
   * tasks during execution via {@link Asynchro.run}
   * @example
   * const ax = new Asynchro({});
   * ax.series('one', async () => {
   *  // other async operations here
   *  return { array: [1] };
   * });
   * ax.series('two', async (a) => {
   *  // other async operations here
   *  console.log(a); // prints out 1
   * }, ax.arg('one.array[0]'));
   * await ax.run();
   * @param {String} name The name given for the task where the result will be stored as a property of the {@link Asynchro.result} object.
   * Can use dot notation to express a path to other objects (e.g. `someObject.someOtherObject.someValue` would equate to
   * `asynchro.result.someObject.someOtherObject.someValue` once the queued task function is executed)
   * @returns {ResultArg} The {@link ResultArg}
   */
  arg(name) {
    if (!name || typeof name !== 'string') throw new Error(`Invlaid name: ${name}`);
    return new ResultArg(name);
  }

  /**
   * The accumulated message(s) gathered while running queued tasks during a {@link Asynchro.run}
   * @param {String} [delimiter] The delimter to use between messages
   * @returns {String} The cumulative messages
   */
  messages(delimiter) {
    return internal(this).at.trk.messages.join(delimiter);
  }

  /**
   * Determines if an `Error` or a `Function` construct to an `Error` will be thrown when encountered during an execution run
   * @param {(Error|Function)} errorOrType Either an `Error` or a `Function` construct to an Error
   * @param {Boolean} [throwWhenTrue] `true` to actually throw the error when `errorOrType` is an actual `Error` and it is determined that the error should throw
   * @returns {Boolean} Returns true if the `Error` or `Function` construct to an `Error` will be thrown when encountered during an execution run
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
   * The number of tasks queued that are _waiting_ for execution excluding {@link Asynchro.background} tasks
   * (see {@link Asynchro.waitingBackground}).
   * @type {Integer}
   */
  get waiting() {
    return internal(this).at.trk.waiting;
  }

  /**
   * The number of {@link Asynchro.background} tasks queued that are _waiting_ for execution. __NOTE:__ If
   * {@link Asynchro.backgroundWaiter} is never called the count will remain indefinitely.
   * @type {Integer}
   */
  get waitingBackground() {
    return internal(this).at.trk.waitingBackground;
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
  * Promisifies event(s) fired from a event target
  * @param {Object} target The object that will fire event(s)
  * @param {Integer} [tko=60000] The timeout delay in milliseconds to wait for the event before _rejecting_ or
  * _resolving_ the promise (set to zero for _unlimited_ timeout or override using `events[].tko`)
  * @param {Integer} [eventMax=1] The number of times any one of the events must fire before the promise is resolved
  * @param {Integer} [eventErrorMax=1] Rhe number of times any one of the events must fire that contain an `Error` as
  * the first argument before the promise is rejected with that `Error` (or `Error[]` if there are more than one)
  * @param {Boolean} [implyError=true] `true` will automatically listen for an `error` events that will reject or resolve
  * @param {Boolean} [resolveOnTimeout=false] `true` to _resolve_ when the `tko` timeout is reached, false to _reject_
  * and uses the passed `tko` for the timeout delay
  * @returns {Function} The function that will listen for events to fire before resolving/rejecting with either an array
  * of arguments passed into the listener, a single value when the listener was passed one argument, `undefined` when
  * the listener was not passed any arguments or an `Object` generated using `listenerParams` to map the argument values
  * passed into the listener in the order they are received. The function accepts the following arguments:
  * - `event` either the event name that will be listened to or an object that will override 
  * - `listenerParams` an optional `String[]` of parameter names for the given function that will be used as the
  * property names on the resolved promise object (or `Object[]` when `eventMax > 1`), a `Function` to extract the
  * property names from, or omit/`false` to simply use an array of argument values when resolving the promise
  * @example
  * // 30 sec timeout, 1 event max (default), 1 error event max (default)
  * const listenAsync = Asynchro.promisifyEventTarget(myEventTarget, 30000);
  * setTimeout(() => {
  *  myEventTarget.dispatchEvent('my-event-1', 'done');
  *  myEventTarget.dispatchEvent('my-event-2', 1, 2, 3);
  *  myEventTarget.dispatchEvent('my-event-2', 4, 5, 6);
  *  // my-event-2 will never set the following since it exceeds event max of 1
  *  myEventTarget.dispatchEvent('my-event-2', 'not set');
  *  myEventTarget.dispatchEvent('my-event-3', 1, 2, 3);
  *  myEventTarget.dispatchEvent('my-event-4', 'a', 'b', 'c');
  *  myEventTarget.dispatchEvent('my-event-4', 'd', 'e', 'f');
  * }, 10);
  * // run in parallel
  * const p1 = listenAsync('my-event-1');
  * const p2 = listenAsync({ name: 'my-event-2', eventMax: 2 });
  * const p3 = listenAsync('my-event-3', ['one', 'two', 'three']);
  * const p4 = listenAsync({ name: 'my-event-4', eventMax: 2 }, ['name1', 'name2', 'name3']);
  * const p4x = listenAsync({ name: 'my-event-4', eventMax: 2 }, function demoNames(name1, name2, name3){});
  * console.log(await p1); // done
  * console.log(await p2); // [[1, 2, 3], [4, 5, 6]]
  * console.log(await p3); // { one: 1, two: 2, three: 3 }
  * console.log(await p4); // [{ name1: 'a', name2: 'b', name3: 'c' }, { name1: 'd', name2: 'e', name3: 'f' }]
  * console.log(await p4x); // [{ name1: 'a', name2: 'b', name3: 'c' }, { name1: 'd', name2: 'e', name3: 'f' }]
  * @example
  * // example setup
  * const tko = 30000, delay = 10, a = 1, b = 2, c = 3, d = 4, e = 5, l1 = 200, l2 = 300;
  * function multiply(a, b, c) {
  *   return new Promise((resolve, reject) => {
  *     setTimeout(() => {
  *       resolve({ m1: 10 * (a || 0), m2: 20 * (b || 0), m3: 30 * (c || 0) });
  *     }, delay);
  *   });
  * }
  * // class just for example purposes
  * class MyEventTarg {
  *   constructor() {
  *     this.listeners = {};
  *   }
  *   addListener(event, listener) {
  *     this.listeners[event] = this.listeners[event] || [];
  *     this.listeners[event].push(listener);
  *   }
  *   removeListener(event, listener) {
  *     var idx = -1;
  *     if (!(event in this.listeners)) idx;
  *     for (let lsn of this.listeners[event]) if (++idx && lsn === listener) {
  *       this.listeners[event].splice(idx, 1);
  *       return idx;
  *     }
  *   }
  *   dispatchEvent(type) {
  *     if (this.listeners[type]) {
  *       // pass all the args to the listener except the 1st arg that is the event name
  *       const args = Array.prototype.slice.call(arguments, 1);
  *       for (let lsn of this.listeners[type]) lsn.apply(this, args);
  *     }
  *   }
  * }
  * const trg = new MyEventTarg();
  * 
  * // 30 sec timeout, 1 event max (default), 1 error event max (default)
  * const listenAsync = Asynchro.promisifyEventTarget(trg, tko);
  * const ax = new Asynchro({});
  * ax.parallel('one', multiply, a, b, c);
  * ax.series('two', listenAsync, 'event-1');
  * ax.series('three', multiply, d, e);
  * ax.parallel('four', listenAsync, 'event-2');
  * 
  * setTimeout(() => {
  *   trg.dispatchEvent('event-1', l1);
  *   setTimeout(() => {
  *     trg.dispatchEvent('event-2', l2);
  *   }, delay * 2); // delay must be between delay on "two"/"three" and "tko"
  * }, delay); // delay must be between delay on "two" and "tko" ("one" is in parallel)
  * 
  * const rslt = await ax.run();
  * // { one: { m1: 10, m2: 40, m3: 90 }, two: 200, three: { m1: 40, m2: 100, m3: 0 }, four: 300 }
  * console.log(rslt);
  */
  static promisifyEventTarget(target, tko = 60000, eventMax = 1, eventErrorMax = 1, implyError = true, resolveOnTimeout = false) {
    const on = target['once'] && eventMax === 1 ? 'once' : (target['on'] && 'on') || (target['addListener'] && 'addListener')
      || (target['addEventListener'] && 'addEventListener');
    const off = (target['off'] && 'off') || (target['removeListener'] ? 'removeListener' : target['removeEventListener'] && 'removeEventListener');
    const promisifierEvent = function promisifierEvent(event, listenerParams) {
      const isEvtStr = event && typeof event === 'string';
      if (!event) throw new Error(`Invlaid event: ${event}`);
      if (!isEvtStr && (!event.name || typeof event.name !== 'string')) throw new Error(`Event name must be a non-empty string, not: ${event.name}`);
      if (!on || !off) throw new Error(`Invalid event target ${target}`);
      if (listenerParams && typeof listenerParams === 'function') listenerParams = Asynchro.extractFuncArgs(listenerParams);
      var timers = {}, listeners = {}, errors, results, counts = { events: 0, errors: 0 }, it = {};
      const clearAll = (done) => {
        for (let handle in timers) clearTimeout(timers[handle]);
        timers = null;
        for (let event in listeners) target[off](event, listeners[event]);
        listeners = null;
        if (done) it.done = true;
      };
      const addlistener = (event) => {
        listeners[event.name] = function listener(err) {
          const isError = err && err instanceof Error;
          if ((isError && ++counts.errors >= event.errorMax) || (!isError && ++counts.events >= event.max)) {
            clearAll(true);
            if (counts.errors > event.errorMax || counts.events > event.max) return;
          }
          if (isError && event.errorMax !== 1) {
            errors = errors || [];
            if (arguments.length > 1) err[event.name] = Array.prototype.slice.call(arguments, 1);
            errors.push(err);
          } else if (!isError) {
            var args;
            if (listenerParams) {
              args = {};
              var fni = -1;
              for (let name of listenerParams) {
                args[name] = arguments[++fni];
              }
            } else args = event.max === 1 && arguments.length === 1 ? arguments[0] : arguments.length > 0 ? Array.prototype.slice.call(arguments) : undefined;
            if (results) results.push(args);
            else if (event.max === 1) results = args;
            else results = [args];
          }
          if ((isError && counts.errors !== event.errorMax) || (!isError && counts.events !== event.max)) return;
          if (isError) it.reject(errors || err);
          else it.resolve(results);
        };
        target[on](event.name, listeners[event.name]);
        if (!event.tko) return;
        timers[event.name] = setTimeout(() => {
          clearAll();
          if (it.done) return;
          it.done = true;
          const err = new Error(`Promisify events for event "${event.name}" timeout at ${event.tko}ms`);
          if (event.resolveOnTimeout) it.resolve(err);
          else it.reject(err);
        }, event.tko);
      };
      const name = isEvtStr ? event : event.name, etko = !isEvtStr && event.hasOwnProperty('tko') ? event.tko : tko;
      const max = !isEvtStr && event.hasOwnProperty('eventMax') ? event.eventMax : eventMax;
      const errorMax =  !isEvtStr && event.hasOwnProperty('eventErrorMax') ? event.eventErrorMax : eventErrorMax;
      const rlvOnTko = !isEvtStr && event.hasOwnProperty('resolveOnTimeout') ? event.resolveOnTimeout : resolveOnTimeout;
      addlistener({ name, tko: etko, max, errorMax, resolveOnTimeout: rlvOnTko });
      if (implyError && name !== 'error') addlistener({ name: 'error', max, errorMax });
      return new Promise((resolve, reject) => {
        it.done = false;
        it.resolve = resolve;
        it.reject = reject;
      });
    }
    Object.defineProperty(promisifierEvent, 'isPromisifiyEvent', { value: true });
    return promisifierEvent;
  }

  /**
   * Takes an object's function with the last argument being a callback function which accepts __multiple parameter arguments__ (1st argument being
   * an `Error`) and converts it to a promise. Rejects when an `Error` is passed in as the first argument or resolves using the arguments passed
   * into the callback (excluding the 1st error parameter). Also supports `this` reference within the passed function (set to the passed `obj`) 
   * @param {Object} obj The object that contains the function that will be promisfied
   * @param {String} funcName The name of the function property in the `obj`
   * @param {(String[]|Function)} [funcParams] A `String[]` of parameter names for the given function that will be used as the property names on the
   * resolved promise object (should not include the error or callback parameter names), a `Function` to extract the property names from, or
   * omit/`false` to simply use an array of argument values when resolving the promise
   * @returns {Function} A `function(..args)` that returns a promise
   */
  static promisifyCallback(obj, funcName, funcParams) {
    return function promisifierCallback() {
      const args = Array.prototype.slice.call(arguments);
      // callback needs to be in the correct position regardless of what was passed
      for (let ai = arguments.length, ln = obj[funcName].length - 1; ai < ln; ++ai) args.push(undefined);
      if (funcParams && typeof funcParams === 'function') {
        funcParams = Asynchro.extractFuncArgs(funcParams);
        funcParams.shift(); // first argument should be the error
        funcParams.pop(); // last argument should be the callback
      }
      return new Promise((resolve, reject) => {
        args.push(function promisifierCb(err) {
          if (err) reject(err);
          else if (funcParams) {
            const rtn = {};
            var fni = 0; // skip error argument
            for (let name of funcParams) {
              rtn[name] = arguments[++fni];
            }
            resolve(rtn);
          } else resolve(Array.prototype.slice.call(arguments, 1)); // remove error argument and return array
        });
        obj[funcName].apply(obj, args);
      });
    };
  }

  /**
   * Extracts the argument names that a function accepts
   * @param {Function} fn The function to extract paramter names from
   * @returns {String[]} The array of function parameter names in the order that they are defined
   */
  static extractFuncArgs(fn) {
    if (!fn || typeof fn !== 'function') return [];
    var ftxt = fn.toString().replace(FN_COMMENTS, '').replace(FN_DEFAULT_PARAMS, '').replace(FN_ARROWS, '($1)');
    const rtn = ftxt.slice(ftxt.indexOf('(') + 1, ftxt.indexOf(')')).match(FN_PARAMS_SEP);
    return rtn || [];
  }
}

// TODO : ESM remove the following line...
module.exports = Asynchro;

/**
 * Queues a promise for **series/paralel** relative to other promises in the queue
 * @private
 * @ignore
 * @param {Asynchro} asyi The `async` processor
 * @param {Boolean} series `true` to run in **series** relative to other tasks, false to run in **parallel**
 * @param {(Boolean|Object|String)} [throws] One of the following values (supersedes any `throws` parameters passed during construction):
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
 * @param {String} [name] The name given for the task where the result will be stored as a property of the {@link Asynchro.result} object
 * (omit to prevent results from being set from function return value - a name/ID will be generated and returned)
 * @param {Function} fn The function to queue for asynchronicity
 * @param {*} args Arguments that will be passed into the queued function
 * @param {Error[]} [bgErrors] An array that will store caught errors from queued background functions. The queued task function will __not__
 * wait before contining to the next task in the queue (omit when the function is __not__ a background task).
 * @returns {String} The queued name/ID (either passed or generated)
 */
function asynchroQueue(asyi, series, throws, name, fn, args, bgErrors) {
  const asy = internal(asyi), isBg = !!bgErrors;
  if (!fn || typeof fn !== 'function') {
    throw new Error(`A ${series ? 'series' : isBg ? 'background' : 'parallel'} task must be a Function, but found ${typeof fn} (${fn})`);
  }
  if (asy.at.status !== Asynchro.QUEUEING) {
    throw new Error(`A ${series ? 'series' : isBg ? 'background' : 'parallel'} must be in status ${Asynchro.QUEUEING}, not ${asy.at.status}`);
  }
  throws = throws === true || throws === false ? throws : (throws && typeof throws === 'object' && throws) || (throws && { matches: throws });
  const noResult = (!name || !name.trim()) && (name = guid()) || isBg ? true : false;
  // TODO : should async allow "this" to be passed?
  const itm = { series, index: asy.at.trk.que.length, isBackground: isBg, throws, name, fn, args, noResult, errorMetaName: asy.at.errorMetaName };
  itm.noAwait = itm.isBackground;
  itm.event = fn.isPromisifiyEvent && args[0];
  if (isBg && itm.throws !== true) setBackgroundFunction(itm, asyi.systemErrorTypes, bgErrors);
  asy.at.trk.que.push(itm);
  if (itm.isBackground) asy.at.trk.waitingBackground++;
  else asy.at.trk.waiting++;
  return name;
}

/**
 * Runs/Executes all queued asynchronous functions in insertion order with parallel/concurrent running simultaneously
 * @private
 * @ignore
 * @param {Object} trk The tracking object from {@link Asynchro}
 * @param {Asynchro} [asyi] The {@link Asynchro} instance
 * @returns {Object} An object that contains the following properties:
 * - `done`: _true_ when ran to completion, _false_ when the process has been stopped before finishing
 * - `tx`: the first {@link Asynchro} instance that was returned from {@link asyncHandler} that queue execution should
 * be transferred to
 * - `item`: the queued _item_ where the stop/transfer occurred
 */
async function asynchro(trk, asyi) {
  var pends = [], rtn = { done: true }, hdl;
  for (let itm of trk.que) {
    hdl = await asyncHandler(trk, asyi, itm, pends); // execute the queued tasks
    if (!itm.promise && !itm.backgroundPromise) trk.waiting--;
    if (hdl === false) { // stop
      rtn.done = hdl;
      rtn.item = itm;
      break;
    } else if (asyi !== hdl && hdl instanceof Asynchro) { // transfer
      rtn.done = false;
      rtn.item = itm;
      rtn.tx = hdl;
      break;
    }
  }
  for (let itm of pends) {
    hdl = await asyncHandler(trk, asyi, itm, pends); // wait for pending parallel/concurrent executions to complete
    trk.waiting--;
    if (rtn.done === false || rtn.tx instanceof Asynchro) continue; // do not override first stop
    if (hdl === false) {
      rtn.done = hdl;
      rtn.item = itm;
    } else if (asyi !== hdl && hdl instanceof Asynchro) {
      rtn.done = false;
      rtn.item = itm;
      rtn.tx = hdl;
    }
  }
  return rtn;
}

/**
 * Processes a queued `async function` from {@link Asynchro}
 * @private
 * @ignore
 * @param {Object} trk The _private_ tracking object from {@link Asynchro}
 * @param {Asynchro} asyi The `Asynchro` instance
 * @param {Object} itm The queued `async` item from {@link asynchroQueue}
 * @param {Object[]} pends The pending parallel/concurrent items- each originating from {@link asynchroQueue}
 * @returns {(Boolean|Asynchro)} `false` or another `Asynchro` instance should **stop** iteration
 */
async function asyncHandler(trk, asyi, itm, pends) { // return false or another Asynchro instance should stop iteration
  var rtn = true, msg;
  const it = {}, type = itm.series ? 'series' : itm.isBackground ? 'background' : 'parallel';
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
 * @param {Asynchro} asyi The `Asynchro` instance
 * @param {Object} itm The queued `async` item from {@link asynchroQueue}
 * @param {Object[]} pends The pending parallel/concurrent items- each originating from {@link asynchroQueue}
 * @param {Object[]} [backgrounds] where background task items will be stored for future promise resolution
 * @returns {*} The result from the function execution or `undefined` when the `item.promise` has been set/generated
 */
async function handleAsync(asyi, itm, pends, backgrounds) {
  var rslt;
  if (!itm.noResult && itm.args && asyi && asyi.result) resolveArgs(asyi, itm);
  if (itm.series) {
    rslt = itm.fn.apply(itm.thiz, itm.args);
    if (rslt instanceof Promise) rslt = await rslt; // performance gain when not async function
  } else if (itm.promise) {
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
    if (itm.isBackground) { // run in background, don't wait for promise
      itm.backgroundPromise = itm.promise;
      itm.promise = false;
      // wait until background promise is pending in case the queue is stopped/transferred
      if (backgrounds) backgrounds.push(itm);
    } else pends.push(itm);
  }
  return rslt;
}

/**
 * Proxies an `itm.fn` in order to handle re-throwing/catching the desired errors
 * @private
 * @ignore
 * @param {Object} itm The queued `async` item from {@link asynchroQueue}
 * @param {*} systemErrorTypes The {@link Asynchro.systemErrorTypes} that will be applied to the background function check
 * @param {Error[]} errors The {@link Asynchro.errors} where caught errors will be added
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
 * @param {Object} it The object to define the item metadata on
 * @param {Object} itm The item where metadata will be extracted from
 * @param {Boolean} pendPromise `true` when a promise is pending
 * @param {String} [name] Instead of defining properties/values directly on `it` they will be set on a newly defined `it[name] = {}`
 */
function defineItemMeta(it, itm, pendPromise, name) {
  var obj = it;
  if (name) {
    if (!obj[name]) Object.defineProperty(obj, name, { value: {}, enumerable: true });
    obj = obj[name];
  }
  Object.defineProperty(obj, 'isPending', { value: !!pendPromise, enumerable: true });
  Object.defineProperty(obj, 'isParallel', { value: !itm.series && !itm.isBackground, enumerable: true });
  Object.defineProperty(obj, 'isBackground', { value: itm.isBackground, enumerable: true });
  Object.defineProperty(obj, 'event', { value: itm.event, enumerable: true });
  Object.defineProperty(obj, 'name', { value: itm.name, enumerable: true });
  Object.defineProperty(obj, 'operation', { value: itm.fn.name, enumerable: true });
}

/**
 * Resolves any arguments that are set in an item that are a {@link ResultArg} to the corresponding {@link Asynchro.result}
 * path resolved value
 * @private
 * @ignore
 * @param {Asynchro} asyi The {@link Asynchro} instance
 * @param {Object} itm The queued `async` item from {@link asynchroQueue}
 */
function resolveArgs(asyi, itm) {
  var argi = 0, names, mtch, val;
  for (let arg of itm.args) {
    if (arg instanceof ResultArg) {
      // convert any obj['path']["to"][`value`][0] -> obj.path.to.value -> [ obj, path, to, value[0] ]
      names = arg.name.replace(/\[['"`](\w+)['"`]\]/g, '.$1').split('.');
      val = asyi.result;
      for (let nm of names) {
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
 * @param {Asynchro} asyi The {@link Asynchro} instance
 * @param {String} [name] The name of the task that was ran
 * @param {(Error|Object|String)} [errorOrMessage] Either an `Error`, `{ message }` or message string that wil be appended to the overall messages
 * @param {String} [operation] An operation name that ran the task, typically a function name
 * @returns {String} The message added to the commulative messages
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
 * @param {(Boolean|Object|String)} [throws] One of the following values (supersedes any `throws` parameters passed during construction):
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
 * @param {(Error|Function)} errorOrType Either an `Error` or a `Function` construct to an Error
 * @param {Boolean} [throwWhenTrue] `true` to actually throw the error when `errorOrType` is an actual `Error` and it is determined that the error should throw
 * @param {Function[]} systemErrorTypes Value from {@link Asynchro.systemErrorTypes}
 * @returns {Boolean} Returns true if the `Error` or `Function` construct to an `Error` will be thrown when encountered during an execution run
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
   * @param {String} name The name of the property in the {@link Asynchro} `result` object
   */
  constructor(name) {
    const rsa = internal(this);
    rsa.at.name = name;
  }

  /**
   * @returns {String} The name of the result argument
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
 * @param {Object} dest The destination object where the properties will be added
 * @param {Object} src The source object that will be used for adding new properties to the destination
 * @param {Object} [opts] Merge options
 * @param {Boolean} [opts.ctyp] Flag that ensures that source values are constrained to the same type as the destination values when present
 * @param {Boolean} [opts.nou] Flag that prevents merge of undefined values
 * @param {Boolean} [opts.non] Flag that prevents merge of null values
 * @param {Boolean} [opts.deep] Flag that indicates that any objects/arrays found will be cloned instead of referenced
 * @param {(Object[] | String[])} [opts.exc] Properties to exclude from the merge
 * @param {(Object | String)} [opts.exc[]] Either object describing a property or a property name
 * @param {String} [opts.exc[].prop] The property name to exclude
 * @param {Integer} [opts.exc[].depth=Infinity] The depth level to exclude
 * @param {Integer} [depth=1] The initial object depth used for exclusions
 * @returns {Object} The destination object
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
 * @param {String} [value] When present, will add any missing hyphens (if `hyphenate=true`) instead of generating a new value
 * @param {Boolean} [hyphenate=true] `true` to include hyphens in generated result
 * @returns {String} The generated GUID
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