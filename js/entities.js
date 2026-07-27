/*
 * Brawlers, projectiles and everything they can spawn.
 *
 * Kits are pure data (see roster.js) built from a vocabulary of emitters and
 * on-hit effects, so a brawler's real behaviour — a shotgun cone, a bouncing
 * bullet, a returning pickaxe, a chaining bolt, a turret — is described rather
 * than special-cased.
 */

let _entityId = 1;

/*
 * Opponents are levelled to match the fight rather than to be a wall: in
 * ranked their level tracks the tier, so a Master lobby is a Master lobby.
 *
 * In casual they trail the player by a couple of levels instead of mirroring
 * them. Mirroring exactly meant every upgrade you bought was handed to the
 * other team in the same breath, so levelling up felt like it did nothing.
 */
function opts_power(def, isBot) {
  if (typeof Game === 'undefined' || !isBot) return 1;
  if (Game.ranked && typeof Ranked !== 'undefined') {
    const i = RANKS.findIndex((r) => r.id === Ranked.tier().id);
    return clamp(3 + Math.round(i * 1.35), 1, MAX_POWER);
  }
  const mine = Game.player ? Game.player.power : 1;
  return clamp(Math.round(mine * 0.7), 1, MAX_POWER);
}

class Brawler {
  constructor(def, team, isBot, name) {
    this.id = _entityId++;
    this.def = def;
    this.team = team;
    this.isBot = isBot;
    this.name = name;
    this.radius = def.radius || 17;
    // Power level scales health and damage together.
    this.power = (typeof Progress !== 'undefined' && !isBot)
      ? Progress.level(def.id)
      : (opts_power(def, isBot));
    this.powerMult = powerMult(this.power);
    this.maxHp = Math.round(def.hp * this.powerMult);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed * MOVE.speedScale;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.maxAmmo = def.ammo != null ? def.ammo : 3;
    this.ammo = this.maxAmmo;
    this.reloadTimer = 0;
    this.attackCd = 0;
    this.charge = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.gems = 0;
    this.revealTimer = 0;
    this.hurtFlash = 0;
    this.spawnGuard = 0;
    this.kills = 0;
    this.deaths = 0;
    this.damageDealt = 0;
    this.emote = null;          // { icon, life }
    this.stars = 0;          // Bounty
    this.lockFlash = 0;      // brief marker over an auto-aim target
    this.lockTarget = null;

    /* Overdrive: fills only once the Super is already available. */
    this.hyperCharge = 0;
    this.hyperMax = def.hyper ? (def.hyper.charge || def.superCharge * 1.2) : Infinity;
    this.hyperActive = 0;

    /* Status effects and shields. */
    this.shieldHp = 0;
    this.poison = null;       // { dps, until, source }
    this.slowUntil = 0;
    this.slowMult = 1;
    this.stunUntil = 0;
    this.invisUntil = 0;
    this.hasteUntil = 0;
    this.hasteMult = 1;
    this.rooted = 0;
    this.pierceWallsUntil = 0;

    /* Multi-shot sequences (Sixer's bullet stream, Haymaker's punch combo). */
    this.pending = [];

    /* Trait resources — Nori banks a fish for every attack that connects. */
    this.fish = 0;

    /* Emitter state. */
    this.dash = null;
    this.leap = null;
    this.chargeUp = 0;        // for charge-up attacks (Bea/Angelo style)
    this.beam = null;
    this.attackToken = 0;
    this.attackIndex = 0;     // which half of an alternating attack is next

    /*
     * Gadget: a small active with a hard limit rather than a meter. Charges
     * come back on respawn, so it is a resource you spend in a fight rather
     * than one you hoard across a whole match.
     */
    this.gadgetUses = def.gadget ? GADGET_USES : 0;
    this.gadgetCd = 0;
    this.gadgetFlash = 0;

    this.input = { mx: 0, my: 0, aim: 0, aimDist: 0, fire: false, super: false, hyper: false, gadget: false };
  }

  get gadgetReady() { return !!this.def.gadget && this.gadgetUses > 0 && this.gadgetCd <= 0; }
  get superReady() { return this.charge >= this.def.superCharge; }
  get chargePct() { return clamp(this.charge / this.def.superCharge, 0, 1); }
  get hyperReady() { return !!this.def.hyper && this.hyperCharge >= this.hyperMax; }
  get hyperPct() { return this.def.hyper ? clamp(this.hyperCharge / this.hyperMax, 0, 1) : 0; }
  get hidden() {
    if (!this.alive) return false;
    if (this.invisUntil > 0) return true;
    return GameMap.bushAt(this.x, this.y) && this.revealTimer <= 0;
  }
  get stunned() { return this.stunUntil > 0; }

