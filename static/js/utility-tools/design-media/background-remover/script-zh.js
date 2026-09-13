import { MaskEditor, imagePoint } from './mask-editor.js';
import { clamp, clampPan, zoomPanAt, brushCursorGeometry } from './viewport-geometry.js';

const $ = id => document.getElementById(id);
const originalCanvas = $('original-canvas');
const resultCanvas = $('result-canvas');
let source = null, filename = '', busy = false, loading = false, selection = 0;
let editor = null, mode = 'keep', pointer = null, keyboardPoint = null, cursorPoint = null;
let zoom = 1, pan = { x: 0, y: 0 }, pointerAction = null, panStart = null;
const MIN_ZOOM = 1, MAX_ZOOM = 32;
const EDIT_MODES = ['keep', 'erase', 'unmark', 'pan'];
const status = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };
const isSmartBrush = () => ['keep', 'erase'].includes(mode) && $('smart-enabled').checked;

function render() {
  const locked = busy || loading || pointer !== null;
  $('original-empty').hidden = $('result-empty').hidden = !!editor;
  $('editor-surface').hidden = resultCanvas.hidden = !editor;
  $('remove').disabled = locked || !source;
  $('download').disabled = locked || !editor || !(editor.hasAutomaticResult || editor.hasMarks);
  $('reset').disabled = locked || !editor;
  $('file-input').disabled = busy || pointer !== null;
  for (const id of EDIT_MODES) $(id).disabled = locked || !editor;
  const smartEnabled = isSmartBrush();
  const brushLocked = locked || !editor || mode === 'pan';
  $('smart-enabled').disabled = brushLocked || mode === 'unmark';
  $('smart-toggle').hidden = mode === 'unmark';
  $('brush-size').disabled = brushLocked || smartEnabled;
  $('smart-tolerance').disabled = brushLocked || !smartEnabled;
  $('smart-options').hidden = $('smart-help').hidden = !smartEnabled;
  $('brush-size-label').textContent = mode === 'unmark' ? '擦除直径' : '普通笔刷直径';
  $('edit-help').textContent = mode === 'unmark'
    ? '在左侧原图拖动，按笔刷直径擦除保留或移除标记，解除该区域的保护并恢复自动抠图结果（未自动抠图时恢复原图），随后可重新刷。'
    : '在左侧原图标记：绿色保留区始终受保护，普通移除、智能移除和自动抠图都会保留它。选择“擦除标记”可局部清除后重新刷。';
  $('undo').disabled = locked || !editor?.history.length;
  $('redo').disabled = locked || !editor?.future.length;
  $('clear-marks').disabled = locked || !editor?.hasMarks;
  $('remove').textContent = busy ? '正在处理，请稍候…' : editor?.hasAutomaticResult ? '✦ 重新自动抠图' : '✦ 开始移除背景';
  $('preview-caption').textContent = !editor ? '上传后在左侧原图标记' : editor.hasAutomaticResult ? '左侧标记 · 右侧实时显示自动抠图结果' : editor.hasMarks ? '左侧标记 · 右侧实时显示手动修正' : '可在左图标记，也可直接自动抠图';
  $('mode-label').textContent = mode === 'pan' ? '移动画面 · 拖动查看' : mode === 'unmark' ? '擦除标记 · 清除后重新刷' : smartEnabled ? (mode === 'keep' ? '智能保留 · 全图颜色匹配' : '智能移除 · 全图颜色匹配') : (mode === 'keep' ? '保留画笔 · 补回原图' : '移除画笔 · 擦除背景');
  for (const id of EDIT_MODES) { $(id).classList.toggle('selected', mode === id); $(id).setAttribute('aria-pressed', String(mode === id)); }
  $('editor-surface').classList.toggle('editing', !!editor && !busy && !loading);
  $('editor-surface').classList.toggle('panning', mode === 'pan' || pointerAction === 'pan');
  $('editor-surface').classList.toggle('dragging', pointerAction === 'pan');
  $('brush-cursor').classList.toggle('erasing', mode === 'erase');
  $('brush-cursor').classList.toggle('unmarking', mode === 'unmark');
  if (mode === 'pan' || pointerAction === 'pan') $('brush-cursor').hidden = true;
  $('marks-canvas').hidden = !$('show-marks').checked;
  $('editor-surface').setAttribute('aria-busy', String(busy));
  $('zoom-out').disabled = locked || !editor || zoom <= MIN_ZOOM;
  $('zoom-in').disabled = locked || !editor || zoom >= MAX_ZOOM;
  $('zoom-reset').disabled = locked || !editor || (zoom === 1 && pan.x === 0 && pan.y === 0);
  $('zoom-value').value = `${Math.round(zoom * 100)}%`;
  $('result-view-state').textContent = `同步视图 · ${Math.round(zoom * 100)}%`;
}

