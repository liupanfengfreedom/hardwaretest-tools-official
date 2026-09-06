import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { MaskEditor, imagePoint } from '../../static/js/utility-tools/design-media/background-remover/mask-editor.js';
import { clampPan, zoomPanAt } from '../../static/js/utility-tools/design-media/background-remover/viewport-geometry.js';

// Uses the native Canvas runtime; no model download or browser is needed.
const { createCanvas, loadImage } = createRequire(import.meta.url)('@napi-rs/canvas');
const factory = () => createCanvas(80, 60);
function fixture() {
  const source = factory();
  const ctx = source.getContext('2d');
  ctx.fillStyle = '#3264c8'; ctx.fillRect(0, 0, 80, 60);
  return new MaskEditor(source, factory(), factory(), factory);
}
const pixel = (canvas, x, y) => Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data);
function stroke(editor, mode, point, end = point) {
  editor.beginStroke(mode, 5, point);
  editor.extendStroke(end);
  editor.endStroke();
}

test('erase makes pixels transparent, keep restores exact source color; original stays unchanged', () => {
  const editor = fixture();
  stroke(editor, 'erase', { x: 20, y: 20 });
  assert.equal(pixel(editor.result, 20, 20)[3], 0);
  assert.deepEqual(pixel(editor.source, 20, 20), [50, 100, 200, 255]);
  stroke(editor, 'keep', { x: 20, y: 20 });
  assert.deepEqual(pixel(editor.result, 20, 20), pixel(editor.source, 20, 20));
});

test('one-pixel brush changes exact pixels with no antialiased alpha', () => {
  const editor = fixture();
  stroke(editor, 'erase', { x: 10.2, y: 10.8 }, { x: 14.2, y: 14.8 });
  // The helper above uses a 5 px radius; explicitly add a one-pixel diagonal.
  editor.undo();
  editor.beginStroke('erase', 0.5, { x: 10.2, y: 10.8 });
  editor.extendStroke({ x: 14.2, y: 14.8 });
  editor.endStroke();
  for (let i = 10; i <= 14; i += 1) assert.equal(pixel(editor.result, i, i)[3], 0);
  assert.equal(pixel(editor.result, 11, 10)[3], 255);
  const alphaValues = new Set(editor.result.getContext('2d').getImageData(0, 0, 80, 60).data.filter((_, index) => index % 4 === 3));
  assert.deepEqual([...alphaValues].sort((a, b) => a - b), [0, 255]);
});

test('fast strokes form continuous lines; one undo removes the whole gesture', () => {
  const editor = fixture();
  stroke(editor, 'erase', { x: 10, y: 30 }, { x: 70, y: 30 });
  for (const x of [10, 25, 40, 55, 70]) assert.equal(pixel(editor.result, x, 30)[3], 0);
  editor.undo();
  assert.equal(pixel(editor.result, 40, 30)[3], 255);
  editor.redo();
  assert.equal(pixel(editor.result, 40, 30)[3], 0);
  editor.undo(); stroke(editor, 'erase', { x: 20, y: 10 });
  assert.equal(editor.future.length, 0);
});

test('manual marks made before AI override AI; later strokes take priority', () => {
  const editor = fixture();
  stroke(editor, 'keep', { x: 20, y: 20 });
  stroke(editor, 'erase', { x: 60, y: 20 });
  const automatic = factory();
  const ctx = automatic.getContext('2d');
  ctx.fillRect(40, 0, 40, 60);
  editor.setAutomaticResult(automatic);
  assert.equal(pixel(editor.result, 20, 20)[3], 255);
  assert.equal(pixel(editor.result, 60, 20)[3], 0);
  assert.equal(pixel(editor.result, 10, 45)[3], 0);
  assert.equal(pixel(editor.result, 70, 45)[3], 255);
  stroke(editor, 'erase', { x: 20, y: 20 });
  assert.equal(pixel(editor.result, 20, 20)[3], 0);
  editor.undo();
  assert.equal(pixel(editor.result, 20, 20)[3], 255);
  editor.setAutomaticResult(automatic);
  assert.equal(pixel(editor.result, 20, 20)[3], 255);
});

test('clear marks restores AI output and can itself be undone', () => {
  const editor = fixture();
  editor.setAutomaticResult(factory());
  stroke(editor, 'keep', { x: 20, y: 20 });
  editor.clearMarks();
  assert.equal(editor.hasMarks, false);
  assert.equal(pixel(editor.result, 20, 20)[3], 0);
  assert.equal(pixel(editor.marks, 20, 20)[3], 0);
  editor.undo();
  assert.equal(editor.hasMarks, true);
  assert.equal(pixel(editor.result, 20, 20)[3], 255);
});

