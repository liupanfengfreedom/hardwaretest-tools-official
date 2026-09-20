import { detectRegularBackground } from './background-model.js?v=20260921-contours';

// Plain backgrounds are better identified from the source than from a semantic AI
// mask: pale artwork can be background-like to the model but belongs to the icon.
// Return null when the perimeter is not reliably uniform, so photos still use AI.
export function createPlainBackgroundMask(source, width, height, { removeEnclosedBackground = false } = {}) {
  const count = width * height;
  if (width < 3 || height < 3 || source.length !== count * 4) return null;
  const edges = [[], [], [], []];
  for (let x = 0; x < width; x += 1) {
    edges[0].push(x);
    edges[1].push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    edges[2].push(y * width);
    edges[3].push(y * width + width - 1);
  }
  const perimeter = edges.flat();
  const transparent = perimeter.filter(pixel => source[pixel * 4 + 3] === 0).length;
  // A transparent border already identifies a cutout. Do not run AI over it again
  // and destroy the existing translucent highlights or antialiased outline.
  if (transparent === perimeter.length) {
    return Uint8ClampedArray.from({ length: count }, (_, pixel) => source[pixel * 4 + 3] ? 255 : 0);
  }
  if (perimeter.some(pixel => source[pixel * 4 + 3] < 250)) return null;
  const color = [0, 1, 2].map(channel => {
    const values = perimeter.map(pixel => source[pixel * 4 + channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  const distance = pixel => {
    const offset = pixel * 4;
    return Math.max(Math.abs(source[offset] - color[0]), Math.abs(source[offset + 1] - color[1]), Math.abs(source[offset + 2] - color[2]));
  };
  // Check each side separately; a long white edge must not conceal a textured one.
  if (edges.some(edge => edge.filter(pixel => distance(pixel) <= 12).length < edge.length * 0.98)) return null;

  const outside = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  const enqueue = pixel => {
    if (outside[pixel] || (source[pixel * 4 + 3] && distance(pixel) > 24)) return;
    outside[pixel] = 1;
    queue[tail++] = pixel;
  };
  perimeter.forEach(enqueue);
  while (head < tail) {
    const pixel = queue[head++], x = pixel % width;
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < count) enqueue(pixel + width);
  }
  // Reject uniform/near-empty images and narrow picture borders. We need both a
  // substantial exterior background and a distinct foreground before bypassing AI.
  const foregroundCount = count - tail;
  if (tail < count * 0.05 || foregroundCount < Math.max(4, count * 0.001)) return null;

  const mask = new Uint8ClampedArray(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    // Automatic removal can also find backdrop-colored holes inside vines,
    // handles, etc. It is independent of the manual connected-selection wall.
    // Use the stricter backdrop match here, not the looser exterior edge range:
    // flooding from an interior highlight could otherwise erase a pale subject.
    const enclosedBackground = removeEnclosedBackground && source[pixel * 4 + 3] === 255 && distance(pixel) <= 12;
    if (source[pixel * 4 + 3] && !outside[pixel] && !enclosedBackground) mask[pixel] = 255;
  }
  return mask;
}

// Chinese automatic mode: recognize a spatially verified palette, independent
// of manual connected selection. English keeps createPlainBackgroundMask.
export function createAutomaticBackgroundSelection(source, width, height) {
  const plain = createPlainBackgroundMask(source, width, height, { removeEnclosedBackground: true });
  const background = detectRegularBackground(source, width, height);
  if (plain && (!background || background.kind === 'solid')) return { mask: plain, background };
  if (!background || background.kind === 'solid') return null;
  const count = width * height, matched = new Uint8Array(count), seen = new Uint8Array(count);
  const mask = new Uint8ClampedArray(count), queue = new Int32Array(count);
  for (let pixel = 0; pixel < count; pixel++) {
    if (!source[pixel * 4 + 3]) continue;
    mask[pixel] = 255;
    const color = background.colorAt(pixel);
    if (source[pixel * 4 + 3] === 255 && color.every((value, channel) => Math.abs(source[pixel * 4 + channel] - value) <= background.tolerance)) matched[pixel] = 1;
  }
  let removed = 0, exterior = 0;
  for (let seed = 0; seed < count; seed++) {
    if (!matched[seed] || seen[seed]) continue;
    let head = 0, tail = 1, touchesEdge = false, colors = 0;
    queue[0] = seed; seen[seed] = 1;
    const enqueue = pixel => { if (matched[pixel] && !seen[pixel]) { seen[pixel] = 1; queue[tail++] = pixel; } };
    while (head < tail) {
      const pixel = queue[head++], x = pixel % width;
      colors |= 1 << background.palette.indexOf(background.colorAt(pixel));
      if (!x || x === width - 1 || pixel < width || pixel >= count - width) touchesEdge = true;
      if (x > 0) enqueue(pixel - 1);
      if (x + 1 < width) enqueue(pixel + 1);
      if (pixel >= width) enqueue(pixel - width);
      if (pixel + width < count) enqueue(pixel + width);
    }
    // Enclosed areas need evidence of the repeating pattern, not merely one
    // palette color. This protects solid white/gray details inside the subject.
    if (!touchesEdge && !(colors & (colors - 1))) continue;
    for (let index = 0; index < tail; index++) mask[queue[index]] = 0;
    removed += tail;
    if (touchesEdge) exterior += tail;
  }
  if (exterior < count * 0.05 || count - removed < Math.max(4, count * 0.001)) return null;
  return { mask, background };
}
