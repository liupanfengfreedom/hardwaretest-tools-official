import { MaskEditor, imagePoint } from './mask-editor.js';
import { clamp, clampPan, zoomPanAt } from './viewport-geometry.js';

const $ = id => document.getElementById(id);
const originalCanvas = $('original-canvas');
const resultCanvas = $('result-canvas');
let source = null, filename = '', busy = false, loading = false, selection = 0;
let editor = null, mode = 'keep', pointer = null, keyboardPoint = null;
let zoom = 1, pan = { x: 0, y: 0 }, pointerAction = null, panStart = null;
const MIN_ZOOM = 1, MAX_ZOOM = 8;
const status = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };

function render() {
  const locked = busy || loading || pointer !== null;
  $('original-empty').hidden = $('result-empty').hidden = !!editor;
  $('editor-surface').hidden = resultCanvas.hidden = !editor;
  $('remove').disabled = locked || !source;
  $('download').disabled = locked || !editor || !(editor.hasAutomaticResult || editor.hasMarks);
  $('reset').disabled = locked || !editor;
  $('file-input').disabled = busy || pointer !== null;
  for (const id of ['keep', 'erase', 'pan', 'brush-size']) $(id).disabled = locked || !editor;
  $('undo').disabled = locked || !editor?.history.length;
  $('redo').disabled = locked || !editor?.future.length;
  $('clear-marks').disabled = locked || !editor?.hasMarks;
  $('remove').textContent = busy ? '正在处理，请稍候…' : editor?.hasAutomaticResult ? '✦ 重新自动抠图' : '✦ 开始移除背景';
  $('preview-caption').textContent = !editor ? '上传后在左侧原图标记' : editor.hasAutomaticResult ? '左侧标记 · 右侧实时显示自动抠图结果' : editor.hasMarks ? '左侧标记 · 右侧实时显示手动修正' : '可在左图标记，也可直接自动抠图';
  $('mode-label').textContent = mode === 'keep' ? '保留画笔 · 补回原图' : mode === 'erase' ? '移除画笔 · 擦除背景' : '移动画面 · 拖动查看';
  for (const id of ['keep', 'erase', 'pan']) { $(id).classList.toggle('selected', mode === id); $(id).setAttribute('aria-pressed', String(mode === id)); }
  $('editor-surface').classList.toggle('editing', !!editor && !busy && !loading);
  $('editor-surface').classList.toggle('panning', mode === 'pan' || pointerAction === 'pan');
  $('editor-surface').classList.toggle('dragging', pointerAction === 'pan');
  $('brush-cursor').classList.toggle('erasing', mode === 'erase');
  if (mode === 'pan' || pointerAction === 'pan') $('brush-cursor').hidden = true;
  $('marks-canvas').hidden = !$('show-marks').checked;
  $('editor-surface').setAttribute('aria-busy', String(busy));
  $('zoom-out').disabled = locked || !editor || zoom <= MIN_ZOOM;
  $('zoom-in').disabled = locked || !editor || zoom >= MAX_ZOOM;
  $('zoom-reset').disabled = locked || !editor || (zoom === 1 && pan.x === 0 && pan.y === 0);
  $('zoom-value').value = `${Math.round(zoom * 100)}%`;
}

