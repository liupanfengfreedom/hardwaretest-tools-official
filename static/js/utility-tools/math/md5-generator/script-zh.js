// ═══════════════════════════════════════════════════════
//  Pure-JS MD5 implementation (RFC 1321)
// ═══════════════════════════════════════════════════════
(function(){
  function safeAdd(x,y){ const lsw=(x&0xFFFF)+(y&0xFFFF); const msw=(x>>16)+(y>>16)+(lsw>>16); return (msw<<16)|(lsw&0xFFFF); }
  function bitRotateLeft(num,cnt){ return (num<<cnt)|(num>>>(32-cnt)); }
  function md5cmn(q,a,b,x,s,t){ return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b); }
  function md5ff(a,b,c,d,x,s,t){ return md5cmn((b&c)|((~b)&d),a,b,x,s,t); }
  function md5gg(a,b,c,d,x,s,t){ return md5cmn((b&d)|(c&(~d)),a,b,x,s,t); }
  function md5hh(a,b,c,d,x,s,t){ return md5cmn(b^c^d,a,b,x,s,t); }
  function md5ii(a,b,c,d,x,s,t){ return md5cmn(c^(b|(~d)),a,b,x,s,t); }

  function binlMD5(x,len){
    x[len>>5]|=0x80<<(len%32);
    x[(((len+64)>>>9)<<4)+14]=len;
    let a=1732584193,b=-271733879,c=-1732584194,d=271733878;
    for(let i=0;i<x.length;i+=16){
      const oa=a,ob=b,oc=c,od=d;
      a=md5ff(a,b,c,d,x[i],7,-680876936); d=md5ff(d,a,b,c,x[i+1],12,-389564586); c=md5ff(c,d,a,b,x[i+2],17,606105819); b=md5ff(b,c,d,a,x[i+3],22,-1044525330);
      a=md5ff(a,b,c,d,x[i+4],7,-176418897); d=md5ff(d,a,b,c,x[i+5],12,1200080426); c=md5ff(c,d,a,b,x[i+6],17,-1473231341); b=md5ff(b,c,d,a,x[i+7],22,-45705983);
      a=md5ff(a,b,c,d,x[i+8],7,1770035416); d=md5ff(d,a,b,c,x[i+9],12,-1958414417); c=md5ff(c,d,a,b,x[i+10],17,-42063); b=md5ff(b,c,d,a,x[i+11],22,-1990404162);
      a=md5ff(a,b,c,d,x[i+12],7,1804603682); d=md5ff(d,a,b,c,x[i+13],12,-40341101); c=md5ff(c,d,a,b,x[i+14],17,-1502002290); b=md5ff(b,c,d,a,x[i+15],22,1236535329);
      a=md5gg(a,b,c,d,x[i+1],5,-165796510); d=md5gg(d,a,b,c,x[i+6],9,-1069501632); c=md5gg(c,d,a,b,x[i+11],14,643717713); b=md5gg(b,c,d,a,x[i],20,-373897302);
      a=md5gg(a,b,c,d,x[i+5],5,-701558691); d=md5gg(d,a,b,c,x[i+10],9,38016083); c=md5gg(c,d,a,b,x[i+15],14,-660478335); b=md5gg(b,c,d,a,x[i+4],20,-405537848);
      a=md5gg(a,b,c,d,x[i+9],5,568446438); d=md5gg(d,a,b,c,x[i+14],9,-1019803690); c=md5gg(c,d,a,b,x[i+3],14,-187363961); b=md5gg(b,c,d,a,x[i+8],20,1163531501);
      a=md5gg(a,b,c,d,x[i+13],5,-1444681467); d=md5gg(d,a,b,c,x[i+2],9,-51403784); c=md5gg(c,d,a,b,x[i+7],14,1735328473); b=md5gg(b,c,d,a,x[i+12],20,-1926607734);
      a=md5hh(a,b,c,d,x[i+5],4,-378558); d=md5hh(d,a,b,c,x[i+8],11,-2022574463); c=md5hh(c,d,a,b,x[i+11],16,1839030562); b=md5hh(b,c,d,a,x[i+14],23,-35309556);
      a=md5hh(a,b,c,d,x[i+1],4,-1530992060); d=md5hh(d,a,b,c,x[i+4],11,1272893353); c=md5hh(c,d,a,b,x[i+7],16,-155497632); b=md5hh(b,c,d,a,x[i+10],23,-1094730640);
      a=md5hh(a,b,c,d,x[i+13],4,681279174); d=md5hh(d,a,b,c,x[i],11,-358537222); c=md5hh(c,d,a,b,x[i+3],16,-722521979); b=md5hh(b,c,d,a,x[i+6],23,76029189);
      a=md5hh(a,b,c,d,x[i+9],4,-640364487); d=md5hh(d,a,b,c,x[i+12],11,-421815835); c=md5hh(c,d,a,b,x[i+15],16,530742520); b=md5hh(b,c,d,a,x[i+2],23,-995338651);
      a=md5ii(a,b,c,d,x[i],6,-198630844); d=md5ii(d,a,b,c,x[i+7],10,1126891415); c=md5ii(c,d,a,b,x[i+14],15,-1416354905); b=md5ii(b,c,d,a,x[i+5],21,-57434055);
      a=md5ii(a,b,c,d,x[i+12],6,1700485571); d=md5ii(d,a,b,c,x[i+3],10,-1894986606); c=md5ii(c,d,a,b,x[i+10],15,-1051523); b=md5ii(b,c,d,a,x[i+1],21,-2054922799);
      a=md5ii(a,b,c,d,x[i+8],6,1873313359); d=md5ii(d,a,b,c,x[i+15],10,-30611744); c=md5ii(c,d,a,b,x[i+6],15,-1560198380); b=md5ii(b,c,d,a,x[i+13],21,1309151649);
      a=md5ii(a,b,c,d,x[i+4],6,-145523070); d=md5ii(d,a,b,c,x[i+11],10,-1120210379); c=md5ii(c,d,a,b,x[i+2],15,718787259); b=md5ii(b,c,d,a,x[i+9],21,-343485551);
      a=safeAdd(a,oa); b=safeAdd(b,ob); c=safeAdd(c,oc); d=safeAdd(d,od);
    }
    return [a,b,c,d];
  }

  function binl2hex(binarray){
    const hexTab='0123456789abcdef'; let str='';
    for(let i=0;i<binarray.length*4;i++){
      str+=hexTab.charAt((binarray[i>>2]>>((i%4)*8+4))&0xF)+hexTab.charAt((binarray[i>>2]>>((i%4)*8))&0xF);
    }
    return str;
  }

  function rstrMD5(s){
    return binl2hex(binlMD5(rstr2binl(s),s.length*8));
  }

  function rstr2binl(input){
    const output=[]; output[(input.length>>2)-1]=undefined;
    for(let i=0;i<output.length;i++) output[i]=0;
    for(let i=0;i<input.length*8;i+=8) output[i>>5]|=(input.charCodeAt(i/8)&0xFF)<<(i%32);
    return output;
  }

  function str2rstrUTF8(input){
    return unescape(encodeURIComponent(input));
  }

  function rstrHMAC(key, data){
    let bkey=rstr2binl(key);
    if(bkey.length>16) bkey=binlMD5(bkey,key.length*8);
    const ipad=[],opad=[];
    for(let i=0;i<16;i++){ ipad[i]=bkey[i]^0x36363636; opad[i]=bkey[i]^0x5C5C5C5C; }
    const hash=binlMD5(ipad.concat(rstr2binl(data)),512+data.length*8);
    return binl2hex(binlMD5(opad.concat(hash),512+128));
  }

  window.MD5 = {
    hex: function(str){ return rstrMD5(str2rstrUTF8(str)); },
    hexRaw: function(raw){ return rstrMD5(raw); },
    hmac: function(key, str){ return rstrHMAC(str2rstrUTF8(key), str2rstrUTF8(str)); },
    str2rstrUTF8
  };
})();

