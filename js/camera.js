import { state, bus } from './store.js';

let stream = null;
export function getStream() { return stream; }

export async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showGate('Camera unavailable',
      'This browser blocked camera access. Open the app over http://localhost or https:// — a plain file:// page cannot use the camera in most browsers.');
    return;
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
    document.getElementById('preview').srcObject = stream;
    bus.dispatchEvent(new CustomEvent('camera:ready'));
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
  bus.dispatchEvent(new CustomEvent('camera:status', { detail: { title, msg } }));
}

async function listDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const pick = (kind, current) => {
    const list = devices.filter(d => d.kind === kind);
    const track = stream && stream.getTracks().find(t => t.kind === (kind === 'videoinput' ? 'video' : 'audio'));
    const active = track && track.getSettings ? track.getSettings().deviceId : null;
    return { list, value: current || active || (list[0] && list[0].deviceId) || '' };
  };
  bus.dispatchEvent(new CustomEvent('camera:devices', {
    detail: { video: pick('videoinput', state.videoId), audio: pick('audioinput', state.audioId) }
  }));
}

if (navigator.mediaDevices) {
  navigator.mediaDevices.addEventListener('devicechange', () => { if (stream) listDevices(); });
}