test('cancelled touch stroke leaves image and history intact', () => {
  const editor = fixture();
  editor.beginStroke('erase', 5, { x: 20, y: 20 });
  assert.equal(pixel(editor.result, 20, 20)[3], 0);
  editor.cancelStroke();
  assert.equal(pixel(editor.result, 20, 20)[3], 255);
  assert.equal(editor.history.length, 0);
});

test('brush coordinates scale correctly and strokes can cross image edges', () => {
  assert.deepEqual(imagePoint(150, 120, { left: 100, top: 100, width: 200, height: 100 }, 1000, 500), { x: 250, y: 100 });
  const editor = fixture();
  stroke(editor, 'erase', { x: -10, y: 20 }, { x: 100, y: 20 });
  assert.equal(pixel(editor.result, 0, 20)[3], 0);
  assert.equal(pixel(editor.result, 79, 20)[3], 0);
});

test('translucent source alpha is preserved rather than multiplied twice', () => {
  const editor = fixture();
  const ctx = editor.source.getContext('2d');
  ctx.clearRect(0, 0, 80, 60);
  ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'; ctx.fillRect(0, 0, 80, 60);
  editor.setAutomaticResult(editor.source);
  assert.equal(pixel(editor.result, 20, 20)[3], pixel(editor.source, 20, 20)[3]);
  stroke(editor, 'erase', { x: 20, y: 20 });
  stroke(editor, 'keep', { x: 20, y: 20 });
  assert.equal(pixel(editor.result, 20, 20)[3], pixel(editor.source, 20, 20)[3]);
});

test('exported PNG contains edits and transparency, without colored marks', async () => {
  const editor = fixture();
  stroke(editor, 'keep', { x: 20, y: 20 });
  stroke(editor, 'erase', { x: 60, y: 20 });
  const decoded = await loadImage(editor.result.toBuffer('image/png'));
  const exported = factory(); exported.getContext('2d').drawImage(decoded, 0, 0);
  assert.deepEqual(pixel(exported, 20, 20), [50, 100, 200, 255]);
  assert.equal(pixel(exported, 60, 20)[3], 0);
  assert.notDeepEqual(pixel(editor.marks, 20, 20), pixel(exported, 20, 20));
});

test('zoom stays anchored under the pointer and pan cannot lose the image', () => {
  const surface = { width: 500, height: 300 };
  const currentRect = { left: 100, top: 50, width: 500, height: 300 };
  const anchor = { x: 225, y: 125 };
  const zoomedPan = zoomPanAt({ x: 0, y: 0 }, 1, 2, anchor, currentRect, surface);
  assert.deepEqual(zoomedPan, { x: 125, y: 75 });
  const newLeft = 350 - surface.width + zoomedPan.x;
  const newTop = 200 - surface.height + zoomedPan.y;
  assert.deepEqual({ x: newLeft + surface.width / 2, y: newTop + surface.height / 2 }, anchor);
  assert.deepEqual(clampPan({ x: 999, y: -999 }, 2, surface, surface), { x: 250, y: -150 });
  assert.deepEqual(clampPan({ x: 50, y: 50 }, 1, surface, surface), { x: 0, y: 0 });
});

function smartStroke(editor, mode, point, options = {}, end = point) {
  editor.beginStroke(mode, 0.5, point, { enabled: true, radius: 8, tolerance: 0, ...options });
  editor.extendStroke(end);
  editor.endStroke();
}

test('smart erase grows through matching colors, within its radius, without crossing a color barrier', () => {
  const editor = fixture();
  const ctx = editor.source.getContext('2d');
  ctx.fillStyle = '#ef2030'; ctx.fillRect(24, 0, 1, 60);
  smartStroke(editor, 'erase', { x: 20.5, y: 20.5 });
  assert.equal(pixel(editor.result, 22, 20)[3], 0);
  assert.equal(pixel(editor.result, 20, 28)[3], 0);
  assert.equal(pixel(editor.result, 20, 29)[3], 255);
  assert.equal(pixel(editor.result, 24, 20)[3], 255);
  assert.equal(pixel(editor.result, 25, 20)[3], 255);
  assert.deepEqual(pixel(editor.source, 22, 20), [50, 100, 200, 255]);
});