// ═══════════════════════════════════════════════════════
//  App State
// ═══════════════════════════════════════════════════════
let fileBytes = null;
let fileName  = null;
let totalHashes = 0;
let totalBytes  = 0;
let autoTimer   = null;
let batchData   = [];

function onConfigChange(){ runHash(); updateStatStrip(); updateAddBatchBtn(); }

function updateAddBatchBtn(){
  const btn = document.getElementById('addBatchBtn');
  const isBatch = document.getElementById('batchMode').value === 'multi';
  if(!isBatch){
    btn.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  // Disable when a file is loaded
  btn.disabled = !!fileBytes;
  btn.title = fileBytes ? '文件模式下不支持批量添加' : '在末尾添加新批次行';
}

function addBatchLine(){
  const ta = document.getElementById('inputText');
  const val = ta.value;
  // If textarea is empty just focus; otherwise ensure we're on a fresh line
  if(val === ''){
    ta.focus();
    return;
  }
  // Append newline if not already ending with one
  if(!val.endsWith('\n')){
    ta.value = val + '\n';
  }
  // Move cursor to end
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  // Scroll to bottom
  ta.scrollTop = ta.scrollHeight;
  onInputChange();
}


function updateStatStrip(){
  const variant = document.getElementById('hashVariant').value;
  const variantMap = {'md5-32':'HEX-32','md5-16':'HEX-16','md5-upper':'HEX-32↑'};
  document.getElementById('statFormat').textContent = variantMap[variant];
  document.getElementById('statMode').textContent = document.getElementById('batchMode').value==='multi' ? 'BATCH' : 'STANDARD';
}

function onInputChange(){
  updateInputStat();
  clearTimeout(autoTimer);
  autoTimer = setTimeout(runHash, 160);
}

function updateInputStat(){
  const txt = document.getElementById('inputText').value;
  const enc = document.getElementById('inputEncoding').value;
  let bytes;
  if(fileBytes){ bytes = fileBytes.length; }
  else if(enc==='utf8'){ bytes = new TextEncoder().encode(txt).length; }
  else { bytes = txt.replace(/\s/g,'').length / 2 | 0; }
  document.getElementById('inputStat').textContent = bytes + ' bytes';
}

// ── Hash Runner ──
function getInputStr(){
  const txt = document.getElementById('inputText').value;
  const enc = document.getElementById('inputEncoding').value;
  if(enc==='hex'){
    const clean = txt.replace(/\s/g,'');
    let raw='';
    for(let i=0;i<clean.length;i+=2) raw+=String.fromCharCode(parseInt(clean.substr(i,2),16));
    return raw;
  }
  if(enc==='base64'){
    try{ return atob(txt); } catch(e){ throw new Error('Base64 格式无效'); }
  }
  return MD5.str2rstrUTF8(txt);
}

function applyVariant(hex32){
  const variant = document.getElementById('hashVariant').value;
  if(variant==='md5-16') return hex32.substring(8,24);
  if(variant==='md5-upper') return hex32.toUpperCase();
  return hex32;
}

function computeHashFromRaw(raw){
  return MD5.hexRaw(raw);
}

function runHash(){
  const isBatch = document.getElementById('batchMode').value==='multi';
  const inputEl = document.getElementById('inputText');
  const outputEl = document.getElementById('outputText');
  const input = inputEl.value;

  try {
    if(fileBytes){
      // File mode
      const raw = Array.from(fileBytes).map(b=>String.fromCharCode(b)).join('');
      const hex32 = computeHashFromRaw(raw);
      const result = applyVariant(hex32);
      outputEl.value = result;
      updateOutputStat(result);
      renderHashRows(hex32, raw.length);
      document.getElementById('batchTableWrap').classList.remove('visible');
      incStats(raw.length, 1);
      setStatus(`✓ 文件哈希完成 — ${fileName} (${formatBytes(raw.length)})`, 'success');
      return;
    }

    if(!input.trim()){ outputEl.value=''; updateOutputStat(''); renderHashRows(null); setStatus('就绪 — 输入文本后自动计算，或点击按钮手动触发'); return; }

    if(isBatch){
      const lines = input.split('\n').filter(l=>l.trim());
      batchData = lines.map(line=>{
        const enc = document.getElementById('inputEncoding').value;
        let raw;
        if(enc==='utf8') raw = MD5.str2rstrUTF8(line);
        else if(enc==='hex'){ const c=line.replace(/\s/g,''); raw=''; for(let i=0;i<c.length;i+=2) raw+=String.fromCharCode(parseInt(c.substr(i,2),16)); }
        else { try{ raw=atob(line); } catch(e){ raw=line; } }
        const hex32 = computeHashFromRaw(raw);
        return { input:line, md5_32:hex32, md5_16:hex32.substring(8,24), md5_upper:hex32.toUpperCase() };
      });
      const variant = document.getElementById('hashVariant').value;
      const key = variant==='md5-16'?'md5_16':variant==='md5-upper'?'md5_upper':'md5_32';
      const results = batchData.map(r=>r[key]).join('\n');
      outputEl.value = results;
      updateOutputStat(results);
      renderBatchTable();
      document.getElementById('batchTableWrap').classList.add('visible');
      renderHashRows(batchData[0]?.md5_32||null, 0);
      incStats(new TextEncoder().encode(input).length, lines.length);
      setStatus(`✓ 批量完成 — ${lines.length} 条记录已哈希`, 'success');
    } else {
      const raw = getInputStr();
      const hex32 = computeHashFromRaw(raw);
      const result = applyVariant(hex32);
      outputEl.value = result;
      updateOutputStat(result);
      renderHashRows(hex32, raw.length);
      document.getElementById('batchTableWrap').classList.remove('visible');
      incStats(new TextEncoder().encode(input).length, 1);
      setStatus(`✓ 哈希生成成功 — 128-bit / 32 hex chars`, 'success');
    }
  } catch(e){
    setStatus('✗ ' + e.message, 'error');
  }
}

function renderHashRows(hex32, byteLen){
  const container = document.getElementById('hashRows');
  if(!hex32){ container.innerHTML = `<div style="padding:28px 20px;text-align:center;font-family:var(--mono);font-size:12px;color:var(--text3);">— 暂无哈希结果 —</div>`; return; }

  const rows = [
    { label:'MD5-32',      value: hex32 },
    { label:'MD5-16',      value: hex32.substring(8,24) },
    { label:'MD5-32 大写', value: hex32.toUpperCase() },
    { label:'字节数',      value: byteLen > 0 ? formatBytes(byteLen) : '—', noCopy:true },
  ];

  container.innerHTML = rows.map(r=>`
    <div class="hash-row">
      <span class="hash-type-tag"><span class="hash-type-dot"></span>${r.label}</span>
      <span class="hash-value">${r.value}</span>
      ${r.noCopy ? '<span></span>' : `<button class="copy-hash-btn" onclick="copyHashValue('${r.value}',this)" title="复制">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>`}
    </div>
  `).join('');
}

function renderBatchTable(){
  const tbody = document.getElementById('batchTableBody');
  tbody.innerHTML = batchData.map(r=>`
    <tr>
      <td title="${r.input}">${r.input}</td>
      <td>${r.md5_32}</td>
      <td>${r.md5_16}</td>
      <td>${r.md5_upper}</td>
    </tr>
  `).join('');
}

function updateOutputStat(val){
  document.getElementById('outputStat').textContent = val ? (val.length + ' chars') : '—';
  const variant = document.getElementById('hashVariant').value;
  const map={'md5-32':'MD5-32','md5-16':'MD5-16','md5-upper':'MD5-UPPER'};
  document.getElementById('outputFormatTag').textContent = map[variant];
}

function incStats(bytes, hashes){
  totalBytes  += bytes;
  totalHashes += hashes;
  animateStat('statHashes', totalHashes);
  animateStat('statBytes', totalBytes);
}

function animateStat(id, target){
  const el = document.getElementById(id);
  const start = parseInt(el.textContent)||0;
  let cur = start;
  const step = Math.ceil((target-start)/8)||1;
  const t = setInterval(()=>{
    cur = Math.min(cur+step, target);
    el.textContent = cur;
    if(cur>=target) clearInterval(t);
  },40);
}

function formatBytes(b){ if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(2)+' MB'; }

// ── File Handling ──
function loadFile(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    fileBytes = new Uint8Array(e.target.result);
    fileName  = file.name;
    document.getElementById('fileBadge').style.display='flex';
    document.getElementById('fileBadgeName').textContent = file.name;
    document.getElementById('inputText').value='';
    document.getElementById('inputText').placeholder = `📄 ${file.name} (${formatBytes(file.size)}) 已加载`;
    updateInputStat();
    updateAddBatchBtn();
    runHash();
  };
  reader.readAsArrayBuffer(file);
  event.target.value='';
}

