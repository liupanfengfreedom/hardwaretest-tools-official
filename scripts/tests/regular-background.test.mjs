import test from 'node:test';
import assert from 'node:assert/strict';
import { detectRegularBackground } from '../../static/js/utility-tools/design-media/background-remover/background-model.js';
import { createAutomaticBackgroundSelection, createPlainBackgroundMask } from '../../static/js/utility-tools/design-media/background-remover/automatic-mask.js';
import { refineAutomaticEdges } from '../../static/js/utility-tools/design-media/background-remover/edge-refinement.js';
import { regularizeContour } from '../../static/js/utility-tools/design-media/background-remover/contour-refinement.js';

const width = 120, height = 104, fg = [211, 121, 39];
function fixture(palette, kind = 'checker', offset = [3, 5]) {
  const source = new Uint8ClampedArray(width * height * 4), coverage = new Float32Array(width * height);
  const colorAt = (x, y) => palette[((kind === 'horizontal' ? 0 : Math.floor((x + offset[0]) / 8))
    + (kind === 'vertical' ? 0 : Math.floor((y + offset[1]) / 8))) % palette.length];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const radius = Math.hypot(x - 60, y - 52);
    const alpha = Math.max(0, Math.min(1, (32.6 - radius) / 2, (radius - 12.4) / 2));
    const pixel = y * width + x, background = colorAt(x, y);
    coverage[pixel] = alpha;
    source.set([...fg.map((value, channel) => alpha * value + (1 - alpha) * background[channel]), 255], pixel * 4);
  }
  return { source, coverage, colorAt };
}
for (const palette of [[[17, 17, 19], [17, 17, 19]], [[255, 255, 255], [218, 218, 218]], [[24, 75, 191], [210, 232, 255]]]) {
  test(`automatic selection and matte cleanup on ${palette} preserve a loop and its hole`, () => {
    const { source, coverage } = fixture(palette), original = source.slice();
    const detected = createAutomaticBackgroundSelection(source, width, height);
    assert.ok(detected);
    const { mask, background } = detected;
    const refined = refineAutomaticEdges(source, width, height, mask, {
      recoverOutside: true, maxEdgeWidth: 2, cleanSpeckles: true, continuousContour: true, backgroundModel: background
    });
    assert.ok(refined);
    let checked = 0;
    for (let pixel = 0; pixel < mask.length; pixel++) {
      if (!coverage[pixel]) assert.equal(refined.alpha[pixel], 0, `background at ${pixel}`);
      if (coverage[pixel] === 1) assert.equal(refined.alpha[pixel], 255, `core at ${pixel}`);
      if (coverage[pixel] > 0.2 && coverage[pixel] < 0.9) {
        checked++;
        assert.ok(Math.abs(refined.alpha[pixel] / 255 - coverage[pixel]) < 0.035, `soft edge at ${pixel}`);
        for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(refined.colors[pixel * 4 + channel] - fg[channel]) < 8);
      }
    }
    assert.ok(checked > 100);
    assert.deepEqual(source, original);
  });
}

for (const kind of ['checker', 'horizontal', 'vertical']) for (const palette of [
  [[255, 255, 255], [238, 238, 238]], [[230, 110, 130], [42, 70, 160], [70, 210, 160]],
  [[240, 230, 220], [90, 40, 120], [170, 190, 55], [30, 140, 160]]
]) test(`${palette.length}-color ${kind} is recognized by location, including a partial first tile`, () => {
  const { source, colorAt } = fixture(palette, kind);
  const model = detectRegularBackground(source, width, height);
  assert.ok(model);
  assert.equal(model.palette.length, palette.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) assert.deepEqual(model.colorAt(y * width + x), colorAt(x, y));
  assert.ok(createAutomaticBackgroundSelection(source, width, height));
  assert.equal(createPlainBackgroundMask(source, width, height), null, 'English does not opt into pattern removal');
});

test('wrong-phase palette colors and enclosed solid details are not classified by color alone', () => {
  const { source, colorAt } = fixture([[255, 255, 255], [190, 190, 190]]);
  for (let y = 45; y < 59; y++) for (let x = 78; x < 88; x++) source.set([255, 255, 255, 255], (y * width + x) * 4);
  const pixel = 52 * width + 80;
  const wrong = colorAt(80, 52)[0] === 255 ? 190 : 255;
  source.set([wrong, wrong, wrong, 255], pixel * 4);
  const { mask, background } = createAutomaticBackgroundSelection(source, width, height);
  const refined = refineAutomaticEdges(source, width, height, mask, {
    recoverOutside: true, maxEdgeWidth: 2, cleanSpeckles: true, continuousContour: true, backgroundModel: background
  });
  for (let y = 45; y < 59; y++) for (let x = 78; x < 88; x++) {
    assert.equal(mask[y * width + x], 255);
    assert.equal(refined.alpha[y * width + x], 255, 'refinement must not override position-based protection');
  }
});

