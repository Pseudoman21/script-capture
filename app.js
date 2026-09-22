(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const KEY = 'script-capture:v1';

const DEFAULTS = {
  script: "Welcome — this is your teleprompter.\n\nDrag this panel by its top bar and park it right beside the lens, so your eyes stay close to camera.\n\nPress Space to roll the script, R to start recording. The script never appears in the recording.",
  rect: null,
  speed: 45,
  fontSize: 28,
  lineHeight: 1.5,
  opacity: 0.7,
  align: 'left',
  flip: false,
  mirror: true,
  guide: true,
  countdown: 3,
  autoScroll: true,
  hideChrome: false,
  quality: '1080',
  videoId: '',
  audioId: ''
};

let state = Object.assign({}, DEFAULTS);
try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

let saveTimer;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }, 200);
};

// ---------- elements ----------
const video = $('#preview');
const prompter = $('#prompter');
const bar = $('#prompterBar');
const body = $('#prompterBody');
const view = $('#scriptView');
const edit = $('#scriptEdit');
const handle = $('#resizeHandle');
const drawer = $('#drawer');
const gate = $('#gate');
const timerEl = $('#timer');
const recordBtn = $('#recordBtn');
const pauseBtn = $('#pauseBtn');
const scrollBtn = $('#scrollBtn');
const statusText = $('#statusText');
const takesBtn = $('#takesBtn');
const review = $('#review');
const reviewVideo = $('#reviewVideo');
const takesList = $('#takesList');

