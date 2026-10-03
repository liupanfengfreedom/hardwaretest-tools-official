let worker = null;
let nextRequest = 0;

// One persistent worker/session per page. Failed workers are released before
// the legacy engine starts, so a failed GPU run cannot keep consuming memory.
export function removeBackgroundFine(source, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextRequest;
    try { worker ||= new Worker(new URL('./fine-removal-worker.js?v=20261003', import.meta.url), { type: 'module' }); }
    catch (error) { reject(error); return; }
    const activeWorker = worker;
    const cleanup = () => {
      clearTimeout(timeout);
      activeWorker.removeEventListener('message', message);
      activeWorker.removeEventListener('error', failed);
      activeWorker.removeEventListener('messageerror', failed);
    };
    const fail = error => {
      cleanup(); activeWorker.terminate();
      if (worker === activeWorker) worker = null;
      reject(error);
    };
    const message = event => {
      if (event.data.id !== id) return;
      if (event.data.type === 'progress') {
        // A slow first download may take several minutes. Only time out when
        // the worker stops making progress, not while bytes keep arriving.
        clearTimeout(timeout);
        timeout = setTimeout(() => fail(new Error('AI model timed out')), 300000);
        onProgress(event.data);
      }
      else if (event.data.type === 'result') { cleanup(); resolve(event.data); }
      else if (event.data.type === 'error') fail(new Error(event.data.message));
    };
    const failed = event => { event.preventDefault?.(); fail(new Error(event.message || 'AI worker failed')); };
    let timeout = setTimeout(() => fail(new Error('AI model timed out')), 300000);
    activeWorker.addEventListener('message', message);
    activeWorker.addEventListener('error', failed);
    activeWorker.addEventListener('messageerror', failed);
    try { activeWorker.postMessage({ id, source }); } catch (error) { fail(error); }
  });
}
