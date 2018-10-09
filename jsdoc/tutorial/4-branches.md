### Branching
No workflow engine would be complete without a way to _branch_ from one workflow to another. And since `asynchro` aims to supply a simple, yet versatile workflow engine, this feature is essential for handling logic routes based upon any number of conditions.

As we seen when [verifying](tutorial-3-verification.html) queued `async` tasks, the results/errors can be altered after execution has taken place. One aspect that was not dicussed though was the ability to either __stop__ the queue from continuting execution or __tranfer/branch__ to another queue altogether.

Stoping the queue from continuting execution is fairly easy. Simply return `false` from [Asynchro.verify](Asynchro.html#verify). Let's examine the subsequent example.
```js
// sample data and async function
const delay = 10, a = 1, b = 2, c = 3, d = 4, e = 5;
function multiply(a, b, c) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ m1: 10 * (a || 0), m2: 20 * (b || 0), m3: 30 * (c || 0) });
    }, delay);
  });
}

const ax = new Asynchro({});
ax.series('one', multiply, a, b, c);
ax.verify('one', async it => {
  it.result = 999; // optionally override result value
  return false; // stop the queue from continuing to process/run
});
// two is never ran
ax.series('two', multiply, d, e);
const rslt = await ax.run();
// { one: { m1: 999, m2: 40, m3: 90 } }
console.log(rslt);
```

Tranferring from one `Asynchro` instance/queue to another is very similar to stopping one. The difference is that a new `Asynchro` instance is returned from [Asynchro.verify](Asynchro.html#verify) rather than returning `false`.
```js
const resultObject = {};
const ax = new Asynchro(resultObject);
ax.parallel('one', multiply, a, b, c); // multiply/a/b/c from previous example
ax.verify('one', async it => {
  // execute when parallel function is first called (called 2x)
  // 1. when function is called and a promise is returned
  // 2. after await on the promise
  if (it.isPending) { // pending so transfer happens before "two" is executed
    // we can either use the same result object from the original queue
    // or use a new one (values from the original will be merged into the new one)
    const axt = new Asynchro(resultObject);
    axt.series('x', multiply, 1, 1, 1); // multiply from previous example
    axt.parallel('y', multiply, 2, 2);
    // stop the queue from continuing to process/run and transfer/run the new one
    return axt;
  } else {
    // optionally override result value (once it's set- i.e. isPending = false)
    it.result = 999;
  }
});
// two is never ran
ax.series('two', multiply, d, e); // multiply/d/e from previous example
const rslt = await ax.run();
// {
//   one: { m1: 999, m2: 40, m3: 90 },
//   x: { m1: 10, m2: 20, m3: 30 },
//   y: { m1: 20, m2: 40, m3: 60 }
// }
console.log(rslt);
```
Branching can occur at any given point during queue execution via the return value from [Asynchro.verify](Asynchro.html#verify). There is no _hard_ limit to the number of branches from one `Asynchro` instance to another. This leads to a simple, yet flexible logic route for defining how workflows interact between one another.

When branching to/from queues that contain one or more [background tasks](tutorial-2-background.html) it's important to keep in mind that [Asynchro.backgroundWaiter](Asynchro.html#backgroundWaiter) will accumulate the subsequent results that are set as well as any errors that are caught after [Asynchro.run](Asynchro.html#run) is `await`ed for.
```js
const ax = new Asynchro({});
ax.parallel('one', multiply, a, b, c); // multiply/a/b/c from previous example
ax.verify('one', async it => {
  if (it.isPending) {
    const axt = new Asynchro(ax.result);
    axt.series('x', multiply, 1, 1, 1); // multiply from previous example
    axt.parallel('y', multiply, 2, 2);
    axt.background('z', multiply, 4, 4, 4);
    // stop the queue from continuing to process/run and transfer/run the new one
    return axt;
  } else {
    it.result = 999;
  }
});
// two is never ran
ax.series('two', multiply, d, e); // multiply/d/e from previous example
await ax.run();
// {
//   one: { m1: 999, m2: 40, m3: 90 },
//   x: { m1: 10, m2: 20, m3: 30 },
//   y: { m1: 20, m2: 40, m3: 60 }
// }
console.log(ax.result);
// if we don't want to set results on the same result object as "ax"
// we can pass another object as the 1st argument
const abx = await ax.backgroundWaiter();
// {
//   one: { m1: 999, m2: 40, m3: 90 },
//   x: { m1: 10, m2: 20, m3: 30 },
//   y: { m1: 20, m2: 40, m3: 60 },
//   z: { m1: 40, m2: 80, m3: 120 }
// }
console.log(abx.result);
// true
console.log(ax.result === abx.result);
```

#### [Conversions >>](tutorial-5-conversion.html)