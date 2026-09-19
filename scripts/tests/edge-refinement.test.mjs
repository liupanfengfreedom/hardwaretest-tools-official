import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createPlainBackgroundMask } from '../../static/js/utility-tools/design-media/background-remover/automatic-mask.js';
import { refineAutomaticEdges } from '../../static/js/utility-tools/design-media/background-remover/edge-refinement.js';
import { MaskEditor } from '../../static/js/utility-tools/design-media/background-remover/mask-editor.js';

const { createCanvas, loadImage } = createRequire(import.meta.url)('@napi-rs/canvas');
const width = 96, height = 80, foreground = [148, 165, 53];
const factory = () => createCanvas(width, height);
const rgba = (canvas, x, y) => [...canvas.getContext('2d').getImageData(x, y, 1, 1).data];
function flattened(background, feather = 2) {
  const source = new Uint8ClampedArray(width * height * 4);
  const coverage = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const alpha = Math.max(0, Math.min(1, (29.6 - Math.hypot(x - 48, y - 40)) / feather));
      coverage[pixel] = alpha;
      source.set([...foreground.map((value, channel) => alpha * value + (1 - alpha) * background[channel]), 255], pixel * 4);
    }
  }
  return { source, coverage, mask: createPlainBackgroundMask(source, width, height) };
}

test('wide feathered edges do not use contaminated four-pixel inset colors as foreground', () => {
  const { source, coverage, mask } = flattened([17, 17, 19], 8);
  const refined = refineAutomaticEdges(source, width, height, mask, { recoverOutside: true });
  assert.ok(refined);
  let checked = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (!mask[pixel] || coverage[pixel] >= 0.95) continue;
    checked += 1;
    assert.ok(Math.abs(refined.alpha[pixel] / 255 - coverage[pixel]) < 0.02, `wide coverage at ${pixel}`);
    for (let channel = 0; channel < 3; channel += 1) {
      assert.ok(Math.abs(refined.colors[pixel * 4 + channel] - foreground[channel]) < 6, `wide color at ${pixel}`);
    }
  }
  assert.ok(checked > 500);
});

test('one-pixel background gaps are cleaned without borrowing colors from the object across the gap', () => {
  const source = new Uint8ClampedArray(width * height * 4);
  const gold = y => [230 + y % 4 * 7, 145 + y % 4 * 9, 40 + y % 4 * 5];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const color = x < 46 ? foreground : gold(y);
    const inset = Math.min(x < 46 ? x - 12 : x - 46, x < 46 ? 46 - x : 84 - x, y - 12, 68 - y);
    const alpha = Math.max(0, Math.min(1, inset / 2));
    source.set([...color.map(value => 17 + alpha * (value - 17)), 255], (y * width + x) * 4);
  }
  const mask = createPlainBackgroundMask(source, width, height);
  const refined = refineAutomaticEdges(source, width, height, mask, { recoverOutside: true });
  assert.ok(refined);
  for (let y = 28; y < 52; y += 1) {
    assert.equal(refined.alpha[y * width + 46], 0, 'gap stays transparent');
    for (const x of [45, 47]) {
      const pixel = y * width + x, expected = x < 46 ? foreground : gold(y);
      assert.ok(Math.abs(refined.alpha[pixel] - 128) < 4, `gap edge alpha at ${x},${y}`);
      for (let channel = 0; channel < 3; channel += 1) {
        assert.ok(Math.abs(refined.colors[pixel * 4 + channel] - expected[channel]) < 6, `gap edge color at ${x},${y}`);
      }
    }
  }
});

test('small textured shapes without a flat or deep interior still receive edge cleanup', () => {
  const source = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const alpha = Math.max(0, Math.min(1, Math.min(x - 40, 50 - x, y - 12, 68 - y) / 2));
    const color = [230 + y % 4 * 7, 145 + y % 4 * 9, 40 + y % 4 * 5];
    source.set([...color.map(value => 17 + alpha * (value - 17)), 255], (y * width + x) * 4);
  }
  const mask = createPlainBackgroundMask(source, width, height);
  const refined = refineAutomaticEdges(source, width, height, mask, { recoverOutside: true });
  assert.ok(refined);
  for (let y = 28; y < 52; y += 1) for (const x of [41, 49]) {
    const pixel = y * width + x;
    assert.ok(Math.abs(refined.alpha[pixel] - 128) < 4);
    assert.ok(refined.colors[pixel * 4] >= 225);
    assert.equal(refined.alpha[y * width + 45], 255, 'small core is preserved');
  }
});

