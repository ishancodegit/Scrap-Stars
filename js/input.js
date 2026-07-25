/* Keyboard + mouse, and twin-stick touch controls for phones. */

const Input = {
  keys: new Set(),
  mouseX: 0,
  mouseY: 0,
  firing: false,
  superQueued: false,
  hyperQueued: false,
  quickQueued: false,
  quickFlash: 0,
  autoAim: true,
  usingTouch: false,

  // touch sticks: { id, ox, oy, x, y }
  moveStick: null,
  aimStick: null,
  superTap: false,
  superFlash: 0,
  hyperFlash: 0,
  aimReleased: false,
  releaseAim: null,

  init(canvas) {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      this.usingTouch = true;
    }
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ') this.superQueued = true;
      if (e.key.toLowerCase() === 'q') this.hyperQueued = true;
      if (e.key.toLowerCase() === 'e') this.quickQueued = true;
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
      if (e.button === 1) this.quickQueued = true;
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

  /*
   * One source of truth for where the on-screen controls live, shared by the
   * hit-testing here and the drawing in render.js so they can never drift.
   * Layout mirrors the real thing: move stick bottom-left, attack stick
   * bottom-right, big Super button in the corner with Hyper stacked above it.
   */
  layout(w, h) {
    const pad = Math.max(16, Math.min(w, h) * 0.05);
    // Bound by width too, so the two sticks can never collide in portrait.
    const r = Math.max(38, Math.min(Math.min(w, h) * 0.13, w * 0.11, 82));
    return {
      r,
      move: { x: pad + r, y: h - pad - r, r },
      aim: { x: w - pad - r * 4.2, y: h - pad - r * 0.9, r },
      superBtn: { x: w - pad - r * 0.9, y: h - pad - r * 0.9, r: r * 0.72 },
      hyperBtn: { x: w - pad - r * 2.25, y: h - pad - r * 1.25, r: r * 0.5 },
      quickBtn: { x: w - pad - r * 1.05, y: h - pad - r * 2.5, r: r * 0.47 },
    };
  },

  _hit(p, x, y, slack = 8) {
    return Math.hypot(x - p.x, y - p.y) <= p.r + slack;
  },

  _touchStart(e, canvas) {
    e.preventDefault();
    this.usingTouch = true;
    const r = canvas.getBoundingClientRect();
    const L = this.layout(r.width, r.height);

    for (const t of e.changedTouches) {
      const x = t.clientX - r.left, y = t.clientY - r.top;

      // Buttons win over the sticks they sit next to.
      if (this._hit(L.superBtn, x, y)) {
        this.superQueued = true;
        this.superFlash = 0.3;
        continue;
      }
      if (this._hit(L.hyperBtn, x, y)) {
        this.hyperQueued = true;
        this.hyperFlash = 0.3;
        continue;
      }
      if (this._hit(L.quickBtn, x, y)) {
        this.quickQueued = true;
        this.quickFlash = 0.3;
        continue;
      }

      // Sticks float to wherever the thumb actually landed.
      if (x < r.width / 2 && !this.moveStick) {
        this.moveStick = { id: t.identifier, ox: x, oy: y, x, y };
      } else if (x >= r.width / 2 && !this.aimStick) {
        this.aimStick = { id: t.identifier, ox: x, oy: y, x, y, r: L.r };
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
      if (this.aimStick && t.identifier === this.aimStick.id) {
        // Releasing is what fires: a drag shoots where you aimed, a tap
        // without any drag auto-aims at the nearest target.
        const v = this.stickVector(this.aimStick, this.aimStick.r || 70);
        this.releaseAim = v.len > 0.15 ? { angle: Math.atan2(v.y, v.x), len: v.len } : null;
        this.aimReleased = true;
        this.aimStick = null;
      }
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

  consumeQuick() {
    const q = this.quickQueued;
    this.quickQueued = false;
    return q;
  },

  consumeHyper() {
    const q = this.hyperQueued;
    this.hyperQueued = false;
    return q;
  },

  consumeAimRelease() {
    const q = this.aimReleased;
    this.aimReleased = false;
    return q;
  },
};