test('smart keep restores matching original pixels after AI removal and exports the corrected PNG', async () => {
  const editor = fixture();
  editor.setAutomaticResult(factory());
  smartStroke(editor, 'keep', { x: 20.5, y: 20.5 });
  assert.deepEqual(pixel(editor.result, 25, 20), [50, 100, 200, 255]);
  assert.equal(pixel(editor.result, 29, 20)[3], 0);
  const exported = factory();
  exported.getContext('2d').drawImage(await loadImage(editor.result.toBuffer('image/png')), 0, 0);
  assert.deepEqual(pixel(exported, 25, 20), [50, 100, 200, 255]);
  assert.equal(pixel(exported, 29, 20)[3], 0);
});

test('color tolerance is relative to the initial seed, preventing gradual color drift during dragging', () => {
  const editor = fixture();
  const ctx = editor.source.getContext('2d');
  ctx.fillStyle = '#646464'; ctx.fillRect(0, 0, 20, 60);
  ctx.fillStyle = '#6e6e6e'; ctx.fillRect(20, 0, 10, 60);
  ctx.fillStyle = '#828282'; ctx.fillRect(30, 0, 10, 60);
  const seed = { x: 19.5, y: 20.5 };
  smartStroke(editor, 'erase', seed, { radius: 20, tolerance: 0 });
  assert.equal(pixel(editor.result, 20, 20)[3], 255);
  editor.undo();
  smartStroke(editor, 'erase', seed, { radius: 20, tolerance: 5 }, { x: 35.5, y: 20.5 });
  assert.equal(pixel(editor.result, 25, 20)[3], 0);
  assert.equal(pixel(editor.result, 35, 20)[3], 255);
  editor.undo();
  smartStroke(editor, 'erase', seed, { radius: 20, tolerance: 15 });
  assert.equal(pixel(editor.result, 35, 20)[3], 0);
});

test('smart history snapshots settings and survives undo, redo, clear, and AI reruns', () => {
  const editor = fixture();
  const options = { enabled: true, radius: 4, tolerance: 0 };
  editor.beginStroke('erase', 0.5, { x: 20.5, y: 20.5 }, options);
  editor.endStroke();
  options.radius = 100; options.tolerance = 100;
  const expected = editor.result.getContext('2d').getImageData(0, 0, 80, 60).data;
  editor.undo(); editor.redo();
  assert.deepEqual(editor.result.getContext('2d').getImageData(0, 0, 80, 60).data, expected);
  editor.setAutomaticResult(editor.source);
  assert.deepEqual(editor.result.getContext('2d').getImageData(0, 0, 80, 60).data, expected);
  editor.clearMarks();
  assert.equal(pixel(editor.result, 20, 20)[3], 255);
  editor.undo();
  assert.deepEqual(editor.result.getContext('2d').getImageData(0, 0, 80, 60).data, expected);
});

test('smart selection respects transparent gaps and ignores fully transparent seeds', () => {
  const editor = fixture();
  editor.source.getContext('2d').clearRect(24, 0, 1, 60);
  smartStroke(editor, 'erase', { x: 20.5, y: 20.5 }, { tolerance: 100 });
  assert.equal(pixel(editor.result, 22, 20)[3], 0);
  assert.equal(pixel(editor.result, 25, 20)[3], 255);
  const count = editor.history.length;
  smartStroke(editor, 'keep', { x: 24.5, y: 20.5 }, { tolerance: 100 });
  assert.equal(editor.history.length, count);
});

test('disabling smart mode preserves exact one-pixel editing; movement mode cannot paint', () => {
  const editor = fixture();
  smartStroke(editor, 'erase', { x: 20.5, y: 20.5 }, { enabled: false });
  assert.equal(pixel(editor.result, 20, 20)[3], 0);
  assert.equal(pixel(editor.result, 21, 20)[3], 255);
  const count = editor.history.length;
  editor.beginStroke('pan', 5, { x: 30, y: 30 }); editor.endStroke();
  assert.equal(editor.history.length, count);
  assert.equal(pixel(editor.result, 30, 30)[3], 255);
});

test('smart strokes cover rapid movement, clip at boundaries, and cancel as a whole gesture', () => {
  const editor = fixture();
  smartStroke(editor, 'erase', { x: 5.5, y: 20.5 }, { radius: 3 }, { x: 100000, y: 20.5 });
  for (const x of [5, 30, 60, 79]) assert.equal(pixel(editor.result, x, 22)[3], 0);
  assert.equal(pixel(editor.result, 30, 24)[3], 255);
  editor.undo();
  editor.beginStroke('erase', 0.5, { x: 0, y: 0 }, { enabled: true, radius: 8, tolerance: 0 });
  assert.equal(pixel(editor.result, 0, 7)[3], 0);
  editor.cancelStroke();
  assert.equal(pixel(editor.result, 0, 7)[3], 255);
  assert.equal(editor.history.length, 0);
});
