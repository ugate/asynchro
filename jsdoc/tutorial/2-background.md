### Background Tasks
Background tasks are `async` functions that do not require `await`ing before proceeding to subsequent tasks in the queue, but still require adherence to an __Error Handling Rule__ (discussed in _Error Handling_ section of [The Queue](tutorial-1-queue.html)). To get a better understanding of this concept, consider the following functions.
```js
function multiply(a, b, c, obj) { // public function
  if (!a) throw new Error(`"a" must be a number greater than zero, but received: ${a}`);
  if (!b) return;
  return multiplier(a, b, c, obj)
}
function multiplier(a, b, c, obj) { // private function
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (obj && obj.reject) reject(new Error('Example error after timeout'));
      else resolve({ m1: 10 * a, m2: 20 * b, m3: 30 * (c || 0) });
    }, 10);
  });
}
```
Now lets consider the different results when invoking `multiply`.
```js
try {
  // caught since error is thrown immediately
  multiply(0);
  // .catch() is required since a promise is returned
  multiply(1, 2, 3, { reject: true }).catch((err) => {
    console.error(err);
  });
  // TypeError: Cannot read property 'catch' of undefined
  multiply(1, 0, 3, { reject: true }).catch((err) => {
    console.error(err);
  });
} catch (err) {
  console.error(err);
}
``` 
As illustrated, there are quite a few ways that an error can be either intentionally or unintentionally thrown. Another option would be to convert `function multiply` to `async function multiply`, but that would add another `Promise` wrapper that would need to be processed internally during the next iteration of the [Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop). And that's assuming the function doesn't belong to an external module where we do not have any control over it's implementation. With all the different variations involved, it's better to keep it simple and mitigate any risk by wrapping background tasks within another `async function`. Fortunately, `asynchro` will do this for us everytime we call [Asynchro.background](Asynchro.html#background) (unless always throwing, `throws = true`). Take for instance the subsequent example:
```js
const ax = new Asynchro({}, false, console.log);
ax.series('one', multiply, 1, 2, 3); // multiply from previous examples
ax.background('two', multiply, 4, 5, 6);
ax.background('three', multiply, 0);
ax.background('four', multiply, 1, 2, 3, { reject: true });
ax.background('five', multiply, 1, 0, 3, { reject: true });
await ax.run();
// { one: { m1: 10, m2: 40, m3: 90 } }
console.log(ax.result);
// [
//  { Error: "a" must be a number greater than zero, but received: 0
//    ...
//    Asynchro: {
//      name: 'three',
//      operation: 'multiply'
//      isPending: false,
//      isParallel: false,
//      isBackground: true
//    }
//  }
// ]
console.log(ax.errors);
```
Only the result for `one` is set in [Asynchro.result](Asynchro.html#result). And since the only error that occurred was the one that was immediately thrown when `multiply(0)` was called, it is the only one recorded yet in [Asynchro.errors](Asynchro.html#errors). If it is desirable to capture background results/errors that occurred after all the background tasks have been `await`ed for (either completed or errored) [Asynchro.backgroundWaiter](Asynchro.html#backgroundWaiter) can be `await`ed for after `await`ing [Asynchro.run](Asynchro.html#run).
```js
const ax = new Asynchro({}, false, console.log);
ax.series('one', multiply, 1, 2, 3); // multiply from previous examples
ax.background('two', multiply, 4, 5, 6);
ax.background('three', multiply, 0);
ax.background('four', multiply, 1, 2, 3, { reject: true });
ax.background('five', multiply, 1, 0, 3, { reject: true });
await ax.run();
// could use a different result object or add to the current one
const errors = await ax.backgroundWaiter(ax.result);
// {
//  one: { m1: 10, m2: 40, m3: 90 },
//  two: { m1: 40, m2: 100, m3: 180 },
//  three: undefined,
//  four: undefined,
//  five: undefined
// }
console.log(ax.result);
// [
//  { Error: "a" must be a number greater than zero, but received: 0
//    ...
//    Asynchro: {
//      name: 'three',
//      operation: 'multiply'
//      isPending: false,
//      isParallel: false,
//      isBackground: true
//    }
//  },
//  { Error: Example error after timeout
//    ...
//    Asynchro: {
//      name: 'four',
//      operation: 'multiply'
//      isPending: false,
//      isParallel: false,
//      isBackground: true
//    }
//  },
// ]
console.log(errors);
```

#### [Verification >>](tutorial-3-verification.html)