test('low-contrast white checkerboards are identified as two colors, not collapsed into a single background', () => {
  const { source } = fixture([[255, 255, 255], [244, 244, 244]]);
  const result = createAutomaticBackgroundSelection(source, width, height);
  assert.ok(result);
  assert.equal(result.background.kind, 'checker');
  assert.equal(result.background.palette.length, 2);
  assert.equal(result.mask[0], 0);
  assert.equal(result.mask[52 * width + 60], 0);
  assert.equal(result.mask[52 * width + 80], 255);
});

test('gradients, photographic border texture, and translucent cutouts are not forced into a repeating-color model', () => {
  const { source } = fixture([[255, 255, 255], [190, 190, 190]]);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) source.set([50 + x, 70 + y, 160, 255], (y * width + x) * 4);
  assert.equal(createAutomaticBackgroundSelection(source, width, height), null);
  const { source: transparent } = fixture([[0, 0, 0], [0, 0, 0]]);
  for (let p = 0; p < width * height; p++) transparent[p * 4 + 3] = Math.max(...transparent.slice(p * 4, p * 4 + 3)) ? 120 : 0;
  const selection = createAutomaticBackgroundSelection(transparent, width, height);
  assert.ok(selection); assert.equal(selection.background, null);
  assert.equal(refineAutomaticEdges(transparent, width, height, selection.mask, { recoverOutside: true, continuousContour: true }), null);
});

test('irregular texture, one-pixel decorative frames, and empty patterns fall back instead of guessing', () => {
  const palette = [[250, 250, 250], [170, 185, 210]], { source } = fixture(palette);
  const empty = source.slice();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    empty.set([...palette[(Math.floor((x + 3) / 8) + Math.floor((y + 5) / 8)) % 2], 255], (y * width + x) * 4);
  }
  assert.equal(createAutomaticBackgroundSelection(empty, width, height), null);
  const frame = empty.slice();
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) frame.set([110, 70, 150, 255], (y * width + x) * 4);
  assert.equal(createAutomaticBackgroundSelection(frame, width, height), null);
  for (let x = 0; x < width; x++) source.set([x * 19 % 256, x * 37 % 256, x * 47 % 256, 255], x * 4);
  assert.equal(createAutomaticBackgroundSelection(source, width, height), null);
});

for (const backdrop of [[17, 17, 19], [255, 255, 255], [25, 75, 200]]) test(`contour cleanup removes unsupported bumps over ${backdrop}, not thin structures or colored droplets`, () => {
  const source = new Uint8ClampedArray(width * height * 4), alpha = new Uint8ClampedArray(width * height);
  const paint = (x, y, color = fg) => { const p = y * width + x; source.set([...color, 255], p * 4); alpha[p] = 255; };
  for (let p = 0; p < alpha.length; p++) source.set([...backdrop, 255], p * 4);
  for (let y = 20; y <= 84; y++) for (let x = 30; x <= 90; x++) paint(x, y);
  const weak = fg.map((value, i) => Math.round(backdrop[i] * 0.8 + value * 0.2));
  paint(29, 40, weak); paint(28, 55, weak); // attached protrusion and detached background dot
  paint(29, 65); paint(28, 65); // legitimate sharp tip
  paint(28, 75); // legitimate detached droplet
  for (let x = 10; x < 30; x++) paint(x, 30, weak); // coherent thin antenna
  const original = alpha.slice();
  const result = regularizeContour(source, width, height, { alpha, colors: source }, () => backdrop);
  assert.equal(result.alpha[40 * width + 29], 0);
  assert.equal(result.alpha[55 * width + 28], 0);
  for (const [x, y] of [[28, 65], [29, 65], [28, 75], [10, 30], [29, 30]]) assert.equal(result.alpha[y * width + x], 255);
  for (let x = 30; x <= 90; x++) assert.equal(result.alpha[50 * width + x], 255);
  assert.deepEqual(alpha, original);
  assert.deepEqual(result.colors, source);
});

test('contour cleanup cannot sever a weak narrow bridge, touch existing translucency, or run without background evidence', () => {
  const source = new Uint8ClampedArray(width * height * 4), alpha = new Uint8ClampedArray(width * height), b = [17, 17, 19];
  for (let p = 0; p < alpha.length; p++) source.set([...b, 255], p * 4);
  for (let y = 40; y <= 44; y++) for (let x = 40; x <= 50; x++) {
    if (x === 45 && y !== 42) continue;
    const p = y * width + x; alpha[p] = 255; source.set([...(x === 45 ? [45, 40, 24] : fg), 255], p * 4);
  }
  const result = { alpha, colors: source };
  assert.equal(regularizeContour(source, width, height, result, null), result);
  const refined = regularizeContour(source, width, height, result, () => b);
  assert.equal(refined.alpha[42 * width + 45], 255);
  const translucent = 39 * width + 42; alpha[translucent] = 255; source.set([45, 40, 24, 120], translucent * 4);
  assert.equal(regularizeContour(source, width, height, result, () => b).alpha[translucent], 255);
});
