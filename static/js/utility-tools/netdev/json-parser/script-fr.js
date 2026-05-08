let parsed = null;
let timer = null;

const SAMPLE = {"project":"JSON Parser","version":"1.0.0","active":true,"score":9.8,"tags":["parser","formatter","validator"],"author":{"name":"Claude","email":"hello@example.com","links":{"github":"https://github.com","docs":null}},"config":{"indent":2,"theme":"dark","features":{"search":true,"collapse":true,"stats":true}},"nums":[1,2,3,4,5]};

function loadSample() {
  document.getElementById('inp').value = JSON.stringify(SAMPLE, null, 2);
  parseJSON();
}

function clearAll() {
  document.getElementById('inp').value = '';
  parsed = null;
  reset();
  setStatus('', 'Waiting for input');
  document.getElementById('schar').textContent = '0 chars';
  document.getElementById('sline').textContent = '0 lines';
}

function reset() {
  const emp = n => `<div class="empty"><div class="empty-ico">{ }</div>Appears after parsing</div>`;
  document.getElementById('tree').innerHTML = '<div class="empty"><div class="empty-ico">{ }</div>Enter JSON and click Parse</div>';
  document.getElementById('out-fmt').innerHTML = emp();
  document.getElementById('out-cmp').innerHTML = emp();
  document.getElementById('sgrid').innerHTML = `<div style="grid-column:1/-1"><div class="empty" style="height:200px"><div class="empty-ico">{ }</div>Statistics appear after parsing</div></div>`;
  document.getElementById('errbox').classList.remove('on');
}

function onInp() {
  const v = document.getElementById('inp').value;
  document.getElementById('schar').textContent = v.length.toLocaleString() + ' chars';
  document.getElementById('sline').textContent = (v ? v.split('\n').length : 0) + ' lines';
  clearTimeout(timer);
  timer = setTimeout(() => { if (v.trim()) parseJSON(); else { reset(); setStatus('', 'Waiting for input'); } }, 500);
}

function setStatus(cls, txt) {
  const d = document.getElementById('sdot');
  d.className = 'dot' + (cls ? ' ' + cls : '');
  document.getElementById('stxt').textContent = txt;
}

function parseJSON() {
  const raw = document.getElementById('inp').value.trim();
  if (!raw) { reset(); return; }
  document.getElementById('errbox').classList.remove('on');
  try {
    parsed = JSON.parse(raw);
    // tree
    const t = document.getElementById('tree');
    t.innerHTML = '';
    t.appendChild(mkNode(parsed, '$', true));
    // fmt
    const ind = document.getElementById('ind').value;
    document.getElementById('out-fmt').textContent = JSON.stringify(parsed, null, ind === 'tab' ? '\t' : parseInt(ind));
    // compact
    document.getElementById('out-cmp').textContent = JSON.stringify(parsed);
    // stats
    renderStats(parsed, raw);
    setStatus('ok', '✓ Valid JSON');
  } catch(e) {
    parsed = null;
    document.getElementById('tree').innerHTML = '';
    document.getElementById('errbox').classList.add('on');
    document.getElementById('errmsg').textContent = e.message;
    setStatus('err', '✗ Invalid JSON');
  }
}

