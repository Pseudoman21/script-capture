import { state, save, bus } from '../store.js';

class TeleprompterPanel extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section id="prompter" aria-label="Teleprompter">
        <div id="prompterBar" class="prompter-bar">
          <span class="grip" aria-hidden="true"></span>
          <div class="bar-actions">
            <button id="scrollBtn" class="mini" title="Start / pause scroll (Space)">Scroll</button>
            <button id="rewindBtn" class="mini" title="Back to top">Top</button>
            <button id="editBtn" class="mini" title="Edit script (E)">Edit</button>
          </div>
        </div>
        <div id="prompterBody" class="prompter-body">
          <div id="scriptView" class="script-view"></div>
          <textarea id="scriptEdit" class="script-edit" spellcheck="false" placeholder="Type or paste your script…" hidden></textarea>
          <div id="guide" class="read-guide" aria-hidden="true"></div>
        </div>
        <div id="resizeHandle" class="resize-handle" title="Resize"></div>
      </section>`;

    this.prompter = this.querySelector('#prompter');
    this.bar = this.querySelector('#prompterBar');
    this.body = this.querySelector('#prompterBody');
    this.view = this.querySelector('#scriptView');
    this.edit = this.querySelector('#scriptEdit');
    this.handle = this.querySelector('#resizeHandle');
    this.guide = this.querySelector('#guide');
    this.scrollBtn = this.querySelector('#scrollBtn');
    this.editBtn = this.querySelector('#editBtn');

    this.scrolling = false;
    this.pos = 0;
    this.last = 0;

    this.dragify(this.bar, (dx, dy, r) => this.applyRect({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h }),
      e => !e.target.closest('button'));
    this.dragify(this.handle, (dx, dy, r) => this.applyRect({ x: r.x, y: r.y, w: r.w + dx, h: r.h + dy }));

    addEventListener('resize', () => this.applyRect(state.rect || this.defaultRect()));

    this.view.addEventListener('scroll', () => { if (!this.scrolling) this.pos = this.view.scrollTop; });
    this.scrollBtn.addEventListener('click', () => this.setScrolling(!this.scrolling));
    this.querySelector('#rewindBtn').addEventListener('click', () => {
      this.setScrolling(false); this.pos = 0; this.view.scrollTop = 0;
    });

    this.editBtn.addEventListener('click', () => this.setEditing(this.edit.hidden));
    this.edit.addEventListener('input', () => { state.script = this.edit.value; save(); });

    new ResizeObserver(() => this.updatePadding()).observe(this.body);

    bus.addEventListener('state:changed', () => this.syncFromState());
    bus.addEventListener('prompter:reset-position', () => this.applyRect(this.defaultRect()));

    this.applyRect(state.rect || this.defaultRect());
    this.syncFromState();
  }

  defaultRect() {
    const w = Math.min(460, innerWidth - 40);
    const h = Math.min(380, innerHeight - 220);
    return { x: Math.round((innerWidth - w) / 2), y: 88, w, h };
  }

  applyRect(r) {
    const w = Math.max(220, Math.min(r.w, innerWidth - 16));
    const h = Math.max(150, Math.min(r.h, innerHeight - 16));
    const x = Math.max(8, Math.min(r.x, innerWidth - w - 8));
    const y = Math.max(8, Math.min(r.y, innerHeight - h - 8));
    state.rect = { x, y, w, h };
    Object.assign(this.prompter.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    this.updatePadding();
    save();
  }

  updatePadding() {
    const h = this.body.clientHeight || 300;
    document.documentElement.style.setProperty('--pad-top', Math.round(h * 0.34) + 'px');
    document.documentElement.style.setProperty('--pad-bot', Math.round(h * 0.72) + 'px');
  }

  renderScript() {
    this.view.textContent = state.script;
    this.view.style.textAlign = state.align;
  }

  syncFromState() {
    const d = document.documentElement.style;
    d.setProperty('--fs', state.fontSize + 'px');
    d.setProperty('--lh', String(state.lineHeight));
    d.setProperty('--panel-op', String(state.opacity));
    document.body.classList.toggle('flip', state.flip);
    this.guide.hidden = !state.guide;
    this.renderScript();
  }

  dragify(el, onMove, filter) {
    el.addEventListener('pointerdown', e => {
      if (filter && !filter(e)) return;
      el.setPointerCapture(e.pointerId);
      this.prompter.classList.add('dragging');
      const start = { x: e.clientX, y: e.clientY, r: Object.assign({}, state.rect) };
      const move = ev => onMove(ev.clientX - start.x, ev.clientY - start.y, start.r);
      const up = ev => {
        el.releasePointerCapture(ev.pointerId);
        this.prompter.classList.remove('dragging');
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      e.preventDefault();
    });
  }

  tick(t) {
    if (!this.scrolling) return;
    if (!this.last) this.last = t;
    // clamp: a backgrounded tab freezes rAF, and the catch-up frame would jump the script
    this.pos += state.speed * Math.min((t - this.last) / 1000, 0.1);
    this.last = t;
    const max = this.view.scrollHeight - this.view.clientHeight;
    if (this.pos >= max) { this.pos = max; this.view.scrollTop = this.pos; this.setScrolling(false); return; }
    this.view.scrollTop = this.pos;
    requestAnimationFrame(t => this.tick(t));
  }

  setScrolling(on) {
    this.scrolling = on;
    this.last = 0;
    this.scrollBtn.textContent = on ? 'Pause' : 'Scroll';
    this.scrollBtn.classList.toggle('on', on);
    if (on) { this.pos = this.view.scrollTop; requestAnimationFrame(t => this.tick(t)); }
  }

  setEditing(on) {
    this.edit.hidden = !on;
    this.editBtn.classList.toggle('on', on);
    this.editBtn.textContent = on ? 'Done' : 'Edit';
    if (on) { this.setScrolling(false); this.edit.value = state.script; this.edit.focus(); }
    else { state.script = this.edit.value; this.renderScript(); save(); }
  }
}
customElements.define('teleprompter-panel', TeleprompterPanel);
