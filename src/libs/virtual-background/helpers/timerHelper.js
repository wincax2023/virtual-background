
import { CLEAR_TIMEOUT, TIMEOUT_TICK, SET_TIMEOUT, timerWorkerScript } from './timerworker';

export function createTimerWorker() {
  const callbacks = new Map()

  const worker = new Worker(timerWorkerScript, {
    name: 'Blur effect worker'
  });

//   worker.onmessage = (event) => {
//     const callback = callbacks.get(event.data.callbackId)
//     if (!callback) {
//       return
//     }
//     callbacks.delete(event.data.callbackId)
//     if (event.data.id === TIMEOUT_TICK) {
//         callback()
//     }
//   }

//   let nextCallbackId = 1

  function onmessage(callback) {
    worker.onmessage = (event) => {
        if (event.data.id === TIMEOUT_TICK) {
            callback(event)};
        }
  }

  function setTimeout(timeoutMs) {
    // const callbackId = nextCallbackId++
    // callbacks.set(callbackId, callback)
    worker.postMessage({ id: SET_TIMEOUT, timeoutMs })
    // return callbackId
  }

  function clearTimeout(callbackId) {
    // if (!callbacks.has(callbackId)) {
    //   return
    // }
    worker.postMessage({ id: CLEAR_TIMEOUT })
    callbacks.delete(callbackId)
  }

  function terminate() {
    callbacks.clear()
    worker.terminate()
  }

  return { setTimeout, clearTimeout, terminate, onmessage }
}
