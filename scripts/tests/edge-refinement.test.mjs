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

const refineChineseEdges = (source, width, height, mask, options) => refineAutomaticEdges(source, width, height, mask, { ...options, maxEdgeWidth: 2, cleanSpeckles: true, continuousContour: true });

test('clipped low-signal channels no longer force a mixed edge pixel to opaque black', () => {
  const { source } = flattened([17, 17, 19]);
  const pixel = 40 * width + 19;
  // Actual reported pixel: blue undershoots the backdrop after resampling.
  source.set([47, 38, 0, 255], pixel * 4);
  const mask = createPlainBackgroundMask(source, width, height, { removeEnclosedBackground: true });
  const original = source.slice(), originalMask = mask.slice();
  const old = refineAutomaticEdges(source, width, height, mask, { recoverOutside: true, maxEdgeWidth: 2 });
  const refined = refineChineseEdges(source, width, height, mask, { recoverOutside: true });
  assert.equal(old.alpha[pixel], 255, 'fixture reproduces the previous opaque speck');
  assert.ok(refined.alpha[pixel] > 0 && refined.alpha[pixel] < 90);
  assert.ok(refined.colors[pixel * 4] > 140 && refined.colors[pixel * 4 + 1] > 150);
  assert.deepEqual(source, original);
  assert.deepEqual(mask, originalMask);
});

test('backdrop-colored speckles are removed without deleting small colored droplets or thin antennae', () => {
  const { source } = flattened([17, 17, 19]);
  for (let y = 34; y < 46; y++) for (let x = 42; x < 54; x++) source.set([17, 17, 19, 255], (y * width + x) * 4);
  const noise = [[46, 38, [14, 15, 0]], [47, 38, [26, 29, 0]], [47, 39, [38, 19, 0]]];
  for (const [x, y, color] of noise) source.set([...color, 255], (y * width + x) * 4);
  source.set([230, 178, 45, 255], (14 * width + 8) * 4);
  for (let x = 75; x < 85; x++) source.set([86, 86, 88, 255], (7 * width + x) * 4);
  const mask = createPlainBackgroundMask(source, width, height, { removeEnclosedBackground: true });
  const refined = refineChineseEdges(source, width, height, mask, { recoverOutside: true });
  for (const [x, y] of noise) {
    assert.equal(mask[y * width + x], 255, 'old backdrop match missed the clipped noise');
    assert.equal(refined.alpha[y * width + x], 0);
  }
  for (const [x, y] of [[8, 14], ...Array.from({ length: 10 }, (_, i) => [75 + i, 7])]) {
    const pixel = y * width + x;
    assert.equal(refined.alpha[pixel], 255);
    assert.deepEqual(refined.colors.slice(pixel * 4, pixel * 4 + 4), source.slice(pixel * 4, pixel * 4 + 4));
  }
});

test('noise cleanup is returned even when no foreground anchor or matte correction is available', () => {
  const source = new Uint8ClampedArray(width * height * 4), mask = new Uint8ClampedArray(width * height);
  for (let pixel = 0; pixel < mask.length; pixel++) source.set([17, 17, 19, 255], pixel * 4);
  const noise = 40 * width + 48;
  source.set([14, 15, 0, 255], noise * 4); mask[noise] = 255;
  const refined = refineChineseEdges(source, width, height, mask, { recoverOutside: true });
  assert.ok(refined);
  assert.equal(refined.alpha[noise], 0);
  assert.equal(mask[noise], 255, 'input mask was not mutated');
  assert.deepEqual(refined.colors, source);
  assert.equal(refineChineseEdges(source, width, height, mask, { recoverOutside: false }), null, 'AI masks do not use an unverified global backdrop');
});

test('Chinese cleanup removes matte from both sides of a thin loop without refilling its enclosed hole', () => {
  const source = new Uint8ClampedArray(width * height * 4), background = [17, 17, 19];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const radius = Math.hypot(x - 48, y - 40);
    const alpha = Math.max(0, Math.min(1, (29.6 - radius) / 2, (radius - 18.4) / 2));
    source.set([...foreground.map((value, channel) => alpha * value + (1 - alpha) * background[channel]), 255], (y * width + x) * 4);
  }
  const mask = createPlainBackgroundMask(source, width, height, { removeEnclosedBackground: true });
  const refined = refineChineseEdges(source, width, height, mask, { recoverOutside: true });
  assert.ok(refined);
  for (const x of [19, 29, 67, 77]) {
    const pixel = 40 * width + x;
    assert.ok(Math.abs(refined.alpha[pixel] - 76) <= 3, 'soft edge coverage is recovered');
    for (let channel = 0; channel < 3; channel++) {
      assert.ok(Math.abs(refined.colors[pixel * 4 + channel] - foreground[channel]) < 6, 'black matte is removed');
    }
  }
  let corePixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const radius = Math.hypot(x - 48, y - 40), pixel = y * width + x;
    if (radius < 17) assert.equal(refined.alpha[pixel], 0, 'enclosed hole stays open');
    if (radius >= 22 && radius <= 26) {
      corePixels++;
      assert.equal(refined.alpha[pixel], 255, 'thin loop core stays opaque');
      assert.deepEqual(refined.colors.slice(pixel * 4, pixel * 4 + 4), source.slice(pixel * 4, pixel * 4 + 4));
    }
  }
  assert.ok(corePixels > 400);
});

test('narrow cleanup cannot spread from an edge into an opaque interior shadow', () => {
  const source = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const coverage = Math.max(0, Math.min(1, Math.min(x - 10, 86 - x, y - 10, 70 - y) / 2));
    const shade = y >= 39 && y <= 41 && x <= 20 ? 0.5 : 1;
    source.set([...foreground.map(value => 17 + (value - 17) * coverage * shade), 255], (y * width + x) * 4);
  }
  const mask = createPlainBackgroundMask(source, width, height, { removeEnclosedBackground: true });
  const refined = refineChineseEdges(source, width, height, mask, { recoverOutside: true });
  assert.ok(refined.alpha[40 * width + 11] < 255, 'edge still gets cleaned');
  for (let x = 13; x <= 20; x++) {
    const pixel = 40 * width + x;
    assert.equal(refined.alpha[pixel], 255, 'interior shadow is not treated as transparency');
    assert.deepEqual(refined.colors.slice(pixel * 4, pixel * 4 + 4), source.slice(pixel * 4, pixel * 4 + 4));
  }
});

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

for (const [name, refinement] of [['English', refineAutomaticEdges], ['Chinese', refineChineseEdges]]) test(`${name}: corrected RGB reaches exported PNG; Keep, unmark, undo, clear and reruns preserve their semantics`, async () => {
  const { editor, mask } = editorFixture(refinement);
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

for (const [name, refinement] of [['English', refineAutomaticEdges], ['Chinese', refineChineseEdges]]) test(`${name}: AI mask edges are corrected without reopening removed holes or increasing AI alpha`, () => {
  const { editor, coverage } = editorFixture(refinement);
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

test('default editor retains legacy output when edge refinement is not enabled', () => {
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
