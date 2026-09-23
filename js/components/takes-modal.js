import { bus } from '../store.js';

class TakesModal extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id="review" class="modal" hidden>
        <div class="modal-card">
          <div class="modal-head">
            <h2>Takes</h2>
            <button id="reviewClose" class="btn btn-ghost">Close</button>
          </div>
          <video id="reviewVideo" controls playsinline></video>
          <div class="modal-actions">
            <button id="downloadBtn" class="btn btn-primary">Download</button>
            <button id="deleteBtn" class="btn btn-ghost">Delete take</button>
          </div>
          <ul id="takesList" class="takes"></ul>
          <p class="hint">Takes live in this tab only — download the ones you want before closing or reloading.</p>
        </div>
      </div>`;

    this.modal = this.querySelector('#review');
    this.reviewVideo = this.querySelector('#reviewVideo');
    this.takesList = this.querySelector('#takesList');
    this.takes = [];
    this.activeTake = null;

    this.querySelector('#reviewClose').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', e => { if (e.target === this.modal) this.close(); });

    this.querySelector('#downloadBtn').addEventListener('click', () => {
      if (!this.activeTake) return;
      const a = document.createElement('a');
      a.href = this.activeTake.url;
      a.download = this.activeTake.name;
      a.click();
    });

    this.querySelector('#deleteBtn').addEventListener('click', () => {
      if (!this.activeTake) return;
      const i = this.takes.indexOf(this.activeTake);
      URL.revokeObjectURL(this.activeTake.url);
      this.takes.splice(i, 1);
      this.activeTake = this.takes[0] || null;
      bus.dispatchEvent(new CustomEvent('takes:updated', { detail: { count: this.takes.length } }));
      if (!this.activeTake) { this.close(); return; }
      this.reviewVideo.src = this.activeTake.url;
      this.renderList();
    });

    bus.addEventListener('take:added', e => {
      this.takes.unshift(e.detail.take);
      bus.dispatchEvent(new CustomEvent('takes:updated', { detail: { count: this.takes.length } }));
      this.open(e.detail.take);
    });
  }

  renderList() {
    this.takesList.innerHTML = '';
    this.takes.forEach(t => {
      const li = document.createElement('li');
      li.className = this.activeTake && t.id === this.activeTake.id ? 'active' : '';
      li.innerHTML = `<span>${t.name}</span><span class="meta">${(t.size / 1048576).toFixed(1)} MB</span>`;
      li.addEventListener('click', () => { this.activeTake = t; this.reviewVideo.src = t.url; this.renderList(); });
      this.takesList.appendChild(li);
    });
  }

  open(take) {
    if (!take && !this.takes.length) return;
    this.activeTake = take || this.activeTake || this.takes[0];
    this.reviewVideo.src = this.activeTake.url;
    this.renderList();
    this.modal.hidden = false;
  }

  close() {
    this.modal.hidden = true;
    this.reviewVideo.pause();
    this.reviewVideo.removeAttribute('src');
  }
}
customElements.define('takes-modal', TakesModal);
