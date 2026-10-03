import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { normalizedModelInput, modelAlpha, resizeModelAlpha } from '../../static/js/utility-tools/design-media/background-remover/ai-mask.js';
import { MaskEditor } from '../../static/js/utility-tools/design-media/background-remover/mask-editor.js';

const { createCanvas } = createRequire(import.meta.url)('@napi-rs/canvas');
const canvas = () => createCanvas(1, 1);

test('BiRefNet input uses RGB ImageNet normalization in planar NCHW order', () => {
  const input = normalizedModelInput(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]), 2, 1);
  const expected = [(1 - .485) / .229, - .485 / .229, - .456 / .224, (1 - .456) / .224, - .406 / .225, - .406 / .225];
  input.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6));
  assert.throws(() => normalizedModelInput(new Uint8Array(3), 1, 1), /dimensions/);
});

test('hidden RGB of transparent input does not affect model input', () => {
  assert.deepEqual(normalizedModelInput(new Uint8Array([0, 0, 0, 0]), 1, 1), normalizedModelInput(new Uint8Array([255, 255, 255, 255]), 1, 1));
});

test('model logits become soft alpha through sigmoid, without hard thresholding', () => {
  assert.deepEqual([...modelAlpha(new Float32Array([-Infinity, -1, 0, 1, Infinity]), 'float32', 5, 1)], [0, 69, 128, 186, 255]);
  assert.throws(() => modelAlpha(new Float32Array([NaN]), 'float32', 1, 1), /Invalid model output/);
  assert.throws(() => modelAlpha(new Float32Array(2), 'float32', 1, 1), /dimensions/);
});

test('encoded float16 output is decoded before sigmoid, including subnormals', () => {
  assert.deepEqual([...modelAlpha(new Uint16Array([0xfc00, 0xbc00, 0, 0x3c00, 0x7c00, 1, 0x8001]), 'float16', 7, 1)], [0, 69, 128, 186, 255, 128, 127]);
  assert.throws(() => modelAlpha(new Uint16Array([0x7e00]), 'float16', 1, 1), /Invalid model output/);
});

test('model mask is resized to working dimensions and retains soft edges', () => {
  const resized = resizeModelAlpha(new Uint8ClampedArray([0, 255]), 2, 1, 8, 4, canvas);
  assert.equal(resized.length, 32);
  assert.equal(resized[0], 0);
  assert.equal(resized[7], 255);
  assert.ok(resized.some(value => value > 0 && value < 255));
});

test('AI mask preserves source transparency and manual Keep protection on reruns', () => {
  const source = createCanvas(4, 1), context = source.getContext('2d');
  const pixels = context.createImageData(4, 1);
  pixels.data.set([30, 60, 90, 160, 30, 60, 90, 255, 30, 60, 90, 255, 30, 60, 90, 0]);
  context.putImageData(pixels, 0, 0);
  const editor = new MaskEditor(source, canvas(), canvas(), canvas);
  editor.setAutomaticMask(new Uint8ClampedArray([128, 255, 0, 255]), { recoverOutside: false });
  const alpha = () => [...editor.result.getContext('2d').getImageData(0, 0, 4, 1).data].filter((_, index) => index % 4 === 3);
  assert.deepEqual(alpha(), [80, 255, 0, 0]);
  editor.beginStroke('keep', .5, { x: 2.5, y: .5 }); editor.endStroke();
  editor.setAutomaticMask(new Uint8ClampedArray(4), { recoverOutside: false });
  assert.deepEqual(alpha(), [0, 0, 255, 0]);
});

test('failed GPU workers are released and a later attempt can use a fresh session', async () => {
  const originalWorker = globalThis.Worker;
  const instances = [];
  class TestWorker extends EventTarget {
    constructor() { super(); this.index = instances.length; this.terminated = false; instances.push(this); }
    postMessage({ id }) {
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: this.index === 0
        ? { id, type: 'error', message: 'WebGPU unavailable' }
        : { id, type: 'result', alpha: new Uint8ClampedArray([128]), width: 1, height: 1 } })));
    }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = TestWorker;
  try {
    const { removeBackgroundFine } = await import('../../static/js/utility-tools/design-media/background-remover/fine-removal.js');
    await assert.rejects(removeBackgroundFine(new Blob()), /WebGPU unavailable/);
    assert.equal(instances[0].terminated, true);
    assert.equal((await removeBackgroundFine(new Blob())).alpha[0], 128);
    await removeBackgroundFine(new Blob());
    assert.equal(instances.length, 2);
    assert.equal(instances[1].terminated, false);
  } finally { globalThis.Worker = originalWorker; }
});
