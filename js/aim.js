/*
 * Auto-aim.
 *
 * One target picker shared by everything that needs one: the mobile bare tap
 * and the aim assist that nudges manual shots. It leads the target the same
 * way the bots do, so a shot at a moving enemy actually connects instead of
 * trailing behind them.
 */

const AIM = {
  assistCone: 0.32,     // manual shots snap to a target inside this half-angle
  reachMult: 1.1,       // how far past your range auto-aim will still look
  minLockDist: 24,
};

const AutoAim = {
  /*
   * Best enemy to point at, or null. Prefers whoever is closest to dying,
   * then whoever is closest, so a shot tends to finish rather than spread
   * damage around.
   */
  target(game, from, opts) {
    const o = opts || {};
    const reach = (o.range || specRange(from.def.attack)) * AIM.reachMult;
    const needLos = o.needLos !== false;
    let best = null, bestScore = -Infinity;

    for (const e of game.brawlers) {
      if (!e.alive || e.team === from.team || e === from) continue;
      const d = dist(from.x, from.y, e.x, e.y);
      if (d > reach) continue;
      // Someone sitting in a bush is not a valid lock unless you are on top of them.
      if (e.hidden && d > BUSH_REVEAL_DIST) continue;
      if (needLos && !GameMap.lineOfSight(from.x, from.y, e.x, e.y)) continue;

      let score = 1000 - d;
      score += (1 - e.hp / e.maxHp) * 600;
      score += (e.gems || 0) * 40;
      // Bias toward whatever you are already facing so the lock is predictable.
      if (o.facing != null) {
        const off = Math.abs(angDiff(Math.atan2(e.y - from.y, e.x - from.x), o.facing));
        score -= off * 260;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }

    // Heist safes are legitimate things to shoot at when nobody is around.
    if (!best && game.safes) {
      const safe = game.safes[1 - from.team];
      if (safe && !safe.dead && dist(from.x, from.y, safe.x, safe.y) < reach) {
        return safe;
      }
    }
    return best;
  },

  /* Angle to hit a target, leading it by the projectile's flight time. */
  angleTo(from, target, spec) {
    const speed = (spec && spec.speed) || 800;
    const d = dist(from.x, from.y, target.x, target.y);
    const flight = d / speed;
    const px = target.x + (target.vx || 0) * flight;
    const py = target.y + (target.vy || 0) * flight;
    return Math.atan2(py - from.y, px - from.x);
  },

  /* Full solution: angle + distance, ready to drop into a brawler's input. */
  solve(game, from, opts) {
    const t = this.target(game, from, opts);
    if (!t) return null;
    const spec = (opts && opts.spec) || from.def.attack;
    const lobber = spec.emit === 'lob' || spec.ignoreWalls;
    const target = lobber
      ? this.target(game, from, { ...opts, needLos: false }) || t
      : t;
    return {
      target,
      angle: this.angleTo(from, target, spec),
      dist: clamp(dist(from.x, from.y, target.x, target.y), 60, specRange(spec)),
    };
  },

  /*
   * Aim assist for a manually aimed shot: if a target sits close to where the
   * player is already pointing, snap onto it. Outside the cone the player's
   * own aim is left completely alone.
   */
  assist(game, from, angle, spec) {
    const sol = this.solve(game, from, { facing: angle, spec });
    if (!sol) return null;
    if (Math.abs(angDiff(sol.angle, angle)) > AIM.assistCone) return null;
    if (dist(from.x, from.y, sol.target.x, sol.target.y) < AIM.minLockDist) return null;
    return sol;
  },
};
