// ==UserScript==
// @name         Torn Chain Tracker - TornPDA
// @namespace    https://torn.com
// @version      3.5
// @description  Chain queue panel for TornPDA
// @author       LordGraham
// @downloadURL https://raw.githubusercontent.com/grahampler/TornChainQueue/main/TornPDA
// @updateURL   https://raw.githubusercontent.com/grahampler/TornChainQueue/main/TornPDA
// @match        https://www.torn.com/*
// @grant        none
// @connect.    cool-field-1c8b.musiccmangraham.workers.dev
// ==/UserScript==

(function() {
  'use strict';

  var TRACKER_URL = 'https://cool-field-1c8b.musiccmangraham.workers.dev';
  var API_KEY = '###PDA-APIKEY###';

  var members = [];
  var chainCount = 0;
  var prevChainCount = -1;
  var alertFired = false;
  var playerName = '';
  var soundEnabled = false;
  var localTimeout = 0;
  var localTick = null;
  var infoBannerTimer = null;
  var pushLockUntil = 0;

  var COLORS = ['#534AB7','#1D9E75','#D85A30','#185FA5','#854F0B','#993556','#0F6E56','#3C3489'];

  var pdaReady = false;
  var pdaQueue = [];

  function flushQueue() {
    pdaReady = true;
    for (var i = 0; i < pdaQueue.length; i++) pdaQueue[i]();
    pdaQueue = [];
  }

  window.addEventListener('flutterInAppWebViewPlatformReady', flushQueue);

  function checkReady() {
    if (typeof window.flutter_inappwebview !== 'undefined' &&
        typeof window.flutter_inappwebview.callHandler === 'function') {
      flushQueue();
    } else {
      setTimeout(checkReady, 200);
    }
  }
  checkReady();

  function whenReady(fn) {
    if (pdaReady) { fn(); }
    else { pdaQueue.push(fn); }
  }

  function doGet(url, onSuccess, onFail) {
    whenReady(function() {
      window.flutter_inappwebview.callHandler('PDA_httpGet', url, {})
        .then(function(r) {
          try {
            var text = r;
            if (r && typeof r === 'object') {
              text = r.body || r.responseText || r.response || JSON.stringify(r);
            }
            if (typeof text !== 'string') text = JSON.stringify(text);
            onSuccess(JSON.parse(text));
          } catch(e) { if(onFail) onFail(e); }
        })
        .catch(function(e) { if(onFail) onFail(e); });
    });
  }

  function doPost(url, data, onDone) {
    whenReady(function() {
      window.flutter_inappwebview.callHandler(
        'PDA_httpPost', url,
        {'Content-Type': 'application/json', 'Accept': 'application/json', 'Origin': 'https://torn.com'},
        JSON.stringify(data)
      )
      .then(function() { if(onDone) onDone(); })
      .catch(function() { if(onDone) onDone(); });
    });
  }

  var s = document.createElement('style');
  s.textContent =
    '#ctb{position:fixed;bottom:80px;right:0;z-index:99998;background:#534AB7;color:#fff;border:none;padding:8px 10px;border-radius:8px 0 0 8px;font-size:12px;font-weight:500;cursor:pointer;font-family:sans-serif;writing-mode:vertical-rl;}' +
    '#ctw{position:fixed;bottom:80px;right:10px;z-index:99999;width:300px;background:#0f1117;border:1px solid #2e3147;border-radius:12px;font-family:sans-serif;font-size:13px;color:#e8eaf6;display:none;}' +
    '#cth{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1a1d27;border-radius:12px 12px 0 0;border-bottom:1px solid #2e3147;}' +
    '#cth span{flex:1;font-size:13px;font-weight:500;}' +
    '#ctx{background:none;border:none;color:#7b8098;font-size:18px;cursor:pointer;padding:0;}' +
    '#ctmet{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;border-bottom:1px solid #2e3147;}' +
    '.ctm{background:#1a1d27;border:1px solid #2e3147;border-radius:6px;padding:5px 7px;}' +
    '.ctml{font-size:9px;color:#7b8098;text-transform:uppercase;margin-bottom:2px;}' +
    '.ctmv{font-size:14px;font-weight:500;color:#e8eaf6;}' +
    '.cttb{height:3px;background:#2e3147;border-radius:2px;margin-top:3px;overflow:hidden;}' +
    '.cttf{height:100%;border-radius:2px;background:#1D9E75;transition:width 1s linear;}' +
    '#ctinfo{display:none;margin:6px 8px 0;padding:6px 8px;border-radius:6px;font-size:11px;background:#0d1f18;color:#5DCAA5;border:1px solid #1D9E75;}' +
    '#ctalt{display:none;margin:6px 8px 0;padding:7px 8px;border-radius:6px;font-size:11px;font-weight:500;background:#1e1608;color:#FAC775;border:1px solid #BA7517;}' +
    '#ctlist{max-height:180px;overflow-y:auto;padding:6px 8px;}' +
    '.ctr{display:grid;grid-template-columns:24px 1fr auto auto auto;align-items:center;gap:5px;padding:5px 6px;border-radius:6px;border:1px solid #2e3147;background:#13151f;margin-bottom:4px;}' +
    '.ctr.up{border-color:#1D9E75;background:#0d1f18;}' +
    '.ctr.me{border-color:#534AB7;background:#13111f;}' +
    '.ctr.dn{opacity:0.3;}' +
    '.ctav{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:500;}' +
    '.ctnm{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.cthn{font-size:10px;color:#7b8098;white-space:nowrap;}' +
    '.cthn.up{color:#5DCAA5;font-weight:500;}' +
    '.cthn.me{color:#AFA9EC;font-weight:500;}' +
    '.ctbdg{font-size:9px;padding:2px 5px;border-radius:4px;font-weight:500;white-space:nowrap;}' +
    '.ctbdg.up{background:#0d2e20;color:#5DCAA5;border:1px solid #1D9E75;}' +
    '.ctbdg.wt{background:#1e2130;color:#7b8098;}' +
    '.ctbdg.dn{background:#181b27;color:#4a4f66;}' +
    '.ctbdg.me{background:#13111f;color:#AFA9EC;border:1px solid #534AB7;}' +
    '.ctrm{width:20px;height:20px;background:transparent;border:1px solid #2e3147;border-radius:4px;color:#4a4f66;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
    '#ctadd{display:flex;gap:6px;padding:6px 8px;}' +
    '#ctinp{flex:1;height:32px;border:1px solid #2e3147;border-radius:6px;padding:0 8px;font-size:13px;background:#13151f;color:#e8eaf6;outline:none;}' +
    '#ctabtn{height:32px;padding:0 10px;border:1px solid #2e3147;border-radius:6px;background:#1e2130;color:#c8cae0;cursor:pointer;font-size:12px;}' +
    '#ctbtns{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 8px 8px;}' +
    '#ctbtns button{height:32px;border:1px solid #2e3147;border-radius:6px;font-size:11px;font-weight:500;background:#1e2130;color:#c8cae0;cursor:pointer;}' +
    '#ctclaim{background:#1D9E75!important;color:#fff!important;border-color:#1D9E75!important;}' +
    '#ctreset{color:#E24B4A!important;border-color:#4a1515!important;background:transparent!important;grid-column:span 2;}' +
    '#ctsound.on{background:#534AB7!important;color:#fff!important;border-color:#534AB7!important;}' +
    '#ctfoot{padding:4px 8px 8px;border-top:1px solid #2e3147;display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#4a4f66;}' +
    '#ctfoot b{color:#534AB7;}' +
    '.ctsd{width:5px;height:5px;border-radius:50%;background:#4a4f66;display:inline-block;margin-right:4px;vertical-align:middle;}' +
    '.ctsd.ok{background:#1D9E75;}' +
    '.ctsd.er{background:#E24B4A;}' +
    '#ctpn{font-size:10px;color:#4a4f66;padding:0 8px 6px;}' +
    '#ctpn b{color:#534AB7;}';
  document.head.appendChild(s);

  var btn = document.createElement('button');
  btn.id = 'ctb'; btn.textContent = 'Chain Tracker';
  document.body.appendChild(btn);

  var wrap = document.createElement('div');
  wrap.id = 'ctw';
  wrap.innerHTML =
    '<div id="cth">' +
      '<div style="width:7px;height:7px;border-radius:50%;background:#4a4f66;" id="ctdot"></div>' +
      '<span>Attack queue</span>' +
      '<span id="ctqn" style="font-size:10px;color:#4a4f66;"></span>' +
      '<button id="ctx">&#x2715;</button>' +
    '</div>' +
    '<div id="ctmet">' +
      '<div class="ctm"><div class="ctml">Chain</div><div class="ctmv" id="ctmc">&mdash;</div></div>' +
      '<div class="ctm"><div class="ctml">Time</div><div class="ctmv" id="ctmt">&mdash;</div><div class="cttb"><div class="cttf" id="cttf" style="width:0%"></div></div></div>' +
      '<div class="ctm"><div class="ctml">Multi</div><div class="ctmv" id="ctmm">&mdash;</div></div>' +
    '</div>' +
    '<div id="ctalt"></div>' +
    '<div id="ctinfo"></div>' +
    '<div id="ctlist"></div>' +
    '<div id="ctadd"><input type="text" id="ctinp" placeholder="Member name"/><button id="ctabtn">+ Add</button></div>' +
    '<div id="ctbtns">' +
      '<button id="ctclaim">Claim slot</button>' +
      '<button id="ctdone">Mark done</button>' +
      '<button id="ctsound">Sound off</button>' +
      '<button id="ctreset">Reset queue</button>' +
    '</div>' +
    '<div id="ctpn">Playing as: <b id="ctpname">detecting...</b></div>' +
    '<div id="ctfoot">' +
      '<div><span class="ctsd" id="ctsd"></span><span id="ctsl">connecting...</span></div>' +
      '<div>by <b>LordGraham</b></div>' +
    '</div>';
  document.body.appendChild(wrap);

  btn.addEventListener('click', function() { wrap.style.display = wrap.style.display === 'block' ? 'none' : 'block'; });
  document.getElementById('ctx').addEventListener('click', function() { wrap.style.display = 'none'; });
  document.getElementById('ctabtn').addEventListener('click', addMember);
  document.getElementById('ctinp').addEventListener('keydown', function(e) { if(e.key==='Enter') addMember(); });
  document.getElementById('ctclaim').addEventListener('click', claimSlot);
  document.getElementById('ctdone').addEventListener('click', markDone);
  document.getElementById('ctreset').addEventListener('click', resetQueue);
  document.getElementById('ctsound').addEventListener('click', toggleSound);

  function toMMSS(s) { if(!s||s<0) s=0; s=Math.floor(s); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
  function initials(n) { return n.trim().split(/\s+/).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2)||'?'; }
  function pickColor(n) { var h=0; for(var i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))%COLORS.length; return COLORS[h]; }

  function setSyncStatus(ok) {
    var d=document.getElementById('ctsd'), l=document.getElementById('ctsl');
    if(!d) return;
    d.className = ok ? 'ctsd ok' : 'ctsd er';
    l.textContent = ok ? 'synced' : 'sync error';
  }
  function showInfo(msg) {
    var b=document.getElementById('ctinfo'); if(!b) return;
    b.textContent=msg; b.style.display='block';
    if(infoBannerTimer) clearTimeout(infoBannerTimer);
    infoBannerTimer=setTimeout(function(){b.style.display='none';},5000);
  }
  function showAlert(msg) {
    var b=document.getElementById('ctalt');
    if(b){b.textContent=msg;b.style.display='block';setTimeout(function(){b.style.display='none';},8000);}
    wrap.style.display='block';
    if(soundEnabled) playBeep();
    try{navigator.vibrate([200,100,200,100,400]);}catch(e){}
  }
  function playBeep() {
    try {
      var ctx=new(window.AudioContext||window.webkitAudioContext)();
      [0,0.22,0.44].forEach(function(o){
        var osc=ctx.createOscillator(),g=ctx.createGain();
        osc.connect(g);g.connect(ctx.destination);osc.frequency.value=880;
        g.gain.setValueAtTime(0.3,ctx.currentTime+o);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+o+0.18);
        osc.start(ctx.currentTime+o);osc.stop(ctx.currentTime+o+0.22);
      });
    }catch(e){}
  }

  function reassignHits() {
    var offset=0;
    for(var i=0;i<members.length;i++){
      if(members[i].status==='done') continue;
      offset++; members[i].hitNum=chainCount+offset;
    }
  }
  function renderQueue() {
    var list=document.getElementById('ctlist'), dot=document.getElementById('ctdot'), qn=document.getElementById('ctqn');
    if(!list) return;
    var ml=playerName?playerName.toLowerCase():'';
    var pending=members.filter(function(m){return m.status!=='done';});
    if(dot) dot.style.background=members.some(function(m){return m.status==='up';})?'#1D9E75':'#4a4f66';
    if(qn) qn.textContent=pending.length?pending.length+' in queue':'';
    if(!members.length){list.innerHTML='<div style="color:#4a4f66;font-size:11px;text-align:center;padding:10px 0;">Add members to build the queue.</div>';return;}
    list.innerHTML='';
    for(var i=0;i<members.length;i++){
      (function(idx){
        var m=members[idx],isMe=ml&&m.name.toLowerCase()===ml,col=pickColor(m.name);
        var row=document.createElement('div');
        row.className='ctr'+(m.status==='up'?' up':m.status==='done'?' dn':isMe?' me':'');
        var av=document.createElement('div'); av.className='ctav'; av.style.cssText='background:'+col+'22;color:'+col; av.textContent=initials(m.name);
        var nm=document.createElement('span'); nm.className='ctnm'; nm.textContent=m.name+(isMe?' (you)':'');
        var hn=document.createElement('span'); hn.className='cthn'+(m.status==='up'?' up':isMe?' me':''); hn.textContent='#'+m.hitNum;
        var bdg=document.createElement('span'); bdg.className='ctbdg '+(m.status==='up'?'up':m.status==='done'?'dn':isMe?'me':'wt'); bdg.textContent=m.status==='up'?'Up now':m.status==='done'?'Done':'Waiting';
        var rm=document.createElement('button'); rm.className='ctrm'; rm.textContent='x';
        rm.addEventListener('click',function(){
          var wasUp=members[idx].status==='up';
          members.splice(idx,1);
          if(wasUp){for(var j=0;j<members.length;j++){if(members[j].status==='waiting'){members[j].status='up';break;}}}
          reassignHits(); renderQueue(); pushQueue();
        });
        row.appendChild(av);row.appendChild(nm);row.appendChild(hn);row.appendChild(bdg);row.appendChild(rm);
        list.appendChild(row);
      })(i);
    }
  }
  function addMember() {
    var inp=document.getElementById('ctinp'); if(!inp) return;
    var name=inp.value.trim(); if(!name) return;
    var isFirst=!members.some(function(m){return m.status!=='done';});
    members.push({name:name,status:isFirst?'up':'waiting',hitNum:0});
    reassignHits(); inp.value=''; renderQueue(); pushQueue();
  }
  function claimSlot() {
    if(!playerName){showInfo('Player name not detected yet.');return;}
    var ml=playerName.toLowerCase();
    for(var i=0;i<members.length;i++){
      if(members[i].name.toLowerCase()===ml&&members[i].status!=='done'){
        showInfo(members[i].status==='up'?'You are already up now!':'You are in the queue at hit #'+members[i].hitNum+'.'); return;
      }
    }
    var isFirst=!members.some(function(m){return m.status!=='done';});
    members.push({name:playerName,status:isFirst?'up':'waiting',hitNum:0});
    reassignHits(); renderQueue(); pushQueue();
  }
  function markDone() {
    for(var i=0;i<members.length;i++){
      if(members[i].status==='up'){
        members[i].status='done';
        for(var j=0;j<members.length;j++){if(members[j].status==='waiting'){members[j].status='up';break;}}
        alertFired=false; reassignHits(); renderQueue(); pushQueue(); return;
      }
    }
  }
  function resetQueue() {
    members=[]; chainCount=0; prevChainCount=-1;
    alertFired=false; renderQueue(); pushQueue();
  }
  function toggleSound() {
    soundEnabled=!soundEnabled;
    var b=document.getElementById('ctsound'); if(!b) return;
    b.textContent=soundEnabled?'Sound on':'Sound off';
    if(soundEnabled) b.classList.add('on'); else b.classList.remove('on');
  }

  function pushQueue() { pushLockUntil = Date.now() + 3000; doPost(TRACKER_URL+'/queue',{members:members,chainCount:chainCount},null); }
  function checkPersonalAlert(incoming) {
    if(!playerName) return;
    var ml=playerName.toLowerCase();
    var wasUp=members.some(function(m){return m.name.toLowerCase()===ml&&m.status==='up';});
    var nowUp=incoming.some(function(m){return m.name.toLowerCase()===ml&&m.status==='up';});
    if(nowUp&&!wasUp){
      var me=incoming.find(function(m){return m.name.toLowerCase()===ml;});
      showAlert('Your turn, '+playerName+'! Attack NOW \u2014 hit #'+(me?me.hitNum:''));
    }
  }
  function schedulePull(delay) { setTimeout(doPull, delay||5000); }
  function doPull() {
    doGet(TRACKER_URL+'/queue', function(data) {
      setSyncStatus(true);
      if(Date.now() < pushLockUntil) { schedulePull(5000); return; }
      var incoming=data.members||[], incomingCount=data.chainCount||0;
      if(prevChainCount===-1) prevChainCount=incomingCount;
      if(JSON.stringify(members)!==JSON.stringify(incoming)||incomingCount!==chainCount){
        if(prevChainCount!==-1&&incomingCount>prevChainCount){
          var diff=incomingCount-prevChainCount;
          if(incoming.filter(function(m){return m.status!=='done';}).length>0&&diff>0)
            showInfo(diff===1?'Hit #'+incomingCount+' landed \u2014 queue advanced.':diff+' hits landed.');
        }
        checkPersonalAlert(incoming);
        prevChainCount=incomingCount; members=incoming; chainCount=incomingCount;
        var el=document.getElementById('ctmc'); if(el) el.textContent=chainCount.toLocaleString();
        renderQueue();
      }
      schedulePull(5000);
    }, function(){ setSyncStatus(false); schedulePull(10000); });
  }

  function updateTimer(secs) {
    if(!secs||secs<0) secs=0;
    var el=document.getElementById('ctmt'),bar=document.getElementById('cttf'); if(!el) return;
    el.textContent=toMMSS(secs);
    if(bar){ bar.style.width=Math.min(100,Math.max(0,(secs/300)*100))+'%';
      if(secs<=45){bar.style.background='#E24B4A';el.style.color='#E24B4A';}
      else if(secs<=90){bar.style.background='#EF9F27';el.style.color='#FAC775';}
      else{bar.style.background='#1D9E75';el.style.color='#5DCAA5';}
    }
    if(secs<=45&&secs>0&&!alertFired){
      alertFired=true;
      var up=null; for(var i=0;i<members.length;i++){if(members[i].status==='up'){up=members[i];break;}}
      showAlert('Chain drops in '+toMMSS(secs)+' \u2014 '+(up?up.name:'next attacker')+', attack NOW!');
    }
    if(secs>45) alertFired=false;
  }
  function startCountdown(seconds) {
    if(localTick) clearInterval(localTick);
    localTimeout=Math.round(seconds); updateTimer(localTimeout);
    localTick=setInterval(function(){ if(localTimeout>0) localTimeout--; updateTimer(localTimeout); },1000);
  }

  function fetchPlayerName(key) {
    doGet('https://api.torn.com/user/?selections=basic&key='+key, function(data){
      if(data.name){ playerName=data.name; var el=document.getElementById('ctpname'); if(el) el.textContent=playerName; }
    }, function(){});
  }
  function scheduleChain(key, delay) { setTimeout(function(){ doChain(key); }, delay||0); }
  function doChain(key) {
    doGet('https://api.torn.com/faction/?selections=chain&key='+key, function(data){
      if(!data.error){
        var c=data.chain, newCount=c.current||0;
        prevChainCount=newCount; chainCount=newCount;
        var ce=document.getElementById('ctmc'),mm=document.getElementById('ctmm');
        if(ce) ce.textContent=chainCount.toLocaleString();
        if(mm) mm.textContent='x'+parseFloat(c.modifier||1).toFixed(2);
        reassignHits(); renderQueue();
        startCountdown(c.timeout||0);
      }
      scheduleChain(key, 15000);
    }, function(){ scheduleChain(key, 15000); });
  }

  function init() {
    var key = API_KEY;
    if(!key||key==='###PDA-APIKEY###'||key.length<10){
      key=localStorage.getItem('ct-pda-key')||'';
      if(!key){
        key=prompt('Chain Tracker: Enter your Torn API key');
        if(key&&key.trim()) localStorage.setItem('ct-pda-key',key.trim());
      }
    }
    key=(key||'').trim();
    if(key){ fetchPlayerName(key); scheduleChain(key, 0); }
    renderQueue();
    doPull();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(init,2000);});
  } else {
    setTimeout(init,2000);
  }

})();
