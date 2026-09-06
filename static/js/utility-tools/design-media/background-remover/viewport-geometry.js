export const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

// Local CSS geometry; the editor surface applies zoom to both the image and cursor.
export function brushCursorGeometry(point, diameter, surface, image) {
  const singlePixel = diameter === 1;
  const x = singlePixel ? Math.floor(point.x) + 0.5 : point.x;
  const y = singlePixel ? Math.floor(point.y) + 0.5 : point.y;
  const scaleX = surface.width / image.width;
  const scaleY = surface.height / image.height;
  return { x: x * scaleX, y: y * scaleY, width: diameter * scaleX, height: diameter * scaleY, singlePixel };
}

export function clampPan(pan, zoom, surface, viewport) {
  const limitX = Math.max(0, (surface.width * zoom - viewport.width) / 2);
  const limitY = Math.max(0, (surface.height * zoom - viewport.height) / 2);
  return {
    x: clamp(pan.x, -limitX, limitX),
    y: clamp(pan.y, -limitY, limitY)
  };
}

// Keep the image point under the pointer fixed while scaling around its center.
export function zoomPanAt(pan, currentZoom, nextZoom, anchor, currentRect, surface) {
  const u = currentRect.width ? (anchor.x - currentRect.left) / currentRect.width : 0.5;
  const v = currentRect.height ? (anchor.y - currentRect.top) / currentRect.height : 0.5;
  const baseCenterX = currentRect.left + currentRect.width / 2 - pan.x;
  const baseCenterY = currentRect.top + currentRect.height / 2 - pan.y;
  return {
    x: anchor.x - baseCenterX - (u - 0.5) * surface.width * nextZoom,
    y: anchor.y - baseCenterY - (v - 0.5) * surface.height * nextZoom
  };
}