  get speed() {
    let s = this.baseSpeed;
    if (this.hyperActive > 0) s *= HYPER.speedMult;
    if (this.hasteUntil > 0) s *= this.hasteMult;
    if (this.slowUntil > 0) s *= this.slowMult;
    if (this.def.trait === 'slowReload') s *= 1;
    return s;
  }

  get damageMult() {
    return (this.hyperActive > 0 ? HYPER.damageMult : 1) * this.powerMult;
  }
  get incomingMult() { return this.hyperActive > 0 ? HYPER.shieldMult : 1; }

  spawnAt(x, y) {
    this.x = x;
    this.y = y;
    this.hp = this.maxHp;
    this.alive = true;
    this.ammo = this.maxAmmo;
    this.reloadTimer = 0;
    this.attackCd = 0;
    this.vx = this.vy = 0;
    this.spawnGuard = 1.2;
    this.dash = null;
    this.leap = null;
    this.beam = null;
    this.pending.length = 0;
    this.shieldHp = 0;
    this.poison = null;
    this.slowUntil = this.stunUntil = this.invisUntil = this.hasteUntil = 0;
    this.pierceWallsUntil = 0;
    this.hyperActive = 0;
    this.chargeUp = 0;
    this.gadgetUses = this.def.gadget ? GADGET_USES : 0;
    this.gadgetCd = 0;
  }

