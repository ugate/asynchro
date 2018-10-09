### Verification
There are instances where the result of an `async` function needs to be verified before proceeding to the next task in the queue. Rather than adding verification logic to the task itself or wrapping those functions with another function to handle that logic, `asynchro` provides an [Asynchro.verify](Asynchro.html#verify) method to handle them. This also opens up the possiblity to [branch from one `Asynchro` instance to another](tutorial-4-branches.html).
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
ax.parallel('one', multiply, a, b, c);
ax.verify('one', async it => {
  // parallel tasks call 2x (serial called only 1x and it.isPending is always false)
  // 1. once called and the promise is pending
  // 2. another time after the promise completes
  if (it.isPending) {
    // do something?
    return;
  }
  // override the error or cancel it out?
  // only available when the error is caught
  // (see "throws" on parallelThrowOverride/seriesThrowOverride or Asynchro constructor)
  if (it.error) {
    // alternatively, could have set it.error
    throw new Error('Overridden error'); 
  }
  // override the result
  if (it.result.m1 === 10) it.result.m1 = 999;
  // set a message indicating what happened
  it.message = `Successfully verified '${it.name}'`;
  // {
  //   name: "one",
  //   operation: "multiply",
  //   event: false,
  //   isParallel: true,
  //   isBackground: false
  // }
  console.log(it);
});
ax.series('two', multiply, d, e);
const rslt = await ax.run();
// { one: { m1: 999, m2: 40, m3: 90 }, two: { m1: 40, m2: 100, m3: 0 } }
console.log(rslt);
// [ "Successfully verified 'one'" ]
console.log(ax.messages());
```

#### [Branching >>](tutorial-4-branches.html)