function surfaceSize() {
  return { width: parseFloat($('editor-surface').style.width) || 1, height: parseFloat($('editor-surface').style.height) || 1 };
}
function viewportSize() {
  return { width: Math.max(1, $('original-stage').clientWidth - 24), height: Math.max(1, $('original-stage').clientHeight - 24) };
}
function applyViewport() {
  if (!editor) return;
  const surface = surfaceSize();
  const editorSurface = $('editor-surface');
  pan = clampPan(pan, zoom, surface, viewportSize());
  // Both canvases have the same fitted dimensions and centered transform origin.
  // Applying one transform preserves the same image coordinates in both panels.
  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  editorSurface.style.transform = resultCanvas.style.transform = transform;
  const pixelX = surface.width / originalCanvas.width;
  const pixelY = surface.height / originalCanvas.height;
  editorSurface.style.setProperty('--pixel-x', `${pixelX}px`);
  editorSurface.style.setProperty('--pixel-y', `${pixelY}px`);
  editorSurface.style.setProperty('--grid-line', `${1 / zoom}px`);
  editorSurface.style.setProperty('--ui-scale', 1 / zoom);
  const showPixels = Math.min(pixelX, pixelY) * zoom >= 6;
  editorSurface.classList.toggle('pixel-grid', showPixels);
  resultCanvas.style.imageRendering = showPixels ? 'pixelated' : 'auto';
  updateCursor();
}
function setZoom(value, anchor = null) {
  if (!editor || busy || loading || pointer !== null) return;
  const nextZoom = clamp(value, MIN_ZOOM, MAX_ZOOM);
  if (nextZoom === zoom) return;
  if (anchor) pan = zoomPanAt(pan, zoom, nextZoom, anchor, originalCanvas.getBoundingClientRect(), surfaceSize());
  zoom = nextZoom;
  applyViewport();
  $('brush-cursor').hidden = true;
  render();
}
function resetViewport(update = true) {
  zoom = 1; pan = { x: 0, y: 0 };
  $('editor-surface').style.transform = resultCanvas.style.transform = '';
  $('editor-surface').classList.remove('pixel-grid');
  resultCanvas.style.imageRendering = 'auto';
  applyViewport();
  if (update) render();
}

function fitPreviews() {
  if (!editor) return;
  const stages = [$('original-stage'), $('stage')];
  const availableWidth = Math.min(...stages.map(stage => stage.clientWidth - 24));
  const availableHeight = Math.min(...stages.map(stage => stage.clientHeight - 24));
  const scale = Math.min(availableWidth / resultCanvas.width, availableHeight / resultCanvas.height, 1);
  for (const element of [$('editor-surface'), resultCanvas]) {
    element.style.width = `${Math.max(1, resultCanvas.width * scale)}px`;
    element.style.height = `${Math.max(1, resultCanvas.height * scale)}px`;
  }
  applyViewport();
}
new ResizeObserver(fitPreviews).observe($('stage'));
new ResizeObserver(fitPreviews).observe($('original-stage'));