  update(dt, game) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) game.respawn(this);
      return;
    }

    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    this.revealTimer = Math.max(0, this.revealTimer - dt);
    this.spawnGuard = Math.max(0, this.spawnGuard - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.lockFlash = Math.max(0, this.lockFlash - dt);
    this.slowUntil = Math.max(0, this.slowUntil - dt);
    this.stunUntil = Math.max(0, this.stunUntil - dt);
    this.invisUntil = Math.max(0, this.invisUntil - dt);
    this.hasteUntil = Math.max(0, this.hasteUntil - dt);
    this.pierceWallsUntil = Math.max(0, this.pierceWallsUntil - dt);
    this.gadgetCd = Math.max(0, this.gadgetCd - dt);
    this.gadgetFlash = Math.max(0, this.gadgetFlash - dt);
    if (this.hyperActive > 0) this.hyperActive = Math.max(0, this.hyperActive - dt);

    if (this.poison) {
      this.poison.until -= dt;
      this.poison.tick -= dt;
      if (this.poison.tick <= 0) {
        this.poison.tick += STATUS_TICK;
        game.damage(this, this.poison.dps * STATUS_TICK, this.poison.source, true);
      }
      if (this.poison.until <= 0) this.poison = null;
      if (!this.alive) return;
    }

    this._updateReload(dt);
    this._updatePending(dt, game);
    if (this.def.trait === 'chargeHook') this._updateCharge(dt, game);

    if (this.dash) this._updateDash(dt, game);
    else if (this.leap) this._updateLeap(dt, game);
    else this._updateMove(dt, game);

    if (!this.stunned && !this.dash && !this.leap) {
      if (this.input.gadget && this.gadgetReady) this.useGadget(game);
      if (this.input.hyper && this.hyperReady && this.superReady) this.activateHyper(game);
      if (this.input.super && this.superReady) this.useSuper(game);
      // A charge-hook brawler drives its own attack off hold/release instead.
      else if (this.def.trait === 'chargeHook') { /* handled in _updateCharge */ }
      else if (this.input.fire && this.attackCd <= 0 && this.ammo > 0) {
        // Carrying the ball replaces the attack with a kick.
        if (game.mode.interceptFire && game.mode.interceptFire(game, this)) this.attackCd = 0.35;
        else this.fire(game);
      }
    }

    game.pickUpGems(this);
  }

  _updateReload(dt) {
    const rate = this.def.reload;
    if (this.ammo < this.maxAmmo) {
      this.reloadTimer += dt;
      if (this.reloadTimer >= rate) {
        this.reloadTimer -= rate;
        this.ammo++;
      }
    } else {
      this.reloadTimer = 0;
    }
  }

  _updatePending(dt, game) {
    if (!this.pending.length) return;
    for (const shot of this.pending) shot.t -= dt;
    while (this.pending.length && this.pending[0].t <= 0) {
      const shot = this.pending.shift();
      // Only bullet streams go through fireOne. Queued melee (a punch combo,
      // a wind-up swing) has to go back through the emitter, or it silently
      // turns into invisible projectiles with melee stats.
      if (shot.spec.emit && shot.spec.emit !== 'projectiles') {
        Abilities.emit(this, shot.spec, game, shot.ctx);
      } else {
        Abilities.fireOne(this, shot.spec, game, shot.ctx);
      }
    }
  }

  /*
   * Counter-Strike movement. Friction bleeds the whole velocity every frame;
   * accelerate() then tops it back up, but only along the direction asked for
   * and only up to the cap. Net effect: you ramp up over a few frames, carry
   * momentum through turns, and a knockback keeps sliding instead of being
   * cancelled the instant you hold a key.
   */
  _friction(dt, scale) {
    const sp = Math.hypot(this.vx, this.vy);
    if (sp < 1) { this.vx = this.vy = 0; return; }
    const control = Math.max(sp, MOVE.stopSpeed);
    const drop = control * MOVE.friction * (scale == null ? 1 : scale) * dt;
    const mult = Math.max(sp - drop, 0) / sp;
    this.vx *= mult;
    this.vy *= mult;
  }

  _accelerate(dt, wx, wy, wishSpeed, accel) {
    const current = this.vx * wx + this.vy * wy;
    const add = wishSpeed - current;
    if (add <= 0) return;                       // already at speed this way
    const a = Math.min(accel * wishSpeed * dt, add);
    this.vx += wx * a;
    this.vy += wy * a;
  }

  get moveSpeed() { return Math.hypot(this.vx, this.vy); }

  _updateMove(dt, game) {
    const inp = this.input;
    let wx = inp.mx, wy = inp.my;
    const len = Math.hypot(wx, wy);
    if (len > 0.0001) { wx /= len; wy /= len; }
    const held = len > 0.05 && !this.stunned && this.rooted <= 0;

    this._friction(dt);
    if (held) this._accelerate(dt, wx, wy, this.speed, MOVE.accel);

    this.hitWallX = this.hitWallY = false;
    moveAndCollide(this, this.vx * dt, this.vy * dt);
    // Running into a wall kills that component instead of banking against it.
    if (this.hitWallX) this.vx = 0;
    if (this.hitWallY) this.vy = 0;

    this.angle = inp.aim;
  }

  /* Knockback and pulls are impulses straight into velocity; friction eats them. */
  push(ax, ay) {
    this.vx += ax;
    this.vy += ay;
  }

  _updateDash(dt, game) {
    const d = this.dash;
    d.left -= d.speed * dt;
    const step = d.speed * dt;
    const dx = Math.cos(d.angle) * step;
    const dy = Math.sin(d.angle) * step;

    if (d.breakWalls) {
      const ax = this.x + Math.cos(d.angle) * (this.radius + 12);
      const ay = this.y + Math.sin(d.angle) * (this.radius + 12);
      const tx = Math.floor(ax / TILE), ty = Math.floor(ay / TILE);
      if (GameMap.breakTile(tx, ty)) game.crateSmashed(tx, ty);
    }

    this.hitWallX = this.hitWallY = false;
    if (d.throughWalls) {
      this.x = clamp(this.x + dx, this.radius, WORLD_W - this.radius);
      this.y = clamp(this.y + dy, this.radius, WORLD_H - this.radius);
      // Never finish a wall-phasing dash inside a wall.
      if (d.left <= 0 && GameMap.solidAt(this.x, this.y)) d.left = 6;
    } else {
      moveAndCollide(this, dx, dy);
      if (this.hitWallX || this.hitWallY) d.left = 0;
    }

    if (d.damage) {
      for (const other of game.brawlers) {
        if (!other.alive || other.team === this.team || d.hits.has(other.id)) continue;
        if (dist2(this.x, this.y, other.x, other.y) < (this.radius + other.radius + 6) ** 2) {
          d.hits.add(other.id);
          Abilities.applyHit(other, d.spec, this, game, d.angle);
        }
      }
    }

    this.angle = d.angle;
    if (d.left <= 0) {
      if (d.spec && d.spec.onArrive) Abilities.emit(this, d.spec.onArrive, game, { angle: d.angle, aimDist: 0 });
      game.burst(this.x, this.y, this.def.color, 16);
      this.dash = null;
    }
  }

  _updateLeap(dt, game) {
    const l = this.leap;
    l.t += dt;
    const p = clamp(l.t / l.dur, 0, 1);
    this.x = lerp(l.sx, l.tx, p);
    this.y = lerp(l.sy, l.ty, p);
    l.height = Math.sin(Math.PI * p);
    if (p >= 1) {
      // Never land inside a wall.
      if (GameMap.solidAt(this.x, this.y)) {
        const back = GameMap._nearestOpen(Math.floor(this.x / TILE), Math.floor(this.y / TILE));
        if (back) { this.x = (back.tx + 0.5) * TILE; this.y = (back.ty + 0.5) * TILE; }
      }
      if (l.spec.onArrive) Abilities.emit(this, l.spec.onArrive, game, { angle: this.angle, aimDist: 0 });
      game.shake(7);
      this.leap = null;
    }
  }

  fire(game, extra) {
    let a = this.def.attack;
    if (a.emit === 'alternate') {
      a = a.parts[this.attackIndex % a.parts.length];
      this.attackIndex++;
    }
    this.ammo--;
    this.attackCd = a.cooldown || 0.35;
    this.revealTimer = ATTACK_REVEAL;
    Abilities.emit(this, a, game, Object.assign({
      angle: this.input.aim,
      aimDist: this.input.aimDist || a.range,
    }, extra));
    Sfx.play('shot');
  }

  /*
   * Nori's rod. A tap swings it in a wide arc; holding winds up a hook that
   * latches onto whoever — or whatever — it hits and reels him in. A full
   * charge carries him clean over the wall he catches.
   */
  _updateCharge(dt, game) {
    const holding = this.input.holding && !this.stunned && !this.dash && !this.leap;
    if (holding) {
      this.chargeUp = Math.min(this.chargeUp + dt, HOOK.maxCharge);
      this._wasHolding = true;
      return;
    }
    if (!this._wasHolding) return;
    this._wasHolding = false;
    const held = this.chargeUp;
    this.chargeUp = 0;
    if (this.attackCd > 0 || this.ammo <= 0) return;
    if (held < HOOK.tapTime) this.fire(game);
    else this.hookThrow(game, clamp(held / HOOK.maxCharge, 0, 1));
  }

  hookThrow(game, charge) {
    const h = this.def.hook;
    if (!h) return this.fire(game);
    this.ammo--;
    this.attackCd = h.cooldown || 0.5;
    this.revealTimer = ATTACK_REVEAL;
    const range = lerp(h.minRange || 200, h.range || 420, charge);
    Abilities._spawnBullet(this, h, game, this.input.aim, range, { charge });
    game.floatText(this.x, this.y - this.radius - 30,
      charge >= 0.95 ? 'MAX' : '', '#38bdf8', 13);
    Sfx.play('super_shot');
  }

  get chargePctHook() { return clamp(this.chargeUp / HOOK.maxCharge, 0, 1); }

  useSuper(game) {
    this.supersLanded = (this.supersLanded || 0) + 1;
    let spec = this.def.super;
    // A live Overdrive upgrades the Super for as long as it lasts.
    if (this.hyperActive > 0 && this.def.hyper && this.def.hyper.super) {
      spec = Object.assign({}, spec, this.def.hyper.super);
    }
    this.charge = 0;
    this.revealTimer = ATTACK_REVEAL;
    Abilities.emit(this, spec, game, {
      angle: this.input.aim,
      aimDist: this.input.aimDist || spec.range || 400,
      isSuper: true,
    });
    Sfx.play('super');
    if (typeof Music !== 'undefined') Music.duck(0.5, 0.6);
  }

  /*
   * Gadgets aim wherever you already point. A few of them (a lobbed charge, a
   * syrup patch) want a distance too, which is the same aim the Super uses.
   */
  useGadget(game) {
    const g = this.def.gadget;
    if (!g) return;
    this.gadgetUses--;
    this.gadgetCd = GADGET_COOLDOWN;
    this.gadgetFlash = 0.4;
    this.gadgetsUsed = (this.gadgetsUsed || 0) + 1;
    this.revealTimer = ATTACK_REVEAL;
    Abilities.emit(this, g.spec, game, {
      angle: this.input.aim,
      aimDist: this.input.aimDist || g.spec.range || 200,
    });
    game.floatText(this.x, this.y - this.radius - 26, g.name.toUpperCase(), g.spec.color || this.def.color, 13);
    Sfx.play('gadget');
  }

  activateHyper(game) {
    this.hyperCharge = 0;
    this.hyperActive = HYPER.duration;
    game.pulses.push({ x: this.x, y: this.y, r: 0, max: 150, life: 0.5, color: '#facc15' });
    game.floatText(this.x, this.y - this.radius - 30, 'OVERDRIVE!', '#facc15', 16);
    Sfx.play('charged');
  }

  addCharge(amount) {
    if (amount <= 0) return;
    if (this.charge < this.def.superCharge) {
      this.charge = Math.min(this.def.superCharge, this.charge + amount);
    } else if (this.def.hyper) {
      this.hyperCharge = Math.min(this.hyperMax, this.hyperCharge + amount * HYPER.chargeMult);
    }
  }
}

