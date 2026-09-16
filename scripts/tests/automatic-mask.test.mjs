import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlainBackgroundMask } from '../../static/js/utility-tools/design-media/background-remover/automatic-mask.js';

function icon(background = [255, 255, 255, 255]) {
  const width = 101, height = 101;
  const source = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const radius = Math.hypot(x - 50, y - 50);
      const color = radius > 42 ? background : radius > 39 ? [205, 155, 66, 255] : [255, 249, 235, 255];
      source.set(color, (y * width + x) * 4);
    }
  }
  return { source, width, height };
}

test('pale icon interior and white highlights survive even where the AI outline would be missing', () => {
  const { source, width, height } = icon();
  // A bright interior is similar to the exterior; connectivity must be measured on
  // the original outline, never on the AI mask with a gap in its upper-left edge.
  source.set([255, 255, 255, 255], (30 * width + 30) * 4);
  const original = source.slice();
  const mask = createPlainBackgroundMask(source, width, height);
  assert.ok(mask);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      assert.equal(mask[y * width + x], Math.hypot(x - 50, y - 50) <= 42 ? 255 : 0);
    }
  }
  assert.deepEqual(source, original);
});

test('colored backgrounds with small JPEG-like variation are removed', () => {
  const { source, width, height } = icon([30, 90, 190, 255]);
  for (let x = 0; x < width; x += 1) source[x * 4] += x % 5;
  const mask = createPlainBackgroundMask(source, width, height);
  assert.ok(mask);
  assert.equal(mask[0], 0);
  assert.equal(mask[50 * width + 50], 255);
});

test('textured edges, almost empty images and thin photo frames fall back to AI', () => {
  const { source, width, height } = icon();
  for (let x = 0; x < width; x += 2) source[x * 4] = 70;
  assert.equal(createPlainBackgroundMask(source, width, height), null);
  source.fill(255);
  assert.equal(createPlainBackgroundMask(source, width, height), null);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) source.set([40, 80, 120, 255], (y * width + x) * 4);
  }
  assert.equal(createPlainBackgroundMask(source, width, height), null);
});

test('existing transparent cutouts keep all source alpha including translucent interior and holes', () => {
  const { source, width, height } = icon([0, 0, 0, 0]);
  source[50 * width * 4 + 50 * 4 + 3] = 128;
  source[50 * width * 4 + 51 * 4 + 3] = 0;
  const mask = createPlainBackgroundMask(source, width, height);
  assert.ok(mask);
  assert.equal(mask[0], 0);
  assert.equal(mask[50 * width + 50], 255);
  assert.equal(mask[50 * width + 51], 0);
});
