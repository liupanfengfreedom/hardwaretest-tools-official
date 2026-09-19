// A flattened edge contains C = aF + (1 - a)B. Keeping C after removing B
// leaves a dark/light/color fringe. Estimate a and F only in a narrow edge band,
// using nearby, reliable background and opaque foreground samples.
export function refineAutomaticEdges(source, width, height, mask, { recoverOutside = false } = {}) {
  const count = width * height;
  if (source.length !== count * 4 || mask.length !== count) throw new Error('Invalid image dimensions');
  const radius = 8;
  const queue = new Int32Array(count);
  const neighbors = (pixel, visit) => {
    const x = pixel % width;
    if (x > 0) visit(pixel - 1);
    if (x + 1 < width) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel + width < count) visit(pixel + width);
  };
  function nearest(seed, withOwner = true) {
    const distance = new Uint8Array(count).fill(255);
    const owner = withOwner ? new Int32Array(count).fill(-1) : null;
    let head = 0, tail = 0;
    for (let pixel = 0; pixel < count; pixel += 1) {
      if (!seed(pixel)) continue;
      distance[pixel] = 0;
      if (owner) owner[pixel] = pixel;
      queue[tail++] = pixel;
    }
    while (head < tail) {
      const pixel = queue[head++];
      if (distance[pixel] >= radius) continue;
      neighbors(pixel, next => {
        if (distance[next] !== 255) return;
        distance[next] = distance[pixel] + 1;
        if (owner) owner[next] = owner[pixel];
        queue[tail++] = next;
      });
    }
    return { distance, owner };
  }

  // Existing transparent PNGs need no color unmixing. Never use their hidden RGB
  // as a background estimate or multiply their original alpha a second time.
  const opaqueRemoved = pixel => mask[pixel] === 0 && source[pixel * 4 + 3] === 255;
  if (!mask.some((_, pixel) => opaqueRemoved(pixel))) return null;
  const outside = nearest(opaqueRemoved, false).distance;
  const foreground = nearest(pixel => mask[pixel] >= 250 && source[pixel * 4 + 3] === 255
    && outside[pixel] >= 4 && outside[pixel] <= radius).owner;
  if (!foreground.some(pixel => pixel >= 0)) return null;
  const background = nearest(pixel => {
    if (!opaqueRemoved(pixel)) return false;
    const x = pixel % width, y = Math.floor(pixel / width), offset = pixel * 4;
    // Exclude mixed pixels just outside a hard mask and textured background
    // samples. Without a reliable local background, leave the edge alone.
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const other = pixel + dy * width + dx;
        if (!opaqueRemoved(other)) return false;
        for (let channel = 0; channel < 3; channel += 1) {
          if (Math.abs(source[offset + channel] - source[other * 4 + channel]) > 6) return false;
        }
      }
    }
    return true;
  }).owner;

  const candidates = new Uint8Array(count);
  const coverage = new Float32Array(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (outside[pixel] > 4 || source[pixel * 4 + 3] !== 255 || foreground[pixel] < 0 || background[pixel] < 0) continue;
    if (!mask[pixel]) {
      if (!recoverOutside) continue;
      let touchesForeground = false;
      neighbors(pixel, next => { if (mask[next]) touchesForeground = true; });
      if (!touchesForeground) continue;
    }
    const offset = pixel * 4, bg = background[pixel] * 4;
    const fit = sample => {
      if (sample < 0) return null;
      const fg = sample * 4;
      let dot = 0, length = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        const direction = source[fg + channel] - source[bg + channel];
        dot += (source[offset + channel] - source[bg + channel]) * direction;
        length += direction * direction;
      }
      if (length < 32 ** 2) return null;
      const alpha = Math.max(0, Math.min(1, dot / length));
      let residual = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        residual = Math.max(residual, Math.abs(source[offset + channel]
          - (alpha * source[fg + channel] + (1 - alpha) * source[bg + channel])));
      }
      return { alpha, residual, limit: 6 + Math.sqrt(length) * 0.025, sample };
    };
    let estimate = fit(foreground[pixel]);
    if (!estimate || estimate.residual > estimate.limit) {
      // The nearest interior sample may land on a highlight or vein. Try a few
      // nearby anchors, without widening the band or borrowing distant colors.
      const x = pixel % width, y = Math.floor(pixel / width);
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-4, 0], [4, 0], [0, -4], [0, 4]]) {
        if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const sample = foreground[pixel + dy * width + dx];
        if (sample < 0 || Math.abs(sample % width - x) + Math.abs(Math.floor(sample / width) - y) > radius) continue;
        const alternative = fit(sample);
        if (alternative && (!estimate || alternative.residual < estimate.residual)) estimate = alternative;
      }
    }
    if (!estimate || estimate.residual > estimate.limit) continue;
    const alpha = estimate.alpha;
    if (alpha >= 0.98 || (!mask[pixel] && (alpha < 0.03 || alpha > 0.4))) continue;
    foreground[pixel] = estimate.sample;
    candidates[pixel] = 1;
    coverage[pixel] = alpha;
  }

  // Only follow mixed colors inward from the removed region. A solid outline or
  // an unrelated color stops cleanup, protecting enclosed highlights/interiors.
  let head = 0, tail = 0;
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (!opaqueRemoved(pixel)) continue;
    queue[tail++] = pixel;
    if (candidates[pixel]) candidates[pixel] = 2;
  }
  while (head < tail) {
    neighbors(queue[head++], next => {
      if (!mask[next] || candidates[next] !== 1) return;
      candidates[next] = 2;
      queue[tail++] = next;
    });
  }
  if (!candidates.includes(2)) return null;
  const alpha = mask.slice(), colors = source.slice();
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (candidates[pixel] !== 2) continue;
    const amount = coverage[pixel], offset = pixel * 4;
    alpha[pixel] = Math.min(mask[pixel] || 255, Math.round(amount * 255));
    if (!alpha[pixel]) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      colors[offset + channel] = amount < 0.15 ? source[foreground[pixel] * 4 + channel]
        : (source[offset + channel] - (1 - amount) * source[background[pixel] * 4 + channel]) / amount;
    }
  }
  return { alpha, colors };
}