/* ------------------------------------------------------------------ */

class Projectile {
  constructor(owner, spec, opt) {
    this.owner = owner;
    this.team = owner.team;
    this.spec = spec;
    this.x = opt.x;
    this.y = opt.y;
    this.angle = opt.angle;
    this.speed = opt.speed;
    this.vx = Math.cos(opt.angle) * opt.speed;
    this.vy = Math.sin(opt.angle) * opt.speed;
    this.radius = spec.radius || 6;
    this.range = opt.range;
    this.travelled = 0;
    this.color = spec.color || owner.def.color;
    this.dead = false;
    this.hits = new Set();

    this.bounce = spec.bounce || 0;
    this.pierce = !!spec.pierce;
    this.returns = !!spec.returns;
    this.returning = false;
    this.homing = spec.homing || 0;
    this.sticky = spec.sticky || 0;
    this.stuckTimer = 0;
    this.chain = spec.chain || null;
    this.chainsLeft = spec.chain ? spec.chain.count : 0;
    this.ignoreWalls = !!spec.ignoreWalls;
    this.aoe = spec.aoe || 0;
    this.scale = spec.scale || null;   // damage ramp over distance
    this.isSuper = !!opt.isSuper;
    this.wave = !!spec.healAllies;
    this.hookPull = !!spec.hookPull;
    this.charge = opt.charge || 0;
  }

