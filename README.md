# <b style="color:#FFA726">&#8669;</b> asynchro 
Micro lib for __parallel__/__series__/__background__ asynchronous functions using built-in ES `async/await` with __zero__ external dependencies. `Asynchro` is not just another `async` library, but rather a micro-sized workflow engine! Check out the turorials for more details. Runs in the browser or in [Node.js](https://nodejs.org/) `npm install asynchro`.

* [Tutorials](https://ugate.github.io/asynchro/tutorial-1-queue.html)
* [API Docs](https://ugate.github.io/asynchro/Asynchro.html)

### Turn _vanilla_ `async/await` boilerplate code like this...
```js
const SYSTEM_ERRORS = [ EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError ];
async function myWorkflow() {
  const rslt = { result: {}, errors: [] }, promises = {}, log = console.log;
  try {
    rslt.one = await mySeriesFunc1('val1', 2, 3);
  } catch (err) {
    if (log) log('Error at one', err);
    rslt.errors.push(err);
    return rslt;
  }
  try {
    rslt.two = await mySeriesFunc2(1, 2);
  } catch (err) {
    if (log) log('Error at one', err);
    for (let stype of SYSTEM_ERRORS) {
      if (err instanceof stype) {
        throw err; // only system errors will throw
      }
    }
    rslt.errors.push(err);
    return rslt;
  }
  try {
    promises.three = myParallelFunc1({ a: 1, b: 2, c: 3 });
  } catch (err) {
    if (log) log('Error at three', err);
    rslt.errors.push(err);
    return rslt;
  }
  try {
    promises.four = myParallelFunc2();
  } catch (err) {
    if (log) log('Error at four', err);
    rslt.errors.push(err);
    return rslt;
  }
  promises.five = myParallelFunc3('always throw errors');
  try {
    rslt.six = await mySeriesFunc3(true, false);
  } catch (err) {
    if (log) log('Error at six', err);
    rslt.errors.push(err);
    return rslt;
  }
  for (let name in promises) {
    // always throw five/myParallelFunc3
    if (name === 'five') rslt.five = await promises[name];
    try {
      rslt[name] = await promises[name];
    } catch (err) {
      if (log) log(`Error at ${name}`, err);
      rslt.errors.push(err);
      return rslt;
    }
  }
  return rslt;
}
```

### ... into this:
```js
async function myWorkflow() {
  const ax = new Asynchro({}, false, console.log);
  ax.series('one', mySeriesFunc1, 'val1', 2, 3);
  ax.seriesThrowOverride('two', 'system', mySeriesFunc2, 1, 2);
  ax.parallel('three', myParallelFunc1, { a: 1, b: 2, c: 3 });
  ax.parallel('four', myParallelFunc2);
  ax.parallelThrowOverride('five', true, myParallelFunc3, 'always throw errors');
  ax.series('six', mySeriesFunc3, true, false);
  const result = await ax.run();
  return { result, errors: ax.errors };
}
```

### [Take me there! >>](https://ugate.github.io/asynchro/tutorial-1-queue.html)