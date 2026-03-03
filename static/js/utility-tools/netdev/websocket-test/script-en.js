var ws=null,sent=0,recv=0,bytes=0,autoS=true,curF='all';
var connAt=null,upIv=null,pingIv=null,pingTs=null,latH=[];
var curProto='wss';
var log=[];

var HIST_KEY='ws_url_history';
var HIST_MAX=20;
var histDrop=false;
var histActiveIdx=-1;

function loadHist(){
  try{
    var arr = JSON.parse(localStorage.getItem(HIST_KEY)||'[]');
    if(!Array.isArray(arr)) return [];
    var res = [];
    for(var i=0; i<arr.length; i++){
      var v = arr[i];
      if(typeof v === 'string') { res.push({url: v, ts: Date.now()}); }
      else if(v && typeof v === 'object' && typeof v.url === 'string') { res.push(v); }
    }
    return res;
  }catch(e){
    return [];
  }
}
function saveHist(arr){try{localStorage.setItem(HIST_KEY,JSON.stringify(arr));}catch(e){}}

function pushUrlHist(fullUrl){
  var arr=loadHist();
  arr=arr.filter(function(i){return i.url!==fullUrl;});
  arr.unshift({url:fullUrl,ts:Date.now()});
  if(arr.length>HIST_MAX)arr=arr.slice(0,HIST_MAX);
  saveHist(arr);
}

function openHistDrop(){
  var drop=document.getElementById('url-hist-drop');
  var field=document.getElementById('url-field');
  var btn=document.getElementById('url-hist-btn');
  renderHistList(document.getElementById('url').value.trim());
  drop.classList.add('visible');
  field.classList.add('hist-open');
  btn.classList.add('open');
  histDrop=true;
  histActiveIdx=-1;
}

function closeHistDrop(){
  var drop=document.getElementById('url-hist-drop');
  var field=document.getElementById('url-field');
  var btn=document.getElementById('url-hist-btn');
  drop.classList.remove('visible');
  field.classList.remove('hist-open');
  btn.classList.remove('open');
  histDrop=false;
  histActiveIdx=-1;
}

function toggleHistDrop(){
  if(histDrop){closeHistDrop();}
  else{document.getElementById('url').focus();openHistDrop();}
}

