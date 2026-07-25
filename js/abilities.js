/*
 * The ability engine.
 *
 * Every attack and Super in the roster is a spec object with an `emit` kind
 * plus on-hit effects. This file turns those specs into things happening in
 * the world, so roster.js stays pure data.
 *
 *   emit: projectiles | lob | melee | beam | dash | leap | summon
 *         self | area | pull | walls | teleport | multi
 *
 * On-hit effects any damaging spec may carry:
 *   damage, heal, healAllies, knockback, pull, stun, slow, poison,
 *   lifesteal, shieldSelf, chargeOnHit
 */

const Abilities = {
  emit(owner, spec, game, ctx) {
    if (!spec) return;
    const angle = ctx.angle != null ? ctx.angle : owner.angle;
    const aimDist = ctx.aimDist || spec.range || 300;

    switch (spec.emit) {
      case 'multi':
        for (const sub of (spec.parts || [])) this.emit(owner, sub, game, ctx);
        return;

      case 'projectiles': return this._projectiles(owner, spec, game, { ...ctx, angle, aimDist });
      case 'lob': return this._lob(owner, spec, game, { ...ctx, angle, aimDist });
      case 'melee': return this._melee(owner, spec, game, { ...ctx, angle });
      case 'beam': return this._beam(owner, spec, game);
      case 'dash': return this._dash(owner, spec, game, angle);
      case 'leap': return this._leap(owner, spec, game, angle, aimDist);
      case 'summon': return this._summon(owner, spec, game, angle, aimDist);
      case 'self': return this._self(owner, spec, game);
      case 'area': return this._area(owner, spec, game, angle, aimDist);
      case 'pull': return this._pull(owner, spec, game, angle, aimDist);
      case 'walls': return this._walls(owner, spec, game, angle, aimDist);
      case 'teleport': return this._teleport(owner, spec, game, angle, aimDist);
      case 'delayedArea': return this._delayedArea(owner, spec, game, angle, aimDist);
      case 'random': return this._random(owner, spec, game, ctx);
      default: return;
    }
  },

  /* One projectile from a queued stream. */
  fireOne(owner, spec, game, ctx) {
    if (!owner.alive) return;
    this._spawnBullet(owner, spec, game, ctx.angle, ctx.range || spec.range, ctx);
    if (spec.sound !== false) Sfx.play(ctx.isSuper ? 'super_shot' : 'shot');
  },

  _spawnBullet(owner, spec, game, angle, range, ctx) {
    const off = owner.radius + 4;
    const effective = owner.pierceWallsUntil > 0 ? { ...spec, ignoreWalls: true } : spec;
    game.projectiles.push(new Projectile(owner, effective, {
      x: owner.x + Math.cos(angle) * off,
      y: owner.y + Math.sin(angle) * off,
      angle,
      speed: (spec.speed || 700) * rand(spec.speedJitter ? 0.95 : 1, spec.speedJitter ? 1.05 : 1),
      range: range || spec.range || 320,
      isSuper: ctx && ctx.isSuper,
    }));
  },

  _projectiles(owner, spec, game, ctx) {
    const count = spec.count || 1;
    const pattern = spec.pattern || (count > 1 ? 'fan' : 'single');

    if (pattern === 'stream') {
      // Colt-style: a rapid line of shots from one ammo bar.
      const interval = spec.interval || 0.07;
      for (let i = 0; i < count; i++) {
        owner.pending.push({
          t: i * interval,
          spec,
          ctx: { angle: ctx.angle + rand(-(spec.jitter || 0), spec.jitter || 0), range: spec.range, isSuper: ctx.isSuper },
        });
      }
      owner.pending.sort((a, b) => a.t - b.t);
      return;
    }

    for (let i = 0; i < count; i++) {
      let angle = ctx.angle;
      if (pattern === 'fan' && count > 1) {
        angle += ((i / (count - 1)) - 0.5) * (spec.spread || 0.4);
      } else if (pattern === 'random') {
        angle += rand(-(spec.spread || 0.3) / 2, (spec.spread || 0.3) / 2);
      }
      this._spawnBullet(owner, spec, game, angle, spec.range, ctx);
    }
  },

  _lob(owner, spec, game, ctx) {
    const range = Math.min(spec.range, Math.max(spec.minRange || 60, ctx.aimDist));
    const base = {
      x: owner.x + Math.cos(ctx.angle) * range,
      y: owner.y + Math.sin(ctx.angle) * range,
    };
    const offsets = this._lobPattern(spec, ctx.angle);
    for (const o of offsets) {
      game.lobs.push(new Lob(owner, spec, {
        x: owner.x, y: owner.y,
        tx: clamp(base.x + o.x, 8, WORLD_W - 8),
        ty: clamp(base.y + o.y, 8, WORLD_H - 8),
      }));
    }
  },

  _lobPattern(spec, angle) {
    const s = spec.patternSize || 60;
    switch (spec.pattern) {
      case 'cross':
        return [{ x: 0, y: 0 }, { x: s, y: 0 }, { x: -s, y: 0 }, { x: 0, y: s }, { x: 0, y: -s }];
      case 'cluster': {
        const out = [];
        for (let i = 0; i < (spec.count || 3); i++) {
          const a = (i / (spec.count || 3)) * Math.PI * 2;
          out.push({ x: Math.cos(a) * s, y: Math.sin(a) * s });
        }
        return out;
      }
      case 'line': {
        const out = [];
        const n = spec.count || 3;
        for (let i = 0; i < n; i++) {
          const d = (i - (n - 1) / 2) * s;
          out.push({ x: Math.cos(angle) * d, y: Math.sin(angle) * d });
        }
        return out;
      }
      case 'spread': {
        const out = [];
        const n = spec.count || 3;
        for (let i = 0; i < n; i++) {
          const a = angle + ((i / Math.max(1, n - 1)) - 0.5) * (spec.spread || 0.5);
          out.push({ x: Math.cos(a) * s - Math.cos(angle) * s, y: Math.sin(a) * s - Math.sin(angle) * s });
        }
        return out;
      }
      default:
        return [{ x: 0, y: 0 }];
    }
  },

  _melee(owner, spec, game, ctx) {
    const hits = spec.hits || 1;
    if (hits > 1 && !ctx.chained) {
      for (let i = 1; i < hits; i++) {
        owner.pending.push({ t: i * (spec.interval || 0.14), spec: { ...spec, hits: 1 }, ctx: { ...ctx, chained: true } });
      }
      owner.pending.sort((a, b) => a.t - b.t);
    }
    const reach = spec.reach || 90;
    const arc = spec.arc || 0.9;
    let landed = false;
    for (const b of game.brawlers) {
      if (!b.alive || b.team === owner.team || b === owner) continue;
      const d = dist(owner.x, owner.y, b.x, b.y);
      if (d > reach + b.radius) continue;
      const a = Math.atan2(b.y - owner.y, b.x - owner.x);
      if (Math.abs(angDiff(a, ctx.angle)) > arc / 2) continue;
      this.applyHit(b, spec, owner, game, ctx.angle);
      landed = true;
      if (spec.catchFish) owner.fish++;
    }
    for (const s of game.summons) {
      if (s.team === owner.team || s.dead) continue;
      if (dist(owner.x, owner.y, s.x, s.y) > reach + s.radius) continue;
      s.takeDamage((spec.damage || 0) * owner.damageMult, game);
    }
    game.swings.push({
      x: owner.x, y: owner.y, angle: ctx.angle, arc, reach,
      life: 0.18, maxLife: 0.18, color: spec.color || owner.def.color,
    });
    if (spec.breakWalls) {
      const tx = Math.floor((owner.x + Math.cos(ctx.angle) * reach) / TILE);
      const ty = Math.floor((owner.y + Math.sin(ctx.angle) * reach) / TILE);
      if (GameMap.breakTile(tx, ty)) game.crateSmashed(tx, ty);
    }
    return landed;
  },

  _beam(owner, spec, game) {
    game.beams.push(new Beam(owner, spec));
  },

  _dash(owner, spec, game, angle) {
    owner.dash = {
      angle,
      left: spec.distance || 300,
      speed: spec.speed || 700,
      damage: spec.damage || 0,
      breakWalls: !!spec.breakWalls,
      throughWalls: !!spec.throughWalls,
      hits: new Set(),
      spec,
    };
    game.shake(6);
  },

  _leap(owner, spec, game, angle, aimDist) {
    const range = Math.min(spec.range || 300, Math.max(60, aimDist));
    owner.leap = {
      sx: owner.x, sy: owner.y,
      tx: clamp(owner.x + Math.cos(angle) * range, 20, WORLD_W - 20),
      ty: clamp(owner.y + Math.sin(angle) * range, 20, WORLD_H - 20),
      t: 0, dur: Math.max(0.25, range / (spec.speed || 700)),
      height: 0, spec,
    };
  },

  _summon(owner, spec, game, angle, aimDist) {
    const n = spec.count || 1;
    for (let i = 0; i < n; i++) {
      const a = angle + (n > 1 ? ((i / (n - 1)) - 0.5) * (spec.spread || 1.2) : 0);
      const d = Math.min(spec.placeRange || 120, Math.max(40, aimDist));
      let x = owner.x + Math.cos(a) * d;
      let y = owner.y + Math.sin(a) * d;
      if (GameMap.solidAt(x, y)) { x = owner.x; y = owner.y; }
      game.summons.push(new Summon(owner, spec, clamp(x, 20, WORLD_W - 20), clamp(y, 20, WORLD_H - 20)));
    }
  },

  _self(owner, spec, game) {
    if (spec.shield) owner.shieldHp += spec.shield;
    if (spec.heal) game.healTarget(owner, spec.heal, owner);
    if (spec.invis) owner.invisUntil = Math.max(owner.invisUntil, spec.invis);
    if (spec.haste) {
      owner.hasteUntil = Math.max(owner.hasteUntil, spec.haste.duration);
      owner.hasteMult = spec.haste.mult;
    }
    if (spec.ammo) owner.ammo = owner.maxAmmo;
    if (spec.teamRadius) {
      for (const b of game.brawlers) {
        if (!b.alive || b.team !== owner.team || b === owner) continue;
        if (dist(owner.x, owner.y, b.x, b.y) > spec.teamRadius) continue;
        if (spec.teamHeal) game.healTarget(b, spec.teamHeal, owner);
        if (spec.teamShield) b.shieldHp += spec.teamShield;
        if (spec.teamHaste) {
          b.hasteUntil = Math.max(b.hasteUntil, spec.teamHaste.duration);
          b.hasteMult = spec.teamHaste.mult;
        }
      }
    }
    game.pulses.push({
      x: owner.x, y: owner.y, r: 0, max: spec.teamRadius || 120,
      life: 0.5, color: spec.color || owner.def.color,
    });
  },

  _area(owner, spec, game, angle, aimDist) {
    const d = Math.min(spec.range || 300, Math.max(40, aimDist));
    const x = clamp(owner.x + Math.cos(angle) * d, 20, WORLD_W - 20);
    const y = clamp(owner.y + Math.sin(angle) * d, 20, WORLD_H - 20);
    game.areas.push({
      x, y, radius: spec.radius || 90, dps: spec.dps || 0, heal: spec.heal || 0,
      slow: spec.slow || 0, life: spec.duration || 4, maxLife: spec.duration || 4,
      team: owner.team, owner, color: spec.color || owner.def.color, tick: 0,
      teamPierceWalls: !!spec.teamPierceWalls, teamHasteField: !!spec.teamHasteField,
    });
    if (spec.damage) game.explode(x, y, spec.radius || 90, spec.damage * owner.damageMult, owner, spec.color || owner.def.color, spec);
  },

  /* Gene / Tara style: yank enemies toward a point. */
  _pull(owner, spec, game, angle, aimDist) {
    if (spec.projectile) {
      // A hand that grabs the first enemy it touches.
      this._spawnBullet(owner, { ...spec, pullToOwner: true }, game, angle, spec.range, { isSuper: true });
      return;
    }
    const d = Math.min(spec.range || 300, Math.max(40, aimDist));
    const x = clamp(owner.x + Math.cos(angle) * d, 20, WORLD_W - 20);
    const y = clamp(owner.y + Math.sin(angle) * d, 20, WORLD_H - 20);
    game.areas.push({
      x, y, radius: spec.radius || 140, dps: spec.dps || 0, pull: spec.strength || 260,
      life: spec.duration || 1.4, maxLife: spec.duration || 1.4,
      team: owner.team, owner, color: spec.color || owner.def.color, tick: 0,
    });
    game.pulses.push({ x, y, r: 0, max: spec.radius || 140, life: 0.6, color: spec.color || owner.def.color });
  },

  /* Sprout-style hedge: temporary destructible cover. */
  _walls(owner, spec, game, angle, aimDist) {
    const d = Math.min(spec.range || 300, Math.max(60, aimDist));
    const cx = owner.x + Math.cos(angle) * d;
    const cy = owner.y + Math.sin(angle) * d;
    const len = spec.length || 3;
    const perp = angle + Math.PI / 2;
    const placed = [];
    for (let i = 0; i < len; i++) {
      const off = (i - (len - 1) / 2) * TILE;
      const tx = Math.floor((cx + Math.cos(perp) * off) / TILE);
      const ty = Math.floor((cy + Math.sin(perp) * off) / TILE);
      if (tx < 1 || ty < 1 || tx >= MAP_W - 1 || ty >= MAP_H - 1) continue;
      if (GameMap.get(tx, ty) !== T_EMPTY) continue;
      // Do not entomb anyone standing there.
      let blocked = false;
      for (const b of game.brawlers) {
        if (b.alive && Math.floor(b.x / TILE) === tx && Math.floor(b.y / TILE) === ty) blocked = true;
      }
      if (blocked) continue;
      GameMap.set(tx, ty, T_CRATE);
      placed.push({ tx, ty });
    }
    if (placed.length) game.tempWalls.push({ tiles: placed, life: spec.duration || 8 });
  },

  _teleport(owner, spec, game, angle, aimDist) {
    const d = Math.min(spec.range || 320, Math.max(40, aimDist));
    let x = owner.x + Math.cos(angle) * d;
    let y = owner.y + Math.sin(angle) * d;
    if (GameMap.solidAt(x, y)) {
      const open = GameMap._nearestOpen(Math.floor(x / TILE), Math.floor(y / TILE));
      if (!open) return;
      x = (open.tx + 0.5) * TILE;
      y = (open.ty + 0.5) * TILE;
    }
    game.burst(owner.x, owner.y, owner.def.color, 16);
    owner.x = clamp(x, owner.radius, WORLD_W - owner.radius);
    owner.y = clamp(y, owner.radius, WORLD_H - owner.radius);
    game.burst(owner.x, owner.y, owner.def.color, 16);
    if (spec.invis) owner.invisUntil = Math.max(owner.invisUntil, spec.invis);
  },

  /*
   * Telegraphed strike: a marker lands now, the damage arrives a beat later.
   * Nori's Super scales both the radius and the hit with fish caught.
   */
  _delayedArea(owner, spec, game, angle, aimDist) {
    const d = Math.min(spec.range || 300, Math.max(40, aimDist));
    const x = clamp(owner.x + Math.cos(angle) * d, 20, WORLD_W - 20);
    const y = clamp(owner.y + Math.sin(angle) * d, 20, WORLD_H - 20);
    let radius = spec.radius || 100;
    let damage = spec.damage || 0;
    if (spec.perFish) {
      const fish = Math.min(owner.fish || 0, spec.maxFish || 6);
      radius += fish * spec.perFish.radius;
      damage += fish * spec.perFish.damage;
      owner.fish = 0;
    }
    game.telegraphs.push({
      x, y, radius, damage, delay: spec.delay || 1, maxDelay: spec.delay || 1,
      owner, team: owner.team, color: spec.color || owner.def.color, spec,
    });
  },

  /* Chester's Super never does the same thing twice. */
  _random(owner, spec, game, ctx) {
    const roll = pick(spec.options || ['blast']);
    const boost = spec.boosted ? 1.4 : 1;
    const table = {
      blast: { emit: 'projectiles', count: 7, pattern: 'fan', spread: 0.6, damage: 500 * boost, speed: 800, range: 400, radius: 8 },
      stun: { emit: 'projectiles', count: 1, damage: 400 * boost, speed: 780, range: 420, radius: 12, stun: 1.6, pierce: true },
      poison: { emit: 'area', range: 340, radius: 130, dps: 620 * boost, duration: 3.4, color: '#a3e635' },
      heal: { emit: 'self', teamRadius: 300, teamHeal: 2200 * boost, heal: 2200 * boost },
    };
    game.floatText(owner.x, owner.y - 40, roll.toUpperCase(), '#ec4899', 15);
    this.emit(owner, table[roll] || table.blast, game, ctx);
  },

  /* ---------------------------------------------------------------- */

  /* Apply a spec's damage and every rider effect to one target. */
  applyHit(target, spec, owner, game, angle, damageOverride) {
    const dmg = damageOverride != null ? damageOverride : (spec.damage || 0) * owner.damageMult;
    if (dmg > 0) game.damage(target, dmg, owner);
    if (!target.alive) return;

    if (spec.knockback) {
      target.push(Math.cos(angle) * spec.knockback, Math.sin(angle) * spec.knockback);
    }
    if (spec.pullToOwner && owner.alive) {
      const a = Math.atan2(owner.y - target.y, owner.x - target.x);
      target.push(Math.cos(a) * (spec.pullStrength || 420), Math.sin(a) * (spec.pullStrength || 420));
    }
    if (spec.stun) target.stunUntil = Math.max(target.stunUntil, spec.stun);
    if (spec.slow) {
      target.slowUntil = Math.max(target.slowUntil, spec.slow.duration || 1.5);
      target.slowMult = spec.slow.mult || 0.65;
    }
    if (spec.poison) {
      target.poison = {
        dps: spec.poison.dps,
        until: spec.poison.duration,
        tick: STATUS_TICK,
        source: owner,
      };
    }
    if (spec.reveal) target.revealTimer = Math.max(target.revealTimer, spec.reveal);
    if (spec.lifesteal && owner.alive) game.healTarget(owner, dmg * spec.lifesteal, owner);
    if (spec.shieldSelf) owner.shieldHp += spec.shieldSelf;
  },
};
