// Suppress unsupported one-pixel bumps, not entire small components. Work only
// on a verified backdrop, after matte recovery, and never grow/fill the mask.
// Thin lines, disconnected colored details and the interiors stay untouched.
export function regularizeContour(source, width, height, result, background, protectedPixels = null) {
  if (!background) return result;
  const { alpha, colors } = result;
  const output = alpha.slice();
  const contrast = (pixels, pixel) => {
    const b = background(pixel), offset = pixel * 4;
    return Math.max(Math.abs(pixels[offset] - b[0]), Math.abs(pixels[offset + 1] - b[1]), Math.abs(pixels[offset + 2] - b[2]));
  };
  const ring = [-width - 1, -width, -width + 1, 1, width + 1, width, width - 1, -1];
  let changed = false;
  for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) {
    const pixel = y * width + x, value = alpha[pixel];
    if (!value || protectedPixels?.[pixel] || source[pixel * 4 + 3] !== 255) continue;
    let boundary = false;
    for (const offset of ring) if (!alpha[pixel + offset]) { boundary = true; break; }
    if (!boundary) continue;
    const adjacent = ring.map(offset => alpha[pixel + offset]);
    const median = adjacent.slice().sort((a, b) => a - b)[3];
    if (value <= median + 48) continue; // A smooth antialiased edge is not a spike.
    const current = contrast(colors, pixel), observed = contrast(source, pixel);
    let similar = 0;
    for (const offset of ring) {
      const next = pixel + offset;
      if (alpha[next] < 64) continue;
      const distance = Math.max(...[0, 1, 2].map(channel => Math.abs(colors[next * 4 + channel] - colors[pixel * 4 + channel])));
      if (distance <= 24) similar++;
    }
    if (similar >= 2) continue; // Preserve coherent antennae, hair and sharp tips.
    const anchors = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dy) continue;
      const next = pixel + dy * width + dx;
      if (alpha[next] >= 192) anchors.push(contrast(colors, next));
    }
    if (anchors.length < 3) continue;
    anchors.sort((a, b) => a - b);
    const reference = anchors[Math.floor(anchors.length / 2)];
    // Relative contrast works for white, colored and periodic backdrops as well
    // as black. Never remove a dot just because it is dark or small.
    if (observed > reference * 0.55 || current > reference * 0.65) continue;
    // A simple-point guard: do not cut a narrow bridge or join two background
    // holes. Inspect the current mask so adjacent removals cannot break a line.
    const occupied = ring.map(offset => output[pixel + offset] > 0);
    let transitions = 0;
    for (let i = 0; i < 8; i++) if (occupied[i] !== occupied[(i + 1) % 8]) transitions++;
    if (transitions > 2) continue;
    output[pixel] = median;
    changed = true;
  }
  return changed ? { alpha: output, colors } : result;
}