test('mixed highlight edges are decontaminated but off-color background noise is not restored', () => {
  const { source } = flattened([17, 17, 19]);
  const highlight = 40 * width + 19, noise = 40 * width + 18;
  source.set([91, 85, 72, 255], highlight * 4);
  source.set([10, 25, 39, 255], noise * 4);
  const mask = createPlainBackgroundMask(source, width, height);
  assert.equal(mask[highlight], 255);
  assert.equal(mask[noise], 0);
  const refined = refineAutomaticEdges(source, width, height, mask, { recoverOutside: true });
  assert.ok(refined.alpha[highlight] > 50 && refined.alpha[highlight] < 160);
  assert.ok(refined.colors[highlight * 4] >= 160, 'no opaque dark fleck on the highlight');
  assert.ok(refined.colors[highlight * 4] > refined.colors[highlight * 4 + 1]);
  assert.ok(refined.colors[highlight * 4 + 1] > refined.colors[highlight * 4 + 2]);
  assert.equal(refined.alpha[noise], 0, 'do not revive background ringing');
});

for (const background of [[17, 17, 17], [255, 255, 255], [30, 70, 210]]) {
  test(`removes background contamination and recovers soft edge coverage over ${background}`, () => {
    const { source, coverage, mask } = flattened(background);
    const original = source.slice(), originalMask = mask.slice();
    const refined = refineAutomaticEdges(source, width, height, mask, { recoverOutside: true });
    assert.ok(refined);
    let checked = 0, recovered = 0;
    for (let pixel = 0; pixel < mask.length; pixel += 1) {
      if (coverage[pixel] > 0.06 && coverage[pixel] < 0.95) {
        checked += 1;
        assert.ok(Math.abs(refined.alpha[pixel] / 255 - coverage[pixel]) < 0.02, `coverage at ${pixel}`);
        for (let channel = 0; channel < 3; channel += 1) {
          assert.ok(Math.abs(refined.colors[pixel * 4 + channel] - foreground[channel]) < 6, `color at ${pixel}`);
        }
        if (!mask[pixel] && refined.alpha[pixel]) recovered += 1;
      }
      if (coverage[pixel] === 1) {
        assert.equal(refined.alpha[pixel], 255);
        assert.deepEqual(refined.colors.slice(pixel * 4, pixel * 4 + 4), source.slice(pixel * 4, pixel * 4 + 4));
      }
      if (coverage[pixel] === 0) assert.equal(refined.alpha[pixel], 0);
    }
    assert.ok(checked > 200);
    assert.ok(recovered > 0);
    assert.deepEqual(source, original);
    assert.deepEqual(mask, originalMask);
  });
}

test('cleanup does not cross an opaque outline into enclosed background-colored highlights', () => {
  const { source } = flattened([255, 255, 255]);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.hypot(x - 48, y - 40) < 27) source.set([255, 255, 255, 255], (y * width + x) * 4);
    }
  }
  const mask = createPlainBackgroundMask(source, width, height);
  const refined = refineAutomaticEdges(source, width, height, mask, { recoverOutside: true });
  const alpha = refined?.alpha || mask;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.hypot(x - 48, y - 40) < 27) assert.equal(alpha[y * width + x], 255);
    }
  }
});

test('existing transparent pixels and thin details remain untouched without reliable samples', () => {
  const { source, coverage } = flattened([17, 17, 17]);
  const mask = new Uint8ClampedArray(width * height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    source[pixel * 4 + 3] = Math.round(coverage[pixel] * 255);
    mask[pixel] = source[pixel * 4 + 3] ? 255 : 0;
  }
  assert.equal(refineAutomaticEdges(source, width, height, mask), null);
  assert.equal(refineAutomaticEdges(source, width, height, mask, { recoverOutside: true }), null);
  source.fill(0); mask.fill(0);
  for (let pixel = 0; pixel < mask.length; pixel += 1) source[pixel * 4 + 3] = 255;
  for (let x = 15; x < 80; x += 1) {
    source.set([...foreground, 255], (40 * width + x) * 4);
    mask[40 * width + x] = 255;
  }
  assert.equal(refineAutomaticEdges(source, width, height, mask), null);
  assert.equal(refineAutomaticEdges(source, width, height, mask, { recoverOutside: true }), null);
});

