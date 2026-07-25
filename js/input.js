/* Keyboard + mouse, and twin-stick touch controls for phones. */

const Input = {
  keys: new Set(),
  mouseX: 0,
  mouseY: 0,
  firing: false,
  superQueued: false,
  hyperQueued: false,
  usingTouch: false,

  // touch sticks: { id, ox, oy, x, y }
  moveStick: null,
  aimStick: null,
  superTap: false,

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ') this.superQueued = true;
      if (e.key.toLowerCase() === 'q') this.hyperQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.firing = false; });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 0) this.firing = true;
      if (e.button === 1) this.hyperQueued = true;
      if (e.button === 2) this.superQueued = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.firing = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('touchstart', (e) => this._touchStart(e, canvas), { passive: false });
    canvas.addEventListener('touchmove', (e) => this._touchMove(e, canvas), { passive: false });
    canvas.addEventListener('touchend', (e) => this._touchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this._touchEnd(e), { passive: false });
  },

  _touchStart(e, canvas) {
    e.preventDefault();
    this.usingTouch = true;
    const r = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const x = t.clientX - r.left, y = t.clientY - r.top;
      // Bottom-right corner is the super button.
      if (x > r.width - 120 && y > r.height - 210 && y < r.height - 120) {
        this.superQueued = true;
        this.superTap = true;
        continue;
      }
      if (x > r.width - 220 && x < r.width - 130 && y > r.height - 190 && y < r.height - 110) {
        this.hyperQueued = true;
        continue;
      }
      if (x < r.width / 2 && !this.moveStick) {
        this.moveStick = { id: t.identifier, ox: x, oy: y, x, y };
      } else if (x >= r.width / 2 && !this.aimStick) {
        this.aimStick = { id: t.identifier, ox: x, oy: y, x, y };
      }
    }
  },

  _touchMove(e, canvas) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const x = t.clientX - r.left, y = t.clientY - r.top;
      if (this.moveStick && t.identifier === this.moveStick.id) { this.moveStick.x = x; this.moveStick.y = y; }
      if (this.aimStick && t.identifier === this.aimStick.id) { this.aimStick.x = x; this.aimStick.y = y; }
    }
  },

  _touchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.moveStick && t.identifier === this.moveStick.id) this.moveStick = null;
      if (this.aimStick && t.identifier === this.aimStick.id) this.aimStick = null;
    }
  },

  stickVector(stick, maxLen = 70) {
    if (!stick) return { x: 0, y: 0, len: 0 };
    let dx = stick.x - stick.ox, dy = stick.y - stick.oy;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return { x: 0, y: 0, len: 0 };
    const n = Math.min(len, maxLen) / maxLen;
    return { x: (dx / len) * n, y: (dy / len) * n, len: n };
  },

  /* Movement direction from WASD/arrows or the left stick. */
  moveVector() {
    if (this.moveStick) {
      const v = this.stickVector(this.moveStick);
      return { x: v.x, y: v.y };
    }
    let x = 0, y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    return { x, y };
  },

  consumeSuper() {
    const q = this.superQueued;
    this.superQueued = false;
    return q;
  },

  consumeHyper() {
    const q = this.hyperQueued;
    this.hyperQueued = false;
    return q;
  },
};
