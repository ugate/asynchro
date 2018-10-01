### Conversions
There are some instances where legacy style `async`-like functions need to be incorporated into a workflow. `Asynchro` provides some micro-sized utilities that should accommodate the most common use cases.

#### Callback Conversions
Most _callback_ style functions that follow the `function(error, function callback(error, returnValue))` schematics can be converted/promisified into an async function using a utility such as the one provided by `util.promisify` in [Node.js](https://nodejs.org). But if you're running in a browser or just need multiple argument support, those type of solutions fall short. `Aynchro` provides some simple solutions to assist. [Asynchro.promisifyCallback](Asynchro.html#promisifyCallback) does callback conversions on one or more aguments provided that the callback function belongs to an `Object`:
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
(async () => {
  var rslt;
  rslt = await myAsyncFunc(0, 1, 2); // 10 * 0 = 0, 20 * 1 = 20, 30 * 2 = 60
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
})();
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
There may be certain events that need to `await` for before continuing queue execution. In order to achieve this `asynchro` provides [Asynchro.promisifyEventTarget](Asynchro.html#promisifyEventTarget). The event object that is converted must have an `addListener`, `addEventListener`, `once` or `on` function for registering an event listener as well as a `removeListener`, `removeEventListener` function for removing the listener. Both functions must have a function signature of `function(eventName, listenerFunction)`. The listener will listen for a single dispatched/emitted event of any one of the specified events. Once the listener is notified the listener is removed. By default `error` events are listened to and thrown- allowing an `Asynchro` queue to process the generated async function just like any other task in the queue.
```js
// class just for demo purposes
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
// if no event is fired within 60 secods a timeout error is thrown
const fn = Asynchro.promisifyEventTarget(trg, 60000);
const ax = new Asynchro({});
ax.series('one', fn, 'test', 123);
// ...more async function added to the queue here
const rslt = await ax.run();
console.log(rslt); // { one: 123 }
```

#### [Verification >>](tutorial-4-verification.html)