// ---------- prompter geometry ----------
function defaultRect() {
  const w = Math.min(460, innerWidth - 40);
  const h = Math.min(380, innerHeight - 220);
  return { x: Math.round((innerWidth - w) / 2), y: 88, w, h };
}
function applyRect(r) {
  const w = Math.max(220, Math.min(r.w, innerWidth - 16));
  const h = Math.max(150, Math.min(r.h, innerHeight - 16));
  const x = Math.max(8, Math.min(r.x, innerWidth - w - 8));
  const y = Math.max(8, Math.min(r.y, innerHeight - h - 8));
  state.rect = { x, y, w, h };
  Object.assign(prompter.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  updatePadding();
  save();
}
function updatePadding() {
  const h = body.clientHeight || 300;
  document.documentElement.style.setProperty('--pad-top', Math.round(h * 0.34) + 'px');
  document.documentElement.style.setProperty('--pad-bot', Math.round(h * 0.72) + 'px');
}

// ---------- render settings into the UI ----------
function renderScript() {
  view.textContent = state.script;
  view.style.textAlign = state.align;
}
function applyState() {
  const d = document.documentElement.style;
  d.setProperty('--fs', state.fontSize + 'px');
  d.setProperty('--lh', String(state.lineHeight));
  d.setProperty('--panel-op', String(state.opacity));
  document.body.classList.toggle('mirror', state.mirror);
  document.body.classList.toggle('flip', state.flip);
  $('#guide').hidden = !state.guide;
  $('#fsVal').textContent = state.fontSize + 'px';
  $('#lhVal').textContent = Number(state.lineHeight).toFixed(2);
  $('#spVal').textContent = state.speed + ' px/s';
  $('#opVal').textContent = Math.round(state.opacity * 100) + '%';
  $('#fontSize').value = state.fontSize;
  $('#lineHeight').value = state.lineHeight;
  $('#speed').value = state.speed;
  $('#speedQuick').value = state.speed;
  $('#opacity').value = state.opacity;
  $('#alignSel').value = state.align;
  $('#guideChk').checked = state.guide;
  $('#flipChk').checked = state.flip;
  $('#mirrorChk').checked = state.mirror;
  $('#countdownSel').value = String(state.countdown);
  $('#autoScrollChk').checked = state.autoScroll;
  $('#hideChromeChk').checked = state.hideChrome;
  $('#qualitySel').value = state.quality;
  renderScript();
  save();
}

// ---------- drag & resize ----------
function dragify(el, onMove, filter) {
  el.addEventListener('pointerdown', e => {
    if (filter && !filter(e)) return;
    el.setPointerCapture(e.pointerId);
    prompter.classList.add('dragging');
    const start = { x: e.clientX, y: e.clientY, r: Object.assign({}, state.rect) };
    const move = ev => onMove(ev.clientX - start.x, ev.clientY - start.y, start.r);
    const up = ev => {
      el.releasePointerCapture(ev.pointerId);
      prompter.classList.remove('dragging');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    e.preventDefault();
  });
}
dragify(bar, (dx, dy, r) => applyRect({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h }),
  e => !e.target.closest('button'));
dragify(handle, (dx, dy, r) => applyRect({ x: r.x, y: r.y, w: r.w + dx, h: r.h + dy }));

addEventListener('resize', () => applyRect(state.rect || defaultRect()));

// ---------- scrolling ----------
let scrolling = false, pos = 0, last = 0;
function tick(t) {
  if (!scrolling) return;
  if (!last) last = t;
  // clamp: a backgrounded tab freezes rAF, and the catch-up frame would jump the script
  pos += state.speed * Math.min((t - last) / 1000, 0.1);
  last = t;
  const max = view.scrollHeight - view.clientHeight;
  if (pos >= max) { pos = max; view.scrollTop = pos; setScrolling(false); return; }
  view.scrollTop = pos;
  requestAnimationFrame(tick);
}
function setScrolling(on) {
  scrolling = on;
  last = 0;
  scrollBtn.textContent = on ? 'Pause' : 'Scroll';
  scrollBtn.classList.toggle('on', on);
  if (on) { pos = view.scrollTop; requestAnimationFrame(tick); }
}
view.addEventListener('scroll', () => { if (!scrolling) pos = view.scrollTop; });
scrollBtn.addEventListener('click', () => setScrolling(!scrolling));
$('#rewindBtn').addEventListener('click', () => { setScrolling(false); pos = 0; view.scrollTop = 0; });

// ---------- edit mode ----------
function setEditing(on) {
  edit.hidden = !on;
  $('#editBtn').classList.toggle('on', on);
  $('#editBtn').textContent = on ? 'Done' : 'Edit';
  if (on) { setScrolling(false); edit.value = state.script; edit.focus(); }
  else { state.script = edit.value; renderScript(); save(); }
}
$('#editBtn').addEventListener('click', () => setEditing(edit.hidden));
edit.addEventListener('input', () => { state.script = edit.value; save(); });

// ---------- settings wiring ----------
const bind = (sel, prop, cast = v => v) =>
  $(sel).addEventListener('input', e => {
    state[prop] = cast(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    applyState();
  });
bind('#fontSize', 'fontSize', Number);
bind('#lineHeight', 'lineHeight', Number);
bind('#speed', 'speed', Number);
bind('#speedQuick', 'speed', Number);
bind('#opacity', 'opacity', Number);
bind('#alignSel', 'align');
bind('#guideChk', 'guide');
bind('#flipChk', 'flip');
bind('#mirrorChk', 'mirror');
bind('#autoScrollChk', 'autoScroll');
bind('#hideChromeChk', 'hideChrome');
bind('#countdownSel', 'countdown', Number);
$('#qualitySel').addEventListener('change', e => { state.quality = e.target.value; save(); startCamera(); });
$('#videoSel').addEventListener('change', e => { state.videoId = e.target.value; save(); startCamera(); });
$('#audioSel').addEventListener('change', e => { state.audioId = e.target.value; save(); startCamera(); });
$('#resetPos').addEventListener('click', () => applyRect(defaultRect()));
$('#settingsBtn').addEventListener('click', () => drawer.classList.toggle('open'));
$('#drawerClose').addEventListener('click', () => drawer.classList.remove('open'));
$('#scriptToggle').addEventListener('click', toggleScript);
function toggleScript() {
  const hidden = document.body.classList.toggle('script-hidden');
  $('#scriptToggle').textContent = hidden ? 'Show script' : 'Hide script';
}

// ---------- camera ----------
let stream = null;
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return showGate('Camera unavailable',
      'This browser blocked camera access. Open the app over http://localhost or https:// — a plain file:// page cannot use the camera in most browsers.');
  }
  if (stream) stream.getTracks().forEach(t => t.stop());
  showGate('Starting camera…', 'Allow camera and microphone access when your browser asks.');
  const h = Number(state.quality);
  const constraints = {
    video: state.videoId
      ? { deviceId: { exact: state.videoId }, width: { ideal: Math.round(h * 16 / 9) }, height: { ideal: h } }
      : { facingMode: 'user', width: { ideal: Math.round(h * 16 / 9) }, height: { ideal: h } },
    audio: state.audioId
      ? { deviceId: { exact: state.audioId }, echoCancellation: true, noiseSuppression: true }
      : { echoCancellation: true, noiseSuppression: true }
  };
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    gate.hidden = true;
    await listDevices();
  } catch (err) {
    const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    showGate(denied ? 'Camera access blocked' : 'Could not start the camera',
      denied
        ? 'Allow camera and microphone for this page in your browser, then try again.'
        : (err && err.message ? err.message : 'Unknown error') + ' — try another device or quality in Settings.');
  }
}
function showGate(title, msg) {
  $('#gate-title').textContent = title;
  $('#gate-msg').textContent = msg;
  gate.hidden = false;
}
$('#gate-retry').addEventListener('click', startCamera);

