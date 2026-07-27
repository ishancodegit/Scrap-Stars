/*
 * Controller support.
 *
 * A twin-stick arena game is a controller game that happens to run in a
 * browser, so it plays like one: left stick walks, right stick aims and fires
 * in the direction you push it, and everything else is a face button. No
 * remapping screen — the standard layout is standard for a reason, and a game
 * you can pick up a pad and play immediately is worth more than one you can
 * configure.
 *
 * The Gamepad API is poll-only: there are no events, so this is read once per
 * frame and turned into the same queued flags the keyboard writes. Everything
 * downstream therefore has no idea a controller exists.
 */

const PAD = {
  deadzone: 0.28,        // sticks rest slightly off centre; ignore that
  fireDeflect: 0.45,     // how far the right stick must go before it shoots
  repeatDelay: 0.42,     // menu navigation: pause before a held direction repeats
  repeatRate: 0.14,
};

/* Standard mapping, as reported by any pad the browser calls "standard". */
const BTN = {
  a: 0, b: 1, x: 2, y: 3,
  lb: 4, rb: 5, lt: 6, rt: 7,
  back: 8, start: 9,
  up: 12, down: 13, left: 14, right: 15,
};

const Pad = {
  active: false,          // a pad was seen and touched this session
  connected: false,
  move: { x: 0, y: 0 },
  aim: null,              // { angle, len } while the right stick is pushed
  firing: false,
  _prev: {},              // button index -> was it down last frame
  _repeat: 0,
  _held: false,

  /* The first pad with anything actually pressed on it wins. */
  _read() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let best = null;
    for (const g of pads) {
      if (!g || !g.connected) continue;
      if (!best) best = g;
      const live = g.buttons.some((b) => b.pressed)
        || g.axes.some((a) => Math.abs(a) > PAD.deadzone);
      if (live) return g;
    }
    return best;
  },

  _stick(gp, ax, ay) {
    let x = gp.axes[ax] || 0, y = gp.axes[ay] || 0;
    const len = Math.hypot(x, y);
    if (len < PAD.deadzone) return { x: 0, y: 0, len: 0 };
    // Rescale from the deadzone edge so the first millimetre of travel is not
    // a jump from nothing to a third of full speed.
    const n = Math.min(1, (len - PAD.deadzone) / (1 - PAD.deadzone));
    return { x: (x / len) * n, y: (y / len) * n, len: n };
  },

  /* True on the frame a button goes down, and never again until released. */
  _pressed(gp, i) {
    const down = !!(gp.buttons[i] && gp.buttons[i].pressed);
    const was = this._prev[i];
    this._prev[i] = down;
    return down && !was;
  },

  poll(dt) {
    const gp = this._read();
    this.connected = !!gp;
    if (!gp) {
      this.move.x = this.move.y = 0;
      this.aim = null;
      this.firing = false;
      return;
    }

    const l = this._stick(gp, 0, 1);
    const r = this._stick(gp, 2, 3);
    this.move.x = l.x;
    this.move.y = l.y;
    this.aim = r.len > 0 ? { angle: Math.atan2(r.y, r.x), len: r.len } : null;

    const rt = gp.buttons[BTN.rt] && (gp.buttons[BTN.rt].pressed || gp.buttons[BTN.rt].value > 0.35);
    this.firing = r.len > PAD.fireDeflect || !!rt;

    // Anything at all counts as "there is a controller here", which is what
    // decides whether the on-screen hints talk about buttons or about keys.
    if (this.firing || l.len > 0 || r.len > 0 || gp.buttons.some((b) => b.pressed)) this._wake();

    if (this._pressed(gp, BTN.a) || this._pressed(gp, BTN.rb)) Input.superQueued = true;
    if (this._pressed(gp, BTN.x)) Input.gadgetQueued = true;
    if (this._pressed(gp, BTN.y) || this._pressed(gp, BTN.lb)) Input.hyperQueued = true;
    if (this._pressed(gp, BTN.start) || this._pressed(gp, BTN.back)) Input.pauseQueued = true;

    // The d-pad is quick chat, in the order the wheel draws it.
    const dpad = [BTN.up, BTN.right, BTN.down, BTN.left];
    for (let i = 0; i < dpad.length && i < EMOTES.length; i++) {
      if (this._pressed(gp, dpad[i])) Input.emoteQueued = i;
    }
  },

  /*
   * Menus. Only three things are needed — confirm, back, and moving between
   * options — and the browser already gives buttons keyboard focus, so this
   * synthesises the same keys rather than building a second navigation model.
   */
  pollMenu(dt) {
    const gp = this._read();
    this.connected = !!gp;
    if (!gp) return;
    if (gp.buttons.some((b) => b.pressed)) this._wake();

    if (this._pressed(gp, BTN.a)) {
      const el = document.activeElement;
      if (el && el !== document.body && typeof el.click === 'function') el.click();
      else document.dispatchEvent(new CustomEvent('padconfirm'));
    }
    if (this._pressed(gp, BTN.b)) document.dispatchEvent(new CustomEvent('padback'));

    // Held direction walks the focusable controls on whatever screen is up.
    const l = this._stick(gp, 0, 1);
    const dy = (Math.abs(l.y) > 0.5 ? Math.sign(l.y) : 0)
      || (gp.buttons[BTN.down] && gp.buttons[BTN.down].pressed ? 1 : 0)
      || (gp.buttons[BTN.up] && gp.buttons[BTN.up].pressed ? -1 : 0);
    if (!dy) { this._repeat = 0; this._held = false; return; }
    this._repeat -= dt;
    if (this._repeat > 0) return;
    // A long pause before the first repeat, a short one after: holding down
    // should scroll, but a flick of the stick should move exactly one row.
    this._repeat = this._held ? PAD.repeatRate : PAD.repeatDelay;
    this._held = true;
    this._focusStep(dy);
  },

  /* First time anything is pressed: this is a controller session now. */
  _wake() {
    if (this.active) return;
    this.active = true;
    Input.usingTouch = false;
    document.body.classList.add('usingpad');
    if (typeof UI !== 'undefined' && UI._refreshHome) UI._refreshHome();
  },

  _focusStep(dir) {
    const screen = [...document.querySelectorAll('.overlay')]
      .find((el) => !el.classList.contains('hidden'));
    if (!screen) return;
    const items = [...screen.querySelectorAll('button:not([disabled])')]
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const at = items.indexOf(document.activeElement);
    const next = at < 0 ? 0 : (at + dir + items.length) % items.length;
    items[next].focus();
  },
};
