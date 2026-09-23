class CoffeeModal extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id="coffeeModal" class="modal" hidden>
        <div class="modal-card coffee-card">
          <div class="modal-head">
            <h2>Thanks for stopping by ☕</h2>
            <button id="coffeeClose" class="btn btn-ghost">Close</button>
          </div>
          <p class="hint">Scan with your GCash app to send a coffee — appreciated either way.</p>
          <img class="coffee-qr" src="photos/gcash.jpg" alt="GCash QR code for buying the developer a coffee">
        </div>
      </div>`;

    this.modal = this.querySelector('#coffeeModal');
    this.querySelector('#coffeeClose').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', e => { if (e.target === this.modal) this.close(); });
  }

  open() { this.modal.hidden = false; }
  close() { this.modal.hidden = true; }
}
customElements.define('coffee-modal', CoffeeModal);
