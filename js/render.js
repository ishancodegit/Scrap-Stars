/* All drawing: world, entities, effects and the heads-up display. */

const Renderer = {
  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  dpr: 1,
  camX: WORLD_W / 2,
  camY: WORLD_H / 2,
  scale: 1,
  shakeMag: 0,
  shakeT: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    // Show roughly a 1000x700 slice of the world, whatever the window is.
    this.scale = clamp(Math.max(this.w / 1040, this.h / 720), 0.55, 1.6);
  },

  shake(mag) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = 0.25;
  },

  worldToScreen(x, y) {
    return {
      x: (x - this.camX) * this.scale + this.w / 2,
      y: (y - this.camY) * this.scale + this.h / 2,
    };
  },

  screenToWorld(x, y) {
    return {
      x: (x - this.w / 2) / this.scale + this.camX,
      y: (y - this.h / 2) / this.scale + this.camY,
    };
  },

  follow(target, dt) {
    const tx = target ? target.x : WORLD_W / 2;
    const ty = target ? target.y : WORLD_H / 2;
    const k = 1 - Math.pow(0.001, dt);
    this.camX = lerp(this.camX, tx, k);
    this.camY = lerp(this.camY, ty, k);
    // Never show the void outside the arena.
    const halfW = this.w / 2 / this.scale, halfH = this.h / 2 / this.scale;
    this.camX = halfW * 2 >= WORLD_W ? WORLD_W / 2 : clamp(this.camX, halfW, WORLD_W - halfW);
    this.camY = halfH * 2 >= WORLD_H ? WORLD_H / 2 : clamp(this.camY, halfH, WORLD_H - halfH);
  },

  draw(game, dt) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.shakeT <= 0) this.shakeMag = 0;
    const sx = this.shakeMag ? rand(-this.shakeMag, this.shakeMag) : 0;
    const sy = this.shakeMag ? rand(-this.shakeMag, this.shakeMag) : 0;

    ctx.save();
    ctx.translate(this.w / 2 + sx, this.h / 2 + sy);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.camX, -this.camY);

    this._drawFloor(ctx);
    this._drawAreas(ctx, game);
    this._drawTelegraphs(ctx, game);
    this._drawMine(ctx, game);
    this._drawGems(ctx, game);
    this._drawProjectiles(ctx, game);
    this._drawSummons(ctx, game);
    this._drawBeams(ctx, game);
    this._drawBrawlers(ctx, game);
    this._drawWalls(ctx);
    this._drawBushes(ctx, game);
    this._drawEffects(ctx, game);

    ctx.restore();

    this._drawHud(ctx, game);
  },

  _viewBounds() {
    const halfW = this.w / 2 / this.scale + TILE;
    const halfH = this.h / 2 / this.scale + TILE;
    return {
      tx0: clamp(Math.floor((this.camX - halfW) / TILE), 0, MAP_W - 1),
      tx1: clamp(Math.ceil((this.camX + halfW) / TILE), 0, MAP_W - 1),
      ty0: clamp(Math.floor((this.camY - halfH) / TILE), 0, MAP_H - 1),
      ty1: clamp(Math.ceil((this.camY + halfH) / TILE), 0, MAP_H - 1),
    };
  },

  _drawFloor(ctx) {
    const b = this._viewBounds();
    for (let ty = b.ty0; ty <= b.ty1; ty++) {
      for (let tx = b.tx0; tx <= b.tx1; tx++) {
        ctx.fillStyle = (tx + ty) % 2 ? PALETTE.floor : PALETTE.floorAlt;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let tx = b.tx0; tx <= b.tx1 + 1; tx++) {
      ctx.moveTo(tx * TILE, b.ty0 * TILE);
      ctx.lineTo(tx * TILE, (b.ty1 + 1) * TILE);
    }
    for (let ty = b.ty0; ty <= b.ty1 + 1; ty++) {
      ctx.moveTo(b.tx0 * TILE, ty * TILE);
      ctx.lineTo((b.tx1 + 1) * TILE, ty * TILE);
    }
    ctx.stroke();
  },

  _drawWalls(ctx) {
    const b = this._viewBounds();
    for (let ty = b.ty0; ty <= b.ty1; ty++) {
      for (let tx = b.tx0; tx <= b.tx1; tx++) {
        const t = GameMap.get(tx, ty);
        if (t !== T_ROCK && t !== T_CRATE) continue;
        const x = tx * TILE, y = ty * TILE;
        const rock = t === T_ROCK;
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        this._roundRect(ctx, x + 2, y + 5, TILE - 4, TILE - 4, 7);
        ctx.fill();
        ctx.fillStyle = rock ? PALETTE.rock : PALETTE.crate;
        this._roundRect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, 7);
        ctx.fill();
        ctx.fillStyle = rock ? PALETTE.rockTop : PALETTE.crateTop;
        this._roundRect(ctx, x + 5, y + 5, TILE - 10, TILE - 16, 5);
        ctx.fill();
        if (!rock) {
          ctx.strokeStyle = 'rgba(0,0,0,.28)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + TILE - 8, y + TILE - 8);
          ctx.moveTo(x + TILE - 8, y + 8); ctx.lineTo(x + 8, y + TILE - 8);
          ctx.stroke();
        }
      }
    }
  },

  _drawBushes(ctx, game) {
    const b = this._viewBounds();
    const p = game.player;
    for (let ty = b.ty0; ty <= b.ty1; ty++) {
      for (let tx = b.tx0; tx <= b.tx1; tx++) {
        if (GameMap.get(tx, ty) !== T_BUSH) continue;
        const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
        // Fade the bush the player is standing in so they can still see out.
        const inside = p && p.alive && Math.floor(p.x / TILE) === tx && Math.floor(p.y / TILE) === ty;
        ctx.globalAlpha = inside ? 0.55 : 1;
        ctx.fillStyle = PALETTE.bush;
        ctx.beginPath();
        ctx.arc(cx - 11, cy + 6, 17, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy + 8, 15, 0, Math.PI * 2);
        ctx.arc(cx + 2, cy - 8, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.bushTop;
        ctx.beginPath();
        ctx.arc(cx - 8, cy - 4, 10, 0, Math.PI * 2);
        ctx.arc(cx + 8, cy + 2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  },

  _drawMine(ctx, game) {
    const x = GameMap.centerX(), y = GameMap.centerY();
    const t = game.time * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.5 + Math.sin(t) * 0.12;
    const grd = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
    grd.addColorStop(0, 'rgba(168,85,247,.55)');
    grd.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.rotate(game.time * 0.6);
    ctx.fillStyle = '#4c1d95';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = i % 2 ? 16 : 24;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  _drawGems(ctx, game) {
    for (const g of game.gems) {
      const bob = Math.sin(game.time * 4 + g.x * 0.05) * 3;
      ctx.save();
      ctx.translate(g.x, g.y + bob);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(0, 12 - bob, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      this._gemShape(ctx, 11);
      ctx.restore();
    }
  },

  _gemShape(ctx, r) {
    ctx.fillStyle = PALETTE.gem;
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.86, -r * 0.3);
    ctx.lineTo(r * 0.55, r * 0.85);
    ctx.lineTo(-r * 0.55, r * 0.85);
    ctx.lineTo(-r * 0.86, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.3, -r * 0.1);
    ctx.lineTo(-r * 0.3, -r * 0.1);
    ctx.closePath();
    ctx.fill();
  },

  _drawAreas(ctx, game) {
    for (const a of game.areas) {
      const p = clamp(a.life / a.maxLife, 0, 1);
      ctx.globalAlpha = 0.22 + p * 0.2;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  _drawProjectiles(ctx, game) {
    for (const p of game.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const len = p.wave ? p.radius : p.radius * (p.isSuper ? 3.4 : 2.6);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(-len * 0.9, 0, len * 1.6, p.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.wave ? 'rgba(232,121,249,.55)' : p.color;
      ctx.beginPath();
      if (p.wave) ctx.arc(0, 0, p.radius, -0.9, 0.9);
      else ctx.ellipse(0, 0, len, p.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!p.wave) {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath();
        ctx.ellipse(len * 0.35, 0, p.radius * 0.45, p.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const l of game.lobs) {
      const h = l.height * 34;
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.radius * 0.9, l.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Landing marker so you can read where it will hit.
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(l.tx, l.ty, l.aoe * (0.5 + 0.5 * (l.t / l.duration)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(l.x, l.y - h, l.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.arc(l.x - l.radius * 0.3, l.y - h - l.radius * 0.3, l.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  _drawBrawlers(ctx, game) {
    for (const b of game.brawlers) {
      if (!b.alive) continue;
      if (!game.visibleToPlayer(b)) continue;
      this._drawBrawler(ctx, b, game);
    }
  },

  _drawBrawler(ctx, b, game) {
    const isPlayer = b === game.player;
    const r = b.radius;
    ctx.save();
    ctx.globalAlpha = b.hidden ? 0.6 : 1;

    // Aim line for the local player.
    if (isPlayer && b.alive) {
      const range = specRange(b.def.attack);
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = b.def.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(b.angle) * range, b.y + Math.sin(b.angle) * range);
      ctx.stroke();
      ctx.globalAlpha = b.hidden ? 0.6 : 1;
    }

    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + r * 0.75, r * 1.05, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (b.superReady) {
      ctx.globalAlpha *= 0.9;
      const glow = ctx.createRadialGradient(b.x, b.y, r * 0.6, b.x, b.y, r * 2.1);
      glow.addColorStop(0, 'rgba(250,204,21,.45)');
      glow.addColorStop(1, 'rgba(250,204,21,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Facing wedge.
    ctx.fillStyle = TEAM_COLOR[b.team];
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.arc(b.x, b.y, r * 1.5, b.angle - 0.32, b.angle + 0.32);
    ctx.closePath();
    ctx.globalAlpha *= 0.75;
    ctx.fill();
    ctx.globalAlpha = b.hidden ? 0.6 : 1;

    ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : b.def.color;
    ctx.strokeStyle = TEAM_COLOR[b.team];
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (b.hyperActive > 0) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + Math.sin(game.time * 14) * 0.25;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = b.hidden ? 0.6 : 1;
    }
    if (b.shieldHp > 0) {
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (b.stunUntil > 0) {
      ctx.fillStyle = '#fde047';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', b.x, b.y - r - 26);
    }
    if (b.spawnGuard > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = `${Math.round(r * 1.15)}px system-ui, "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.def.icon, b.x, b.y + 1);

    // Health bar.
    const bw = r * 2.6, bh = 7;
    const bx = b.x - bw / 2, by = b.y - r - 17;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    this._roundRect(ctx, bx - 1.5, by - 1.5, bw + 3, bh + 3, 4);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    this._roundRect(ctx, bx, by, bw, bh, 3);
    ctx.fill();
    ctx.fillStyle = TEAM_COLOR[b.team];
    this._roundRect(ctx, bx, by, bw * clamp(b.hp / b.maxHp, 0, 1), bh, 3);
    ctx.fill();

    // Carried gems.
    if (b.gems > 0) {
      ctx.save();
      ctx.translate(b.x + r + 6, b.y - r - 6);
      ctx.scale(0.62, 0.62);
      this._gemShape(ctx, 12);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(String(b.gems), b.x + r + 6, b.y - r - 5);
    }

    if (!isPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(b.name, b.x, by - 9);
    }

    ctx.restore();
  },

  _drawTelegraphs(ctx, game) {
    for (const t of game.telegraphs) {
      const p = 1 - clamp(t.delay / t.maxDelay, 0, 1);
      ctx.globalAlpha = 0.25 + p * 0.35;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.12 + p * 0.25;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  _drawSummons(ctx, game) {
    for (const s of game.summons) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + s.radius * 0.7, s.radius * 0.95, s.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      if (s.kind === 'mine') {
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }

      ctx.fillStyle = s.color;
      ctx.strokeStyle = TEAM_COLOR[s.team];
      ctx.lineWidth = 3;
      this._roundRect(ctx, s.x - s.radius, s.y - s.radius, s.radius * 2, s.radius * 2, 6);
      ctx.fill();
      ctx.stroke();

      // Barrel showing where it is pointing.
      if (s.kind === 'turret') {
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(s.angle) * s.radius * 1.3, s.y + Math.sin(s.angle) * s.radius * 1.3);
        ctx.stroke();
      }

      const bw = s.radius * 2, bh = 5;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(s.x - bw / 2, s.y - s.radius - 10, bw, bh);
      ctx.fillStyle = TEAM_COLOR[s.team];
      ctx.fillRect(s.x - bw / 2, s.y - s.radius - 10, bw * clamp(s.hp / s.maxHp, 0, 1), bh);
    }
  },

  _drawBeams(ctx, game) {
    for (const b of game.beams) {
      const w = (b.spec.arc || 0.12) * b.length * 0.9;
      ctx.save();
      ctx.translate(b.owner.x, b.owner.y);
      ctx.rotate(b.angle);
      const grd = ctx.createLinearGradient(0, 0, b.length, 0);
      grd.addColorStop(0, b.color);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(b.length, -w);
      ctx.lineTo(b.length, w);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  },

  _drawEffects(ctx, game) {
    for (const s of game.swings) {
      const p = clamp(s.life / s.maxLife, 0, 1);
      ctx.globalAlpha = p * 0.5;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.arc(s.x, s.y, s.reach * (1.15 - p * 0.15), s.angle - s.arc / 2, s.angle + s.arc / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const l of game.links) {
      ctx.globalAlpha = clamp(l.life / l.maxLife, 0, 1);
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of game.pulses) {
      const t = 1 - p.life / 0.5;
      ctx.globalAlpha = clamp(p.life / 0.5, 0, 1) * 0.8;
      ctx.strokeStyle = p.color || '#e879f9';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.max * t, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    for (const t of game.texts) {
      ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },

  /* ---------------- HUD ---------------- */

  _drawHud(ctx, game) {
    const w = this.w, h = this.h;
    ctx.textBaseline = 'middle';

    this._drawScoreboard(ctx, game, w);
    this._drawPlayerPanel(ctx, game, w, h);
    this._drawFeed(ctx, game, w);

    if (game.player && !game.player.alive) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, h / 2 - 60, w, 120);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText('Respawning', w / 2, h / 2 - 12);
      ctx.font = 'bold 46px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText(Math.ceil(game.player.respawnTimer).toString(), w / 2, h / 2 + 30);
    }

    if (Input.usingTouch) this._drawTouchControls(ctx, w, h);
  },

  _drawScoreboard(ctx, game, w) {
    const cx = w / 2;
    const panelW = 300, panelH = 62;
    ctx.fillStyle = 'rgba(9,11,16,.78)';
    this._roundRect(ctx, cx - panelW / 2, 12, panelW, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    for (let team = 0; team < 2; team++) {
      const x = cx + (team === 0 ? -88 : 88);
      ctx.fillStyle = TEAM_COLOR[team];
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(String(game.teamGems[team]), x, 38);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(team === game.playerTeam ? 'YOUR TEAM' : 'ENEMY', x, 60);
      // Pips showing progress to ten.
      for (let i = 0; i < GEMS_TO_WIN; i++) {
        const px = x - 45 + i * 10;
        ctx.fillStyle = i < game.teamGems[team] ? TEAM_COLOR[team] : 'rgba(255,255,255,.14)';
        ctx.fillRect(px, 20, 7, 3);
      }
    }

    ctx.save();
    ctx.translate(cx, 34);
    ctx.scale(0.9, 0.9);
    this._gemShape(ctx, 12);
    ctx.restore();

    const mins = Math.floor(game.timeLeft / 60);
    const secs = Math.floor(game.timeLeft % 60);
    ctx.fillStyle = game.timeLeft < 30 ? '#fca5a5' : 'rgba(255,255,255,.75)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, cx, 62);

    if (game.lockTeam !== -1) {
      const t = Math.ceil(game.lockTimer);
      ctx.fillStyle = TEAM_COLOR[game.lockTeam];
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.lineWidth = 5;
      ctx.strokeText(String(t), cx, 118);
      ctx.fillText(String(t), cx, 118);
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      const label = game.lockTeam === game.playerTeam ? 'HOLD THE GEMS!' : 'BREAK THEIR HOLD!';
      ctx.fillText(label, cx, 148);
    }
  },

  _drawPlayerPanel(ctx, game, w, h) {
    const p = game.player;
    if (!p) return;
    const x = 20, y = h - 112;
    ctx.fillStyle = 'rgba(9,11,16,.78)';
    this._roundRect(ctx, x, y, 284, 96, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = p.def.color;
    ctx.beginPath();
    ctx.arc(x + 34, y + 42, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = TEAM_COLOR[p.team];
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '20px system-ui, "Segoe UI Emoji", sans-serif';
    ctx.fillStyle = '#000';
    ctx.fillText(p.def.icon, x + 34, y + 43);

    // Health.
    ctx.textAlign = 'left';
    const hbX = x + 68, hbY = y + 12, hbW = 198, hbH = 14;
    ctx.fillStyle = '#111827';
    this._roundRect(ctx, hbX, hbY, hbW, hbH, 7);
    ctx.fill();
    ctx.fillStyle = p.alive ? '#34d399' : '#4b5563';
    this._roundRect(ctx, hbX, hbY, hbW * clamp(p.hp / p.maxHp, 0, 1), hbH, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, Math.ceil(p.hp))}`, hbX + hbW / 2, hbY + 8);

    // Ammo pips.
    ctx.textAlign = 'left';
    const pipW = (hbW - 12) / p.def.maxAmmo;
    for (let i = 0; i < p.def.maxAmmo; i++) {
      const px = hbX + i * (pipW + 6);
      ctx.fillStyle = '#111827';
      this._roundRect(ctx, px, y + 32, pipW, 10, 5);
      ctx.fill();
      let fill = 0;
      if (i < p.ammo) fill = 1;
      else if (i === p.ammo) fill = clamp(p.reloadTimer / p.def.reload, 0, 1);
      if (fill > 0) {
        ctx.fillStyle = PALETTE.accent;
        this._roundRect(ctx, px, y + 32, pipW * fill, 10, 5);
        ctx.fill();
      }
    }

    // Super meter.
    const sy = y + 50;
    ctx.textAlign = 'left';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillText('SUPER', hbX, sy - 6);
    ctx.fillStyle = '#111827';
    this._roundRect(ctx, hbX, sy, hbW, 10, 5);
    ctx.fill();
    ctx.fillStyle = p.superReady ? '#facc15' : '#a16207';
    this._roundRect(ctx, hbX, sy, hbW * p.chargePct, 10, 5);
    ctx.fill();
    ctx.fillStyle = p.superReady ? '#facc15' : 'rgba(255,255,255,.4)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(p.superReady ? 'READY — SPACE' : '', hbX + hbW, sy - 6);

    if (p.def.hyper) {
      const hy = y + 72;
      ctx.fillStyle = '#111827';
      this._roundRect(ctx, hbX, hy, hbW, 6, 3);
      ctx.fill();
      ctx.fillStyle = p.hyperActive > 0 ? '#fde047' : (p.hyperReady ? '#f97316' : '#7c2d12');
      this._roundRect(ctx, hbX, hy, hbW * (p.hyperActive > 0 ? p.hyperActive / HYPER.duration : p.hyperPct), 6, 3);
      ctx.fill();
      ctx.fillStyle = p.hyperReady ? '#fb923c' : 'rgba(255,255,255,.32)';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillText('HYPER', hbX, hy - 6);
      ctx.textAlign = 'right';
      ctx.fillStyle = p.hyperReady ? '#fb923c' : 'rgba(255,255,255,.32)';
      ctx.fillText(p.hyperActive > 0 ? `${p.def.hyper.name.toUpperCase()} ACTIVE`
        : p.hyperReady ? 'READY — Q' : '', hbX + hbW, hy - 6);
    }
  },

  _drawFeed(ctx, game, w) {
    ctx.textAlign = 'right';
    ctx.font = '13px system-ui, sans-serif';
    let y = 26;
    for (const f of game.feed) {
      ctx.globalAlpha = clamp(f.life / 1.2, 0, 1);
      ctx.fillStyle = 'rgba(9,11,16,.7)';
      const tw = ctx.measureText(f.text).width + 18;
      this._roundRect(ctx, w - 16 - tw, y - 11, tw, 22, 8);
      ctx.fill();
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, w - 25, y);
      y += 26;
    }
    ctx.globalAlpha = 1;
  },

  _drawTouchControls(ctx, w, h) {
    const rings = [
      { s: Input.moveStick, color: '#38bdf8' },
      { s: Input.aimStick, color: '#f97316' },
    ];
    for (const { s, color } of rings) {
      if (!s) continue;
      const v = Input.stickVector(s);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s.ox, s.oy, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(s.ox + v.x * 62, s.oy + v.y * 62, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(w - 74, h - 165, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUPER', w - 74, h - 165);
  },

  _roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  },
};