  get damage() {
    let d = (this.spec.damage || 0) * this.owner.damageMult;
    if (this.scale) {
      const t = clamp(this.travelled / this.range, 0, 1);
      d *= lerp(this.scale.near, this.scale.far, t);
    }
    return d;
  }

  update(dt, game) {
    if (this.stuckTimer > 0) {
      this.stuckTimer -= dt;
      if (this.stuckTimer <= 0) this._detonate(game);
      return;
    }

    const steps = 2;
    const sdt = dt / steps;
    for (let s = 0; s < steps && !this.dead; s++) {
      if (this.homing) this._steer(sdt, game);

      if (this.returning) {
        // Home back on the thrower (Carl's pickaxe).
        const a = Math.atan2(this.owner.y - this.y, this.owner.x - this.x);
        this.angle = a;
        this.vx = Math.cos(a) * this.speed;
        this.vy = Math.sin(a) * this.speed;
        if (dist2(this.x, this.y, this.owner.x, this.owner.y) < 26 * 26) {
          this.dead = true;
          if (this.owner.alive && this.spec.refillOnCatch) {
            this.owner.ammo = Math.min(this.owner.maxAmmo, this.owner.ammo + 1);
          }
          return;
        }
      }

      const dx = this.vx * sdt, dy = this.vy * sdt;
      this.x += dx;
      this.y += dy;
      this.travelled += Math.hypot(dx, dy);

      if (this.x < 0 || this.y < 0 || this.x > WORLD_W || this.y > WORLD_H) { this.dead = true; break; }

      if (!this.returning && this.travelled >= this.range) {
        if (this.returns) { this.returning = true; this.hits.clear(); }
        else if (this.sticky) { this.stuckTimer = this.sticky; return; }
        else { this._expire(game); break; }
      }

      if (!this.ignoreWalls) {
        const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
        if (GameMap.solid(tx, ty)) {
          if (this.spec.breakWalls && GameMap.breakTile(tx, ty)) {
            game.crateSmashed(tx, ty);
          } else if (this.hookPull) {
            // Caught a wall: reel in, and vault it on a full charge.
            this._latch(game, this.x, this.y);
            break;
          } else if (this.bounce > 0) {
            this._reflect(tx, ty);
          } else {
            game.burst(this.x, this.y, '#94a3b8', 5);
            this._expire(game);
            break;
          }
        }
      }

      if (this._checkHits(game)) break;
    }
  }

