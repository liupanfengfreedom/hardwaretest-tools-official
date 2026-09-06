// Match the original reference color across the whole working image, including disconnected areas.
export function selectSimilarPixels(source, width, height, reference, tolerance) {
  if (!reference[3]) return null;
  const selected = new Uint8Array(width * height);
  const threshold = tolerance * 255 / 100;
  let count = 0;
  for (let pixel = 0; pixel < selected.length; pixel += 1) {
    const offset = pixel * 4;
    if (source[offset + 3] === 0) continue;
    let matches = true;
    for (let channel = 0; channel < 4; channel += 1) {
      if (Math.abs(source[offset + channel] - reference[channel]) > threshold) {
        matches = false;
        break;
      }
    }
    if (matches) { selected[pixel] = 1; count += 1; }
  }
  return { left: 0, top: 0, width, height, selected, count };
}