async function selectFile(file) {
  if (busy || pointer !== null || !file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return status('请选择 JPG、PNG 或 WebP 格式的图片。', true);
  if (file.size > 20 * 1024 * 1024) return status('图片超过 20 MB，请压缩后重试。', true);
  const token = ++selection;
  loading = true; render(); status('正在读取图片…');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (token !== selection) return;
    const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (token !== selection) return;
    if (!blob) throw new Error('图片解码失败');
    originalCanvas.width = canvas.width; originalCanvas.height = canvas.height;
    originalCanvas.getContext('2d').drawImage(canvas, 0, 0);
    editor = new MaskEditor(originalCanvas, resultCanvas, $('marks-canvas'), () => document.createElement('canvas'));
    resetViewport(false);
    source = blob; filename = file.name.replace(/\.[^.]+$/, ''); keyboardPoint = cursorPoint = null;
    $('file-info').textContent = `${file.name} · ${canvas.width} × ${canvas.height}${ratio < 1 ? '（已缩小）' : ''}`;
    status('图片已就绪。可先标记区域，也可直接自动移除背景。');
  } catch { if (token === selection) status('无法读取这张图片，请换一张图片重试。', true); }
  finally { bitmap?.close(); if (token === selection) { loading = false; render(); fitPreviews(); } }
}
$('file-input').addEventListener('change', e => { selectFile(e.target.files[0]); e.target.value = ''; });
for (const event of ['dragenter', 'dragover']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); if (!busy) $('drop-zone').classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) $('drop-zone').addEventListener(event, e => { e.preventDefault(); $('drop-zone').classList.remove('dragging'); });
$('drop-zone').addEventListener('drop', e => selectFile(e.dataTransfer.files[0]));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