function editorFixture(refinement = refineAutomaticEdges) {
  const fixture = flattened([17, 17, 17]);
  const source = factory(), pixels = source.getContext('2d').createImageData(width, height);
  pixels.data.set(fixture.source);
  source.getContext('2d').putImageData(pixels, 0, 0);
  return { ...fixture, editor: new MaskEditor(source, factory(), factory(), factory, factory(), refinement) };
}
function mark(editor, mode, x, y) {
  editor.beginStroke(mode, 0.5, { x: x + 0.5, y: y + 0.5 });
  editor.endStroke();
}

test('corrected RGB reaches exported PNG; Keep, unmark, undo, clear and reruns preserve their semantics', async () => {
  const { editor, mask } = editorFixture();
  const x = 19, y = 40;
  editor.setAutomaticMask(mask);
  const edge = rgba(editor.result, x, y), original = rgba(editor.source, x, y);
  assert.ok(edge[3] > 50 && edge[3] < 100);
  assert.ok(edge[0] > original[0] + 70);
  mark(editor, 'keep', x, y);
  assert.deepEqual(rgba(editor.result, x, y), original);
  editor.setAutomaticMask(mask);
  assert.deepEqual(rgba(editor.result, x, y), original);
  mark(editor, 'erase', x, y);
  assert.deepEqual(rgba(editor.result, x, y), original);
  mark(editor, 'unmark', x, y);
  assert.deepEqual(rgba(editor.result, x, y), edge);
  editor.undo();
  assert.deepEqual(rgba(editor.result, x, y), original);
  editor.redo();
  assert.deepEqual(rgba(editor.result, x, y), edge);
  mark(editor, 'erase', x, y);
  assert.equal(rgba(editor.result, x, y)[3], 0);
  editor.clearMarks();
  assert.deepEqual(rgba(editor.result, x, y), edge);
  const decoded = factory();
  decoded.getContext('2d').drawImage(await loadImage(editor.result.toBuffer('image/png')), 0, 0);
  assert.deepEqual(rgba(decoded, x, y), edge);
  assert.deepEqual(rgba(editor.source, x, y), original);
});

test('AI mask edges are corrected without reopening removed holes or increasing AI alpha', () => {
  const { editor, coverage } = editorFixture();
  const automatic = factory(), pixels = automatic.getContext('2d').createImageData(width, height);
  for (let pixel = 0; pixel < coverage.length; pixel += 1) pixels.data[pixel * 4 + 3] = Math.round(coverage[pixel] * 255);
  pixels.data[(40 * width + 48) * 4 + 3] = 0;
  automatic.getContext('2d').putImageData(pixels, 0, 0);
  editor.setAutomaticResult(automatic);
  const edge = rgba(editor.result, 19, 40);
  assert.ok(edge[0] > 140);
  assert.ok(edge[3] <= rgba(automatic, 19, 40)[3]);
  assert.equal(rgba(editor.result, 48, 40)[3], 0);
  assert.equal(rgba(editor.result, 18, 40)[3], 0);
});

test('default editor retains legacy output when English-only refinement is not enabled', () => {
  const { editor, mask } = editorFixture(null);
  editor.setAutomaticMask(mask);
  assert.deepEqual(rgba(editor.result, 19, 40), rgba(editor.source, 19, 40));
  assert.equal(editor.automaticSource, null);
});

test('Keep preserves source translucency when another edge in the same image is refined', () => {
  const { editor, mask } = editorFixture();
  const ctx = editor.source.getContext('2d');
  ctx.clearRect(48, 40, 1, 1);
  ctx.fillStyle = 'rgba(50, 100, 150, 0.5)';
  ctx.fillRect(48, 40, 1, 1);
  const original = rgba(editor.source, 48, 40);
  editor.setAutomaticMask(mask);
  assert.ok(editor.automaticSource);
  mark(editor, 'keep', 48, 40);
  assert.deepEqual(rgba(editor.result, 48, 40), original);
  editor.setAutomaticMask(mask);
  assert.deepEqual(rgba(editor.result, 48, 40), original);
  mark(editor, 'unmark', 48, 40);
  assert.deepEqual(rgba(editor.result, 48, 40), original);
});
