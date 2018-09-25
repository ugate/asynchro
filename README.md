# &#8669; asynchro 
Micro `async` lib for __parallel__/__series__/__background__ functions using built-in ES `async/await` with <i style="color:orange;">__zero__</i> dependencies.
* [API Docs](https://ugate.github.io/asynchro/)
## Examples:
For demostration purposes, let's assume we have an `async` function like the following that just delays execution and either returns a result or throws an error (along with some logging).
```js
async function asyncCall(num, val, rtn, rejectIt, delay, log) {
  if (log) log(`${num}. Starting`);
  var result, err;
  try {
    result = await Asynchro.promisifyDelay(delay, val, rejectIt);
  } catch (e) {
    err = e;
  }
  if (log) log(`${num}. Ended with ${err ? 'ERROR' : 'RESULT'} (delay = ${delay}): ${err && err.message ? err.message + '\n' + err.stack : result}`);
  if (err) throw err;
  if (rtn) return result;
}
```

```js
const ax = new Asynchro({}, true, console.log);
ax.series('one', afn, 1, 'A', true, false, delay -= 10);
ax.series('two', afn, 2, null, false, false, delay -= 10);
ax.series('three', afn, 3, 'B', true, false, delay -= 10);
ax.parallel('four', afn, 4, null, false, false, delay -= 10);
ax.parallel('five', afn, 5, 'C', true, false, delay -= 10);
ax.parallel('six', afn, 6, 'D', true, false, delay -= 10);
ax.series('seven', afn, 7, null, false, false, delay -= 10);
ax.series('eight', afn, 8, 'E', true, false, delay -= 10);
ax.parallel('nine', afn, 9, null, false, false, delay -= 10);
ax.parallel('shouldNotRun', afn, 10, 'F', true, true, delay -= 10);
ax.series('shouldNotRun2', afn, 11, 'G', true, false, delay -= 10);
try {
  rslt = await ax.run();
} catch (err) {
  error = err;
}
```