document.addEventListener('paste', e => {
  if (e.defaultPrevented || !e.clipboardData) return;
  // Read image files from the user's paste event; text and image URLs paste normally.
  let file = null;
  for (const item of Array.from(e.clipboardData.items || [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    file = item.getAsFile();
    if (file) break;
  }
  file ||= Array.from(e.clipboardData.files || []).find(item => item.type.startsWith('image/'));
  if (!file) return;
  e.preventDefault();
  if (busy || pointer !== null) return status('请完成当前图片处理或标记后，再粘贴图片。');
  if (!file.name) {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type] || 'img';
    file = new File([file], `剪贴板图片.${extension}`, { type: file.type });
  }
  selectFile(file);
});

$('remove').addEventListener('click', async () => {
  if (!source || busy || loading || pointer !== null) return;
  const token = ++selection;
  busy = true; render(); $('brush-cursor').hidden = true;
  $('progress').hidden = false; $('progress').removeAttribute('value');
  status('正在加载 AI 引擎，首次使用需要下载模型，请保持页面打开…');
  let bitmap;
  try {
    const { removeBackground } = await import('https://esm.sh/@imgly/background-removal@1.7.0');
    const result = await removeBackground(source, { device: 'cpu', model: 'isnet_quint8', output: { format: 'image/png', type: 'foreground' }, progress: (key, current, total) => {
      if (token !== selection) return;
      if (total > 0 && current < total) { $('progress').max = total; $('progress').value = current; status(`正在下载模型资源：${Math.round(current / total * 100)}%（首次使用较慢）`); }
      else { $('progress').removeAttribute('value'); status('正在准备模型并识别主体，请稍候…'); }
    } });
    bitmap = await createImageBitmap(result);
    if (token !== selection) return;
    editor.setAutomaticResult(bitmap);
    status('自动抠图完成，已应用手动标记。可以继续修补或下载。');
  } catch (error) {
    console.error('背景移除失败', error);
    if (token === selection) status('自动抠图失败，请检查网络后重试。也可以直接使用画笔手动移除背景。', true);
  } finally { bitmap?.close(); if (token === selection) { busy = false; $('progress').hidden = true; render(); } }
});

for (const id of EDIT_MODES) $(id).addEventListener('click', () => { mode = id; $('brush-cursor').hidden = true; render(); });
$('brush-size').addEventListener('input', () => { $('brush-value').value = `${$('brush-size').value} 像素`; updateCursor(); });
$('smart-enabled').addEventListener('change', () => { render(); updateCursor(); });
$('smart-tolerance').addEventListener('input', () => { $('tolerance-value').value = $('smart-tolerance').value; });
$('show-marks').addEventListener('change', render);
$('zoom-in').addEventListener('click', () => setZoom(zoom * 1.5));
$('zoom-out').addEventListener('click', () => setZoom(zoom / 1.5));
$('zoom-reset').addEventListener('click', () => resetViewport());
$('original-stage').addEventListener('wheel', e => {
  if (!editor || busy || loading || pointer !== null) return;
  e.preventDefault();
  setZoom(zoom * Math.exp(-e.deltaY * 0.0015), { x: e.clientX, y: e.clientY });
}, { passive: false });

function positionCursor(point) {
  cursorPoint = { ...point };
  const cursor = $('brush-cursor');
  cursor.hidden = busy || loading || !editor || mode === 'pan';
  updateCursor();
}
function updateCursor() {
  if (!editor || !cursorPoint) return;
  const cursor = $('brush-cursor');
  const smartEnabled = isSmartBrush();
  const geometry = brushCursorGeometry(cursorPoint, smartEnabled ? 1 : Number($('brush-size').value), surfaceSize(), originalCanvas);
  // Smart mode has a sampling marker; manual brushes show their actual image-pixel footprint.
  const width = smartEnabled ? 14 / zoom : geometry.width;
  const height = smartEnabled ? 14 / zoom : geometry.height;
  cursor.classList.toggle('single-pixel', !smartEnabled && geometry.singlePixel);
  cursor.classList.toggle('smart', smartEnabled);
  cursor.style.left = `${geometry.x}px`; cursor.style.top = `${geometry.y}px`;
  cursor.style.width = `${width}px`; cursor.style.height = `${height}px`;
  // Inset-only outlines never enlarge the footprint, including sub-screen-pixel sizes.
  cursor.style.setProperty('--cursor-line', `${Math.min(1 / zoom, width / 4, height / 4)}px`);
}
function pointFromEvent(e) {
  const rect = originalCanvas.getBoundingClientRect();
  const point = imagePoint(e.clientX, e.clientY, rect, originalCanvas.width, originalCanvas.height);
  positionCursor(point);
  return point;
}
function brushRadius() { return Math.max(0.5, Number($('brush-size').value) / 2); }
function smartSettings() { return { enabled: isSmartBrush(), tolerance: Number($('smart-tolerance').value) }; }
originalCanvas.addEventListener('pointerdown', e => {
  if (!editor || busy || loading || pointer !== null || ![0, 1].includes(e.button)) return;
  e.preventDefault(); originalCanvas.focus({ preventScroll: true });
  pointer = e.pointerId; originalCanvas.setPointerCapture(pointer);
  pointerAction = mode === 'pan' || e.button === 1 ? 'pan' : 'brush';
  if (pointerAction === 'pan') panStart = { clientX: e.clientX, clientY: e.clientY, x: pan.x, y: pan.y };
  else editor.beginStroke(mode, brushRadius(), pointFromEvent(e), smartSettings());
  render();
});
originalCanvas.addEventListener('pointermove', e => {
  if (!editor || busy || loading || (pointer !== null && e.pointerId !== pointer)) return;
  if (pointer === e.pointerId && pointerAction === 'pan') {
    pan = { x: panStart.x + e.clientX - panStart.clientX, y: panStart.y + e.clientY - panStart.clientY };
    applyViewport();
  } else {
    const point = pointFromEvent(e);
    if (pointer === e.pointerId) editor.extendStroke(point);
  }
});
function finishStroke(e, cancel = false) {
  if (pointer !== e.pointerId) return;
  const showCursor = pointerAction === 'brush' && !cancel && e.pointerType !== 'touch' && originalCanvas.matches(':hover');
  if (pointerAction === 'brush') {
    if (cancel) editor.cancelStroke();
    else { editor.extendStroke(pointFromEvent(e)); editor.endStroke(); }
  }
  const id = pointer; pointer = null;
  pointerAction = null; panStart = null;
  if (originalCanvas.hasPointerCapture(id)) originalCanvas.releasePointerCapture(id);
  $('brush-cursor').hidden = !showCursor;
  render();
}
originalCanvas.addEventListener('pointerup', e => finishStroke(e));
originalCanvas.addEventListener('pointercancel', e => finishStroke(e, true));
originalCanvas.addEventListener('lostpointercapture', e => finishStroke(e, true));
originalCanvas.addEventListener('pointerleave', () => { if (pointer === null) $('brush-cursor').hidden = true; });
originalCanvas.addEventListener('blur', () => { $('brush-cursor').hidden = true; });

function editAction(action) {
  if (!editor || busy || loading || pointer !== null) return;
  editor[action](); render();
}
$('undo').addEventListener('click', () => editAction('undo'));
$('redo').addEventListener('click', () => editAction('redo'));
$('clear-marks').addEventListener('click', () => editAction('clearMarks'));
document.addEventListener('keydown', e => {
  if (!editor || busy || loading || pointer !== null || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
    e.preventDefault(); editAction(e.key.toLowerCase() === 'y' || e.shiftKey ? 'redo' : 'undo');
  }
});
originalCanvas.addEventListener('keydown', e => {
  if (!editor || busy || loading || pointer !== null || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) return;
  e.preventDefault();
  if (mode === 'pan') {
    const distance = e.shiftKey ? 80 : 24;
    const delta = { ArrowLeft: [distance, 0], ArrowRight: [-distance, 0], ArrowUp: [0, distance], ArrowDown: [0, -distance] }[e.key];
    if (delta) { pan.x += delta[0]; pan.y += delta[1]; applyViewport(); render(); }
    return;
  }
  keyboardPoint ??= { x: Math.floor(resultCanvas.width / 2) + 0.5, y: Math.floor(resultCanvas.height / 2) + 0.5 };
  const step = e.shiftKey ? 10 : 1;
  const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (delta) {
    keyboardPoint.x = Math.max(0.5, Math.min(resultCanvas.width - 0.5, keyboardPoint.x + delta[0]));
    keyboardPoint.y = Math.max(0.5, Math.min(resultCanvas.height - 0.5, keyboardPoint.y + delta[1]));
  } else { editor.beginStroke(mode, brushRadius(), { ...keyboardPoint }, smartSettings()); editor.endStroke(); render(); }
  positionCursor(keyboardPoint);
});

document.querySelectorAll('[data-bg]').forEach(button => button.addEventListener('click', () => {
  const transparent = button.dataset.bg === 'transparent';
  $('stage').classList.toggle('checker', transparent); $('stage').style.backgroundColor = transparent ? '' : button.dataset.bg;
  document.querySelectorAll('[data-bg]').forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
}));
$('download').addEventListener('click', async () => {
  if ($('download').disabled) return;
  const downloadName = `${filename}-去背景.png`;
  try {
    const blob = await new Promise(resolve => resultCanvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG 编码失败');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = downloadName;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch { status('图片导出失败，请重试。', true); }
});
$('reset').addEventListener('click', () => {
  if (busy || loading || pointer !== null) return;
  ++selection; editor = null; source = null; keyboardPoint = cursorPoint = null; pointerAction = null; panStart = null;
  resetViewport(false);
  for (const id of ['original-canvas', 'result-canvas', 'marks-canvas']) { $(id).width = 1; $(id).height = 1; }
  $('brush-cursor').hidden = true;
  $('file-info').textContent = '支持人物、商品、动物等主体清晰的图片';
  status('选择图片，或按 Ctrl+V（Mac：⌘V）粘贴图片。'); render();
});
render();