  _steer(dt, game) {
    let best = null, bestD = Infinity;
    for (const b of game.brawlers) {
      if (!b.alive || b.team === this.team) continue;
      const d = dist2(this.x, this.y, b.x, b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (!best) return;
    const want = Math.atan2(best.y - this.y, best.x - this.x);
    const diff = angDiff(want, this.angle);
    this.angle += clamp(diff, -this.homing * dt, this.homing * dt);
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
  }

  _reflect(tx, ty) {
    // Work out which face was crossed and mirror the matching component.
    const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
    const dx = this.x - cx, dy = this.y - cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.vx = -this.vx;
      this.x += Math.sign(dx) * 3;
    } else {
      this.vy = -this.vy;
      this.y += Math.sign(dy) * 3;
    }
    this.angle = Math.atan2(this.vy, this.vx);
    this.bounce--;
  }

  _checkHits(game) {
    for (const b of game.brawlers) {
      if (!b.alive || this.hits.has(b.id) || b === this.owner) continue;
      const friendly = b.team === this.team;
      if (friendly && !this.spec.healAllies) continue;
      const rr = (this.radius + b.radius) ** 2;
      if (dist2(this.x, this.y, b.x, b.y) > rr) continue;

      this.hits.add(b.id);
      if (friendly) {
        game.healTarget(b, (this.spec.heal || this.spec.damage) * this.owner.damageMult, this.owner);
      } else {
        if (this.aoe) this._detonate(game);
        else Abilities.applyHit(b, this.spec, this.owner, game, this.angle, this.damage);
        game.burst(this.x, this.y, this.color, 6);
        if (this.spec.catchFish && this.owner.alive) this.owner.fish++;
        if (this.hookPull) { this._latch(game, b.x, b.y); return true; }
        // Spike's cactus bursts on contact, not just at the end of its flight.
        if (this.spec.splitOnHit && this.spec.splitOnEnd) {
          this._expire(game);
          return true;
        }
        if (this.chainsLeft > 0 && this._chainTo(b, game)) return false;
      }
      if (!this.pierce && !this.returns) { this.dead = true; return true; }
    }

    // Summons are legitimate targets too.
    for (const s of game.summons) {
      if (s.team === this.team || s.dead || this.hits.has(s.id)) continue;
      if (dist2(this.x, this.y, s.x, s.y) > (this.radius + s.radius) ** 2) continue;
      this.hits.add(s.id);
      s.takeDamage(this.damage, game);
      game.burst(this.x, this.y, this.color, 5);
      if (!this.pierce && !this.returns) { this.dead = true; return true; }
    }
    return false;
  }

  /* Belle-style: leap to the next nearby enemy instead of stopping. */
  _chainTo(from, game) {
    let best = null, bestD = this.chain.range ** 2;
    for (const b of game.brawlers) {
      if (!b.alive || b.team === this.team || this.hits.has(b.id)) continue;
      const d = dist2(from.x, from.y, b.x, b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (!best) return false;
    this.chainsLeft--;
    this.x = from.x;
    this.y = from.y;
    this.angle = Math.atan2(best.y - this.y, best.x - this.x);
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.travelled = 0;
    this.range = this.chain.range;
    game.addLink(from.x, from.y, best.x, best.y, this.color);
    return true;
  }

  /* Reel the thrower toward whatever the hook caught. */
  _latch(game, tx, ty) {
    this.dead = true;
    const o = this.owner;
    if (!o || !o.alive) return;
    const a = Math.atan2(ty - o.y, tx - o.x);
    const d = Math.max(0, dist(o.x, o.y, tx, ty) - (o.radius + 16));
    o.dash = {
      angle: a, left: d, speed: HOOK.reelSpeed, damage: 0,
      breakWalls: false, throughWalls: this.charge >= 0.95,
      hits: new Set(), spec: {},
    };
    game.addLink(o.x, o.y, tx, ty, this.color);
    game.burst(tx, ty, this.color, 8);
    Sfx.play('tick');
  }

  _detonate(game) {
    this.dead = true;
    game.explode(this.x, this.y, this.aoe || 60, this.damage, this.owner, this.color, this.spec);
  }

  _expire(game) {
    this.dead = true;
    if (this.aoe) game.explode(this.x, this.y, this.aoe, this.damage, this.owner, this.color, this.spec);
    if (this.spec.splitOnEnd) {
      const n = this.spec.splitOnEnd.count;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
        game.projectiles.push(new Projectile(this.owner, this.spec.splitOnEnd, {
          x: this.x, y: this.y, angle: a,
          speed: this.spec.splitOnEnd.speed || 420,
          range: this.spec.splitOnEnd.range || 120,
        }));
      }
    }
  }
}

/* Arcing shot that clears walls and detonates where it lands. */
class Lob {
  constructor(owner, spec, opt) {
    this.owner = owner;
    this.team = owner.team;
    this.spec = spec;
    this.x = this.sx = opt.x;
    this.y = this.sy = opt.y;
    this.tx = opt.tx;
    this.ty = opt.ty;
    this.travel = dist(this.sx, this.sy, this.tx, this.ty);
    this.duration = Math.max(0.12, this.travel / (spec.speed || 560));
    this.t = 0;
    this.radius = spec.radius || 9;
    this.aoe = spec.aoe || 60;
    this.color = spec.color || owner.def.color;
    this.dead = false;
  }

  get height() { return Math.sin(Math.PI * clamp(this.t / this.duration, 0, 1)); }

  update(dt, game) {
    this.t += dt;
    const p = clamp(this.t / this.duration, 0, 1);
    this.x = lerp(this.sx, this.tx, p);
    this.y = lerp(this.sy, this.ty, p);
    if (p >= 1) {
      this.dead = true;
      game.explode(this.x, this.y, this.aoe, (this.spec.damage || 0) * this.owner.damageMult,
        this.owner, this.color, this.spec);
      if (this.spec.puddle) {
        game.areas.push({
          x: this.x, y: this.y, radius: this.spec.puddle.radius || this.aoe,
          dps: this.spec.puddle.dps, life: this.spec.puddle.duration,
          maxLife: this.spec.puddle.duration, team: this.team, owner: this.owner,
          color: this.color, tick: 0, heal: this.spec.puddle.heal || 0,
          slow: this.spec.puddle.slow || 0,
        });
      }
    }
  }
}

/* Sustained hitscan line — flamethrowers, beams, healing rays. */
class Beam {
  constructor(owner, spec) {
    this.owner = owner;
    this.team = owner.team;
    this.spec = spec;
    this.life = spec.duration || 0.3;
    this.tick = 0;
    this.dead = false;
    this.color = spec.color || owner.def.color;
    this.angle = owner.angle;
    this.length = spec.range || 300;
  }

  update(dt, game) {
    this.life -= dt;
    this.tick -= dt;
    if (this.spec.follow !== false) this.angle = this.owner.angle;
    // Stop the beam at the first wall.
    this.length = this.spec.range;
    const steps = Math.ceil(this.spec.range / 12);
    for (let i = 1; i <= steps; i++) {
      const d = (i / steps) * this.spec.range;
      const px = this.owner.x + Math.cos(this.angle) * d;
      const py = this.owner.y + Math.sin(this.angle) * d;
      if (!this.spec.ignoreWalls && GameMap.solidAt(px, py)) { this.length = d; break; }
    }

    if (this.tick <= 0) {
      this.tick += 0.1;
      for (const b of game.brawlers) {
        if (!b.alive) continue;
        const friendly = b.team === this.team;
        if (friendly && !this.spec.healAllies) continue;
        if (b === this.owner) continue;
        const d = dist(this.owner.x, this.owner.y, b.x, b.y);
        if (d > this.length + b.radius) continue;
        const a = Math.atan2(b.y - this.owner.y, b.x - this.owner.x);
        if (Math.abs(angDiff(a, this.angle)) > (this.spec.arc || 0.12)) continue;
        if (friendly) game.healTarget(b, (this.spec.heal || 0) * 0.1, this.owner);
        else Abilities.applyHit(b, this.spec, this.owner, game, this.angle,
          (this.spec.dps || 0) * 0.1 * this.owner.damageMult);
      }
    }
    if (this.life <= 0 || !this.owner.alive) this.dead = true;
  }
}

/* Turrets, bears, cannons, mines — anything a Super leaves on the field. */
class Summon {
  constructor(owner, spec, x, y) {
    this.id = _entityId++;
    this.owner = owner;
    this.team = owner.team;
    this.spec = spec;
    this.x = x;
    this.y = y;
    this.radius = spec.radius || 16;
    this.maxHp = spec.hp;
    this.hp = spec.hp;
    this.life = spec.life || Infinity;
    this.cd = 0;
    this.dead = false;
    this.angle = 0;
    this.kind = spec.kind || 'turret';
    this.armed = 0.4;
    this.color = spec.color || owner.def.color;
  }

  takeDamage(amount, game) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      game.burst(this.x, this.y, this.color, 18);
      Sfx.play('crate');
    }
  }

