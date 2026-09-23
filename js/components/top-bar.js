import { bus } from '../store.js';

class TopBar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header id="topbar" class="chrome">
        <div class="brand">
          <span class="dot" id="statusDot"></span>
          <span id="statusText">Ready</span>
        </div>
        <div class="top-actions">
          <button id="takesBtn" class="btn btn-ghost" hidden>Takes <span id="takesCount">0</span></button>
          <button id="scriptToggle" class="btn btn-ghost" title="Hide script (H)">Hide script</button>
          <button id="settingsBtn" class="btn btn-ghost" title="Settings">Settings</button>
        </div>
      </header>`;

    this.statusText = this.querySelector('#statusText');
    this.takesBtn = this.querySelector('#takesBtn');
    this.takesCount = this.querySelector('#takesCount');
    this.scriptToggle = this.querySelector('#scriptToggle');

    this.querySelector('#settingsBtn').addEventListener('click', () => document.querySelector('settings-drawer').toggle());
    this.takesBtn.addEventListener('click', () => document.querySelector('takes-modal').open());
    this.scriptToggle.addEventListener('click', () => this.toggleScript());

    bus.addEventListener('recording:status', e => { this.statusText.textContent = e.detail.text; });
    bus.addEventListener('takes:updated', e => {
      this.takesBtn.hidden = e.detail.count === 0;
      this.takesCount.textContent = String(e.detail.count);
    });
  }

  toggleScript() {
    const hidden = document.body.classList.toggle('script-hidden');
    this.scriptToggle.textContent = hidden ? 'Show script' : 'Hide script';
  }
}
customElements.define('top-bar', TopBar);
