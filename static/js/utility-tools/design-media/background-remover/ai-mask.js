// BiRefNet expects square RGB, ImageNet normalization, and NCHW layout.
export function normalizedModelInput(rgba, width, height) {
  const count = width * height;
  if (rgba.length !== count * 4) throw new Error('Invalid model input dimensions');
  const input = new Float32Array(count * 3);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let pixel = 0; pixel < count; pixel++) {
    const alpha = rgba[pixel * 4 + 3] / 255;
    for (let channel = 0; channel < 3; channel++) {
      // Composite transparent input over white; keep original alpha on export.
      const color = rgba[pixel * 4 + channel] / 255 * alpha + 1 - alpha;
      input[channel * count + pixel] = (color - mean[channel]) / std[channel];
    }
  }
  return input;
}

function halfFloat(bits) {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits >>> 10) & 31, fraction = bits & 1023;
  if (!exponent) return sign * fraction * 2 ** -24;
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}

export function modelAlpha(data, type, width, height) {
  if (data.length !== width * height) throw new Error('Invalid model output dimensions');
  const alpha = new Uint8ClampedArray(data.length);
  const encodedHalf = type === 'float16' && data instanceof Uint16Array;
  for (let pixel = 0; pixel < data.length; pixel++) {
    const logit = encodedHalf ? halfFloat(data[pixel]) : Number(data[pixel]);
    if (Number.isNaN(logit)) throw new Error('Invalid model output');
    // The graph returns logits, not alpha values. Preserve soft edges.
    alpha[pixel] = Math.round(255 / (1 + Math.exp(-logit)));
  }
  return alpha;
}

export function resizeModelAlpha(alpha, width, height, targetWidth, targetHeight, createCanvas = () => document.createElement('canvas')) {
  if (alpha.length !== width * height) throw new Error('Invalid mask dimensions');
  const small = createCanvas(); small.width = width; small.height = height;
  const context = small.getContext('2d');
  const pixels = context.createImageData(width, height);
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    pixels.data[pixel * 4] = pixels.data[pixel * 4 + 1] = pixels.data[pixel * 4 + 2] = 255;
    pixels.data[pixel * 4 + 3] = alpha[pixel];
  }
  context.putImageData(pixels, 0, 0);
  const full = createCanvas(); full.width = targetWidth; full.height = targetHeight;
  const fullContext = full.getContext('2d');
  fullContext.imageSmoothingEnabled = true;
  fullContext.drawImage(small, 0, 0, targetWidth, targetHeight);
  const resized = fullContext.getImageData(0, 0, targetWidth, targetHeight).data;
  return Uint8ClampedArray.from({ length: targetWidth * targetHeight }, (_, pixel) => resized[pixel * 4 + 3]);
}