  update(dt, game) {
    this.life -= dt;
    this.armed -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    let target = null, bestD = (this.spec.range || 260) ** 2;
    for (const b of game.brawlers) {
      if (!b.alive || b.team === this.team) continue;
      const d = dist2(this.x, this.y, b.x, b.y);
      if (d < bestD && GameMap.lineOfSight(this.x, this.y, b.x, b.y)) { bestD = d; target = b; }
    }

    if (this.kind === 'safe') return;

    if (this.kind === 'mine') {
      if (this.armed <= 0 && target && bestD < (this.spec.trigger || 60) ** 2) {
        this.dead = true;
        game.explode(this.x, this.y, this.spec.aoe || 90, this.spec.damage, this.owner, this.color, this.spec);
      }
      return;
    }

    if (this.kind === 'pet') {
      // Chase and maul, like Nita's bear.
      let goal = target;
      if (!goal) {
        for (const b of game.brawlers) {
          if (!b.alive || b.team === this.team) continue;
          const d = dist2(this.x, this.y, b.x, b.y);
          if (!goal || d < dist2(this.x, this.y, goal.x, goal.y)) goal = b;
        }
      }
      if (goal) {
        const a = Math.atan2(goal.y - this.y, goal.x - this.x);
        this.angle = a;
        moveAndCollide(this, Math.cos(a) * this.spec.speed * dt, Math.sin(a) * this.spec.speed * dt);
        this.cd -= dt;
        if (this.cd <= 0 && dist2(this.x, this.y, goal.x, goal.y) < (this.radius + goal.radius + 14) ** 2) {
          this.cd = this.spec.cooldown || 0.7;
          Abilities.applyHit(goal, this.spec, this.owner, game, a, this.spec.damage);
          game.burst(goal.x, goal.y, this.color, 8);
        }
      }
      return;
    }

    if (this.kind === 'heal') {
      this.cd -= dt;
      if (this.cd <= 0) {
        this.cd = this.spec.cooldown || 1;
        for (const b of game.brawlers) {
          if (!b.alive || b.team !== this.team) continue;
          if (dist2(this.x, this.y, b.x, b.y) < (this.spec.range || 240) ** 2) {
            game.healTarget(b, this.spec.heal, this.owner);
          }
        }
      }
      return;
    }

    // Default: a turret that shoots whatever it can see.
    this.cd -= dt;
    if (target && this.cd <= 0) {
      this.cd = this.spec.cooldown || 0.6;
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);
      game.projectiles.push(new Projectile(this.owner, this.spec.shot || this.spec, {
        x: this.x, y: this.y, angle: this.angle,
        speed: this.spec.bulletSpeed || 620,
        range: this.spec.range || 260,
      }));
    }
  }
}

class Gem {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx || 0;
    this.vy = vy || 0;
    this.radius = 11;
    this.delay = 0.45;
    this.life = 0;
    this.dead = false;
  }

  update(dt) {
    this.life += dt;
    this.delay -= dt;
    if (this.vx || this.vy) {
      moveAndCollide(this, this.vx * dt, this.vy * dt);
      const f = Math.pow(0.002, dt);
      this.vx *= f;
      this.vy *= f;
      if (Math.hypot(this.vx, this.vy) < 6) this.vx = this.vy = 0;
    }
  }
}