function mkNode(val, path) {
  const w = document.createElement('div');

  if (val === null) { w.innerHTML = `<span class="jx">null</span>`; return w; }
  if (typeof val === 'boolean') { w.innerHTML = `<span class="jb">${val}</span>`; return w; }
  if (typeof val === 'number')  { w.innerHTML = `<span class="jn">${val}</span>`; return w; }
  if (typeof val === 'string')  { w.innerHTML = `<span class="js">"${esc(val)}"</span>`; return w; }

  const isArr = Array.isArray(val);
  const keys  = isArr ? val : Object.keys(val);
  const open  = isArr ? '[' : '{';
  const close = isArr ? ']' : '}';
  const label = isArr ? `${keys.length} items` : `${keys.length} keys`;
  const big   = keys.length > 4;

  const tog = document.createElement('span');
  tog.className = 'n-toggle' + (big ? ' coll' : '');
  tog.innerHTML = `<span class="jc">${open}</span><span class="badge">${label}</span>`;

  const ch = document.createElement('div');
  ch.className = 'n-children' + (big ? ' hide' : '');

  (isArr ? val : Object.keys(val)).forEach((item, i) => {
    const line = document.createElement('div');
    const childVal = isArr ? item : val[item];
    const childKey = isArr ? i : item;
    const childPath = isArr ? `${path}[${i}]` : `${path}.${item}`;

    if (!isArr) {
      const ks = document.createElement('span');
      ks.className = 'jk';
      ks.textContent = `"${item}"`;
      ks.style.cursor = 'pointer';
      ks.addEventListener('mouseenter', () => { document.getElementById('pathout').textContent = childPath; });
      line.appendChild(ks);
      const col = document.createElement('span');
      col.className = 'jp'; col.textContent = ': ';
      line.appendChild(col);
    } else {
      const idx = document.createElement('span');
      idx.className = 'jk'; idx.textContent = `${i}: `;
      line.appendChild(idx);
    }

    line.appendChild(mkNode(childVal, childPath));

    if (i < keys.length - 1) {
      const cm = document.createElement('span');
      cm.className = 'jp'; cm.textContent = ',';
      line.appendChild(cm);
    }
    ch.appendChild(line);
  });

  const closeLine = document.createElement('div');
  closeLine.innerHTML = `<span class="jc">${close}</span>`;

  tog.addEventListener('click', () => {
    tog.classList.toggle('coll');
    ch.classList.toggle('hide');
  });

  w.appendChild(tog);
  w.appendChild(ch);
  w.appendChild(closeLine);
  return w;
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function expandAll()  {
  document.querySelectorAll('.n-toggle').forEach(t=>t.classList.remove('coll'));
  document.querySelectorAll('.n-children').forEach(c=>c.classList.remove('hide'));
}
function collapseAll(){
  document.querySelectorAll('.n-toggle').forEach(t=>t.classList.add('coll'));
  document.querySelectorAll('.n-children').forEach(c=>c.classList.add('hide'));
}

function doSearch() {
  const q = document.getElementById('srch').value.toLowerCase().trim();
  document.querySelectorAll('.hl').forEach(el => { el.outerHTML = el.textContent; });
  if (!q) { document.getElementById('scnt').textContent = ''; return; }
  let count = 0;
  document.querySelectorAll('#tree .jk, #tree .js, #tree .jn, #tree .jb, #tree .jx').forEach(sp => {
    const txt = sp.textContent;
    if (txt.toLowerCase().includes(q)) {
      count++;
      const idx = txt.toLowerCase().indexOf(q);
      sp.innerHTML = esc(txt.slice(0,idx)) + `<span class="hl">${esc(txt.slice(idx, idx+q.length))}</span>` + esc(txt.slice(idx+q.length));
      // expand parents
      let p = sp.parentElement;
      while (p && p.id !== 'tree') {
        if (p.classList.contains('n-children')) {
          p.classList.remove('hide');
          const prev = p.previousElementSibling;
          if (prev) prev.classList.remove('coll');
        }
        p = p.parentElement;
      }
    }
  });
  document.getElementById('scnt').textContent = count ? `${count} matches` : 'No matches';
}

function renderStats(data, raw) {
  const s = analyze(data);
  const sz  = new Blob([raw]).size;
  const csz = new Blob([JSON.stringify(data)]).size;
  const items = [
    ['Original size', fmtB(sz)], ['Minified size', fmtB(csz)],
    ['Objects', s.obj], ['Arrays', s.arr],
    ['Strings', s.str], ['Numbers', s.num],
    ['Booleans', s.bool], ['Null', s.nul],
    ['Total keys', s.keys], ['Max depth', s.depth],
  ];
  document.getElementById('sgrid').innerHTML = items.map(([l,v])=>
    `<div class="stat-card"><div class="stat-val">${v}</div><div class="stat-lbl">${l}</div></div>`
  ).join('');
}

function analyze(v, d=0) {
  const r={obj:0,arr:0,str:0,num:0,bool:0,nul:0,keys:0,depth:d};
  if (v===null){r.nul=1;return r;}
  if (typeof v==='string'){r.str=1;return r;}
  if (typeof v==='number'){r.num=1;return r;}
  if (typeof v==='boolean'){r.bool=1;return r;}
  if (Array.isArray(v)){r.arr=1; v.forEach(i=>{const c=analyze(i,d+1);merge(r,c);}); return r;}
  r.obj=1; const ks=Object.keys(v); r.keys=ks.length;
  ks.forEach(k=>{const c=analyze(v[k],d+1);merge(r,c);}); return r;
}
function merge(a,b){
  ['obj','arr','str','num','bool','nul','keys'].forEach(k=>a[k]+=b[k]);
  a.depth=Math.max(a.depth,b.depth);
}
function fmtB(b){ return b<1024?b+' B': b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(2)+' MB'; }

function copy(which) {
  const el = document.getElementById('out-'+which);
  if (!parsed || !el.textContent.trim() || el.querySelector('.empty')) return;
  navigator.clipboard.writeText(el.textContent).catch(() => {});
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2000);
}

function switchTab(el) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pane-'+el.dataset.tab).classList.add('active');
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); parseJSON(); }
});