function clearFile(){
  fileBytes = null; fileName = null;
  document.getElementById('fileBadge').style.display='none';
  document.getElementById('inputText').placeholder='在此输入文本，或拖放 / 上传文件…';
  document.getElementById('outputText').value='';
  document.getElementById('inputStat').textContent='0 bytes';
  renderHashRows(null);
  updateAddBatchBtn();
  setStatus('文件已移除');
}

// Drag-drop
const inputPanel = document.querySelector('.input-panel');
const dropZone   = document.getElementById('dropZone');

['dragenter','dragover'].forEach(e=>{
  inputPanel.addEventListener(e,ev=>{ ev.preventDefault(); dropZone.classList.add('active'); });
});
['dragleave','drop'].forEach(e=>{
  inputPanel.addEventListener(e,ev=>{ ev.preventDefault(); dropZone.classList.remove('active'); });
});
inputPanel.addEventListener('drop', ev=>{
  const file = ev.dataTransfer.files[0];
  if(file){ const reader=new FileReader(); reader.onload=function(e){ fileBytes=new Uint8Array(e.target.result); fileName=file.name; document.getElementById('fileBadge').style.display='flex'; document.getElementById('fileBadgeName').textContent=file.name; document.getElementById('inputText').value=''; document.getElementById('inputText').placeholder=`📄 ${file.name} (${formatBytes(file.size)}) 已加载`; updateInputStat(); updateAddBatchBtn(); runHash(); }; reader.readAsArrayBuffer(file); }
});

