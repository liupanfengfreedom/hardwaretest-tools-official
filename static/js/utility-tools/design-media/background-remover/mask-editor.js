import { selectSimilarPixels } from './smart-region.js';

// Source pixels are immutable. Preview guides are never drawn into the output.
export function imagePoint(clientX, clientY, rect, width, height) {
  return { x: (clientX - rect.left) * width / rect.width, y: (clientY - rect.top) * height / rect.height };
}

export class MaskEditor {
  constructor(source, result, marks, createCanvas) {
    this.source = source;
    this.result = result;
    this.marks = marks;
    this.base = createCanvas();
    this.mask = createCanvas();
    for (const canvas of [result, marks, this.base, this.mask]) {
      canvas.width = source.width;
      canvas.height = source.height;
    }
    this.history = [];
    this.future = [];
    this.active = null;
    // Keep marks protect image pixels independently of the visible overlay and AI mask.
    this.protectedPixels = new Uint8Array(source.width * source.height);
    this.markCount = 0;
    this.hasAutomaticResult = false;
    this.base.getContext('2d').fillRect(0, 0, source.width, source.height);
    this.rebuild();
  }

  get hasMarks() {
    return this.markCount > 0;
  }

  setAutomaticResult(image) {
    const ctx = this.base.getContext('2d');
    ctx.clearRect(0, 0, this.base.width, this.base.height);
    ctx.drawImage(image, 0, 0, this.base.width, this.base.height);
    const mask = ctx.getImageData(0, 0, this.base.width, this.base.height);
    const original = this.source.getContext('2d').getImageData(0, 0, this.source.width, this.source.height);
    // Foreground alpha already includes source alpha; avoid multiplying it twice.
    for (let i = 3; i < mask.data.length; i += 4) {
      mask.data[i] = original.data[i] ? Math.min(255, Math.round(mask.data[i] * 255 / original.data[i])) : 0;
    }
    ctx.putImageData(mask, 0, 0);
    this.hasAutomaticResult = true;
    this.rebuild();
  }