async function listDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const fill = (sel, kind, current) => {
    const el = $(sel);
    const list = devices.filter(d => d.kind === kind);
    el.innerHTML = '';
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || `${kind === 'videoinput' ? 'Camera' : 'Microphone'} ${i + 1}`;
      el.appendChild(o);
    });
    const track = stream && stream.getTracks().find(t => t.kind === (kind === 'videoinput' ? 'video' : 'audio'));
    const active = track && track.getSettings ? track.getSettings().deviceId : null;
    el.value = current || active || (list[0] && list[0].deviceId) || '';
  };
  fill('#videoSel', 'videoinput', state.videoId);
  fill('#audioSel', 'audioinput', state.audioId);
}
if (navigator.mediaDevices) navigator.mediaDevices.addEventListener('devicechange', () => { if (stream) listDevices(); });

// ---------- recording ----------
const MIMES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIMES.find(m => MediaRecorder.isTypeSupported(m)) || '';
}
const mime = pickMime();
$('#formatHint').textContent = mime
  ? 'Saving as ' + (mime.startsWith('video/mp4') ? 'MP4' : 'WebM') + '. The script overlay is never part of the recording.'
  : 'This browser cannot record video (MediaRecorder unavailable). Try Chrome.';

let recorder = null, chunks = [], startedAt = 0, elapsed = 0, timerInt = null, arming = false;
const takes = [];
let activeTake = null;

const fmt = ms => {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
function tickTimer() {
  const total = elapsed + (startedAt ? Date.now() - startedAt : 0);
  timerEl.textContent = fmt(total);
}

async function startRecording() {
  if (!stream || !mime || arming) return;
  const n = state.countdown;
  if (n > 0) {
    arming = true;
    statusText.textContent = 'Starting…';
    await runCountdown(n);
    arming = false;
  }
  chunks = [];
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = finishRecording;
  recorder.start(1000);
  elapsed = 0; startedAt = Date.now();
  timerInt = setInterval(tickTimer, 250);
  document.body.classList.add('recording');
  document.body.classList.toggle('hide-chrome', state.hideChrome);
  statusText.textContent = 'Recording';
  pauseBtn.hidden = false;
  pauseBtn.textContent = 'Pause';
  if (state.autoScroll) setScrolling(true);
}

function stopRecording() {
  if (!recorder || recorder.state === 'inactive') return;
  arming = false;
  recorder.stop();
  clearInterval(timerInt);
  startedAt = 0;
  setScrolling(false);
  document.body.classList.remove('recording', 'paused', 'hide-chrome');
  statusText.textContent = 'Ready';
  pauseBtn.hidden = true;
  timerEl.textContent = '00:00';
}

function finishRecording() {
  const blob = new Blob(chunks, { type: mime.split(';')[0] });
  chunks = [];
  if (!blob.size) return;
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  const d = new Date();
  const p = x => String(x).padStart(2, '0');
  const take = {
    id: Date.now(),
    url: URL.createObjectURL(blob),
    size: blob.size,
    name: `take-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`
  };
  takes.unshift(take);
  takesBtn.hidden = false;
  $('#takesCount').textContent = String(takes.length);
  openReview(take);
}

function togglePause() {
  if (!recorder) return;
  if (recorder.state === 'recording') {
    recorder.pause();
    elapsed += Date.now() - startedAt;
    startedAt = 0;
    document.body.classList.add('paused');
    document.body.classList.remove('hide-chrome');
    pauseBtn.textContent = 'Resume';
    statusText.textContent = 'Paused';
    setScrolling(false);
  } else if (recorder.state === 'paused') {
    recorder.resume();
    startedAt = Date.now();
    document.body.classList.remove('paused');
    document.body.classList.toggle('hide-chrome', state.hideChrome);
    pauseBtn.textContent = 'Pause';
    statusText.textContent = 'Recording';
    if (state.autoScroll) setScrolling(true);
  }
}

function runCountdown(n) {
  return new Promise(resolve => {
    const el = $('#countdown'), num = $('#countNum');
    el.hidden = false;
    let left = n;
    num.textContent = String(left);
    const int = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(int); el.hidden = true; resolve(); return; }
      num.textContent = String(left);
      num.style.animation = 'none';
      void num.offsetWidth;
      num.style.animation = '';
    }, 1000);
  });
}

