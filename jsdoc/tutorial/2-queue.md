### The Queue
At the heart of `asynchro` is a queue. The queue is simply an `Object[]` that holds function execution metadata until [Asynchro.run](Asynchro.html#run) is executed/ran. A single _result_ object can be passed to the `Asynchro` constructor in order to store the results from each queued async function execution using a designated _name_ as the property name in the _result_ object (more on this later!). Each queued async function is ran in the order that it was queued. Although there are variations of each, there are only three types of async functions that can be queued:

1. [Series](Asynchro.html#series) - async functions that are `await`ed for until the next async function in the queue is invoked
2. [Parallel](Asynchro.html#parallel) - async functions that are _not_ immediately `await`ed for, but rather `await`ed for after the queue is exhausted
3. [Background](Asynchro.html#background) - like, parallel, but will _not_ be `await`ed for and will still retain error handling set on the queued function (or error handling defined globally on the `Asynchro` instance itself)

Let's review the simple workflow below:
```js
  const ax = new Asynchro({}, false, console.log);
  ax.series('one', mySeriesFunc1, 'val1', 2, 3);
  ax.series('two', mySeriesFunc2, 1, 2);
  ax.parallel('three', myParallelFunc1, { a: 1, b: 2, c: 3 });
  ax.parallel('four', myParallelFunc2);
  ax.parallelThrowOverride('five', true, myParallelFunc3, 'always throw errors');
  ax.series('six', mySeriesFunc3, true, false);
  const result = await ax.run();
  return { result, errors: ax.errors };
```
The `Asynchro` constructor is called by passing a _result_ object as it's 1<sup>st</sup> argument where all of the results of each queued async function will be stored. For instance, the final results returned from [Asynchro.run](Asynchro.html#run) (or accessed by [Asynchro.result](Asynchro.html#result)) would consist of the following __assuming no errors are thrown__:
```js
// Asynchro.result
{
  one: 'return string from mySeriesFunc1',
  two: { myString: 'mySeriesFunc2 returned an object' }
  three: 'results can be anything',
  four: '...another result',
  five: true,
  six: 123
}
```
Each argument passed after the async function will be passed in order to that function. For example, `mySeriesFunc1`/"one" would receive `val1`, `2`, `3`.
To omit an async function's return value from the final result simply use `null`, `false` or `undefined` as the _name_ argument value: `ax.series(null, mySeriesFunc1, 'val1', 2, 3);`.

#### Passing Results During Execution
Passing results from one async function to the next is fairly easy to follow using [Asynchro.arg](Asynchro.html#arg):
```js
const asyncOne = async () => {
  // other async operations here
  return { array: [1] };
};
const asyncTwo = async (array) => {
  // other async operations here
  const rtn = 2;
  array.push(rtn);
  return rtn;
};
const asyncThree = async (a1) => {
  // other async operations here
  console.log(a1); // prints out 1
  return a1 + 2;
};
const asyncFour = async (array) => {
  // other async operations here
  array.push(4);
};

const ax = new Asynchro({});
ax.series('one', asyncOne);
ax.series('two', asyncTwo, ax.arg('one.array'));
ax.series('three', asyncThree, ax.arg('one.array[0]'));
ax.series(null, asyncFour, ax.arg('one.array'));
const rslt = await ax.run();
console.log(rslt); // { one: { array: [1, 2, 4] }, two: 2, three: 3 }
```
Keep in mind that result arguments may not be available in a _parallel_ async function when referencing a previously queued _parallel_ async function execution (depending on how long the previous operation takes):
```js
const asyncOne = async () => {
  // other async operations here
  return { array: [1] };
};
const asyncTwo = async (array) => {
  // other async operations here
  array.push(2); // ERROR: one.array not yet set!
};

const ax = new Asynchro({});
ax.parallel('one', asyncOne);
ax.parallel(null, asyncTwo, ax.arg('one.array'));
await ax.run();
```

#### Error Handling
You may have noticed that the 2<sup>nd</sup> argument passed into the `Asynchro` constructor was explicitly set to `false` (which is the default value). So, no errors will be thrown but rather captured in an `Error[]` via [Asynchro.errors](Asynchro.html#errors) unless explicitly overridden by using [Asynchro.seriesThrowOverride](Asynchro.html#seriesThrowOverride) or [Asynchro.parallelThrowOverride](Asynchro.html#parallelThrowOverride) as seen in example for `myParallelFunc3`/"five" where `true` was used. This is referred to as an __Error Handling Rule__. Now let's assume that there was an error while `await`ing `mySeriesFunc2`/"two". The queue would `catch`/capture the error and _continue_ to execute subsequent async functions in the queue. Each error will contain additional _metadata_ under an `Asynchro` property that will provide more details about the error:
```js
// Asynchro.result
{
  one: 'return string from mySeriesFunc1',
  three: 'results can be anything',
  four: '...another result',
  five: true,
  six: 123
}
// Asynchro.errors
[
  { // the error object
    // ... other error properties here
    Asynchro: {
      name: 'two',
      operation: 'mySeriesFunc2',
      isPending: false,
      isParallel: false,
      isBackground: false
    }
  }
]
```
Assuming that the __Error Handling Rule__ was set to `true`, the same error would have been thrown and would have contained the same `Asynchro` metadata. But what if we only want to throw specific errors- like "system" errors? `Asynchro` provides a way to define what errors are thrown and what errors are caught/captured by using an `Object` descriptor as the __Error Handling Rule__ instead of the `Boolean` values previously discussed.
To _throw_ only "system" errors defined by [Asynchro.systemErrorTypes](Asynchro.html#systemErrorTypes), the __Error Handling Rule__ can be set to the following `Object` descriptor:
```js
{
  invert: false, // true to catch errors when matches are made, false/omit to throw errors when matches are made
  matches: 'system' // only errors that are an instanceof the predefined "system" error classes will be thrown 
}
```
To _throw_ all errors, but "system" errors defined by [Asynchro.systemErrorTypes](Asynchro.html#systemErrorTypes), set `invert = true`. Also, `matches` can be set to an `Array` of types/classes that will be used when checking if the `Error` is an `instanceof` any one of the defined entries:
```js
{
  matches: [ RangeError, MyCustomError ] // only errors that are an instanceof RangeError or MyCustomError will be thrown 
}
```
Another way to control which errors are caught or thrown is to use an `Object` as the `matches` value. Any error that contains _all_ of the properties/values defined on that `Object` will be thrown (or alternatively caught when `invert = true`):
```js
{
  matches: { // only errors that contain someProperty1 = true and someProperty2 = false will be thrown
    someProperty1: true,
    someProperty2: false
  } 
}
```
For convenience, [Asynchro.throwsError](Asynchro.html#throwsError) is provided to check if the queue will throw or catch a specified `Error`/error type.

#### [Conversions >>](tutorial-3-conversion.html)