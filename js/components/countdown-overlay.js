class CountdownOverlay extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="countdown" class="countdown" hidden><span id="countNum">3</span></div>`;
    this.el = this.querySelector('#countdown');
    this.num = this.querySelector('#countNum');
  }

  run(n) {
    return new Promise(resolve => {
      this.el.hidden = false;
      let left = n;
      this.num.textContent = String(left);
      const int = setInterval(() => {
        left -= 1;
        if (left <= 0) { clearInterval(int); this.el.hidden = true; resolve(); return; }
        this.num.textContent = String(left);
        this.num.style.animation = 'none';
        void this.num.offsetWidth;
        this.num.style.animation = '';
      }, 1000);
    });
  }
}
customElements.define('countdown-overlay', CountdownOverlay);
