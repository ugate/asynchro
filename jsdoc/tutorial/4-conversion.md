### Conversions
There are some instances where legacy style `async`-like functions need to be incorporated into a workflow. `Asynchro` provides some micro-sized utilities that should accommodate the most common use cases.

#### Callback Conversions
Most _callback_ style functions that follow the `function(error, function callback(error, returnValue))` schematics that can be converted/promisified into an async function using a utility such as the one provided by `util.promisify` in [Node.js](https://nodejs.org). But if you're running in a browser or just need multiple argument support, those type of solutions fall short. `Aynchro` provides some simple solutions to assist. [Asynchro.promisifyCallback](Asynchro.html#promisifyCallback) does callback conversions on one or more aguments provided that the callback function belongs to an `Object`:
```js
const myCallbackObj = { // could also be a class instance
  multiply: (a, b, c, cb) => {
    const thiz = this;
    setTimeout(() => {
      cb(thiz.error, 10 * (a || 0), 20 * (b || 0), 30 * (c || 0), cb);
    }, 500);
  }
};
const myAsyncFunc = Asynchro.promisifyCallback(myCallbackObj, 'multiply');
const myAsyncFuncNamed = Asynchro.promisifyCallback(myCallbackObj, 'multiply', [ 'a', 'b', 'c' ]);
var rslt = await myAsyncFunc(0, 1, 2); // 10 * 0 = 0, 20 * 1 = 20, 30 * 2 = 60
console.log(rslt); // [ 0, 20, 60 ]
rslt = await myAsyncFuncNamed(1, 2, 4); // 10 * 1 = 10, 20 * 2 = 40, 30 * 4 = 120
console.log(rslt); // { a: 10, b: 40, c: 120 }
rslt = await myAsyncFuncNamed(2, 4, 6); // 10 * 2 = 20, 20 * 4 = 80, 30 * 6 = 180
console.log(rslt); // { a: 20, b: 80, c: 180 }

myCallbackObj.error = new Error('My expected error');
try {
  rslt = await myAsyncFunc(0, 1, 2);
} catch (err) {
  console.log(err); // My expected error
}
```
Which enables the converted function to be added to the queue:
```js
const myAsyncFunc = Asynchro.promisifyCallback(myCallbackObj, 'multiply', [ 'a', 'b', 'c' ]);
const ax = new Asynchro({}, false, console.log);
ax.series('one', myAsyncFunc, 1, 2, 4);
// ...more async function added to the queue here
const rslt = await ax.run();
console.log(rslt); // { one: { a: 10, b: 40, c: 120 } }
```

#### Event Conversions
There may be certain events that need to `await` for before continuing queue execution. In order to achieve this `asynchro` provides [Asynchro.promisifyEventTarget](Asynchro.html#promisifyEventTarget). The event object that is converted must have at least one of the following functions for registering an event listener:
- [addEventListener(eventName, listener)](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/addListener)
- [addListener(eventName, listener)](https://nodejs.org/api/events.html#events_emitter_addlistener_eventname_listener)
- [once(eventName, listener)](https://nodejs.org/api/events.html#events_emitter_once_eventname_listener)
- [on(eventName, listener)](https://nodejs.org/api/events.html#events_emitter_on_eventname_listener)

As well as any one of the following functions for removing a previously registered event listener:
- [removeEventListener(eventName, listener)](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
- [removeListener(eventName, listener)](https://nodejs.org/api/events.html#events_emitter_removelistener_eventname_listener)
- [off(eventName, listener)](https://nodejs.org/api/events.html#events_emitter_off_eventname_listener)

The listener will listen for a one or more dispatched/emitted events (configurable). Once the listener is notified and the maximum number of events allotted is reached, the listener is removed. By default, yet configurable, `error` events are listened to and thrown- allowing an `Asynchro` queue to process the generated async function just like any other task in the queue.
```js
// setup for example purposes
class MyEventTarg {
  constructor() {
    this.listeners = {};
  }
  addListener(event, listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
  }
  removeListener(event, listener) {
    var idx = -1;
    if (!(event in this.listeners)) idx;
    for (let lsn of this.listeners[event]) if (++idx && lsn === listener) {
       this.listeners[event].splice(idx, 1);
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
const trg = new MyEventTarg();
const tko = 30000, delay = 10, a = 1, b = 2, c = 3, d = 4, e = 5, l1 = 200, l2 = 300;
function multiply(a, b, c) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ m1: 10 * (a || 0), m2: 20 * (b || 0), m3: 30 * (c || 0) });
    }, delay);
  });
}

// 30 sec timeout, 1 event max (default), 1 error event max (default)
const listenAsync = Asynchro.promisifyEventTarget(trg, tko);
const ax = new Asynchro({});
ax.parallel('one', multiply, a, b, c);
ax.series('two', listenAsync, 'event-1');
ax.series('three', multiply, d, e);
ax.parallel('four', listenAsync, 'event-2');

setTimeout(() => {
  trg.dispatchEvent('event-1', l1);
  setTimeout(() => {
    trg.dispatchEvent('event-2', l2);
  }, delay * 2); // delay must be between delay on "two"/"three" and "tko"
}, delay); // delay must be between delay on "two" and "tko" ("one" is in parallel)

const rslt = await ax.run();
// { one: { m1: 10, m2: 40, m3: 90 }, two: 200, three: { m1: 40, m2: 100, m3: 0 }, four: 300 }
console.log(rslt);
```
You may have noticed that in the `delay` was strategically calculated to ensure that there was enough time elapsed before dispatching the events (see inline comments in the previous example). That's why it's a good practice to ensure that the dispatch/emission of the events used are fully understood before adding them to a queue. This will prevent unintended race conditions. To illustrate, consider the following example.
```js
// MyEventTarg from the previous example
const trg = new MyEventTarg();
const tko = 30000, delay = 10, a = 1, b = 2, c = 3, d = 4, e = 5, l1 = 200, l2 = 300;
setTimeout(() => {
  trg.dispatchEvent('event-1', l1);
  trg.dispatchEvent('event-2', l2);
}, 500);

const listenAsync = Asynchro.promisifyEventTarget(trg, tko);
const ax = new Asynchro({});
ax.parallel('one', multiply, a, b, c); // multiply from the previous example
ax.series('two', listenAsync, 'event-1');
ax.series('three', multiply, d, e); // multiply from the previous example
ax.parallel('four', listenAsync, 'event-2');
// ERROR: Timeout since "four" waits for "two" before listening
const rslt = await ax.run();
```
Even though "two"/"event-1" and "four"/"event-2" are collectively fired in an _asynchronous_ manner (`setTimeout`), "two"/"event-1" is queued in _series_ and will wait until the "event-1" event fires before progressing and ultimately waiting for the "event-2" to fire. In other words, "event-2" fires before "four" has a chance to listen for the event. Another way to remedy this other than tweaking the timing of dispatch is to simply queue the events in _parallel_ before any other tasks take place.
```js
// MyEventTarg from the previous example
const trg = new MyEventTarg();
const tko = 30000, delay = 10, a = 1, b = 2, c = 3, d = 4, e = 5, l1 = 200, l2 = 300;
setTimeout(() => {
  trg.dispatchEvent('event-1', l1);
  trg.dispatchEvent('event-2', l2);
}, 500);

const listenAsync = Asynchro.promisifyEventTarget(trg, tko);
const ax = new Asynchro({});
ax.parallel('two', listenAsync, 'event-1');
ax.parallel('four', listenAsync, 'event-2');
ax.parallel('one', multiply, a, b, c); // multiply from the previous example
ax.series('three', multiply, d, e); // multiply from the previous example
const rslt = await ax.run();
// { one: { m1: 10, m2: 40, m3: 90 }, two: 200, three: { m1: 40, m2: 100, m3: 0 }, four: 300 }
console.log(rslt);
```
There is also an additional `event` parameter set during [Verification](tutorial-2-verification.html) for events.
```js
// assuming the last example setup
ax.verify('two', async it => {
  // {
  //   name: "two",
  //   operation: "promisifierEvent",
  //   event: "event-1",
  //   isParallel: true,
  //   isBackground: false
  // }
  console.log(it);
});
```

#### [API >>](Asynchro.html)