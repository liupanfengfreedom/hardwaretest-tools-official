// Local, four-connected color selection. All measurements use working-image pixels.
export function growSimilarRegion(source, imageWidth, imageHeight, from, to, reference, radius, tolerance) {
  const ax = Math.floor(from.x), ay = Math.floor(from.y);
  const bx = Math.floor(to.x), by = Math.floor(to.y);
  const left = Math.max(0, Math.min(ax, bx) - radius);
  const top = Math.max(0, Math.min(ay, by) - radius);
  const right = Math.min(imageWidth - 1, Math.max(ax, bx) + radius);
  const bottom = Math.min(imageHeight - 1, Math.max(ay, by) + radius);
  if (left > right || top > bottom || !reference[3]) return null;
  const width = right - left + 1, height = bottom - top + 1;
  const selected = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const threshold = tolerance * 255 / 100;
  const vx = bx - ax, vy = by - ay, lengthSquared = vx * vx + vy * vy;
  let head = 0, tail = 0;

  const enqueue = (x, y) => {
    if (x < left || x > right || y < top || y > bottom) return;
    const index = (y - top) * width + x - left;
    if (visited[index]) return;
    visited[index] = 1;
    const projection = lengthSquared ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / lengthSquared)) : 0;
    if ((x - ax - projection * vx) ** 2 + (y - ay - projection * vy) ** 2 > radius * radius) return;
    const offset = (y * imageWidth + x) * 4;
    // Transparent gaps are barriers; compare with the original seed, never the last neighbor.
    if (source[offset + 3] === 0) return;
    for (let channel = 0; channel < 4; channel += 1) {
      if (Math.abs(source[offset + channel] - reference[channel]) > threshold) return;
    }
    selected[index] = 1;
    queue[tail++] = index;
  };

  // Clip the seed segment before rasterization, so dragging far outside the image is bounded.
  let start = 0, end = 1;
  let crossesImage = true;
  for (const [direction, distance] of [[-vx, ax], [vx, imageWidth - 1 - ax], [-vy, ay], [vy, imageHeight - 1 - ay]]) {
    if (!direction) { if (distance < 0) crossesImage = false; continue; }
    const t = distance / direction;
    if (direction < 0) start = Math.max(start, t); else end = Math.min(end, t);
  }
  if (crossesImage && start <= end) {
    let x = Math.round(ax + start * vx), y = Math.round(ay + start * vy);
    const targetX = Math.round(ax + end * vx), targetY = Math.round(ay + end * vy);
    const dx = Math.abs(targetX - x), dy = -Math.abs(targetY - y);
    const sx = x < targetX ? 1 : -1, sy = y < targetY ? 1 : -1;
    let error = dx + dy;
    while (true) {
      enqueue(x, y);
      if (x === targetX && y === targetY) break;
      const doubled = error * 2;
      if (doubled >= dy) { error += dy; x += sx; }
      if (doubled <= dx) { error += dx; y += sy; }
    }
  }
  while (head < tail) {
    const index = queue[head++];
    const x = left + index % width, y = top + Math.floor(index / width);
    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
  }
  return { left, top, width, height, selected, count: tail };
}