  beginStroke(mode, radius, point, smart = null) {
    if (this.active || !['keep', 'erase', 'unmark'].includes(mode)) return;
    let selection = null;
    if (smart?.enabled && mode !== 'unmark') {
      const x = Math.floor(point.x), y = Math.floor(point.y);
      if (x < 0 || y < 0 || x >= this.source.width || y >= this.source.height) return;
      this.sourcePixels ??= this.source.getContext('2d').getImageData(0, 0, this.source.width, this.source.height).data;
      const offset = (y * this.source.width + x) * 4;
      selection = {
        tolerance: Math.max(0, Math.min(100, Number(smart.tolerance) || 0)),
        reference: Array.from(this.sourcePixels.slice(offset, offset + 4))
      };
      if (!selection.reference[3]) return;
    }
    this.active = { kind: 'stroke', mode, radius, points: [point], smart: selection };
    this.paintSegment(this.active, point, point);
    this.render();
  }
  extendStroke(point) {
    // A smart gesture already matches the entire image using its initial sample.
    if (!this.active || this.active.smart) return;
    const previous = this.active.points.at(-1);
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.25) return;
    this.active.points.push(point);
    this.paintSegment(this.active, previous, point);
    this.render();
  }
  endStroke() {
    if (!this.active) return;
    this.history.push(this.active);
    this.future = [];
    this.active = null;
  }
  cancelStroke() { this.active = null; this.rebuild(); }

  paintSegment(stroke, from, to) {
    if (stroke.smart) {
      this.paintSmartSelection(stroke);
      return;
    }
    const singlePixel = stroke.radius <= 0.5;
    const margin = singlePixel ? 0 : stroke.radius;
    const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - margin));
    const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - margin));
    const right = Math.min(this.mask.width - 1, Math.ceil(Math.max(from.x, to.x) + margin));
    const bottom = Math.min(this.mask.height - 1, Math.ceil(Math.max(from.y, to.y) + margin));
    if (right < left || bottom < top) return;
    const width = right - left + 1, height = bottom - top + 1;
    const maskContext = this.mask.getContext('2d');
    const markContext = this.marks.getContext('2d');
    const maskPixels = maskContext.getImageData(left, top, width, height);
    const markPixels = markContext.getImageData(left, top, width, height);
    const basePixels = stroke.mode === 'unmark' ? this.base.getContext('2d').getImageData(left, top, width, height) : null;
    const color = stroke.mode === 'keep' ? [16, 185, 129] : [240, 68, 82];
    const setPixel = (x, y) => {
      if (x < 0 || y < 0 || x >= this.mask.width || y >= this.mask.height) return;
      const imagePixel = y * this.mask.width + x;
      const offset = ((y - top) * width + x - left) * 4;
      if (stroke.mode === 'unmark') {
        // Remove every manual decision at this pixel and restore the current AI baseline.
        this.protectedPixels[imagePixel] = 0;
        if (markPixels.data[offset + 3]) this.markCount -= 1;
        maskPixels.data[offset] = maskPixels.data[offset + 1] = maskPixels.data[offset + 2] = 0;
        maskPixels.data[offset + 3] = basePixels.data[offset + 3];
        markPixels.data.fill(0, offset, offset + 4);
        return;
      }
      if (stroke.mode === 'erase' && this.protectedPixels[imagePixel]) return;
      if (stroke.mode === 'keep') this.protectedPixels[imagePixel] = 1;
      if (!markPixels.data[offset + 3]) this.markCount += 1;
      maskPixels.data[offset] = maskPixels.data[offset + 1] = maskPixels.data[offset + 2] = 0;
      maskPixels.data[offset + 3] = stroke.mode === 'keep' ? 255 : 0;
      markPixels.data[offset] = color[0];
      markPixels.data[offset + 1] = color[1];
      markPixels.data[offset + 2] = color[2];
      markPixels.data[offset + 3] = 255;
    };

    if (singlePixel) {
      // A one-pixel brush follows an exact Bresenham path with no antialiasing.
      let x0 = Math.floor(from.x), y0 = Math.floor(from.y);
      const x1 = Math.floor(to.x), y1 = Math.floor(to.y);
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let error = dx + dy;
      while (true) {
        setPixel(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const doubled = error * 2;
        if (doubled >= dy) { error += dy; x0 += sx; }
        if (doubled <= dx) { error += dx; y0 += sy; }
      }
    } else {
      const radiusSquared = stroke.radius ** 2;
      const vx = to.x - from.x, vy = to.y - from.y;
      const lengthSquared = vx * vx + vy * vy;
      for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
          const px = x + 0.5, py = y + 0.5;
          const projection = lengthSquared ? Math.max(0, Math.min(1, ((px - from.x) * vx + (py - from.y) * vy) / lengthSquared)) : 0;
          const nearestX = from.x + projection * vx, nearestY = from.y + projection * vy;
          if ((px - nearestX) ** 2 + (py - nearestY) ** 2 <= radiusSquared) setPixel(x, y);
        }
      }
    }
    maskContext.putImageData(maskPixels, left, top);
    markContext.putImageData(markPixels, left, top);
  }

  paintSmartSelection(stroke) {
    const { tolerance, reference } = stroke.smart;
    const region = selectSimilarPixels(this.sourcePixels, this.source.width, this.source.height, reference, tolerance);
    if (!region?.count) return;
    const { left, top, width, height, selected } = region;
    const maskContext = this.mask.getContext('2d');
    const markContext = this.marks.getContext('2d');
    const maskPixels = maskContext.getImageData(left, top, width, height);
    const markPixels = markContext.getImageData(left, top, width, height);
    const color = stroke.mode === 'keep' ? [16, 185, 129] : [240, 68, 82];
    for (let pixel = 0; pixel < selected.length; pixel += 1) {
      if (!selected[pixel]) continue;
      const imagePixel = (top + Math.floor(pixel / width)) * this.mask.width + left + pixel % width;
      if (stroke.mode === 'erase' && this.protectedPixels[imagePixel]) continue;
      if (stroke.mode === 'keep') this.protectedPixels[imagePixel] = 1;
      const offset = pixel * 4;
      if (!markPixels.data[offset + 3]) this.markCount += 1;
      maskPixels.data[offset] = maskPixels.data[offset + 1] = maskPixels.data[offset + 2] = 0;
      maskPixels.data[offset + 3] = stroke.mode === 'keep' ? 255 : 0;
      markPixels.data[offset] = color[0];
      markPixels.data[offset + 1] = color[1];
      markPixels.data[offset + 2] = color[2];
      markPixels.data[offset + 3] = 255;
    }
    maskContext.putImageData(maskPixels, left, top);
    markContext.putImageData(markPixels, left, top);
  }

  resetLayers() {
    // Replaying history restores protection; undoing a keep or clearing marks releases it.
    this.protectedPixels.fill(0);
    this.markCount = 0;
    const ctx = this.mask.getContext('2d');
    ctx.clearRect(0, 0, this.mask.width, this.mask.height);
    ctx.drawImage(this.base, 0, 0);
    const marks = this.marks.getContext('2d');
    marks.clearRect(0, 0, this.marks.width, this.marks.height);
  }
  rebuild() {
    this.resetLayers();
    for (const action of this.history) {
      if (action.kind === 'clear') { this.resetLayers(); continue; }
      action.points.forEach((point, i) => this.paintSegment(action, action.points[Math.max(0, i - 1)], point));
    }
    this.render();
  }
  render() {
    const ctx = this.result.getContext('2d');
    ctx.clearRect(0, 0, this.result.width, this.result.height);
    ctx.drawImage(this.source, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.mask, 0, 0);
    ctx.restore();
  }
  undo() { if (this.history.length) { this.future.push(this.history.pop()); this.rebuild(); } }
  redo() { if (this.future.length) { this.history.push(this.future.pop()); this.rebuild(); } }
  clearMarks() {
    if (!this.hasMarks) return;
    this.history.push({ kind: 'clear' });
    this.future = [];
    this.rebuild();
  }
}
