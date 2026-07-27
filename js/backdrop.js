/*
 * The menu backdrop.
 *
 * A drawn scene rather than a gradient: a canyon at golden hour, which is
 * where these fights are meant to be happening. Everything is painted with
 * shapes — no image files, so it costs nothing to load and scales to any
 * screen without going soft.
 *
 * Depth comes from parallax. Five bands drift at different speeds, slowest at
 * the horizon, and the clouds move faster than the mesas behind them. The
 * whole thing loops seamlessly because each band is drawn twice, one screen
 * width apart, and the offset wraps.
 *
 * It only runs while a menu is on screen. There is no reason to burn a phone
 * battery painting scenery nobody can see during a match.
 */

const SKY = {
  top: '#2a1a6b',
  mid: '#c0398f',
  low: '#ff6a3d',
  horizon: '#ffd166',
};

const Backdrop = {
  el: null,
  ctx: null,
  t: 0,
  running: false,
  _raf: 0,
  _last: 0,

  init() {
    this.el = document.getElementById('backdrop');
    if (!this.el) return;
    this.ctx = this.el.getContext('2d');
    this._size();
    window.addEventListener('resize', () => this._size());
    this.start();
  },

  _size() {
    if (!this.el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.el.width = Math.round(this.w * dpr);
    this.el.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    if (!this.running) this._draw();          // keep it painted while paused
  },

  start() {
    if (!this.ctx) return;
    this.el.classList.remove('hidden');
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._loop(this._last);
  },

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    if (this.el) this.el.classList.add('hidden');
  },

  _loop(now) {
    if (!this.running) return;
    this.t += Math.min((now - this._last) / 1000 || 0, 0.05);
    this._last = now;
    this._draw();
    this._raf = requestAnimationFrame((n) => this._loop(n));
  },

  /* One rolling band of hills, tiled twice so the drift can wrap. */
  _ridge(ctx, { y, amp, step, color, speed, seed }) {
    const w = this.w;
    const off = (this.t * speed) % w;
    ctx.fillStyle = color;
    for (const shift of [-off, -off + w]) {
      ctx.beginPath();
      ctx.moveTo(shift, this.h);
      for (let x = 0; x <= w + step; x += step) {
        const n = Math.sin((x / w) * 6.283 * 2 + seed) * 0.6
                + Math.sin((x / w) * 6.283 * 5 + seed * 1.7) * 0.3
                + Math.sin((x / w) * 6.283 * 11 + seed * 2.3) * 0.1;
        ctx.lineTo(shift + x, y + n * amp);
      }
      ctx.lineTo(shift + w + step, this.h);
      ctx.closePath();
      ctx.fill();
    }
  },

  /* Blocky mesas, the shape that makes it read as a canyon and not as hills. */
  _mesas(ctx, { y, h: bh, color, speed, seed, count }) {
    const w = this.w;
    const off = (this.t * speed) % w;
    ctx.fillStyle = color;
    for (const shift of [-off, -off + w]) {
      for (let i = 0; i < count; i++) {
        const r = Math.sin(seed + i * 12.9898) * 43758.5453;
        const f = r - Math.floor(r);
        const r2 = Math.sin(seed + i * 78.233) * 43758.5453;
        const f2 = r2 - Math.floor(r2);
        const mw = w * (0.09 + f * 0.11);
        const mh = bh * (0.55 + f2 * 0.75);
        const mx = shift + (i / count) * w + f2 * w * 0.05;
        const cap = Math.min(18, mw * 0.14);
        ctx.beginPath();
        ctx.moveTo(mx, y);
        ctx.lineTo(mx + mw * 0.1, y - mh + cap);
        ctx.quadraticCurveTo(mx + mw * 0.1, y - mh, mx + mw * 0.1 + cap, y - mh);
        ctx.lineTo(mx + mw * 0.9 - cap, y - mh);
        ctx.quadraticCurveTo(mx + mw * 0.9, y - mh, mx + mw * 0.9, y - mh + cap);
        ctx.lineTo(mx + mw, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  },

  _clouds(ctx, { y, scale, color, speed, seed, count }) {
    const w = this.w;
    const off = (this.t * speed) % (w * 1.4);
    ctx.fillStyle = color;
    for (const shift of [-off, -off + w * 1.4]) {
      for (let i = 0; i < count; i++) {
        const r = Math.sin(seed + i * 34.17) * 43758.5453;
        const f = r - Math.floor(r);
        const cx = shift + (i / count) * w * 1.4;
        const cy = y + f * this.h * 0.08;
        const s = scale * (0.7 + f * 0.6);
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 1.9, s * 0.6, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - s * 0.8, cy + s * 0.12, s * 1.0, s * 0.44, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + s * 0.85, cy + s * 0.1, s * 1.1, s * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  _draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.w, h = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, SKY.top);
    sky.addColorStop(0.42, SKY.mid);
    sky.addColorStop(0.72, SKY.low);
    sky.addColorStop(0.86, SKY.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const hz = h * 0.82;               // horizon line, low so the sky dominates

    // Sun, low and fat, with a bloom that lifts the whole middle of the frame.
    const sunX = w * 0.22, sunY = hz - h * 0.14;
    const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.7);
    bloom.addColorStop(0, 'rgba(255,226,150,.75)');
    bloom.addColorStop(0.4, 'rgba(255,140,80,.28)');
    bloom.addColorStop(1, 'rgba(255,110,70,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff2c4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, h * 0.075, 0, Math.PI * 2);
    ctx.fill();

    // Slow rays turning behind everything.
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(this.t * 0.035);
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#fff2c4';
    const R = Math.hypot(w, h);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI * 2 / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R, -R * 0.045);
      ctx.lineTo(R, R * 0.045);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    this._clouds(ctx, { y: h * 0.17, scale: h * 0.05, color: 'rgba(255,180,220,.42)', speed: 5, seed: 3.1, count: 5 });
    this._clouds(ctx, { y: h * 0.33, scale: h * 0.065, color: 'rgba(255,160,130,.40)', speed: 9, seed: 7.7, count: 4 });

    // Three ranges, each darker and warmer as it comes forward. Kept low so
    // they read as a skyline rather than closing the frame in.
    this._mesas(ctx, { y: hz, h: h * 0.17, color: '#8a3f86', speed: 3, seed: 1.7, count: 7 });
    this._mesas(ctx, { y: hz + h * 0.025, h: h * 0.12, color: '#a13f66', speed: 6, seed: 4.4, count: 6 });
    this._ridge(ctx, { y: hz + h * 0.04, amp: h * 0.022, step: 26, color: '#7d3050', speed: 11, seed: 2.2 });

    // Ground, in the same clay the arenas are tiled from.
    const ground = ctx.createLinearGradient(0, hz + h * 0.04, 0, h);
    ground.addColorStop(0, '#e08a45');
    ground.addColorStop(1, '#8f4527');
    ctx.fillStyle = ground;
    ctx.fillRect(0, hz + h * 0.04, w, h);
    this._ridge(ctx, { y: h * 0.94, amp: h * 0.012, step: 20, color: '#5e2d21', speed: 22, seed: 5.9 });

    // A dark wash at the top and bottom so the UI on top stays readable.
    const vig = ctx.createLinearGradient(0, 0, 0, h);
    vig.addColorStop(0, 'rgba(26,12,44,.42)');
    vig.addColorStop(0.28, 'rgba(26,12,44,0)');
    vig.addColorStop(0.8, 'rgba(26,12,44,0)');
    vig.addColorStop(1, 'rgba(20,8,32,.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  },
};