function surfaceSize() {
  return { width: parseFloat($('editor-surface').style.width) || 1, height: parseFloat($('editor-surface').style.height) || 1 };
}
function viewportSize() {
  return { width: Math.max(1, $('original-stage').clientWidth - 24), height: Math.max(1, $('original-stage').clientHeight - 24) };
}
function applyViewport() {
  if (!editor) return;
  pan = clampPan(pan, zoom, surfaceSize(), viewportSize());
  $('editor-surface').style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
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
  $('editor-surface').style.transform = '';
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
    source = blob; filename = file.name.replace(/\.[^.]+$/, ''); keyboardPoint = null;
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

for (const id of ['keep', 'erase', 'pan']) $(id).addEventListener('click', () => { mode = id; $('brush-cursor').hidden = true; render(); });
$('brush-size').addEventListener('input', () => { $('brush-value').value = `${$('brush-size').value} px`; $('brush-cursor').style.width = $('brush-cursor').style.height = `${Number($('brush-size').value) / zoom}px`; });
$('show-marks').addEventListener('change', render);
$('zoom-in').addEventListener('click', () => setZoom(zoom * 1.25));
$('zoom-out').addEventListener('click', () => setZoom(zoom / 1.25));
$('zoom-reset').addEventListener('click', () => resetViewport());
$('original-stage').addEventListener('wheel', e => {
  if (!editor || busy || loading || pointer !== null) return;
  e.preventDefault();
  setZoom(zoom * Math.exp(-e.deltaY * 0.0015), { x: e.clientX, y: e.clientY });
}, { passive: false });

function positionCursor(x, y) {
  const cursor = $('brush-cursor');
  cursor.hidden = busy || loading || !editor || mode === 'pan';
  cursor.style.left = `${x}px`; cursor.style.top = `${y}px`;
  cursor.style.width = cursor.style.height = `${Number($('brush-size').value) / zoom}px`;
}
function pointFromEvent(e) {
  const rect = originalCanvas.getBoundingClientRect();
  positionCursor((e.clientX - rect.left) / zoom, (e.clientY - rect.top) / zoom);
  return imagePoint(e.clientX, e.clientY, rect, originalCanvas.width, originalCanvas.height);
}
function brushRadius() { return Number($('brush-size').value) * originalCanvas.width / originalCanvas.getBoundingClientRect().width / 2; }
originalCanvas.addEventListener('pointerdown', e => {
  if (!editor || busy || loading || pointer !== null || ![0, 1].includes(e.button)) return;
  e.preventDefault(); originalCanvas.focus({ preventScroll: true });
  pointer = e.pointerId; originalCanvas.setPointerCapture(pointer);
  pointerAction = mode === 'pan' || e.button === 1 ? 'pan' : 'brush';
  if (pointerAction === 'pan') panStart = { clientX: e.clientX, clientY: e.clientY, x: pan.x, y: pan.y };
  else editor.beginStroke(mode, brushRadius(), pointFromEvent(e));
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
  if (pointerAction === 'brush') {
    if (cancel) editor.cancelStroke();
    else { editor.extendStroke(pointFromEvent(e)); editor.endStroke(); }
  }
  const id = pointer; pointer = null;
  pointerAction = null; panStart = null;
  if (originalCanvas.hasPointerCapture(id)) originalCanvas.releasePointerCapture(id);
  $('brush-cursor').hidden = true;
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
  keyboardPoint ??= { x: resultCanvas.width / 2, y: resultCanvas.height / 2 };
  const step = brushRadius() * (e.shiftKey ? 1 : 0.3);
  const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (delta) {
    keyboardPoint.x = Math.max(0, Math.min(resultCanvas.width, keyboardPoint.x + delta[0]));
    keyboardPoint.y = Math.max(0, Math.min(resultCanvas.height, keyboardPoint.y + delta[1]));
  } else { editor.beginStroke(mode, brushRadius(), { ...keyboardPoint }); editor.endStroke(); render(); }
  const rect = originalCanvas.getBoundingClientRect();
  positionCursor(keyboardPoint.x * surfaceSize().width / originalCanvas.width, keyboardPoint.y * surfaceSize().height / originalCanvas.height);
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
  ++selection; editor = null; source = null; keyboardPoint = null; pointerAction = null; panStart = null;
  resetViewport(false);
  for (const id of ['original-canvas', 'result-canvas', 'marks-canvas']) { $(id).width = 1; $(id).height = 1; }
  $('brush-cursor').hidden = true;
  $('file-info').textContent = '支持人物、商品、动物等主体清晰的图片';
  status('选择一张图片，即可开始。'); render();
});
render();
