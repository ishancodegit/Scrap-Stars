/* Keyboard + mouse, and twin-stick touch controls for phones. */

const Input = {
  keys: new Set(),
  mouseX: 0,
  mouseY: 0,
  firing: false,
  superQueued: false,
  hyperQueued: false,
  autoAim: true,
  usingTouch: false,

  // touch sticks: { id, ox, oy, x, y }
  moveStick: null,
  aimStick: null,
  superTap: false,
  superFlash: 0,
  // Dragging off the Super button aims it; a plain tap fires it where you
  // already point. Same gesture with a thumb or a mouse.
  superStick: null,
  superAim: null,
  emoteQueued: -1,
  emoteOpen: false,
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
      const emote = EMOTES.findIndex((x) => x.key === e.key);
      if (emote >= 0) this.emoteQueued = emote;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.firing = false; });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
      if (this.superStick && this.superStick.id === 'mouse') {
        this.superStick.x = this.mouseX;
        this.superStick.y = this.mouseY;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 2) { this.superQueued = true; return; }
      if (e.button !== 0) return;
      // The Super and Overdrive buttons are drawn on the canvas, so a mouse has
      // to hit-test them the same way a thumb does or they are pure decoration.
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (this._pressButton(x, y, r.width, r.height, 'mouse')) return;
      this.firing = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      if (this.superStick && this.superStick.id === 'mouse') this._releaseSuper();
      this.firing = false;
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
      // Inboard of the move stick along the bottom edge, so it never fights
      // the stick for space and never runs off the side on a short screen.
      emoteBtn: { x: pad + r * 2.5, y: h - pad - r * 0.45, r: Math.max(17, r * 0.36) },
      muteBtn: { x: w - pad * 0.8, y: pad * 0.8, r: Math.max(15, r * 0.28) },
    };
  },

  /*
   * Where each quick-chat option sits once the wheel is open. The fan opens
   * upward and to the right and is clamped inside the viewport, because a
   * landscape phone is short enough that a symmetric ring would hang off it.
   */
  emoteSlots(w, h) {
    const L = this.layout(w, h);
    const c = L.emoteBtn;
    const R = c.r * 2.8;
    const spread = 1.9;
    return EMOTES.map((e, i) => {
      const t = EMOTES.length === 1 ? 0.5 : i / (EMOTES.length - 1);
      const a = -Math.PI + 0.35 + t * spread;      // sweeps left-up to right-up
      const r = c.r * 0.94;
      return {
        x: clamp(c.x + Math.cos(a) * R, r + 4, w - r - 4),
        y: clamp(c.y + Math.sin(a) * R, r + 4, h - r - 4),
        r, index: i, emote: e,
      };
    });
  },

  _hit(p, x, y, slack = 8) {
    return Math.hypot(x - p.x, y - p.y) <= p.r + slack;
  },

  /*
   * Shared by mouse and touch: returns true when a button swallowed the press.
   * The Super does not fire here — it arms an aiming stick and goes off on
   * release, so a drag can point it and a tap still fires straight away.
   */
  _pressButton(x, y, w, h, id) {
    const L = this.layout(w, h);

    // An open wheel eats the press, whether it lands on an option or not.
    if (this.emoteOpen) {
      for (const slot of this.emoteSlots(w, h)) {
        if (this._hit(slot, x, y, 10)) {
          this.emoteQueued = slot.index;
          this.emoteOpen = false;
          return true;
        }
      }
      this.emoteOpen = false;
      return true;
    }
    if (this._hit(L.emoteBtn, x, y)) {
      this.emoteOpen = true;
      return true;
    }
    if (this._hit(L.muteBtn, x, y)) {
      const muted = Sfx.toggle();
      const note = document.getElementById('muted');
      if (note) note.textContent = muted ? 'Sound: off (M)' : 'Sound: on (M)';
      return true;
    }
    if (this._hit(L.superBtn, x, y)) {
      this.superStick = { id, ox: x, oy: y, x, y, r: L.r };
      this.superFlash = 0.3;
      return true;
    }
    if (this._hit(L.hyperBtn, x, y)) {
      this.hyperQueued = true;
      this.hyperFlash = 0.3;
      return true;
    }
    return false;
  },

  /* Let go of the Super: a real drag aims it, a tap just fires it. */
  _releaseSuper() {
    const st = this.superStick;
    this.superStick = null;
    if (!st) return;
    const v = this.stickVector(st, st.r || 70);
    this.superAim = v.len > 0.15 ? { angle: Math.atan2(v.y, v.x), len: v.len } : null;
    this.superQueued = true;
  },

  consumeSuperAim() {
    const a = this.superAim;
    this.superAim = null;
    return a;
  },

  _touchStart(e, canvas) {
    e.preventDefault();
    this.usingTouch = true;
    const r = canvas.getBoundingClientRect();
    const L = this.layout(r.width, r.height);

    for (const t of e.changedTouches) {
      const x = t.clientX - r.left, y = t.clientY - r.top;

      // Buttons win over the sticks they sit next to.
      if (this._pressButton(x, y, r.width, r.height, t.identifier)) continue;

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
      if (this.superStick && t.identifier === this.superStick.id) { this.superStick.x = x; this.superStick.y = y; }
    }
  },

  _touchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.superStick && t.identifier === this.superStick.id) this._releaseSuper();
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

  consumeEmote() {
    const e = this.emoteQueued;
    this.emoteQueued = -1;
    return e;
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
