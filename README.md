<b class="jsdocp-remove-me">
  
# ![](https://raw.githubusercontent.com/ugate/asynchro/master/jsdocp/static/favicon-32x32.png) asynchro

[![npm version](https://badgen.net/npm/v/asynchro?color=orange&icon=npm)](https://www.npmjs.com/package/asynchro)
[![Build Status](https://badgen.net/travis/ugate/asynchro?icon=travis)](https://travis-ci.com/ugate/asynchro)
[![Dependency Status](https://badgen.net/david/dep/ugate/asynchro)](https://david-dm.org/ugate/asynchro)
[![Dev Dependency Status](https://badgen.net/david/dev/ugate/asynchro)](https://david-dm.org/ugate/asynchro?type=dev)

</b>

### Micro `async`/`await` Workflow Engine
Micro lib for __parallel__/__series__/__background__ asynchronous functions using built-in ES `async/await` with __zero__ external dependencies. `Asynchro` is not just another `async` library, but rather a micro-sized workflow engine! Check out the tutorials for more details. Runs in the browser or in [Node.js](https://nodejs.org/) `npm install asynchro`.

* [Tutorials](https://ugate.github.io/asynchro/tutorial-1-queue.html)
* [API Docs](https://ugate.github.io/asynchro/Asynchro.html)

### Turn _vanilla_ `async/await` ~~boilerplate~~ code like this...
```js
const SYSTEM_ERRORS = [ EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError ];
async function myWorkflow() {
  const rslt = { result: {}, errors: [] }, promises = {}, log = console.log;
  try {
    rslt.one = await mySeriesFunc1('val1', 2, 3);
  } catch (err) {
    if (log) log('Error at one', err);
    rslt.errors.push(err);
  }
  try {
    rslt.two = await mySeriesFunc2(1, 2, rslt.one ? rslt.one.value : undefined);
  } catch (err) {
    if (log) log('Error at one', err);
    for (let stype of SYSTEM_ERRORS) {
      if (err instanceof stype) {
        throw err; // only system errors will throw
      }
    }
    rslt.errors.push(err);
  }
  try {
    promises.three = myParallelFunc1({ a: 1, b: 2, c: 3 });
  } catch (err) {
    if (log) log('Error at three', err);
    rslt.errors.push(err);
  }
  try {
    promises.four = myParallelFunc2();
  } catch (err) {
    if (log) log('Error at four', err);
    rslt.errors.push(err);
  }
  promises.five = myParallelFunc3('always throw errors');
  try {
    rslt.six = await mySeriesFunc3(true, false);
    if (rslt.six && rslt.six.isWorkflow2) {
      rslt.six = 'Going to workflow2';
      myWorkflow2(rslt, promises, log);
    }
  } catch (err) {
    if (log) log('Error at six', err);
    rslt.errors.push(err);
  }
  if (rslt.six !== 'Going to workflow2') {
    try {
      rslt.seven = await mySeriesFunc4();
    } catch (err) {
      if (log) log('Error at seven', err);
      rslt.errors.push(err);
    }
  }
  for (let name in promises) {
    // always throw five/myParallelFunc3
    if (name === 'five') rslt.five = await promises[name];
    try {
      rslt[name] = await promises[name];
    } catch (err) {
      if (log) log(`Error at ${name}`, err);
      rslt.errors.push(err);
    }
  }
  return rslt;
}
async function myWorkflow2(rslt, promises, log) {
  try {
    promises.seven = myParallelFunc4('workflow2Arg');
  } catch (err) {
    if (log) log('Error at seven', err);
    rslt.errors.push(err);
  }
  try {
    rslt.eight = await mySeriesFunc5();
  } catch (err) {
    if (log) log('Error at eight', err);
    rslt.errors.push(err);
  }
}
```

### ... into this:
```js
// import * as Asynchro frrom "asynchro";
// const Asynchro = require('asynchro');
async function myWorkflow() {
  const ax = new Asynchro({}, false, console.log);
  ax.series('one', mySeriesFunc1, 'val1', 2, 3);
  ax.seriesThrowOverride('two', 'system', mySeriesFunc2, 1, 2, ax.arg('one.value'));
  ax.parallel('three', myParallelFunc1, { a: 1, b: 2, c: 3 });
  ax.parallel('four', myParallelFunc2);
  ax.parallelThrowOverride('five', true, myParallelFunc3, 'always throw errors');
  ax.series('six', mySeriesFunc3, true, false);
  ax.verify('six', async it => {
    if (!it.error && it.result && it.result.isWorkflow2) {
      it.result = 'Going to workflow2';
      const ax2 = new Asynchro(ax.result, false, console.log);
      ax2.parallel('seven', myParallelFunc4, 'workflow2Arg');
      ax2.series('eight', mySeriesFunc5);
      return ax2;
    }
  });
  ax.series('seven', mySeriesFunc4);
  const result = await ax.run();
  return { result, errors: ax.errors };
}
```

### [Take me there! >>](https://ugate.github.io/asynchro/tutorial-1-queue.html)
