import { state, commit } from './store.js';
import { startCamera } from './camera.js';
import { isRecording } from './recorder.js';

import './components/camera-gate.js';
import './components/top-bar.js';
import './components/teleprompter-panel.js';
import './components/bottom-dock.js';
import './components/settings-drawer.js';
import './components/countdown-overlay.js';
import './components/takes-modal.js';
import './components/coffee-modal.js';

// ---------- keyboard shortcuts (span multiple components, kept centralized) ----------
addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT')) {
    if (e.key === 'Escape') t.blur();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const tp = document.querySelector('teleprompter-panel');
  const k = e.key;
  if (k === ' ') { e.preventDefault(); tp.setScrolling(!tp.scrolling); }
  else if (k === 'r' || k === 'R') { document.getElementById('recordBtn').click(); }
  else if (k === 'e' || k === 'E') { tp.setEditing(tp.edit.hidden); }
  else if (k === 'h' || k === 'H') { document.querySelector('top-bar').toggleScript(); }
  else if (k === 'u' || k === 'U') { document.body.classList.toggle('hide-chrome'); }
  else if (k === '[' || k === 'ArrowDown') { state.speed = Math.max(5, state.speed - 5); commit(); }
  else if (k === ']' || k === 'ArrowUp') { state.speed = Math.min(220, state.speed + 5); commit(); }
  else if (k === '-' || k === '_') { state.fontSize = Math.max(14, state.fontSize - 2); commit(); }
  else if (k === '=' || k === '+') { state.fontSize = Math.min(80, state.fontSize + 2); commit(); }
  else if (k === 'Escape') {
    document.querySelector('settings-drawer').close();
    document.querySelector('takes-modal').close();
    document.querySelector('coffee-modal').close();
  }
});

addEventListener('beforeunload', e => {
  const takes = document.querySelector('takes-modal').takes;
  if (isRecording() || takes.length) { e.preventDefault(); e.returnValue = ''; }
});

// ---------- boot ----------
startCamera();
