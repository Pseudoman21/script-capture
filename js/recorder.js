import { state, bus } from './store.js';
import { getStream } from './camera.js';

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
export const formatHint = mime
  ? 'Saving as ' + (mime.startsWith('video/mp4') ? 'MP4' : 'WebM') + '. The script overlay is never part of the recording.'
  : 'This browser cannot record video (MediaRecorder unavailable). Try Chrome.';

let recorder = null, chunks = [], startedAt = 0, elapsed = 0, timerInt = null, arming = false;

export function isRecording() { return !!recorder && recorder.state !== 'inactive'; }

const fmt = ms => {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
function tickTimer() {
  const total = elapsed + (startedAt ? Date.now() - startedAt : 0);
  bus.dispatchEvent(new CustomEvent('recording:tick', { detail: { text: fmt(total) } }));
}

export async function startRecording() {
  const stream = getStream();
  if (!stream || !mime || arming) return;
  const n = state.countdown;
  if (n > 0) {
    arming = true;
    bus.dispatchEvent(new CustomEvent('recording:status', { detail: { text: 'Starting…' } }));
    await document.querySelector('countdown-overlay').run(n);
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
  bus.dispatchEvent(new CustomEvent('recording:status', { detail: { text: 'Recording' } }));
  bus.dispatchEvent(new CustomEvent('recording:started'));
  if (state.autoScroll) document.querySelector('teleprompter-panel').setScrolling(true);
}

export function stopRecording() {
  if (!recorder || recorder.state === 'inactive') return;
  arming = false;
  recorder.stop();
  clearInterval(timerInt);
  startedAt = 0;
  document.querySelector('teleprompter-panel').setScrolling(false);
  document.body.classList.remove('recording', 'paused', 'hide-chrome');
  bus.dispatchEvent(new CustomEvent('recording:status', { detail: { text: 'Ready' } }));
  bus.dispatchEvent(new CustomEvent('recording:stopped'));
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
  bus.dispatchEvent(new CustomEvent('take:added', { detail: { take } }));
}

export function togglePause() {
  if (!recorder) return;
  if (recorder.state === 'recording') {
    recorder.pause();
    elapsed += Date.now() - startedAt;
    startedAt = 0;
    document.body.classList.add('paused');
    document.body.classList.remove('hide-chrome');
    bus.dispatchEvent(new CustomEvent('recording:status', { detail: { text: 'Paused' } }));
    bus.dispatchEvent(new CustomEvent('recording:paused'));
    document.querySelector('teleprompter-panel').setScrolling(false);
  } else if (recorder.state === 'paused') {
    recorder.resume();
    startedAt = Date.now();
    document.body.classList.remove('paused');
    document.body.classList.toggle('hide-chrome', state.hideChrome);
    bus.dispatchEvent(new CustomEvent('recording:status', { detail: { text: 'Recording' } }));
    bus.dispatchEvent(new CustomEvent('recording:resumed'));
    if (state.autoScroll) document.querySelector('teleprompter-panel').setScrolling(true);
  }
}