function renderHistList(filter){
  var list=document.getElementById('url-hist-list');
  var arr=loadHist();
  filter=(filter||'').toLowerCase();
  
  var filtered=filter?arr.filter(function(i){return i.url.toLowerCase().indexOf(filter)!==-1;}):arr;
  
  if(!filtered.length){
    list.innerHTML='<div class="url-hist-empty">'+(arr.length?'No matches':'No history')+'</div>';
    return;
  }
  list.innerHTML=filtered.map(function(item,idx){
    var full=item.url;
    var proto=full.match(/^(wss?):\/\//);
    var protoStr=proto?proto[1]:'wss';
    var host=full.replace(/^wss?:\/\//,'');
    
    var displayHost=host;
    if(filter){
      try{
        var re=new RegExp('('+filter.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
        displayHost=host.replace(re,'<em>$1</em>');
      }catch(e){}
    }
    
    return '<div class="url-hist-item" data-url="'+esc(host)+'" data-proto="'+protoStr+'" data-idx="'+idx+'" onmousedown="pickHist(event,this)">'
      +'<span class="url-hist-icon"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4.5"/><polyline points="6,3.5 6,6 7.5,7.5"/></svg></span>'
      +'<span class="url-hist-text">'+displayHost+'</span>'
      +'<span class="url-hist-proto">'+protoStr.toUpperCase()+'</span>'
      +'<button class="url-hist-del" onmousedown="delHist(event,\''+esc(full)+'\')" title="Delete">✕</button>'
      +'</div>';
  }).join('');
}

function pickHist(e,el){
  e.preventDefault();
  var host=el.getAttribute('data-url');
  var proto=el.getAttribute('data-proto');
  document.getElementById('url').value=host;
  document.querySelectorAll('.prc').forEach(function(b){b.classList.remove('act');});
  document.querySelectorAll('.prc').forEach(function(b){
    if(b.textContent.toLowerCase()===proto){b.classList.add('act');}
  });
  curProto=proto;
  document.getElementById('proto-prefix').textContent=proto+'://';
  closeHistDrop();
  document.getElementById('url').focus();
}

function delHist(e,fullUrl){
  e.preventDefault();
  e.stopPropagation();
  var arr=loadHist().filter(function(i){return i.url!==fullUrl;});
  saveHist(arr);
  renderHistList(document.getElementById('url').value.trim());
}

function clearAllHist(){
  saveHist([]);
  renderHistList('');
}

function onUrlFocus(){openHistDrop();}

function onUrlInput(){
  if(!histDrop)openHistDrop();
  else renderHistList(document.getElementById('url').value.trim());
  histActiveIdx=-1;
}

function onUrlKeydown(e){
  if(!histDrop)return;
  var items=document.querySelectorAll('.url-hist-item');
  if(!items.length)return;
  if(e.key==='ArrowDown'){
    e.preventDefault();
    histActiveIdx=Math.min(histActiveIdx+1,items.length-1);
    updateHistActive(items);
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    histActiveIdx=Math.max(histActiveIdx-1,-1);
    updateHistActive(items);
  } else if(e.key==='Enter'){
    if(histActiveIdx>=0&&items[histActiveIdx]){
      pickHist({preventDefault:function(){}},items[histActiveIdx]);
    } else {
      closeHistDrop();
    }
  } else if(e.key==='Escape'){
    closeHistDrop();
  }
}

function updateHistActive(items) {
  items.forEach(function(item, i) {
    if (i === histActiveIdx) item.classList.add('active');
    else item.classList.remove('active');
  });
}

document.addEventListener('mousedown',function(e){
  if(!histDrop)return;
  var wrap=document.querySelector('.url-wrap');
  if(wrap&&!wrap.contains(e.target))closeHistDrop();
});

function selProto(el,p){document.querySelectorAll('.prc').forEach(function(c){c.classList.remove('act')});el.classList.add('act');curProto=p;document.getElementById('proto-prefix').textContent=p+'://';}
function getUrl(){var r=document.getElementById('url').value.trim().replace(/^wss?:\/\//,'');return curProto+'://'+r;}
function doConn(){
  var url=getUrl();
  if(document.getElementById('url').value.trim()){pushUrlHist(url);}
  setSt('ing','CONNECTING...');
  try{ws=new WebSocket(url);}catch(e){addSys('Connection failed: '+e.message,'error');setSt('err','ERROR');return;}
  ws.onopen=function(){setSt('on','CONNECTED');document.getElementById('cb2').style.display='none';document.getElementById('db').style.display='';document.getElementById('sendbtn').disabled=false;connAt=Date.now();startUp();sent=0;recv=0;bytes=0;updStats();addSys('Connected to '+url);startPing();};
  ws.onmessage=function(e){recv++;bytes+=new Blob([e.data]).size;updStats();push('recv',e.data);if(pingTs){recLat(Date.now()-pingTs);pingTs=null;}};
  ws.onclose=function(e){setSt('','DISCONNECTED');document.getElementById('cb2').style.display='';document.getElementById('db').style.display='none';document.getElementById('sendbtn').disabled=true;stopUp();stopPing();addSys('Connection closed [code: '+e.code+'] '+(e.reason||''));ws=null;};
  ws.onerror=function(){setSt('err','ERROR');addSys('Connection error','error');};
}
function doDisc(){if(ws){ws.close(1000,'User disconnect');ws=null;}}
function doSend(){var msg=document.getElementById('inp').value.trim();if(!msg||!ws||ws.readyState!==1)return;ws.send(msg);sent++;bytes+=new Blob([msg]).size;updStats();push('send',msg);document.getElementById('inp').value='';}
function onK(e){if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();doSend();}}
function push(dir,content){var n=new Date();var t=n.toTimeString().slice(0,8)+'.'+String(n.getMilliseconds()).padStart(3,'0');var entry={id:performance.now(),t:t,dir:dir,content:String(content)};log.push(entry);appendE(entry);}
function addSys(txt,type){push(type||'sys',txt);}
function appendE(e){var el=document.getElementById('ml');var emp=el.querySelector('.empty');if(emp)emp.remove();if(curF!=='all'&&e.dir!==curF)return;var s=document.getElementById('srch').value.toLowerCase();if(s&&!e.content.toLowerCase().includes(s))return;var d=document.createElement('div');d.className='mr';var dm={send:'SND',recv:'RCV',sys:'SYS',error:'ERR'};var dc={send:'mdsend',recv:'mdrecv',sys:'mdsys',error:'mderr'};var cc={sys:'mcsys',error:'mcerr'};var disp=e.content;if(e.dir==='recv'||e.dir==='send'){try{disp=JSON.stringify(JSON.parse(e.content),null,2);}catch(x){}}d.innerHTML='<div class="mt">'+e.t+'</div><div class="md '+(dc[e.dir]||'mdsys')+'">'+(dm[e.dir]||'SYS')+'</div><div class="mc '+(cc[e.dir]||'')+'">'+esc(disp)+'</div>';el.appendChild(d);if(autoS)el.scrollTop=el.scrollHeight;}
function rLog(){var el=document.getElementById('ml');el.innerHTML='';var s=document.getElementById('srch').value.toLowerCase();var f=log.filter(function(e){return(curF==='all'||e.dir===curF)&&(!s||e.content.toLowerCase().includes(s))});if(!f.length){el.innerHTML='<div class="empty"><span>No matching messages</span></div>';return;}f.forEach(function(e){appendE(e);});}
function setF(f,btn){curF=f;document.querySelectorAll('.ft').forEach(function(b){b.classList.remove('act')});btn.classList.add('act');rLog();}
function clrLog(){log=[];sent=0;recv=0;bytes=0;updStats();document.getElementById('ml').innerHTML='<div class="empty"><span>Log cleared</span></div>';}
function expLog(){var txt=log.map(function(e){return'['+e.t+'] ['+e.dir.toUpperCase().padEnd(5)+'] '+e.content;}).join('\n');var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download='ws-log-'+Date.now()+'.txt';a.click();}
function updStats(){document.getElementById('scnt').textContent=sent;document.getElementById('rcnt').textContent=recv;document.getElementById('mT').textContent=sent+recv;document.getElementById('mS').textContent=sent;document.getElementById('mR').textContent=recv;document.getElementById('mB').textContent=fmtB(bytes);}
function fmtB(b){return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(2)+' MB';}
function setSt(cls,txt){var d=document.getElementById('sd');d.className='dot';if(cls)d.classList.add(cls);document.getElementById('ss').textContent=txt;document.getElementById('ss').className='sv'+(cls==='on'?' on':cls==='err'?' err':'');}
function startUp(){upIv=setInterval(function(){if(!connAt)return;var s=Math.floor((Date.now()-connAt)/1000);document.getElementById('upd').textContent=[Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(function(n){return String(n).padStart(2,'0')}).join(':');},1000);}
function stopUp(){clearInterval(upIv);document.getElementById('upd').textContent='—';connAt=null;}
function startPing(){setTimeout(doPing,1000);pingIv=setInterval(doPing,10000);}
function stopPing(){clearInterval(pingIv);document.getElementById('pb').style.display='none';latH=[];renderLC();}
function doPing(){if(!ws||ws.readyState!==1)return;pingTs=Date.now();ws.send(JSON.stringify({type:'ping',ts:pingTs}));var snap=pingTs;setTimeout(function(){if(pingTs===snap){recLat(Date.now()-snap);pingTs=null;}},3000);}
function recLat(ms){latH.push(ms);if(latH.length>16)latH.shift();var b=document.getElementById('pb');b.style.display='';b.textContent=ms+'ms';b.className='pb'+(ms>200?' w':'');document.getElementById('mL').textContent=ms;renderLC();}
function renderLC(){var c=document.getElementById('lc');if(!latH.length){c.innerHTML='';return;}var mx=Math.max.apply(null,latH.concat([1]));c.innerHTML=latH.map(function(v){return'<div class="lb" style="height:'+Math.max(2,Math.round(v/mx*14))+'px"></div>';}).join('');}
function togAS(){autoS=!autoS;document.getElementById('asb').classList.toggle('on',autoS);}
function selP(el,u){document.querySelectorAll('.pi').forEach(function(p){p.classList.remove('act')});el.classList.add('act');document.getElementById('url').value=u.replace(/^wss?:\/\//,'');}
function addH(){var d=document.createElement('div');d.className='hi';d.innerHTML='<input type="text" placeholder="Key"><input type="text" placeholder="Value"><button class="btn bs" onclick="rmH(this)">x</button>';document.getElementById('hl').appendChild(d);}
function rmH(btn){btn.closest('.hi').remove();}
function insPing(){document.getElementById('inp').value=JSON.stringify({type:'ping',ts:Date.now()});}
function insHello(){document.getElementById('inp').value=JSON.stringify({type:'hello',client:'WS Terminal',v:'2.4',ts:Date.now()});}
function insTpl(t){var m={sub:JSON.stringify({action:'subscribe',channel:'market.BTC-USDT',event:'trade'}),auth:JSON.stringify({type:'auth',token:'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}),hb:JSON.stringify({cmd:'heartbeat',seq:Math.floor(Math.random()*9999)})};document.getElementById('inp').value=m[t]||'';}
function fmtJ(){var el=document.getElementById('inp');try{el.value=JSON.stringify(JSON.parse(el.value),null,2);}catch(e){addSys('Invalid JSON format','error');}}
function minJ(){var el=document.getElementById('inp');try{el.value=JSON.stringify(JSON.parse(el.value));}catch(e){addSys('Invalid JSON format','error');}}
function clrInp(){document.getElementById('inp').value='';}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Initialization messages (English)
addSys('WS Terminal v2.4.0 ready');
addSys('Tip: wss://echo.websocket.org — sends back any message');
addSys('Note: After connection, a ping is sent every 10s to measure latency');