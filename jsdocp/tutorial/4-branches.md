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

#### Multiple Branches
Branching can occur at any given point during queue execution via the return value from [Asynchro.verify](Asynchro.html#verify). There is no _hard_ limit to the number of branches from one `Asynchro` instance to another. This leads to a simple, yet flexible logic route for defining how workflows interact between one another.
```js
// Multiple Branching Example:
// Asynchro instances instantiated/queued all at one time for illustrative purposes,
// but could be instantiated/queued at verification time instead
const ax = new Asynchro({}), valueOverride = 'Override value from axt branch "three" verify';
const axt = new Asynchro(ax.result);
const axt2 = new Asynchro(ax.result);

ax.background('one', multiply, 1, 2, 3);
ax.series('two', multiply, 4, 5, 6);
ax.parallel('three', multiply, 7, 8, 9);
// branch/transfer from "ax" to "axt" after "three" has been invoked, but not yet awaited
ax.verify('three', async it => it.isPending ? axt : !(it.result = valueOverride));
ax.parallel('four', multiply, 10, 11, 12); // never invoked

axt.background('five', multiply, 13, 14, 15);
axt.series('six', multiply, 16, 17, 18);
// branch/transfer from "axt" to "axt2" after "six" has been invoked/awaited
axt.verify('six', async it => it.error ? axt2 : null);
axt.parallel('seven', multiply, 19, 20, 21); // never invoked

axt2.series('eight', multiply, 22, 23, 24);
axt2.background('nine', multiply, 25, 26, 27);
axt2.series('ten', multiply, 28, 29, 30);

await ax.run();
```

#### Background Tasks &amp; Branching
As noted in the [background tasks section](tutorial-2-background.html), caught [Asynchro.errors](Asynchro.html#errors) and [Asynchro.result](Asynchro.html#result)s may continue to accumulate __after__ [Asynchro.run](Asynchro.html#run) is `await`ed for. Likewise, branching from one [Asynchro](Asynchro.html) instance to another will also have the same impact. Results are of course dependent upon the result object passed into the constructor of each [Asynchro](Asynchro.html) instance in the branch (or the optional background object that is passed into [Asynchro.backgroundWaiter](Asynchro.html#backgroundWaiter), when used).
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