// ── Copy ──
function copyHashValue(val, btn){
  doCopy(val, ()=>{
    const orig = btn.innerHTML;
    btn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.innerHTML=orig; btn.classList.remove('copied'); },1800);
    showToast('已复制');
  });
}

function copyOutput(btn){
  const val = document.getElementById('outputText').value;
  if(!val){ showToast('无内容可复制','error'); return; }
  doCopy(val, ()=>{
    const orig = btn.innerHTML;
    btn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    btn.style.borderColor='var(--accent2)'; btn.style.color='var(--accent2)';
    setTimeout(()=>{ btn.innerHTML=orig; btn.style.borderColor=''; btn.style.color=''; },1800);
    showToast('已复制到剪贴板');
  });
}

function copyAll(btn){
  const rows = document.querySelectorAll('.hash-value:not(.empty)');
  const lines = Array.from(rows).map(r=>r.textContent).filter(t=>t&&t!=='—');
  if(!lines.length){ showToast('暂无结果','error'); return; }
  doCopy(lines.join('\n'), ()=>{
    const orig=btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 已复制';
    setTimeout(()=>{ btn.innerHTML=orig; btn.classList.remove('copied'); },1800);
    showToast('所有哈希值已复制');
  });
}

function doCopy(text, cb){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(cb).catch(()=>{ fallbackCopy(text)&&cb(); });
  } else { fallbackCopy(text)&&cb(); }
}

