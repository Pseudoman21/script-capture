import { bus } from '../store.js';
import { startCamera } from '../camera.js';

class CameraGate extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id="gate" class="gate" hidden>
        <div class="gate-card">
          <h1 id="gate-title">Camera access needed</h1>
          <p id="gate-msg">Allow camera and microphone access to start recording.</p>
          <button id="gate-retry" class="btn btn-primary">Enable camera</button>
        </div>
      </div>`;

    this.gate = this.querySelector('#gate');
    this.titleEl = this.querySelector('#gate-title');
    this.msg = this.querySelector('#gate-msg');
    this.querySelector('#gate-retry').addEventListener('click', startCamera);

    bus.addEventListener('camera:status', e => {
      this.titleEl.textContent = e.detail.title;
      this.msg.textContent = e.detail.msg;
      this.gate.hidden = false;
    });
    bus.addEventListener('camera:ready', () => { this.gate.hidden = true; });
  }
}
customElements.define('camera-gate', CameraGate);