recordBtn.addEventListener('click', () => {
  if (recorder && recorder.state !== 'inactive') stopRecording(); else startRecording();
  recordBtn.blur();
});
pauseBtn.addEventListener('click', () => { togglePause(); pauseBtn.blur(); });

// ---------- takes / review ----------
function openReview(take) {
  activeTake = take;
  reviewVideo.src = take.url;
  renderTakes();
  review.hidden = false;
}
function renderTakes() {
  takesList.innerHTML = '';
  takes.forEach(t => {
    const li = document.createElement('li');
    li.className = activeTake && t.id === activeTake.id ? 'active' : '';
    li.innerHTML = `<span>${t.name}</span><span class="meta">${(t.size / 1048576).toFixed(1)} MB</span>`;
    li.addEventListener('click', () => { activeTake = t; reviewVideo.src = t.url; renderTakes(); });
    takesList.appendChild(li);
  });
}
$('#downloadBtn').addEventListener('click', () => {
  if (!activeTake) return;
  const a = document.createElement('a');
  a.href = activeTake.url;
  a.download = activeTake.name;
  a.click();
});
$('#deleteBtn').addEventListener('click', () => {
  if (!activeTake) return;
  const i = takes.indexOf(activeTake);
  URL.revokeObjectURL(activeTake.url);
  takes.splice(i, 1);
  $('#takesCount').textContent = String(takes.length);
  activeTake = takes[0] || null;
  if (!activeTake) { closeReview(); takesBtn.hidden = true; return; }
  reviewVideo.src = activeTake.url;
  renderTakes();
});
function closeReview() { review.hidden = true; reviewVideo.pause(); reviewVideo.removeAttribute('src'); }
$('#reviewClose').addEventListener('click', closeReview);
takesBtn.addEventListener('click', () => { if (takes.length) openReview(activeTake || takes[0]); });

// ---------- keyboard ----------
addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT')) {
    if (e.key === 'Escape') t.blur();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === ' ') { e.preventDefault(); setScrolling(!scrolling); }
  else if (k === 'r' || k === 'R') { recordBtn.click(); }
  else if (k === 'e' || k === 'E') { setEditing(edit.hidden); }
  else if (k === 'h' || k === 'H') { toggleScript(); }
  else if (k === 'u' || k === 'U') { document.body.classList.toggle('hide-chrome'); }
  else if (k === '[' || k === 'ArrowDown') { state.speed = Math.max(5, state.speed - 5); applyState(); }
  else if (k === ']' || k === 'ArrowUp') { state.speed = Math.min(220, state.speed + 5); applyState(); }
  else if (k === '-' || k === '_') { state.fontSize = Math.max(14, state.fontSize - 2); applyState(); }
  else if (k === '=' || k === '+') { state.fontSize = Math.min(80, state.fontSize + 2); applyState(); }
  else if (k === 'Escape') { drawer.classList.remove('open'); if (!review.hidden) closeReview(); }
});

addEventListener('beforeunload', e => {
  if ((recorder && recorder.state !== 'inactive') || takes.length) { e.preventDefault(); e.returnValue = ''; }
});

// ---------- boot ----------
new ResizeObserver(updatePadding).observe(body);
applyRect(state.rect || defaultRect());
applyState();
startCamera();
})();
