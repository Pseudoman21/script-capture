import { state, save, commit, bus } from '../store.js';
import { startCamera } from '../camera.js';
import { formatHint } from '../recorder.js';

class SettingsDrawer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <aside id="drawer" class="drawer" aria-label="Settings">
        <div class="drawer-head">
          <h2>Settings</h2>
          <button id="drawerClose" class="btn btn-ghost">Close</button>
        </div>

        <button id="coffeeBtn" class="support-link" type="button">
          <span class="support-icon" aria-hidden="true">☕</span>
          Buy me a coffee, or just say thanks
        </button>

        <div class="group">
          <h3>Devices</h3>
          <label class="field"><span>Camera</span><select id="videoSel"></select></label>
          <label class="field"><span>Microphone</span><select id="audioSel"></select></label>
          <label class="field"><span>Quality</span>
            <select id="qualitySel">
              <option value="720">720p</option>
              <option value="1080">1080p</option>
              <option value="1440">1440p</option>
              <option value="2160">4K</option>
            </select>
          </label>
          <label class="check"><input id="mirrorChk" type="checkbox"><span>Mirror preview (recording stays unmirrored)</span></label>
        </div>

        <div class="group">
          <h3>Script</h3>
          <label class="field"><span>Text size <b id="fsVal"></b></span><input id="fontSize" type="range" min="14" max="80" step="1"></label>
          <label class="field"><span>Line spacing <b id="lhVal"></b></span><input id="lineHeight" type="range" min="1.1" max="2.4" step="0.05"></label>
          <label class="field"><span>Scroll speed <b id="spVal"></b></span><input id="speed" type="range" min="5" max="220" step="1"></label>
          <label class="field"><span>Panel opacity <b id="opVal"></b></span><input id="opacity" type="range" min="0" max="0.95" step="0.05"></label>
          <label class="field"><span>Align</span>
            <select id="alignSel">
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </label>
          <label class="check"><input id="guideChk" type="checkbox"><span>Show reading line</span></label>
          <label class="check"><input id="flipChk" type="checkbox"><span>Flip text (for teleprompter glass)</span></label>
          <button id="resetPos" class="btn btn-ghost full">Reset panel position &amp; size</button>
        </div>

        <div class="group">
          <h3>Recording</h3>
          <label class="field"><span>Countdown</span>
            <select id="countdownSel">
              <option value="0">Off</option>
              <option value="3">3 seconds</option>
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </label>
          <label class="check"><input id="autoScrollChk" type="checkbox"><span>Start scrolling when recording starts</span></label>
          <label class="check"><input id="hideChromeChk" type="checkbox"><span>Hide controls while recording</span></label>
          <p class="hint" id="formatHint"></p>
        </div>

        <div class="group">
          <h3>Shortcuts</h3>
          <ul class="keys">
            <li><kbd>R</kbd> record / stop</li>
            <li><kbd>Space</kbd> scroll / pause</li>
            <li><kbd>[</kbd> <kbd>]</kbd> speed</li>
            <li><kbd>-</kbd> <kbd>+</kbd> text size</li>
            <li><kbd>E</kbd> edit script</li>
            <li><kbd>H</kbd> hide script</li>
            <li><kbd>U</kbd> hide controls</li>
            <li><kbd>Esc</kbd> close</li>
          </ul>
        </div>
      </aside>`;

    this.drawer = this.querySelector('#drawer');
    this.querySelector('#drawerClose').addEventListener('click', () => this.close());
    this.querySelector('#coffeeBtn').addEventListener('click', () => document.querySelector('coffee-modal').open());
    this.querySelector('#resetPos').addEventListener('click', () => bus.dispatchEvent(new CustomEvent('prompter:reset-position')));

    const bind = (sel, prop, cast = v => v) =>
      this.querySelector(sel).addEventListener('input', e => {
        state[prop] = cast(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
        commit();
      });
    bind('#fontSize', 'fontSize', Number);
    bind('#lineHeight', 'lineHeight', Number);
    bind('#speed', 'speed', Number);
    bind('#opacity', 'opacity', Number);
    bind('#alignSel', 'align');
    bind('#guideChk', 'guide');
    bind('#flipChk', 'flip');
    bind('#mirrorChk', 'mirror');
    bind('#autoScrollChk', 'autoScroll');
    bind('#hideChromeChk', 'hideChrome');
    bind('#countdownSel', 'countdown', Number);

    this.querySelector('#qualitySel').addEventListener('change', e => { state.quality = e.target.value; save(); startCamera(); });
    this.querySelector('#videoSel').addEventListener('change', e => { state.videoId = e.target.value; save(); startCamera(); });
    this.querySelector('#audioSel').addEventListener('change', e => { state.audioId = e.target.value; save(); startCamera(); });

    this.querySelector('#formatHint').textContent = formatHint;

    bus.addEventListener('camera:devices', e => this.renderDevices(e.detail));
    bus.addEventListener('state:changed', () => this.syncFromState());
    this.syncFromState();
  }

  renderDevices({ video, audio }) {
    const fill = (sel, info, kind) => {
      const el = this.querySelector(sel);
      el.innerHTML = '';
      info.list.forEach((d, i) => {
        const o = document.createElement('option');
        o.value = d.deviceId;
        o.textContent = d.label || `${kind === 'videoinput' ? 'Camera' : 'Microphone'} ${i + 1}`;
        el.appendChild(o);
      });
      el.value = info.value;
    };
    fill('#videoSel', video, 'videoinput');
    fill('#audioSel', audio, 'audioinput');
  }

  syncFromState() {
    document.body.classList.toggle('mirror', state.mirror);
    this.querySelector('#fsVal').textContent = state.fontSize + 'px';
    this.querySelector('#lhVal').textContent = Number(state.lineHeight).toFixed(2);
    this.querySelector('#spVal').textContent = state.speed + ' px/s';
    this.querySelector('#opVal').textContent = Math.round(state.opacity * 100) + '%';
    this.querySelector('#fontSize').value = state.fontSize;
    this.querySelector('#lineHeight').value = state.lineHeight;
    this.querySelector('#speed').value = state.speed;
    this.querySelector('#opacity').value = state.opacity;
    this.querySelector('#alignSel').value = state.align;
    this.querySelector('#guideChk').checked = state.guide;
    this.querySelector('#flipChk').checked = state.flip;
    this.querySelector('#mirrorChk').checked = state.mirror;
    this.querySelector('#countdownSel').value = String(state.countdown);
    this.querySelector('#autoScrollChk').checked = state.autoScroll;
    this.querySelector('#hideChromeChk').checked = state.hideChrome;
    this.querySelector('#qualitySel').value = state.quality;
  }

  open() { this.drawer.classList.add('open'); }
  close() { this.drawer.classList.remove('open'); }
  toggle() { this.drawer.classList.toggle('open'); }
}
customElements.define('settings-drawer', SettingsDrawer);
