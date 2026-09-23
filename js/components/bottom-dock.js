import { state, commit, bus } from '../store.js';
import { startRecording, stopRecording, togglePause, isRecording } from '../recorder.js';

class BottomDock extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer id="dock" class="chrome">
        <div class="dock-left">
          <span id="timer" class="timer">00:00</span>
        </div>
        <div class="dock-center">
          <button id="recordBtn" class="rec" title="Start / stop recording (R)"><span class="rec-inner"></span></button>
          <button id="pauseBtn" class="btn btn-ghost" hidden>Pause</button>
        </div>
        <div class="dock-right">
          <label class="slider-inline" title="Scroll speed ([ and ])">
            <span>Speed</span>
            <input id="speedQuick" type="range" min="5" max="220" step="1">
          </label>
        </div>
      </footer>`;

    this.timerEl = this.querySelector('#timer');
    this.recordBtn = this.querySelector('#recordBtn');
    this.pauseBtn = this.querySelector('#pauseBtn');
    this.speedQuick = this.querySelector('#speedQuick');

    this.recordBtn.addEventListener('click', () => {
      if (isRecording()) stopRecording(); else startRecording();
      this.recordBtn.blur();
    });
    this.pauseBtn.addEventListener('click', () => { togglePause(); this.pauseBtn.blur(); });
    this.speedQuick.addEventListener('input', e => { state.speed = Number(e.target.value); commit(); });

    bus.addEventListener('state:changed', () => { this.speedQuick.value = state.speed; });
    bus.addEventListener('recording:tick', e => { this.timerEl.textContent = e.detail.text; });
    bus.addEventListener('recording:started', () => { this.pauseBtn.hidden = false; this.pauseBtn.textContent = 'Pause'; });
    bus.addEventListener('recording:stopped', () => { this.pauseBtn.hidden = true; this.timerEl.textContent = '00:00'; });
    bus.addEventListener('recording:paused', () => { this.pauseBtn.textContent = 'Resume'; });
    bus.addEventListener('recording:resumed', () => { this.pauseBtn.textContent = 'Pause'; });

    this.speedQuick.value = state.speed;
  }
}
customElements.define('bottom-dock', BottomDock);
