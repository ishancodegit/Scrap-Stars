/*
 * Starr Drop opening.
 *
 * A full-screen moment rather than a line in a results table: the drop falls
 * in and bounces, you tap it, it shudders, and then it climbs. Every drop
 * starts Rare and each upgrade it rolled plays as its own beat — the capsule
 * flashes, swells, and repaints in the next tier's colour — so a Legendary is
 * watched being earned rather than simply announced. Then it bursts white and
 * blooms into rotating rays with the reward card riding out of the flash.
 *
 * Runs its own animation loop while it is on screen and hands control back
 * when the queue is empty.
 *
 * States: fall → wait → crack → climb → burst → reward
 */

const CLIMB_STEP = 0.62;    // seconds per rarity upgrade beat

const StarrDrop = {
  el: null,
  canvas: null,
  ctx: null,
  active: false,
  state: 'fall',
  t: 0,
  reward: null,
  queue: 0,
  total: 0,
  rays: 0,
  flash: 0,
  shards: [],
  onDone: null,
  _raf: 0,

  init() {
    this.el = document.getElementById('starrdrop');
    if (!this.el) return;
    this.canvas = document.getElementById('drop-stage');
    this.ctx = this.canvas.getContext('2d');
    this.el.addEventListener('click', () => this.tap());
    this.el.addEventListener('touchstart', (e) => { e.preventDefault(); this.tap(); }, { passive: false });
    window.addEventListener('resize', () => this._size());
  },

  _size() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.el.clientWidth || window.innerWidth;
    this.h = this.el.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    this.S = Math.min(this.w, this.h);      // everything scales off the short edge
  },

  /* Open `count` drops back to back, preferring the player's brawler. */
  begin(count, preferId, onDone) {
    if (!this.el || count <= 0) { if (onDone) onDone(); return; }
    this.queue = count;
    this.total = count;
    this.preferId = preferId;
    this.onDone = onDone;
    this.active = true;
    this.el.classList.remove('hidden');
    this._size();
    this._next();
    cancelAnimationFrame(this._raf);
    this._last = performance.now();
    this._loop(this._last);
  },

  _next() {
    this.state = 'fall';
    this.t = 0;
    this.rays = 0;
    this.flash = 0;
    this.shards = [];
    this.reward = null;
    this.chain = null;
    this.chainAt = 0;
    this.pop = 0;
    this.y = -this.h * 0.6;
    this.vy = 0;
    this.bounces = 0;
    this.squash = 0;
    this._setPrompt('');
  },

  /* The rarity the capsule is currently wearing while it climbs. */
  get tierNow() {
    if (this.chain) return this.chain[Math.min(this.chainAt, this.chain.length - 1)];
    return this.reward ? this.reward.rarity : null;
  },

  _setPrompt(text) {
    const el = document.getElementById('drop-prompt');
    if (el) el.textContent = text;
  },

  tap() {
    if (!this.active) return;
    if (this.state === 'wait') {
      this.state = 'crack';
      this.t = 0;
      this._setPrompt('');
      Sfx.resume();
      Sfx.play('tick');
    } else if (this.state === 'reward' && this.t > 0.45) {
      this.queue--;
      if (this.queue > 0) this._next();
      else this.close();
    }
  },

  close() {
    this.active = false;
    cancelAnimationFrame(this._raf);
    this.el.classList.add('hidden');
    this._setPrompt('');
    if (this.onDone) this.onDone();
  },

  _loop(now) {
    if (!this.active) return;
    const dt = Math.min((now - this._last) / 1000 || 0, 0.05);
    this._last = now;
    this.t += dt;
    this._step(dt);
    this._draw();
    this._raf = requestAnimationFrame((n) => this._loop(n));
  },

  _step(dt) {
    const groundY = this.h * 0.48;

    if (this.state === 'fall') {
      this.vy += this.h * 4.2 * dt;
      this.y += this.vy * dt;
      if (this.y >= groundY) {
        this.y = groundY;
        this.vy *= -0.42;
        this.bounces++;
        this.squash = 1;
        Sfx.play('crate');
        if (this.bounces >= 3 || Math.abs(this.vy) < this.h * 0.2) {
          this.state = 'wait';
          this.t = 0;
          this.vy = 0;
          this._setPrompt('TAP TO OPEN');
        }
      }
    } else if (this.state === 'crack') {
      // It rattles harder and harder, then starts climbing the ladder.
      if (this.t > 0.75) {
        this.reward = Progress.openDrop(this.preferId);
        this.chain = (this.reward && this.reward.chain) || [DROP_RARITIES[0]];
        this.chainAt = 0;
        this.pop = 1;
        this.state = 'climb';
        this.t = 0;
        Sfx.play('tick');
      }
    } else if (this.state === 'climb') {
      // One beat per rarity, then one more to admire the last one.
      if (this.t > CLIMB_STEP) {
        this.t = 0;
        if (this.chainAt < this.chain.length - 1) {
          this.chainAt++;
          this.pop = 1;
          this.flash = 0.55;
          Sfx.play('charged');
        } else {
          this._burst();
        }
      }
    } else if (this.state === 'burst') {
      this.rays = Math.min(1, this.rays + dt * 3.4);
      if (this.t > 0.5) { this.state = 'reward'; this.t = 0; this._setPrompt(this._promptText()); }
    }

    this.flash = Math.max(0, this.flash - dt * 5);
    this.squash = Math.max(0, this.squash - dt * 5);
    this.pop = Math.max(0, this.pop - dt * 3.4);
    for (const s of this.shards) {
      s.life -= dt;
      s.vy += this.S * 2.4 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.spin * dt;
    }
    this.shards = this.shards.filter((s) => s.life > 0);
  },

  /* The capsule gives up and the reward comes out. */
  _burst() {
    this.state = 'burst';
    this.t = 0;
    this.flash = 1;
    const rarity = this.reward ? this.reward.rarity : DROP_RARITIES[0];
    Sfx.play(DROP_RARITIES.indexOf(rarity) >= 3 ? 'win' : 'charged');
    const col = rarity.color;
    const R = this.S;
    for (let i = 0; i < 56; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(R * 0.35, R * 1.5);
      this.shards.push({
        x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - R * 0.3,
        r: rand(R * 0.006, R * 0.018), life: rand(0.5, 1.1), max: 1.1,
        color: i % 3 ? col : '#fff', spin: rand(-8, 8), rot: 0,
      });
    }
  },

  _promptText() {
    return this.queue > 1 ? `TAP · ${this.queue - 1} MORE` : 'TAP TO CONTINUE';
  },

  _draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const cx = this.w / 2;
    const groundY = this.h * 0.48;
    const S = this.S;
    const col = this.reward ? this.reward.rarity.color : '#a78bfa';

    // Rays behind everything once it pops. Alternating white keeps it from
    // reading as a flat pinwheel.
    if (this.rays > 0) {
      ctx.save();
      ctx.translate(cx, groundY);
      ctx.rotate(this.t * 0.45);
      const R = Math.hypot(this.w, this.h);
      for (let i = 0; i < 18; i++) {
        ctx.rotate(Math.PI * 2 / 18);
        const white = i % 2 === 0;
        ctx.globalAlpha = (white ? 0.22 : 0.7) * this.rays;
        const g = ctx.createLinearGradient(0, 0, R * this.rays, 0);
        g.addColorStop(0, white ? '#ffffff' : col);
        g.addColorStop(0.75, white ? 'rgba(255,255,255,.25)' : col);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(R * this.rays, -R * (white ? 0.03 : 0.06));
        ctx.lineTo(R * this.rays, R * (white ? 0.03 : 0.06));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.55 * this.rays;
      const glow = ctx.createRadialGradient(cx, groundY, S * 0.02, cx, groundY, S * 0.62);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.35, col);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.restore();
    }

    // The capsule itself, until it bursts.
    if (this.state !== 'burst' && this.state !== 'reward') {
      const tier = this.tierNow;
      const capCol = tier ? tier.color : '#c084fc';
      const shake = this.state === 'crack' ? Math.sin(this.t * 46) * S * (0.008 + this.t * 0.026) : 0;
      const bob = this.state === 'wait' ? Math.sin(this.t * 3.4) * S * 0.012 : 0;
      const sq = 1 + this.squash * 0.3;
      // Each upgrade lands as a swell that settles rather than a hard cut.
      const r = S * 0.16 * (1 + this.pop * 0.22);
      ctx.save();
      ctx.translate(cx, groundY + S * 0.2);
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(0, 0, (r * 0.9) / sq, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // A halo that grows with the tier, so climbing visibly raises the stakes.
      if (this.state === 'climb') {
        ctx.save();
        ctx.globalAlpha = 0.45 + this.pop * 0.4;
        const glow = ctx.createRadialGradient(cx, this.y, r * 0.4, cx, this.y, r * (2.4 + this.chainAt * 0.5));
        glow.addColorStop(0, capCol);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(cx + shake, this.y + bob);
      ctx.scale(1 / sq, sq);
      ctx.shadowColor = capCol;
      ctx.shadowBlur = S * (0.06 + this.pop * 0.1);
      drawStarrDrop(ctx, r, capCol, false);
      ctx.restore();

      // Name the tier it is currently wearing.
      if (this.state === 'climb' && tier) {
        this._outlined(ctx, tier.name.toUpperCase(), cx, groundY - S * 0.3,
          Math.round(S * 0.062 * (1 + this.pop * 0.25)), tier.color, S * 0.009);
      }
    }

    // Shards.
    for (const s of this.shards) {
      ctx.save();
      ctx.globalAlpha = clamp(s.life / s.max, 0, 1);
      ctx.translate(cx + s.x, groundY + s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.fillRect(-s.r, -s.r, s.r * 2, s.r * 2);
      ctx.restore();
    }

    if (this.state === 'reward' && this.reward) this._card(ctx, cx, groundY, S);

    // The pop itself: a white wash over the whole screen for a few frames.
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.flash) * 0.85;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.restore();
    }

    // How many are left in the queue.
    if (this.total > 1) {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = `900 ${Math.round(S * 0.032)}px ui-rounded, system-ui, sans-serif`;
      ctx.fillText(`${this.total - this.queue + 1} / ${this.total}`, this.w - S * 0.05, S * 0.09);
      ctx.restore();
    }
  },

  /* The reward panel: rarity ribbon, the brawler it belongs to, the payout. */
  _card(ctx, cx, cy, S) {
    const r = this.reward;
    const p = clamp(this.t / 0.34, 0, 1);
    // Back-out easing so it overshoots and settles rather than just fading in.
    const e = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
    const w = Math.min(this.w * 0.82, S * 0.86);
    const h = Math.min(this.h * 0.56, w * 0.62);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(0.6 + e * 0.4, 0.6 + e * 0.4);
    ctx.globalAlpha = clamp(p * 1.6, 0, 1);

    // Panel.
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#3a2170');
    g.addColorStop(1, '#1b0f34');
    ctx.fillStyle = g;
    this._round(ctx, -w / 2, -h / 2, w, h, S * 0.05);
    ctx.fill();
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = S * 0.012;
    ctx.stroke();
    ctx.strokeStyle = r.rarity.color;
    ctx.lineWidth = S * 0.007;
    this._round(ctx, -w / 2 + S * 0.012, -h / 2 + S * 0.012, w - S * 0.024, h - S * 0.024, S * 0.04);
    ctx.stroke();

    // Rarity ribbon straddling the top edge.
    const rw = w * 0.56, rh = S * 0.075;
    const rg = ctx.createLinearGradient(0, -h / 2 - rh / 2, 0, -h / 2 + rh / 2);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.35, r.rarity.color);
    rg.addColorStop(1, r.rarity.color);
    ctx.fillStyle = rg;
    this._round(ctx, -rw / 2, -h / 2 - rh / 2, rw, rh, rh / 2);
    ctx.fill();
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = S * 0.009;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1030';
    ctx.font = `900 ${Math.round(S * 0.036)}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(r.rarity.name.toUpperCase(), 0, -h / 2 + S * 0.002);

    // The brawler the drop paid into — wearing the skin when the skin is the prize.
    if (r.brawler && typeof Sprites !== 'undefined') {
      const shown = r.kind === 'skin' ? skinnedDef(r.brawler, r.skin.id) : r.brawler;
      ctx.save();
      ctx.translate(0, -h * 0.08);
      const sc = (S * 0.0045);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath();
      ctx.ellipse(0, 22, 27, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      Sprites.drawBrawler(ctx, { def: shown, radius: 22, angle: 0.25, vx: 0, vy: 0, id: 3, x: 0, y: 0 }, 0.6);
      ctx.restore();
    }

    // What it was.
    if (r.sub) {
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.font = `900 ${Math.round(S * 0.024)}px ui-rounded, system-ui, sans-serif`;
      ctx.fillText(r.sub, 0, h * 0.17);
    }

    // Payout.
    this._outlined(ctx, r.text.toUpperCase(), 0, h * 0.3, Math.round(S * 0.05), '#fff', S * 0.008);

    if (r.brawler) {
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.font = `900 ${Math.round(S * 0.024)}px ui-rounded, system-ui, sans-serif`;
      ctx.fillText(r.brawler.name.toUpperCase(), 0, h * 0.41);
    }
    ctx.restore();
  },

  _outlined(ctx, text, x, y, size, fill, lw) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px ui-rounded, system-ui, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = lw;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  _round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
