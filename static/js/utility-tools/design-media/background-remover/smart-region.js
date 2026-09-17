// Grow from the clicked source pixel through four-way neighbors only. Always compare
// to the initial color: comparing successive neighbors would drift across gradients.
export function selectConnectedPixels(source, width, height, seed, tolerance) {
  const x = Math.floor(seed.x), y = Math.floor(seed.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= width || y >= height) return null;
  const start = y * width + x;
  const reference = source.subarray(start * 4, start * 4 + 4);
  if (!reference[3]) return null;
  const selected = new Uint8Array(width * height);
  const visited = new Uint8Array(selected.length);
  const queue = new Int32Array(selected.length);
  const threshold = Math.max(0, Math.min(100, Number(tolerance) || 0)) * 255 / 100;
  let head = 0, count = 0;
  const enqueue = pixel => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const offset = pixel * 4;
    if (source[offset + 3] === 0) return;
    for (let channel = 0; channel < 4; channel += 1) {
      if (Math.abs(source[offset + channel] - reference[channel]) > threshold) return;
    }
    selected[pixel] = 1;
    queue[count++] = pixel;
  };
  enqueue(start);
  while (head < count) {
    const pixel = queue[head++], column = pixel % width;
    if (column > 0) enqueue(pixel - 1);
    if (column + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < selected.length) enqueue(pixel + width);
  }
  return { left: 0, top: 0, width, height, selected, count };
}