function fallbackCopy(text){
  const ta=document.createElement('textarea');
  ta.value=text; ta.style.cssText='position:fixed;top:-999px;left:-999px;opacity:0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  const ok=document.execCommand('copy'); document.body.removeChild(ta);
  return ok;
}

function exportCSV(){
  if(!batchData.length){ showToast('无批量数据','error'); return; }
  const header='原始内容,MD5-32,MD5-16,MD5-32大写\n';
  const rows=batchData.map(r=>`"${r.input.replace(/"/g,'""')}",${r.md5_32},${r.md5_16},${r.md5_upper}`).join('\n');
  const blob=new Blob(['\uFEFF'+header+rows],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='md5_batch_'+Date.now()+'.csv'; a.click();
  showToast('CSV 已导出');
}

// ── Paste / Clear ──
async function pasteInput(){
  try{
    const text = await navigator.clipboard.readText();
    document.getElementById('inputText').value=text;
    onInputChange(); showToast('已粘贴');
  } catch(e){ showToast('无法访问剪贴板','error'); }
}

function clearInput(){
  document.getElementById('inputText').value='';
  document.getElementById('inputStat').textContent='0 bytes';
  document.getElementById('outputText').value='';
  updateOutputStat('');
  renderHashRows(null);
  setStatus('就绪 — 输入文本后自动计算，或点击按钮手动触发');
}

function clearAll(){
  clearInput(); clearFile();
  batchData=[];
  document.getElementById('batchTableWrap').classList.remove('visible');
  totalHashes=0; totalBytes=0;
  document.getElementById('statHashes').textContent='0';
  document.getElementById('statBytes').textContent='0';
  showToast('已清空');
}

// ── Status / Toast ──
function setStatus(msg, type=''){
  const bar=document.getElementById('statusBar');
  bar.className='status-bar'+(type?' '+type:'');
  document.getElementById('statusText').textContent=msg;
}

function showToast(msg, type='success'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast show '+(type||'success');
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>t.classList.remove('show'),2000);
}

// ── Scroll to explain section ──
function scrollToExplain(id){
  // Small delay so the :target hash updates first
  setTimeout(()=>{
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 50);
}

// ── Init ──
renderHashRows(null);
updateStatStrip();
updateAddBatchBtn();
