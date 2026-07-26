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
    // Fit a consistent slice of the arena. Driving this off the smaller
    // dimension means a short landscape phone sees more, not less.
    // The divisors are the world span kept in view, so smaller means bigger on
    // screen. 900x540 left the fighters too small to read; 620x380 was legible
    // but claustrophobic, closing the view down to about half the arena. This
    // is the midpoint between the two, which keeps a fighter comfortably large
    // without losing sight of who is walking at you.
    this.scale = clamp(Math.min(this.w / 750, this.h / 455), 0.6, 1.9);
  },

  /*
   * Screen shake is deliberately gone. In a top-down game where you are
   * tracking small fast targets, jolting the camera on every explosion costs
   * you the shot you were lining up. Hit feedback lives in the flash, the
   * particles and the damage numbers instead.
   */
  shake() {},

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

    Input.superFlash = Math.max(0, Input.superFlash - dt);
    Input.hyperFlash = Math.max(0, Input.hyperFlash - dt);

    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.camX, -this.camY);

    this._drawFloor(ctx);
    this._drawAreas(ctx, game);
    this._drawTelegraphs(ctx, game);
    if (game.mode.id === 'gem') this._drawMine(ctx, game);
    this._drawObjectives(ctx, game);
    this._drawGems(ctx, game);
    this._drawProjectiles(ctx, game);
    this._drawSummons(ctx, game);
    this._drawBeams(ctx, game);
    this._drawBrawlers(ctx, game);
    this._drawWalls(ctx);
    this._drawBushes(ctx, game);
    this._drawPlates(ctx, game);
    this._drawLock(ctx, game);
    this._drawEffects(ctx, game);
    if (Input.usingTouch) this._drawAimIndicator(ctx, game, Input.aimStick, game.player && game.player.def.attack);
    // The Super preview shows on desktop too — you can drag its button with a mouse.
    if (game.player) this._drawAimIndicator(ctx, game, Input.superStick, game.player.def.super, true);

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

  },

  _drawWalls(ctx) {
    const b = this._viewBounds();
    for (let ty = b.ty0; ty <= b.ty1; ty++) {
      for (let tx = b.tx0; tx <= b.tx1; tx++) {
        const t = GameMap.get(tx, ty);
        if (t !== T_ROCK && t !== T_CRATE) continue;
        const x = tx * TILE, y = ty * TILE;
        const rock = t === T_ROCK;
        const lift = 9;                       // how tall the block reads
        ctx.fillStyle = 'rgba(90,40,22,.32)';
        this._roundRect(ctx, x + 2, y + 6, TILE - 4, TILE - 4, 8);
        ctx.fill();
        // Side face, then the top surface sitting proud of it.
        ctx.fillStyle = rock ? PALETTE.rockSide : PALETTE.crate;
        this._roundRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 8);
        ctx.fill();
        ctx.fillStyle = rock ? PALETTE.rock : PALETTE.crate;
        this._roundRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2 - lift, 8);
        ctx.fill();
        ctx.fillStyle = rock ? PALETTE.rockTop : PALETTE.crateTop;
        this._roundRect(ctx, x + 4, y + 3, TILE - 8, TILE - 12 - lift, 6);
        ctx.fill();
        if (!rock) {
          ctx.strokeStyle = 'rgba(90,50,20,.35)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 10, y + 9); ctx.lineTo(x + TILE - 10, y + TILE - 16);
          ctx.moveTo(x + TILE - 10, y + 9); ctx.lineTo(x + 10, y + TILE - 16);
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

  _drawObjectives(ctx, game) {
    // Slam Ball goals.
    for (const go of (game.goals || [])) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = TEAM_COLOR[go.team];
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(go.x, go.y, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = TEAM_COLOR[go.team];
      ctx.fill();
      ctx.restore();
    }

    const ball = game.ball;
    if (ball) {
      ctx.save();
      ctx.fillStyle = 'rgba(60,25,12,.3)';
      ctx.beginPath();
      ctx.ellipse(ball.x, ball.y + 10, ball.radius, ball.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(ball.x, ball.y);
      Sprites.ball(ctx, ball.radius, game.time);
      ctx.restore();
    }
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
      Sprites.gem(ctx, 11);
      ctx.restore();
    }
  },

  _gemShape(ctx, r) { Sprites.gem(ctx, r); },

  _gemShapeOld(ctx, r) {
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

    ctx.fillStyle = 'rgba(60,25,12,.34)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + r * 0.8, r * 1.1, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Team ring underfoot — blue for your side, red for theirs.
    ctx.save();
    ctx.globalAlpha *= 0.9;
    ctx.strokeStyle = TEAM_COLOR[b.team];
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + r * 0.62, r * 1.15, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = TEAM_COLOR[b.team];
    ctx.fill();
    ctx.restore();

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

    // The character itself.
    if (b.hurtFlash > 0) {
      ctx.save();
      ctx.globalAlpha *= 0.9;
      Sprites.drawBrawler(ctx, b, game.time);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = b.hurtFlash * 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y - r * 0.4, r * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      Sprites.drawBrawler(ctx, b, game.time);
    }

    if (b.spawnGuard > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y - r * 0.3, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  },

  /* Nameplates draw after the foliage so they are never lost behind a bush. */
  /* A quick-chat bubble over whoever sent it. */
  _drawEmote(ctx, b) {
    const e = b.emote;
    if (!e) return;
    const t = 1 - e.life / e.max;
    const rise = Math.min(1, t / 0.16);
    const R = 17;
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.life / 0.35);
    ctx.translate(b.x, b.y - b.radius - 52 - rise * 8);
    ctx.scale(0.6 + rise * 0.4, 0.6 + rise * 0.4);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Tail pointing back down at the speaker.
    ctx.beginPath();
    ctx.moveTo(-6, R - 2);
    ctx.lineTo(0, R + 9);
    ctx.lineTo(6, R - 2);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = e.color;
    ctx.font = '900 21px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.icon, 0, 1);
    ctx.restore();
  },

  _drawPlates(ctx, game) {
    this._drawOwnAmmo(ctx, game);
    for (const b of game.brawlers) {
      if (!b.alive || !game.visibleToPlayer(b)) continue;
      this._drawEmote(ctx, b);
      const isPlayer = b === game.player;
      const r = b.radius;
      ctx.save();
      ctx.globalAlpha = b.hidden ? 0.75 : 1;
      ctx.textBaseline = 'middle';
    // Nameplate: pill bar with the hit points printed inside it.
    const bw = Math.max(52, r * 3), bh = 13;
    const bx = b.x - bw / 2, by = b.y - r - 26;
    ctx.fillStyle = 'rgba(24,14,10,.72)';
    this._roundRect(ctx, bx - 2, by - 2, bw + 4, bh + 4, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    this._roundRect(ctx, bx, by, bw, bh, 6);
    ctx.fill();
    ctx.fillStyle = TEAM_COLOR[b.team];
    this._roundRect(ctx, bx, by, bw * clamp(b.hp / b.maxHp, 0, 1), bh, 6);
    ctx.fill();
    if (b.shieldHp > 0) {
      ctx.fillStyle = 'rgba(125,211,252,.85)';
      this._roundRect(ctx, bx, by, bw * clamp(b.shieldHp / b.maxHp, 0, 1), 4, 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(String(Math.max(0, Math.ceil(b.hp))), b.x, by + bh / 2 + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(Math.max(0, Math.ceil(b.hp))), b.x, by + bh / 2 + 1);

    // Your own ammo sits just under the plate, segment per shot.
    if (isPlayer) {
      const n = b.maxAmmo, seg = (bw - (n - 1) * 3) / n;
      for (let i = 0; i < n; i++) {
        const px = bx + i * (seg + 3);
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        this._roundRect(ctx, px, by + bh + 3, seg, 5, 2.5);
        ctx.fill();
        let fill = 0;
        if (i < b.ammo) fill = 1;
        else if (i === b.ammo) fill = clamp(b.reloadTimer / b.def.reload, 0, 1);
        if (fill > 0) {
          ctx.fillStyle = fill >= 1 ? '#ffffff' : 'rgba(255,255,255,.6)';
          this._roundRect(ctx, px, by + bh + 3, seg * fill, 5, 2.5);
          ctx.fill();
        }
      }
    }

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.strokeText(isPlayer ? b.def.name : b.name, b.x, by - 11);
    ctx.fillStyle = isPlayer ? '#fff' : 'rgba(255,255,255,.88)';
    ctx.fillText(isPlayer ? b.def.name : b.name, b.x, by - 11);
      ctx.restore();
    }
  },

  /* Reticle over the target auto-aim just locked, so the assist is visible. */
  _drawLock(ctx, game) {
    const p = game.player;
    if (!p || !p.alive || p.lockFlash <= 0 || !p.lockTarget) return;
    const t = p.lockTarget;
    if (t.alive === false || t.dead) return;
    const a = clamp(p.lockFlash / 0.3, 0, 1);
    const r = (t.radius || 18) + 10 + (1 - a) * 6;
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const base = i * (Math.PI / 2) + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, base - 0.32, base + 0.32);
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawTelegraphs(ctx, game) {
    for (const t of game.telegraphs) {
      const p = 1 - clamp(t.delay / t.maxDelay, 0, 1);
      if (t.shape === 'x') {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(Math.PI / 4);
        ctx.globalAlpha = 0.2 + p * 0.55;
        ctx.fillStyle = t.color;
        const arm = t.radius * (0.35 + p * 0.65);
        const w = t.radius * 0.26;
        ctx.fillRect(-arm, -w / 2, arm * 2, w);
        ctx.fillRect(-w / 2, -arm, w, arm * 2);
        ctx.globalAlpha = 0.35 + p * 0.5;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-arm, -w / 2, arm * 2, w);
        ctx.strokeRect(-w / 2, -arm, w, arm * 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }
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

      if (s.kind === 'safe') {
        ctx.save();
        ctx.translate(s.x, s.y);
        Sprites.safe(ctx, s.radius * 2.1, s.radius * 1.7, s.team, clamp(s.hp / s.maxHp, 0, 1));
        ctx.restore();
        const bw = s.radius * 2.4;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(s.x - bw / 2 - 2, s.y - s.radius - 18, bw + 4, 10);
        ctx.fillStyle = TEAM_COLOR[s.team];
        ctx.fillRect(s.x - bw / 2, s.y - s.radius - 16, bw * clamp(s.hp / s.maxHp, 0, 1), 6);
        continue;
      }

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
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      if (s.telegraph) {
        // Wind-up: a growing outline showing where the hit will land.
        ctx.arc(s.x, s.y, s.reach * (1 - p), s.angle - s.arc / 2, s.angle + s.arc / 2);
        ctx.closePath();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = s.color;
        ctx.fill();
      } else {
        ctx.arc(s.x, s.y, s.reach * (1.15 - p * 0.15), s.angle - s.arc / 2, s.angle + s.arc / 2);
        ctx.closePath();
        ctx.globalAlpha = p * 0.5;
        ctx.fillStyle = s.color;
        ctx.fill();
      }
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

    this._drawTeamStrips(ctx, game, w);
    this._drawScoreboard(ctx, game, w);
    if (!Input.usingTouch) this._drawPlayerPanel(ctx, game, w, h);
    this._drawFeed(ctx, game, w);

    if (game.player && !game.player.alive) {
      const watching = game.spectating();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      this._roundRect(ctx, w / 2 - 190, h * 0.14, 380, watching ? 92 : 74, 16);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.font = '900 13px ui-rounded, system-ui, sans-serif';
      ctx.fillText('RESPAWNING IN', w / 2, h * 0.14 + 24);
      ctx.font = '900 40px ui-rounded, system-ui, sans-serif';
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText(Math.ceil(game.player.respawnTimer).toString(), w / 2, h * 0.14 + 58);
      if (watching) {
        ctx.font = '900 12px ui-rounded, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.fillText('WATCHING ' + watching.name.toUpperCase(), w / 2, h * 0.14 + 80);
      }
      ctx.restore();
    }

    if (Input.usingTouch) {
      this._drawTouchControls(ctx, w, h, game);
      this._drawEmoteWheel(ctx, w, h);
      this._drawMute(ctx, w, h);
    }
    this._drawLowHp(ctx, game, w, h);
    this._drawIntro(ctx, game, w, h);
    this._drawCallout(ctx, game, w, h);
    this._drawCountdown(ctx, game, w, h);
    this._drawNetBadge(ctx, w, h);
  },

  /*
   * Red creeps in from the edges as health drops. The health bar is small and
   * in a corner; this is readable without looking away from the fight.
   */
  _drawLowHp(ctx, game, w, h) {
    const p = game.player;
    if (!p || !p.alive) return;
    const frac = p.hp / p.maxHp;
    if (frac > 0.4) return;
    const hurt = 1 - frac / 0.4;
    const pulse = 0.55 + 0.45 * Math.sin(game.time * (5 + hurt * 5));
    ctx.save();
    ctx.globalAlpha = hurt * 0.5 * pulse;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28,
                                       w / 2, h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, 'rgba(190,20,40,0)');
    g.addColorStop(1, 'rgba(190,20,40,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },

  /* DOUBLE KILL and friends. Big, brief, and gone. */
  _drawCallout(ctx, game, w, h) {
    const c = game.callout;
    if (!c) return;
    const t = 1 - c.life / c.max;
    const pop = t < 0.18 ? t / 0.18 : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, c.life / 0.4);
    ctx.translate(w / 2, h * 0.24);
    ctx.scale(0.7 + pop * 0.3, 0.7 + pop * 0.3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '900 46px ui-rounded, system-ui, sans-serif';
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = 10;
    ctx.strokeText(c.text, 0, 0);
    const g = ctx.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, '#fff6d5');
    g.addColorStop(1, c.mine ? '#ffb020' : '#ff6b81');
    ctx.fillStyle = g;
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  },

  /* 3 - 2 - 1 - GO. Holds the sim so nobody is shot during it. */
  _drawCountdown(ctx, game, w, h) {
    if (game.countdown <= 0) return;
    const n = Math.ceil(game.countdown - 0.2);
    const label = n <= 0 ? 'GO!' : String(n);
    const frac = (game.countdown - 0.2) % 1;
    const pop = 1 - Math.min(1, frac);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#0b0518';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.translate(w / 2, h / 2);
    ctx.scale(1.5 - pop * 0.5, 1.5 - pop * 0.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '900 96px ui-rounded, system-ui, sans-serif';
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = 16;
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle = label === 'GO!' ? '#4ade80' : '#ffc738';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  },

  /*
   * The first two seconds of a match name the mode and the map, then get out
   * of the way. Without it a match just starts, with no beat to read the board.
   */
  _drawIntro(ctx, game, w, h) {
    const t = game.time;
    if (t > 2.4) return;
    // Slide in, hold, slide out.
    const a = t < 0.35 ? t / 0.35 : t > 2.0 ? 1 - (t - 2.0) / 0.4 : 1;
    const slide = t < 0.35 ? (1 - a) * 90 : t > 2.0 ? (1 - a) * -90 : 0;
    const cy = h * 0.36;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(slide, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(12,7,24,.72)';
    this._roundRect(ctx, w / 2 - 230, cy - 52, 460, 104, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = 7;
    ctx.font = '900 38px ui-rounded, system-ui, sans-serif';
    ctx.strokeText(game.mode.name.toUpperCase(), w / 2, cy - 12);
    ctx.fillStyle = '#fff';
    ctx.fillText(game.mode.name.toUpperCase(), w / 2, cy - 12);

    ctx.font = '900 15px ui-rounded, system-ui, sans-serif';
    ctx.fillStyle = PALETTE.accent;
    ctx.fillText((game.mapDef ? game.mapDef.name : '').toUpperCase(), w / 2, cy + 24);
    ctx.restore();
  },

  /* A quiet marker so you know the match is shared, and whether it is holding up. */
  _drawNetBadge(ctx, w, h) {
    if (typeof Net === 'undefined' || !Net.active) return;
    const label = Net.connected
      ? (Net.isHost ? 'HOSTING' : 'CONNECTED')
      : 'RECONNECTING…';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 11px ui-rounded, system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 30;
    const x = w / 2 - tw / 2;
    const y = h - 26;
    ctx.fillStyle = Net.connected ? 'rgba(12,7,24,.7)' : 'rgba(120,20,20,.85)';
    this._roundRect(ctx, x, y, tw, 20, 10);
    ctx.fill();
    ctx.fillStyle = Net.connected ? '#4ade80' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(x + 12, y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(label, w / 2 + 6, y + 10);
    ctx.restore();
  },

  /*
   * Your team down the left, theirs down the right, the way the real thing
   * lays it out: a portrait chip per brawler with a health bar, dimmed while
   * they are down and counting back in.
   */
  _drawTeamStrips(ctx, game, w) {
    const compact = w < 900 || Input.usingTouch;
    const cw = compact ? 92 : 116;
    const ch = compact ? 26 : 30;
    const gap = 5;
    for (const team of [0, 1]) {
      const mates = game.brawlers.filter((b) => b.team === team);
      const right = team !== game.playerTeam;
      mates.forEach((b, i) => {
        const x = right ? w - 12 - cw : 12;
        const y = 12 + i * (ch + gap);
        ctx.fillStyle = 'rgba(20,12,34,.78)';
        this._roundRect(ctx, x, y, cw, ch, 8);
        ctx.fill();
        ctx.strokeStyle = b === game.player ? '#ffc738' : 'rgba(255,255,255,.12)';
        ctx.lineWidth = b === game.player ? 2 : 1;
        ctx.stroke();

        ctx.save();
        ctx.globalAlpha = b.alive ? 1 : 0.4;
        // Colour chip standing in for the portrait.
        ctx.fillStyle = b.def.color;
        this._roundRect(ctx, x + 4, y + 4, ch - 8, ch - 8, 5);
        ctx.fill();

        const bx = x + ch, bw = cw - ch - 8;
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        this._roundRect(ctx, bx, y + ch / 2 - 4, bw, 8, 4);
        ctx.fill();
        ctx.fillStyle = TEAM_COLOR[team];
        this._roundRect(ctx, bx, y + ch / 2 - 4, bw * clamp(b.hp / b.maxHp, 0, 1), 8, 4);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${compact ? 9 : 10}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(b.def.name, bx, y + ch / 2 - 7);

        if (!b.alive) {
          ctx.fillStyle = '#fca5a5';
          ctx.font = `bold ${compact ? 11 : 12}px system-ui, sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(Math.ceil(Math.max(0, b.respawnTimer)), x + cw - 6, y + ch / 2 + 4);
        }
        ctx.restore();
      });
    }
    ctx.textBaseline = 'middle';
  },

  _drawScoreboard(ctx, game, w) {
    const cx = w / 2;
    const compact = w < 900 || Input.usingTouch;
    const panelW = compact ? 232 : 320, panelH = compact ? 48 : 62;
    ctx.fillStyle = 'rgba(24,14,10,.82)';
    this._roundRect(ctx, cx - panelW / 2, 10, panelW, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const scores = game.mode.score ? game.mode.score(game) : ['0', '0'];
    ctx.textAlign = 'center';
    const off = compact ? 70 : 92;
    for (let team = 0; team < 2; team++) {
      const x = cx + (team === 0 ? -off : off);
      ctx.fillStyle = TEAM_COLOR[team];
      ctx.font = `bold ${compact ? 23 : 29}px system-ui, sans-serif`;
      ctx.fillText(scores[team], x, compact ? 30 : 34);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.font = `${compact ? 9 : 11}px system-ui, sans-serif`;
      ctx.fillText(team === game.playerTeam ? 'YOU' : 'THEM', x, compact ? 44 : 54);
    }

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = `bold ${compact ? 9 : 10}px system-ui, sans-serif`;
    ctx.fillText(game.mode.name.toUpperCase(), cx, compact ? 20 : 22);
    if (game.mapDef) {
      // Sits clear of the panel's lower edge, outlined so it reads on sand.
      const my = 10 + panelH + 14;
      ctx.font = `bold ${compact ? 9 : 10}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,12,34,.8)';
      ctx.strokeText(game.mapDef.name.toUpperCase(), cx, my);
      ctx.fillStyle = '#43d17a';
      ctx.fillText(game.mapDef.name.toUpperCase(), cx, my);
    }
    if (game.ranked) {
      ctx.fillStyle = '#ffc738';
      ctx.font = `bold ${compact ? 8 : 9}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('RANKED', cx - panelW / 2 + 8, compact ? 20 : 22);
      ctx.textAlign = 'center';
    }

    const mins = Math.floor(game.timeLeft / 60);
    const secs = Math.floor(game.timeLeft % 60);
    ctx.fillStyle = game.timeLeft < 30 ? '#fca5a5' : '#fff';
    ctx.font = `bold ${compact ? 16 : 19}px system-ui, sans-serif`;
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, cx, compact ? 40 : 48);

    const banner = game.mode.banner ? game.mode.banner(game) : null;
    if (banner) {
      ctx.fillStyle = banner.color;
      ctx.font = `bold ${compact ? 40 : 52}px system-ui, sans-serif`;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.lineWidth = 5;
      ctx.strokeText(banner.text, cx, panelH + (compact ? 46 : 58));
      ctx.fillText(banner.text, cx, panelH + (compact ? 46 : 58));
      if (banner.sub) {
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillText(banner.sub, cx, panelH + (compact ? 74 : 88));
      }
    }
  },

  /*
   * Ammo lives under your own fighter rather than in a corner box. The health
   * bar that used to sit down there duplicated the plate already floating above
   * the character, so it was two readouts of one number competing for a glance.
   */
  _drawOwnAmmo(ctx, game) {
    const p = game.player;
    if (!p || !p.alive) return;
    const n = p.maxAmmo;
    if (!n) return;
    const bw = Math.max(52, p.radius * 3);
    const gap = 3;
    const pw = (bw - (n - 1) * gap) / n;
    const x = p.x - bw / 2;
    const y = p.y - p.radius - 8;

    ctx.save();
    for (let i = 0; i < n; i++) {
      const px = x + i * (pw + gap);
      ctx.fillStyle = 'rgba(10,6,20,.72)';
      this._roundRect(ctx, px - 1, y - 1, pw + 2, 7, 3.5);
      ctx.fill();
      const filling = i === p.ammo ? clamp(p.reloadTimer / p.def.reload, 0, 1) : 0;
      const full = i < p.ammo;
      if (full || filling > 0) {
        ctx.fillStyle = full ? '#facc15' : 'rgba(250,204,21,.5)';
        this._roundRect(ctx, px, y, pw * (full ? 1 : filling), 5, 2.5);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  /* Quick chat, opened from the button by the move stick. */
  _drawEmoteWheel(ctx, w, h) {
    const L = Input.layout(w, h);
    const open = Input.emoteOpen;

    ctx.save();
    ctx.globalAlpha = open ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(L.emoteBtn.x, L.emoteBtn.y, L.emoteBtn.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12,7,24,.7)';
    ctx.fill();
    ctx.strokeStyle = open ? '#facc15' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.round(L.emoteBtn.r * 1.05)}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('“”', L.emoteBtn.x, L.emoteBtn.y + 2);
    ctx.restore();

    if (!open) return;
    for (const slot of Input.emoteSlots(w, h)) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, slot.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20,12,34,.92)';
      ctx.fill();
      ctx.strokeStyle = slot.emote.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = slot.emote.color;
      ctx.font = `900 ${Math.round(slot.r * 1.1)}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot.emote.icon, slot.x, slot.y + 1);
      ctx.restore();
    }
  },

  /* Muting is keyboard-only otherwise, which is no use on a phone. */
  _drawMute(ctx, w, h) {
    const L = Input.layout(w, h);
    const m = L.muteBtn;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12,7,24,.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(m.x - m.r * 0.34, m.y - m.r * 0.2);
    ctx.lineTo(m.x - m.r * 0.1, m.y - m.r * 0.2);
    ctx.lineTo(m.x + m.r * 0.16, m.y - m.r * 0.46);
    ctx.lineTo(m.x + m.r * 0.16, m.y + m.r * 0.46);
    ctx.lineTo(m.x - m.r * 0.1, m.y + m.r * 0.2);
    ctx.lineTo(m.x - m.r * 0.34, m.y + m.r * 0.2);
    ctx.closePath();
    ctx.fill();
    if (Sfx.muted) {
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(m.x - m.r * 0.5, m.y - m.r * 0.5);
      ctx.lineTo(m.x + m.r * 0.5, m.y + m.r * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawPlayerPanel(ctx, game, w, h) {
    const p = game.player;
    if (!p) return;
    const x = 20, y = Input.usingTouch ? 78 : h - 112;
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
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.fillText(p.def.name[0], x + 34, y + 44);

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
      ctx.fillText('OVER', hbX, hy - 6);
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

  /*
   * On-screen controls, laid out like the mobile original: a floating move
   * stick on the left, a floating attack stick on the right, and a big Super
   * button in the corner whose gold ring fills as the Super charges.
   */
  _drawTouchControls(ctx, w, h, game) {
    const L = Input.layout(w, h);
    const p = game.player;

    this._stick(ctx, L.move, Input.moveStick, '#dbeafe');
    this._stick(ctx, L.aim, Input.aimStick, p ? p.def.color : '#fca5a5');


    // Super: dark disc, gold charge ring, brawler face in the middle.
    this._actionButton(ctx, L.superBtn, {
      progress: p ? p.chargePct : 0,
      ready: p ? p.superReady : false,
      ring: '#facc15',
      glyph: 'star',
      label: 'SUPER',
      flash: Input.superFlash,
    });

    if (p && p.def.hyper) {
      this._actionButton(ctx, L.hyperBtn, {
        progress: p.hyperActive > 0 ? p.hyperActive / HYPER.duration : p.hyperPct,
        ready: p.hyperReady,
        ring: '#fb923c',
        glyph: 'bolt',
        label: 'OVER',
        flash: Input.hyperFlash,
        small: true,
      });
    }
  },

  _stick(ctx, home, live, tint) {
    const cx = live ? live.ox : home.x;
    const cy = live ? live.oy : home.y;
    const r = home.r;
    const v = Input.stickVector(live, r);

    ctx.save();
    ctx.globalAlpha = live ? 0.9 : 0.45;
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.34)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const px = cx + v.x * r, py = cy + v.y * r;
    ctx.fillStyle = tint;
    ctx.globalAlpha = live ? 0.62 : 0.34;
    ctx.beginPath();
    ctx.arc(px, py, r * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = live ? 0.95 : 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  },

  _actionButton(ctx, btn, o) {
    const { x, y, r } = btn;
    ctx.save();

    if (o.ready) {
      const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.6);
      glow.addColorStop(0, o.ring + '66');
      glow.addColorStop(1, o.ring + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = o.ready ? 'rgba(19,42,86,.94)' : 'rgba(16,22,34,.82)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Charge ring, drawn clockwise from the top.
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    if (o.progress > 0.001) {
      ctx.strokeStyle = o.ring;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.86, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(o.progress, 0, 1));
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.globalAlpha = o.ready ? 1 : 0.4;
    ctx.fillStyle = o.ready ? '#fff' : '#cbd5e1';
    const gs = r * 0.5;
    ctx.beginPath();
    if (o.glyph === 'crosshair') {
      ctx.lineWidth = Math.max(2, gs * 0.22);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.arc(x, y, gs * 0.62, 0, Math.PI * 2);
      ctx.moveTo(x - gs, y); ctx.lineTo(x - gs * 0.3, y);
      ctx.moveTo(x + gs * 0.3, y); ctx.lineTo(x + gs, y);
      ctx.moveTo(x, y - gs); ctx.lineTo(x, y - gs * 0.3);
      ctx.moveTo(x, y + gs * 0.3); ctx.lineTo(x, y + gs);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.save();
      ctx.fillStyle = o.ready ? o.ring : 'rgba(255,255,255,.35)';
      ctx.font = `bold ${Math.round(r * 0.26)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.label, x, y + r + r * 0.3);
      ctx.restore();
      return;
    }
    if (o.glyph === 'bolt') {
      ctx.moveTo(x + gs * 0.25, y - gs);
      ctx.lineTo(x - gs * 0.55, y + gs * 0.15);
      ctx.lineTo(x - gs * 0.05, y + gs * 0.15);
      ctx.lineTo(x - gs * 0.25, y + gs);
      ctx.lineTo(x + gs * 0.6, y - gs * 0.2);
      ctx.lineTo(x + gs * 0.05, y - gs * 0.2);
    } else {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? gs * 0.45 : gs;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    if (o.flash > 0) {
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = o.flash * 2.4;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r * (1 + (0.3 - o.flash)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = o.ready ? o.ring : 'rgba(255,255,255,.35)';
    ctx.font = `bold ${Math.round(r * 0.26)}px system-ui, sans-serif`;
    ctx.fillText(o.label, x, y + r + r * 0.3);
    ctx.restore();
  },

  /*
   * While the attack stick is held, show where the shot is going: a cone for
   * direct fire, a landing circle for anything lobbed or placed.
   */
  _drawAimIndicator(ctx, game, stick, spec, isSuper) {
    const p = game.player;
    if (!p || !p.alive || !stick || !spec) return;
    const v = Input.stickVector(stick, stick.r || 70);
    if (v.len < 0.15) return;

    const angle = Math.atan2(v.y, v.x);
    const reach = specRange(spec);
    const placed = spec.emit === 'lob' || spec.emit === 'area' || spec.emit === 'delayedArea';

    ctx.save();
    ctx.globalAlpha = isSuper ? 0.42 : 0.3;
    ctx.fillStyle = isSuper ? '#facc15' : p.def.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = isSuper ? 3 : 2;

    if (placed) {
      const d = 80 + v.len * (reach - 80);
      const tx = p.x + Math.cos(angle) * d;
      const ty = p.y + Math.sin(angle) * d;
      const rad = spec.aoe || spec.radius || 70;
      ctx.beginPath();
      ctx.arc(tx, ty, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tx, ty);
      ctx.globalAlpha = 0.3;
      ctx.stroke();
    } else {
      const spread = Math.max(spec.spread || 0, 0.12);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, reach, angle - spread / 2, angle + spread / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.stroke();
    }
    ctx.restore();
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
