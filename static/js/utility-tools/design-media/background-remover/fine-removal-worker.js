import { normalizedModelInput, modelAlpha } from './ai-mask.js?v=20261003';

// Community WebGPU graph derived from MIT-labelled BiRefNet Lite weights.
// Pin the revision as well as the runtime so model updates cannot change
// tensor names, precision, or preprocessing behind this page.
const MODEL_URL = 'https://huggingface.co/jiabins0303/birefnet-lite-1024-webgpu/resolve/1ad01cef0f4101a285c5a3e0bd7f15597d93403f/onnx/model_fp16.onnx';
const RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.webgpu.bundle.min.mjs';
const RUNTIME_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
const SIZE = 1024;
let session = null, runtime = null;

async function modelBytes(progress) {
  let cache;
  try { cache = await caches.open('starryring-ai-models-v1'); } catch { /* Storage is optional. */ }
  const cached = await cache?.match(MODEL_URL).catch(() => undefined);
  const response = cached || await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Model download failed (${response.status})`);
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader();
  let bytes;
  if (reader) {
    const chunks = []; let loaded = 0, lastProgress = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); loaded += value.length;
      if (Date.now() - lastProgress >= 150 || loaded === total) {
        progress({ phase: 'download', loaded, total }); lastProgress = Date.now();
      }
    }
    bytes = new Uint8Array(loaded); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  } else bytes = new Uint8Array(await response.arrayBuffer());
  if (!cached && cache) {
    try { await cache.put(MODEL_URL, new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(bytes.length) } })); }
    catch { /* A full/private cache must not prevent inference. */ }
  }
  return bytes;
}

async function prepare(progress) {
  if (session) return;
  if (!self.isSecureContext || !navigator.gpu || typeof OffscreenCanvas === 'undefined') throw new Error('WebGPU unavailable');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || adapter.limits.maxStorageBuffersPerShaderStage < 8 || !adapter.features.has('shader-f16')) throw new Error('WebGPU adapter does not support this model');
  progress({ phase: 'engine' });
  runtime = await import(RUNTIME_URL);
  runtime.env.wasm.wasmPaths = RUNTIME_PATH;
  runtime.env.wasm.numThreads = 1;
  const bytes = await modelBytes(progress);
  progress({ phase: 'prepare' });
  session = await runtime.InferenceSession.create(bytes, { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' });
}

self.addEventListener('message', async event => {
  const { id, source } = event.data;
  const progress = details => self.postMessage({ id, type: 'progress', ...details });
  let bitmap, input, outputs;
  try {
    await prepare(progress);
    progress({ phase: 'infer' });
    bitmap = await createImageBitmap(source);
    const canvas = new OffscreenCanvas(SIZE, SIZE), context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, SIZE, SIZE);
    const pixels = context.getImageData(0, 0, SIZE, SIZE);
    input = new runtime.Tensor('float32', normalizedModelInput(pixels.data, SIZE, SIZE), [1, 3, SIZE, SIZE]);
    outputs = await session.run({ [session.inputNames[0]]: input });
    const output = outputs[session.outputNames[0]];
    const [height, width] = output.dims.slice(-2);
    const alpha = modelAlpha(output.data, output.type, width, height);
    self.postMessage({ id, type: 'result', alpha, width, height }, [alpha.buffer]);
  } catch (error) { self.postMessage({ id, type: 'error', message: error.message || String(error) }); }
  finally {
    bitmap?.close(); input?.dispose();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
  }
});
