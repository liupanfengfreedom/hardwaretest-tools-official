function uniformBackground(source, width, height, mask) {
  const sides = [[], [], [], []];
  for (let x = 0; x < width; x += 1) { sides[0].push(x); sides[1].push((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { sides[2].push(y * width); sides[3].push(y * width + width - 1); }
  const samples = sides.flat().filter(pixel => !mask[pixel] && source[pixel * 4 + 3] === 255);
  if (samples.length < 8) return null;
  const color = [0, 1, 2].map(channel => {
    const values = samples.map(pixel => source[pixel * 4 + channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  return sides.every(side => side.filter(pixel => !mask[pixel] && source[pixel * 4 + 3] === 255
    && color.every((value, channel) => Math.abs(source[pixel * 4 + channel] - value) <= 12)).length >= side.length * 0.98) ? color : null;
}

// A flattened edge contains C = aF + (1 - a)B. Keeping C after removing B
// leaves a dark/light/color fringe. Estimate a and F only in a narrow edge band,
// using nearby, reliable background and opaque foreground samples.
export function refineAutomaticEdges(source, width, height, mask, { recoverOutside = false } = {}) {
  const count = width * height;
  if (source.length !== count * 4 || mask.length !== count) throw new Error('Invalid image dimensions');
  const solid = recoverOutside ? uniformBackground(source, width, height, mask) : null;
  const radius = solid ? 24 : 8;
  const band = solid ? 12 : 4;
  const queue = new Int32Array(count);
  const neighbors = (pixel, visit) => {
    const x = pixel % width;
    if (x > 0) visit(pixel - 1);
    if (x + 1 < width) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel + width < count) visit(pixel + width);
  };
  function nearest(seed, withOwner = true, withinForeground = false) {
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
      if (distance[pixel] >= radius || (withinForeground && !mask[pixel])) continue;
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
  const foregroundSeeds = pixel => mask[pixel] >= 250 && source[pixel * 4 + 3] === 255
    && outside[pixel] > band && outside[pixel] <= radius;
  const fallback = solid ? nearest(foregroundSeeds, true, true).owner : null;
  const foreground = nearest(pixel => {
    if (mask[pixel] < 250 || source[pixel * 4 + 3] !== 255 || outside[pixel] < 4 || outside[pixel] > radius) return false;
    if (!solid) return true;
    // An arbitrary four-pixel inset can still be inside a wide blurred edge.
    // Look for a locally stable foreground color instead of treating it as opaque.
    const x = pixel % width, y = Math.floor(pixel / width), offset = pixel * 4;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      const other = pixel + dy * width + dx;
      if (mask[other] < 250 || source[other * 4 + 3] !== 255) return false;
      for (let channel = 0; channel < 3; channel += 1) {
        if (Math.abs(source[offset + channel] - source[other * 4 + channel]) > 8) return false;
      }
    }
    return true;
  }, true, solid !== null).owner;
  if (fallback) for (let pixel = 0; pixel < count; pixel += 1) {
    if (foreground[pixel] < 0) foreground[pixel] = fallback[pixel];
  }
  if (solid && mask.some((value, pixel) => value && outside[pixel] <= band && foreground[pixel] < 0)) {
    // Small, textured tips may have neither a flat patch nor a deep interior.
    // Only fall back to a shallow sample where both safer anchors are absent;
    // otherwise a mixed pixel can select itself and leave a wide halo intact.
    const shallow = nearest(pixel => mask[pixel] >= 250 && source[pixel * 4 + 3] === 255
      && outside[pixel] >= 4 && outside[pixel] <= radius, true, true).owner;
    for (let pixel = 0; pixel < count; pixel += 1) {
      if (foreground[pixel] < 0) foreground[pixel] = shallow[pixel];
    }
  }
  if (!foreground.some(pixel => pixel >= 0)) return null;
  // A verified flat backdrop also supplies B inside narrow gaps, where no 3x3
  // block of background exists. Textured photos still require a local sample.
  const background = solid ? null : nearest(pixel => {
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
    if (outside[pixel] > band || source[pixel * 4 + 3] !== 255 || foreground[pixel] < 0 || (!solid && background[pixel] < 0)) continue;
    if (!mask[pixel]) {
      if (!recoverOutside) continue;
      let touchesForeground = false;
      neighbors(pixel, next => { if (mask[next]) touchesForeground = true; });
      if (!touchesForeground) continue;
    }
    const offset = pixel * 4;
    const backgroundColor = solid || source.subarray(background[pixel] * 4, background[pixel] * 4 + 3);
    const fit = sample => {
      if (sample < 0) return null;
      if (solid) {
        // Never borrow a foreground color across a removed gap, even when the
        // object on its other side offers a closer or better-fitting sample.
        const x = pixel % width, y = Math.floor(pixel / width);
        const dx = sample % width - x, dy = Math.floor(sample / width) - y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        for (let step = 1; step < steps; step += 1) {
          if (!mask[Math.round(y + dy * step / steps) * width + Math.round(x + dx * step / steps)]) return null;
        }
      }
      const fg = sample * 4;
      let dot = 0, length = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        const direction = source[fg + channel] - backgroundColor[channel];
        dot += (source[offset + channel] - backgroundColor[channel]) * direction;
        length += direction * direction;
      }
      if (length < 32 ** 2) return null;
      const alpha = Math.max(0, Math.min(1, dot / length));
      let residual = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        residual = Math.max(residual, Math.abs(source[offset + channel]
          - (alpha * source[fg + channel] + (1 - alpha) * backgroundColor[channel])));
      }
      return { alpha, residual, limit: 6 + Math.sqrt(length) * 0.025, sample };
    };
    let estimate = fit(foreground[pixel]);
    if (!estimate || estimate.residual > estimate.limit) {
      // The nearest interior sample may land on a highlight or vein. Try a few
      // nearby anchors, without widening the band or borrowing distant colors.
      const x = pixel % width, y = Math.floor(pixel / width);
      for (const [dx, dy] of [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2], [-4, 0], [4, 0], [0, -4], [0, 4]]) {
        if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        for (const field of solid ? [foreground, fallback] : [foreground]) {
          const sample = field[pixel + dy * width + dx];
          if (sample < 0 || Math.abs(sample % width - x) + Math.abs(Math.floor(sample / width) - y) > radius) continue;
          const alternative = fit(sample);
          if (alternative && (!estimate || alternative.residual < estimate.residual)) estimate = alternative;
        }
      }
    }
    if (!estimate || (!solid && estimate.residual > estimate.limit)) continue;
    // Reopening an already removed pixel requires a color-consistent fit. JPEG
    // ringing in the background must not be recovered by the contrast fallback.
    if (!mask[pixel] && estimate.residual > estimate.limit) continue;
    let alpha = estimate.alpha;
    if (solid && estimate.residual > estimate.limit) {
      // A highlight and the adjacent fill can mix at the same contour pixel.
      // One RGB line cannot explain that mixture. With a verified backdrop,
      // estimate coverage from contrast and unmix C itself, preserving its hue
      // instead of leaving a fully opaque, background-tinted speck behind.
      let observed = 0, interior = 0, minimum = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        const b = solid[channel], c = source[offset + channel];
        observed = Math.max(observed, Math.abs(c - b));
        interior = Math.max(interior, Math.abs(source[estimate.sample * 4 + channel] - b));
        const extent = c > b ? 255 - b : b;
        if (extent) minimum = Math.max(minimum, Math.abs(c - b) / extent);
      }
      alpha = Math.min(1, Math.max(minimum, observed / Math.max(1, interior)));
    }
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
        : (source[offset + channel] - (1 - amount) * (solid ? solid[channel] : source[background[pixel] * 4 + channel])) / amount;
    }
  }
  return { alpha, colors };
}
