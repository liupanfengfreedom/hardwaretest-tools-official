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
    this.hasAutomaticResult = false;
    this.base.getContext('2d').fillRect(0, 0, source.width, source.height);
    this.rebuild();
  }

  get hasMarks() {
    const lastClear = this.history.findLastIndex(action => action.kind === 'clear');
    return this.history.slice(lastClear + 1).some(action => action.kind === 'stroke');
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

  beginStroke(mode, radius, point) {
    if (this.active) return;
    this.active = { kind: 'stroke', mode, radius, points: [point] };
    this.paintSegment(this.active, point, point);
    this.render();
  }
  extendStroke(point) {
    if (!this.active) return;
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
    const paint = (ctx, color, operation) => {
      ctx.save();
      ctx.globalCompositeOperation = operation;
      ctx.strokeStyle = ctx.fillStyle = color;
      ctx.lineWidth = stroke.radius * 2;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.beginPath();
      if (from.x === to.x && from.y === to.y) {
        ctx.arc(to.x, to.y, stroke.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.restore();
    };
    paint(this.mask.getContext('2d'), '#000', stroke.mode === 'keep' ? 'source-over' : 'destination-out');
    paint(this.marks.getContext('2d'), stroke.mode === 'keep' ? '#10b981' : '#f04452', 'source-over');
  }

  resetLayers() {
    const ctx = this.mask.getContext('2d');
    ctx.clearRect(0, 0, this.mask.width, this.mask.height);
    ctx.drawImage(this.base, 0, 0);
    this.marks.getContext('2d').clearRect(0, 0, this.marks.width, this.marks.height);
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
