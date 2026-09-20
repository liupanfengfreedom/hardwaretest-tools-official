const difference = (a, b) => Math.max(...a.map((value, channel) => Math.abs(value - b[channel])));

// Only extrapolate a backdrop when all four margins support the same spatial
// rule. A palette alone is not evidence: a subject can contain the same colors.
export function detectRegularBackground(source, width, height) {
  if (width < 12 || height < 12 || source.length !== width * height * 4) return null;
  const edges = [[], [], [], []];
  for (let x = 0; x < width; x++) { edges[0].push(x); edges[1].push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { edges[2].push(y * width); edges[3].push(y * width + width - 1); }
  const perimeter = edges.flat();
  const solid = [0, 1, 2].map(channel => {
    const values = perimeter.map(pixel => source[pixel * 4 + channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
  const fallback = perimeter.every(pixel => source[pixel * 4 + 3] === 255)
    && edges.every(edge => edge.filter(pixel => solid.every((value, channel) => Math.abs(source[pixel * 4 + channel] - value) <= 12)).length >= edge.length * 0.98)
    ? { kind: 'solid', palette: [solid], colorAt: () => solid } : null;
  const palette = [], samples = [];
  for (const pixel of perimeter) {
    if (source[pixel * 4 + 3] !== 255) return null;
    const color = Array.from(source.subarray(pixel * 4, pixel * 4 + 3));
    let index = palette.findIndex(candidate => difference(candidate, color) <= 4);
    if (index < 0) {
      if (palette.length === 4) return fallback;
      index = palette.length; palette.push(color); samples.push([[], [], []]);
    }
    color.forEach((value, channel) => samples[index][channel].push(value));
  }
  samples.forEach((channels, index) => {
    palette[index] = channels.map(values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]);
  });
  const tolerance = Math.min(8, ...palette.flatMap((color, index) => palette.slice(index + 1).map(other => Math.floor(difference(color, other) / 3))));
  const label = pixel => palette.findIndex(color => difference(color, Array.from(source.subarray(pixel * 4, pixel * 4 + 3))) <= tolerance);
  const rows = edges.map(edge => edge.map(label));
  if (rows.some(row => row.includes(-1))) return fallback;
  if (palette.length === 1) return { kind: 'solid', palette, colorAt: () => palette[0] };

  function repeatingBlocks(row) {
    const runs = [];
    for (const value of row) {
      if (runs.at(-1)?.value === value) runs.at(-1).length++;
      else runs.push({ value, length: 1 });
    }
    if (runs.length === 1) return { constant: true };
    // Require several repeated, equal-width blocks, not a single two-tone frame.
    if (runs.length < 5) return null;
    const size = runs[1].length;
    if (size < 2 || runs[0].length > size || runs.at(-1).length > size
      || runs.slice(1, -1).some(run => run.length !== size)) return null;
    const period = size * palette.length;
    if (row.length < period * 2 || row.some((value, x) => x >= period && value !== row[x - period])) return null;
    return { constant: false, size };
  }
  const horizontal = repeatingBlocks(rows[0]), vertical = repeatingBlocks(rows[2]);
  if (!horizontal || !vertical || (horizontal.constant && vertical.constant)) return fallback;
  // Palette order follows the first row (or first column for horizontal stripes).
  // This supports offset rectangular checkerboards and two-to-four-color stripes
  // / cyclic tile grids, but deliberately rejects unknown decorative patterns.
  const start = rows[0][0], n = palette.length;
  const expected = (x, y) => (rows[0][x] + rows[2][y] - start + n) % n;
  const model = { kind: horizontal.constant || vertical.constant ? 'stripes' : 'checker', palette, tolerance,
    colorAt: pixel => palette[expected(pixel % width, Math.floor(pixel / width))] };
  const matches = pixel => source[pixel * 4 + 3] === 255
    && difference(model.colorAt(pixel), Array.from(source.subarray(pixel * 4, pixel * 4 + 3))) <= tolerance;
  if (edges.some(edge => edge.filter(matches).length < edge.length * 0.98)) return fallback;
  // Validate a belt, not just a one-pixel decorative border around a photograph.
  const belt = Math.max(2, Math.min(16, Math.floor(Math.min(width, height) * 0.06)));
  let matched = 0, checked = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x >= belt && x < width - belt && y >= belt && y < height - belt) continue;
    checked++; if (matches(y * width + x)) matched++;
  }
  return matched >= checked * 0.98 ? model : fallback;
}
