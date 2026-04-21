// ==UserScript==
// @name         Torn Chain Tracker - Floating Panel
// @namespace    https://torn.com
// @version      2.4
// @description  Floating chain queue panel — syncs with your shared tracker backend. Works in Tampermonkey and TornPDA.
// @author       LordGraham
// @downloadURL https://raw.githubusercontent.com/grahampler/TornChainQueue/main/PC.user.js
// @updateURL   https://raw.githubusercontent.com/grahampler/TornChainQueue/main/PC.user.js
// @match        https://www.torn.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      chain.lordluzer.xyz
// @connect      api.torn.com
// ==/UserScript==

(function() {
  'use strict';

  var TRACKER_URL = 'https://chain.lordluzer.xyz';

  var members = [];
  var chainCount = 0;
  var prevChainCount = -1;
  var alertFired = false;
  var apiKey = '';
  var playerName = '';
  var soundEnabled = false;
  var localTimeout = 0;
  var localTick = null;
  var isSyncing = false;
  var infoBannerTimer = null;
  var panelDragging = false;
  var panelDragOffX = 0;
  var panelDragOffY = 0;
  var tDragging = false;
  var tMoved = false;
  var tOffX = 0, tOffY = 0;
  var tStartX = 0, tStartY = 0;

  var COLORS = ['#534AB7','#1D9E75','#D85A30','#185FA5','#854F0B','#993556','#0F6E56','#3C3489'];

  function httpGet(url, callback, errback) {
    if (typeof GM_xmlhttpRequest !== 'undefined') {
      GM_xmlhttpRequest({ method: 'GET', url: url,
        onload: function(r) { try { callback(JSON.parse(r.responseText)); } catch(e) { if(errback) errback(e); } },
        onerror: function() { if(errback) errback(new Error('request failed')); }
      });
    } else {
      fetch(url).then(function(r){ return r.json(); }).then(callback).catch(errback || function(){});
    }
  }

  function httpPost(url, data, callback, errback) {
    if (typeof GM_xmlhttpRequest !== 'undefined') {
      GM_xmlhttpRequest({ method: 'POST', url: url,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(data),
        onload: function() { if(callback) callback(); },
        onerror: function() { if(errback) errback(new Error('request failed')); }
      });
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(callback || function(){}).catch(errback || function(){});
    }
  }

  GM_addStyle(
    '#ct-toggle{position:fixed;bottom:60px;right:0;z-index:999998;background:#534AB7;color:#fff;border:none;padding:8px 10px;border-radius:8px 0 0 8px;font-size:12px;font-weight:500;cursor:grab;font-family:sans-serif;writing-mode:vertical-rl;user-select:none;}' +
    '#ct-toggle:hover{background:#3C3489;}' +
    '#ct-panel{position:fixed;bottom:60px;right:10px;z-index:999999;width:320px;background:#0f1117;border:0.5px solid #2e3147;border-radius:12px;font-family:sans-serif;font-size:13px;color:#e8eaf6;box-shadow:0 8px 32px rgba(0,0,0,0.6);overflow:hidden;}' +
    '#ct-panel.ct-hidden{display:none;}' +
    '#ct-header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1a1d27;border-bottom:0.5px solid #2e3147;cursor:grab;user-select:none;}' +
    '.ct-live-dot{width:7px;height:7px;border-radius:50%;background:#4a4f66;flex-shrink:0;}' +
    '.ct-live-dot.on{background:#1D9E75;}' +
    '#ct-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 10px;border-bottom:0.5px solid #2e3147;}' +
    '.ct-metric{background:#1a1d27;border:0.5px solid #2e3147;border-radius:6px;padding:6px 8px;}' +
    '.ct-mlabel{font-size:10px;color:#7b8098;margin-bottom:2px;text-transform:uppercase;}' +
    '.ct-mvalue{font-size:16px;font-weight:500;color:#e8eaf6;font-variant-numeric:tabular-nums;}' +
    '.ct-tbar-wrap{height:4px;background:#2e3147;border-radius:2px;overflow:hidden;margin-top:4px;}' +
    '.ct-tbar{height:100%;border-radius:2px;transition:width 1s linear,background 0.3s;background:#2e3147;}' +
    '#ct-info{display:none;margin:6px 10px 0;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:500;background:#0d1f18;color:#5DCAA5;border:0.5px solid #1D9E75;}' +
    '#ct-alert{display:none;margin:6px 10px 0;padding:8px 10px;border-radius:6px;font-size:12px;font-weight:500;background:#1e1608;color:#FAC775;border:1px solid #BA7517;line-height:1.4;}' +
    '#ct-qwrap{max-height:200px;overflow-y:auto;padding:6px 10px;}' +
    '#ct-qwrap::-webkit-scrollbar{width:3px;}' +
    '#ct-qwrap::-webkit-scrollbar-thumb{background:#2e3147;border-radius:2px;}' +
    '.ct-qi{display:grid;grid-template-columns:26px 1fr auto auto auto auto;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;border:0.5px solid #2e3147;background:#13151f;margin-bottom:4px;}' +
    '.ct-qi.is-up{border:1.5px solid #1D9E75;background:#0d1f18;}' +
    '.ct-qi.is-me{border:1.5px solid #534AB7;background:#13111f;}' +
    '.ct-qi.is-done{opacity:0.3;}' +
    '.ct-qi.is-backup{border:1.5px solid #BA7517;background:#1e1608;}' +
    '.ct-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;}' +
    '.ct-qname{font-size:12px;font-weight:500;color:#e8eaf6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.ct-qhit{font-size:11px;color:#7b8098;white-space:nowrap;}' +
    '.ct-qhit.up{color:#5DCAA5;font-weight:500;}' +
    '.ct-qhit.me{color:#AFA9EC;font-weight:500;}' +
    '.ct-qhit.backup{color:#FAC775;font-weight:500;}' +
    '.ct-bdg{font-size:10px;padding:2px 6px;border-radius:4px;font-weight:500;white-space:nowrap;}' +
    '.ct-bdg.up{background:#0d2e20;color:#5DCAA5;border:0.5px solid #1D9E75;}' +
    '.ct-bdg.wait{background:#1e2130;color:#7b8098;}' +
    '.ct-bdg.done{background:#181b27;color:#4a4f66;}' +
    '.ct-bdg.me{background:#13111f;color:#AFA9EC;border:0.5px solid #534AB7;}' +
    '.ct-bdg.backup{background:#1e1608;color:#FAC775;border:0.5px solid #BA7517;}' +
    '.ct-rm{width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#4a4f66;background:transparent;border:0.5px solid #2e3147;border-radius:4px;cursor:pointer;padding:0;}' +
    '.ct-skip{width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#FAC775;background:transparent;border:0.5px solid #BA7517;border-radius:4px;cursor:pointer;padding:0;}' +
    '#ct-addrow{display:flex;gap:6px;padding:0 10px 8px;}' +
    '#ct-addinp{flex:1;height:30px;border:0.5px solid #2e3147;border-radius:6px;padding:0 8px;font-size:12px;background:#13151f;color:#e8eaf6;outline:none;font-family:sans-serif;}' +
    '#ct-addinp:focus{border-color:#534AB7;}' +
    '#ct-addbtn{height:30px;padding:0 10px;border:0.5px solid #2e3147;border-radius:6px;background:#1e2130;color:#c8cae0;cursor:pointer;font-size:12px;font-family:sans-serif;}' +
    '#ct-controls{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 10px 8px;}' +
    '#ct-controls button{height:28px;border:0.5px solid #2e3147;border-radius:6px;font-size:11px;font-weight:500;background:#1e2130;color:#c8cae0;cursor:pointer;font-family:sans-serif;}' +
    '#ct-controls button:hover{background:#262a3d;}' +
    '#ct-btn-claim{background:#1D9E75!important;color:#fff!important;border-color:#1D9E75!important;}' +
    '#ct-btn-backup{background:#1e1608!important;color:#FAC775!important;border-color:#BA7517!important;}' +
    '#ct-btn-reset{color:#E24B4A!important;border-color:#4a1515!important;background:transparent!important;grid-column:span 2;}' +
    '#ct-btn-sound.on{background:#534AB7!important;color:#fff!important;border-color:#534AB7!important;}' +
    '#ct-playingas{font-size:10px;color:#4a4f66;padding:0 10px 8px;}' +
    '#ct-playingas b{color:#534AB7;font-weight:500;}' +
    '#ct-footer{padding:4px 10px 6px;border-top:0.5px solid #2e3147;display:flex;align-items:center;justify-content:space-between;}' +
    '.ct-sync{font-size:10px;color:#4a4f66;display:flex;align-items:center;gap:4px;}' +
    '.ct-sdot{width:5px;height:5px;border-radius:50%;background:#4a4f66;}' +
    '.ct-sdot.ok{background:#1D9E75;}' +
    '.ct-sdot.err{background:#E24B4A;}' +
    '.ct-credit{font-size:10px;color:#2e3147;}' +
    '.ct-credit b{color:#534AB7;font-weight:500;}'
  );

  function buildUI() {
    var toggle = document.createElement('button');
    toggle.id = 'ct-toggle';
    toggle.textContent = 'Chain Tracker';
    document.body.appendChild(toggle);

    var panel = document.createElement('div');
    panel.id = 'ct-panel';
    panel.className = 'ct-hidden';
    panel.innerHTML =
      '<div id="ct-header">' +
        '<div class="ct-live-dot" id="ct-ldot"></div>' +
        '<span style="flex:1;font-size:13px;font-weight:500;color:#e8eaf6;">Attack queue</span>' +
        '<span id="ct-qcount" style="font-size:11px;color:#4a4f66;margin-right:8px;"></span>' +
        '<button id="ct-closebtn" style="background:none;border:none;color:#4a4f66;cursor:pointer;font-size:16px;padding:0;line-height:1;">&#x2715;</button>' +
      '</div>' +
      '<div id="ct-metrics">' +
        '<div class="ct-metric"><div class="ct-mlabel">Chain</div><div class="ct-mvalue" id="ct-mcount">&mdash;</div></div>' +
        '<div class="ct-metric"><div class="ct-mlabel">Time</div><div class="ct-mvalue" id="ct-mtimer" style="font-size:16px;">&mdash;</div><div class="ct-tbar-wrap"><div class="ct-tbar" id="ct-tbar"></div></div></div>' +
        '<div class="ct-metric"><div class="ct-mlabel">Multiplier</div><div class="ct-mvalue" id="ct-mmult">&mdash;</div></div>' +
      '</div>' +
      '<div id="ct-alert"></div>' +
      '<div id="ct-info"></div>' +
      '<div id="ct-qwrap"><div id="ct-qlist"></div></div>' +
      '<div id="ct-addrow"><input type="text" id="ct-addinp" placeholder="Member name" /><button id="ct-addbtn">+ Add</button></div>' +
      '<div id="ct-controls">' +
        '<button id="ct-btn-claim">Claim slot (+1)</button>' +
        '<button id="ct-btn-backup">Claim backup</button>' +
        '<button id="ct-btn-done">Mark done</button>' +
        '<button id="ct-btn-sound">Sound off</button>' +
        '<button id="ct-btn-reset">Reset queue</button>' +
      '</div>' +
      '<div id="ct-playingas">Playing as: <b id="ct-pname">detecting...</b></div>' +
      '<div id="ct-footer">' +
        '<div class="ct-sync"><div class="ct-sdot" id="ct-sdot"></div><span id="ct-slabel">connecting...</span></div>' +
        '<div class="ct-credit">by <b>LordGraham</b></div>' +
      '</div>';
    document.body.appendChild(panel);

    var savedPos = localStorage.getItem('ct-panel-pos');
    if (savedPos) {
      try {
        var pos = JSON.parse(savedPos);
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        panel.style.left = pos.left + 'px'; panel.style.top = pos.top + 'px';
      } catch(e) {}
    }

    var savedTogglePos = localStorage.getItem('ct-toggle-pos');
    if (savedTogglePos) {
      try {
        var tpos = JSON.parse(savedTogglePos);
        toggle.style.right = 'auto'; toggle.style.bottom = 'auto';
        toggle.style.left = tpos.left + 'px'; toggle.style.top = tpos.top + 'px';
      } catch(e) {}
    }

    toggle.addEventListener('mousedown', function(e) {
      tMoved = false; tDragging = true;
      tStartX = e.clientX; tStartY = e.clientY;
      var r = toggle.getBoundingClientRect();
      tOffX = e.clientX - r.left; tOffY = e.clientY - r.top;
    });

    document.addEventListener('mousemove', function(e) {
      if (!tDragging) return;
      if (Math.abs(e.clientX - tStartX) > 5 || Math.abs(e.clientY - tStartY) > 5) {
        tMoved = true;
        var x = Math.max(0, Math.min(e.clientX - tOffX, window.innerWidth - toggle.offsetWidth));
        var y = Math.max(0, Math.min(e.clientY - tOffY, window.innerHeight - toggle.offsetHeight));
        toggle.style.right = 'auto'; toggle.style.bottom = 'auto';
        toggle.style.left = x + 'px'; toggle.style.top = y + 'px';
      }
    });

    document.addEventListener('mouseup', function() {
      if (!tDragging) return;
      tDragging = false;
      if (tMoved) {
        localStorage.setItem('ct-toggle-pos', JSON.stringify({ left: parseInt(toggle.style.left) || 0, top: parseInt(toggle.style.top) || 0 }));
      } else {
        panel.classList.toggle('ct-hidden');
      }
      tMoved = false;
    });

    document.getElementById('ct-closebtn').addEventListener('click', function() {
      panel.classList.add('ct-hidden');
    });

    var hdr = document.getElementById('ct-header');
    hdr.addEventListener('mousedown', function(e) {
      if (e.target.id === 'ct-closebtn') return;
      panelDragging = true;
      var r = panel.getBoundingClientRect();
      panelDragOffX = e.clientX - r.left; panelDragOffY = e.clientY - r.top;
    });
    document.addEventListener('mousemove', function(e) {
      if (!panelDragging) return;
      var x = Math.max(0, Math.min(e.clientX - panelDragOffX, window.innerWidth - 320));
      var y = Math.max(0, Math.min(e.clientY - panelDragOffY, window.innerHeight - 100));
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      panel.style.left = x + 'px'; panel.style.top = y + 'px';
    });
    document.addEventListener('mouseup', function() {
      if (panelDragging) {
        panelDragging = false;
        localStorage.setItem('ct-panel-pos', JSON.stringify({ left: parseInt(panel.style.left) || 0, top: parseInt(panel.style.top) || 0 }));
      }
    });

    document.getElementById('ct-addbtn').addEventListener('click', addMember);
    document.getElementById('ct-addinp').addEventListener('keydown', function(e) { if (e.key === 'Enter') addMember(); });
    document.getElementById('ct-btn-claim').addEventListener('click', claimSlot);
    document.getElementById('ct-btn-backup').addEventListener('click', claimBackup);
    document.getElementById('ct-btn-done').addEventListener('click', markDone);
    document.getElementById('ct-btn-reset').addEventListener('click', resetQueue);
    document.getElementById('ct-btn-sound').addEventListener('click', toggleSound);
  }

  function toMMSS(s) {
    if (!s || s < 0) s = 0;
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function initials(n) {
    return n.trim().split(/\s+/).map(function(w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2) || '?';
  }

  function pickColor(n) {
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % COLORS.length;
    return COLORS[h];
  }

  function setSyncStatus(ok) {
    var d = document.getElementById('ct-sdot');
    var l = document.getElementById('ct-slabel');
    if (!d) return;
    d.className = ok ? 'ct-sdot ok' : 'ct-sdot err';
    l.textContent = ok ? 'synced' : 'sync error';
  }

  function pushQueue() {
    httpPost(TRACKER_URL + '/queue', { members: members, chainCount: chainCount },
      function() { setSyncStatus(true); },
      function() { setSyncStatus(false); }
    );
  }

  function checkPersonalAlert(incoming) {
    if (!playerName) return;
    var ml = playerName.toLowerCase();
    var wasUp = members.some(function(m) { return m.name.toLowerCase() === ml && m.status === 'up' && !m.isBackup; });
    var nowUp = incoming.some(function(m) { return m.name.toLowerCase() === ml && m.status === 'up' && !m.isBackup; });
    var wasBackup = members.some(function(m) { return m.name.toLowerCase() === ml && m.isBackup; });
    if (nowUp && !wasUp) {
      var me = incoming.find(function(m) { return m.name.toLowerCase() === ml && m.status === 'up'; });
      if (wasBackup) {
        showAlert('Backup promoted! ' + playerName + ', attack NOW \u2014 hit #' + (me ? me.hitNum : ''));
      } else {
        showAlert('Your turn, ' + playerName + '! Attack NOW \u2014 hit #' + (me ? me.hitNum : ''));
      }
    }
  }

  function pullQueue() {
    if (isSyncing) return;
    isSyncing = true;
    httpGet(TRACKER_URL + '/queue', function(data) {
      isSyncing = false;
      setSyncStatus(true);
      var incoming = data.members || [];
      var incomingCount = data.chainCount || 0;
      if (prevChainCount === -1) prevChainCount = incomingCount;
      if (JSON.stringify(members) !== JSON.stringify(incoming) || incomingCount !== chainCount) {
        if (prevChainCount !== -1 && incomingCount > prevChainCount) {
          var diff = incomingCount - prevChainCount;
          var pending = incoming.filter(function(m) { return m.status !== 'done' && !m.isBackup; });
          if (pending.length > 0 && diff > 0) {
            showInfo(diff === 1
              ? 'Hit #' + incomingCount + ' landed \u2014 queue advanced.'
              : diff + ' hits landed \u2014 queue advanced.');
          }
        }
        checkPersonalAlert(incoming);
        prevChainCount = incomingCount;
        members = incoming;
        chainCount = incomingCount;
        var el = document.getElementById('ct-mcount');
        if (el) el.textContent = chainCount.toLocaleString();
        renderQueue();
      }
    }, function() { isSyncing = false; setSyncStatus(false); });
  }

  function reassignHits() {
    var offset = 0;
    for (var i = 0; i < members.length; i++) {
      if (members[i].status === 'done') continue;
      if (members[i].isBackup) continue;
      offset++;
      members[i].hitNum = chainCount + offset;
    }
  }

  function findBackupIndex() {
    for (var i = 0; i < members.length; i++) {
      if (members[i].isBackup) return i;
    }
    return -1;
  }

  function findUpIndex() {
    for (var i = 0; i < members.length; i++) {
      if (members[i].status === 'up' && !members[i].isBackup) return i;
    }
    return -1;
  }

  function renderQueue() {
    var list = document.getElementById('ct-qlist');
    var ldot = document.getElementById('ct-ldot');
    var qcount = document.getElementById('ct-qcount');
    if (!list) return;
    var ml = playerName ? playerName.toLowerCase() : '';
    var pending = members.filter(function(m) { return m.status !== 'done' && !m.isBackup; });
    if (ldot) ldot.className = members.some(function(m) { return m.status === 'up'; }) ? 'ct-live-dot on' : 'ct-live-dot';
    if (qcount) qcount.textContent = pending.length ? pending.length + ' in queue' : '';
    if (!members.length) {
      list.innerHTML = '<div style="color:#4a4f66;font-size:12px;text-align:center;padding:12px 0;">Add members to build the queue.</div>';
      return;
    }

    // Display order: up first, backup second, then rest in order
    var upIdx = findUpIndex();
    var backupIdx = findBackupIndex();
    var sorted = [];
    if (upIdx !== -1) sorted.push(upIdx);
    if (backupIdx !== -1) sorted.push(backupIdx);
    for (var i = 0; i < members.length; i++) {
      if (i !== upIdx && i !== backupIdx) sorted.push(i);
    }

    list.innerHTML = '';
    for (var s = 0; s < sorted.length; s++) {
      (function(idx) {
        var m = members[idx];
        var isMe = ml && m.name.toLowerCase() === ml;
        var col = pickColor(m.name);
        var row = document.createElement('div');

        if (m.isBackup) {
          row.className = 'ct-qi is-backup';
        } else {
          row.className = 'ct-qi' + (m.status === 'up' ? ' is-up' : m.status === 'done' ? ' is-done' : isMe ? ' is-me' : '');
        }

        var av = document.createElement('div');
        av.className = 'ct-av';
        av.style.cssText = 'background:' + col + '22;color:' + col;
        av.textContent = initials(m.name);

        var nm = document.createElement('span');
        nm.className = 'ct-qname';
        nm.textContent = m.name + (isMe ? ' (you)' : '');

        var hn = document.createElement('span');
        if (m.isBackup) {
          hn.className = 'ct-qhit backup';
          hn.textContent = 'bkp';
        } else {
          hn.className = 'ct-qhit' + (m.status === 'up' ? ' up' : isMe ? ' me' : '');
          hn.textContent = '#' + m.hitNum;
        }

        var bdg = document.createElement('span');
        if (m.isBackup) {
          bdg.className = 'ct-bdg backup';
          bdg.textContent = 'Backup';
        } else {
          bdg.className = 'ct-bdg ' + (m.status === 'up' ? 'up' : m.status === 'done' ? 'done' : isMe ? 'me' : 'wait');
          bdg.textContent = m.status === 'up' ? 'Up now' : m.status === 'done' ? 'Done' : 'Waiting';
        }

        // Skip button on the "up" row when a backup exists
        if (m.status === 'up' && !m.isBackup && backupIdx !== -1) {
          var skip = document.createElement('button');
          skip.className = 'ct-skip';
          skip.title = 'Skip — promote backup';
          skip.textContent = '\u23ED';
          skip.addEventListener('click', function() { skipToBackup(); });
          row.appendChild(av); row.appendChild(nm); row.appendChild(hn); row.appendChild(bdg); row.appendChild(skip);
        } else {
          var rm = document.createElement('button');
          rm.className = 'ct-rm';
          rm.textContent = 'x';
          rm.addEventListener('click', function() {
            var wasUp = members[idx].status === 'up' && !members[idx].isBackup;
            members.splice(idx, 1);
            if (wasUp) {
              var bi = findBackupIndex();
              if (bi !== -1) {
                members[bi].isBackup = false;
                members[bi].status = 'up';
              } else {
                for (var j = 0; j < members.length; j++) {
                  if (members[j].status === 'waiting') { members[j].status = 'up'; break; }
                }
              }
            }
            reassignHits(); renderQueue(); pushQueue();
          });
          row.appendChild(av); row.appendChild(nm); row.appendChild(hn); row.appendChild(bdg); row.appendChild(rm);
        }

        list.appendChild(row);
      })(sorted[s]);
    }
  }

  function addMember() {
    var inp = document.getElementById('ct-addinp');
    if (!inp) return;
    var name = inp.value.trim();
    if (!name) return;
    var isFirst = !members.some(function(m) { return m.status !== 'done' && !m.isBackup; });
    members.push({ name: name, status: isFirst ? 'up' : 'waiting', hitNum: 0, isBackup: false });
    reassignHits(); inp.value = ''; renderQueue(); pushQueue();
  }

  function claimSlot() {
    if (!playerName) { showInfo('Player name not detected yet, please wait...'); return; }
    var isFirst = !members.some(function(m) { return m.status !== 'done' && !m.isBackup; });
    members.push({ name: playerName, status: isFirst ? 'up' : 'waiting', hitNum: 0, isBackup: false });
    reassignHits(); renderQueue(); pushQueue();
    var existing = members.filter(function(m) { return m.name.toLowerCase() === playerName.toLowerCase() && m.status !== 'done' && !m.isBackup; });
    showInfo('Claimed slot \u2014 you have ' + existing.length + ' slot(s) in queue.');
  }

  function claimBackup() {
    if (!playerName) { showInfo('Player name not detected yet, please wait...'); return; }
    var bi = findBackupIndex();
    if (bi !== -1) {
      showInfo('Backup already set: ' + members[bi].name + '. Remove them first.');
      return;
    }
    var ui = findUpIndex();
    if (ui === -1) {
      showInfo('Nobody is up right now \u2014 no backup needed yet.');
      return;
    }
    members.push({ name: playerName, status: 'waiting', hitNum: 0, isBackup: true });
    renderQueue(); pushQueue();
    showInfo(playerName + ' is now backup for ' + members[ui].name + '.');
  }

  function skipToBackup() {
    var ui = findUpIndex();
    var bi = findBackupIndex();
    if (ui === -1 || bi === -1) return;
    var skippedName = members[ui].name;
    // Move skipped person back to waiting at end of queue
    members[ui].status = 'waiting';
    // Promote backup to up
    members[bi].isBackup = false;
    members[bi].status = 'up';
    alertFired = false;
    reassignHits(); renderQueue(); pushQueue();
    showInfo(members[bi].name + ' promoted. ' + skippedName + ' moved to end of queue.');
  }

  function markDone() {
    for (var i = 0; i < members.length; i++) {
      if (members[i].status === 'up' && !members[i].isBackup) {
        members[i].status = 'done';
        // Promote backup to up first if present, else next waiting
        var bi = findBackupIndex();
        if (bi !== -1) {
          members[bi].isBackup = false;
          members[bi].status = 'up';
        } else {
          for (var j = 0; j < members.length; j++) {
            if (members[j].status === 'waiting') { members[j].status = 'up'; break; }
          }
        }
        alertFired = false; reassignHits(); renderQueue(); pushQueue(); return;
      }
    }
  }

  function resetQueue() {
    members = []; chainCount = 0; prevChainCount = -1;
    alertFired = false; renderQueue(); pushQueue();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    var btn = document.getElementById('ct-btn-sound');
    if (!btn) return;
    btn.textContent = soundEnabled ? 'Sound on' : 'Sound off';
    if (soundEnabled) btn.classList.add('on'); else btn.classList.remove('on');
  }

  function showInfo(msg) {
    var b = document.getElementById('ct-info');
    if (!b) return;
    b.textContent = msg; b.style.display = 'block';
    if (infoBannerTimer) clearTimeout(infoBannerTimer);
    infoBannerTimer = setTimeout(function() { b.style.display = 'none'; }, 5000);
  }

  function showAlert(msg) {
    var b = document.getElementById('ct-alert');
    if (b) { b.textContent = msg; b.style.display = 'block'; setTimeout(function() { b.style.display = 'none'; }, 8000); }
    var panel = document.getElementById('ct-panel');
    if (panel && panel.classList.contains('ct-hidden')) panel.classList.remove('ct-hidden');
    flashPanel();
    if (soundEnabled) playBeep();
    try { navigator.vibrate([200, 100, 200, 100, 400]); } catch(e) {}
  }

  function flashPanel() {
    var panel = document.getElementById('ct-panel');
    if (!panel) return;
    var count = 0;
    var iv = setInterval(function() {
      panel.style.outline = count % 2 === 0 ? '3px solid #BA7517' : 'none';
      count++;
      if (count > 7) { clearInterval(iv); panel.style.outline = 'none'; }
    }, 180);
  }

  function playBeep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22, 0.44].forEach(function(o) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + o);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + o + 0.18);
        osc.start(ctx.currentTime + o);
        osc.stop(ctx.currentTime + o + 0.22);
      });
    } catch(e) {}
  }

  function updateTimer(secs) {
    if (!secs || secs < 0) secs = 0;
    var el = document.getElementById('ct-mtimer');
    var bar = document.getElementById('ct-tbar');
    if (!el) return;
    el.textContent = toMMSS(secs);
    if (bar) {
      bar.style.width = Math.min(100, Math.max(0, (secs / 300) * 100)) + '%';
      if (secs <= 45) { bar.style.background = '#E24B4A'; el.style.color = '#E24B4A'; }
      else if (secs <= 90) { bar.style.background = '#EF9F27'; el.style.color = '#FAC775'; }
      else { bar.style.background = '#1D9E75'; el.style.color = '#5DCAA5'; }
    }
    if (secs <= 45 && secs > 0 && !alertFired) {
      alertFired = true;
      var up = null;
      for (var i = 0; i < members.length; i++) { if (members[i].status === 'up' && !members[i].isBackup) { up = members[i]; break; } }
      showAlert('Chain drops in ' + toMMSS(secs) + ' \u2014 ' + (up ? up.name : 'next attacker') + ', attack NOW!');
    }
    if (secs > 45) alertFired = false;
  }

  function startCountdown(seconds) {
    if (localTick) clearInterval(localTick);
    localTimeout = Math.round(seconds);
    updateTimer(localTimeout);
    localTick = setInterval(function() {
      if (localTimeout > 0) localTimeout--;
      updateTimer(localTimeout);
    }, 1000);
  }

  function fetchPlayerName(key) {
    httpGet('https://api.torn.com/user/?selections=basic&key=' + key, function(data) {
      if (data.name) {
        playerName = data.name;
        var el = document.getElementById('ct-pname');
        if (el) el.textContent = playerName;
      }
    }, function() {});
  }

  function fetchChain() {
    if (!apiKey) return;
    httpGet('https://api.torn.com/faction/?selections=chain&key=' + apiKey, function(data) {
        if (data.error) return;
        var c = data.chain;
        var newCount = c.current || 0;
        prevChainCount = newCount;
        chainCount = newCount;
        var ce = document.getElementById('ct-mcount');
        var me = document.getElementById('ct-mmult');
        if (ce) ce.textContent = chainCount.toLocaleString();
        if (me) me.textContent = 'x' + parseFloat(c.modifier || 1).toFixed(2);
        reassignHits(); renderQueue();
        startCountdown(c.timeout || 0);
    }, function() {});
  }

  function init() {
    buildUI();

    var saved = localStorage.getItem('ct-api-key') || '';
    if (saved) {
      apiKey = saved;
    } else {
      var key = prompt('Chain Tracker: Enter your Torn API key (saved locally, never shared)');
      if (key && key.trim()) {
        localStorage.setItem('ct-api-key', key.trim());
        apiKey = key.trim();
      }
    }

    if (apiKey) {
      fetchPlayerName(apiKey);
      fetchChain();
      setInterval(fetchChain, 15000);
    }

    pullQueue();
    setInterval(pullQueue, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1500); });
  } else {
    setTimeout(init, 1500);
  }

})();
