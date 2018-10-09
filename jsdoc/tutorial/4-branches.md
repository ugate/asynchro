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

#### [Conversions >>](tutorial-5-conversion.html)