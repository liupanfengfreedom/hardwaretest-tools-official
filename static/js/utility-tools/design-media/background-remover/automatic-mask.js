// Plain backgrounds are better identified from the source than from a semantic AI
// mask: pale artwork can be background-like to the model but belongs to the icon.
// Return null when the perimeter is not reliably uniform, so photos still use AI.
export function createPlainBackgroundMask(source, width, height) {
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
    if (source[pixel * 4 + 3] && !outside[pixel]) mask[pixel] = 255;
  }
  return mask;
}
