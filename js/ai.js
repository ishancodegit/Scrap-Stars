/* Bot brains: perception, target selection, flow-field navigation, aiming. */

const DIFFICULTY = {
  easy:   { aimError: 0.20, reaction: 0.42, superChance: 0.55, leadAccuracy: 0.55, retreatHp: 0.28 },
  normal: { aimError: 0.10, reaction: 0.24, superChance: 0.85, leadAccuracy: 0.85, retreatHp: 0.34 },
  hard:   { aimError: 0.045, reaction: 0.13, superChance: 1.0,  leadAccuracy: 1.0,  retreatHp: 0.38 },
};

function makeBrain() {
  return {
    field: null,
    fieldGoal: null,
    fieldTimer: 0,
    target: null,
    targetTimer: 0,
    reaction: 0,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    strafeTimer: rand(0.6, 1.6),
    wanderAngle: rand(0, Math.PI * 2),
  };
}

function botCanSee(bot, other) {
  if (!other.alive) return false;
  const d = dist(bot.x, bot.y, other.x, other.y);
  if (other.hidden && d > BUSH_REVEAL_DIST) return false;
  return GameMap.lineOfSight(bot.x, bot.y, other.x, other.y);
}

function updateBot(bot, game, dt) {
  const ai = bot.ai;
  const cfg = DIFFICULTY[game.difficulty] || DIFFICULTY.normal;
  const inp = bot.input;
  inp.fire = false;
  inp.super = false;
  inp.hyper = false;
  inp.holding = false;
  inp.mx = 0;
  inp.my = 0;

  ai.strafeTimer -= dt;
  if (ai.strafeTimer <= 0) {
    ai.strafeTimer = rand(0.7, 1.8);
    ai.strafeDir *= -1;
  }

  // The countdown changes everything: the team being locked out must break the
  // hold by killing carriers, and the leading team has to protect them.
  const enemyLocked = game.lockTeam === (1 - bot.team);
  const weAreLocked = game.lockTeam === bot.team;

  /* ---- perception ---- */
  ai.targetTimer -= dt;
  if (ai.targetTimer <= 0) {
    ai.targetTimer = 0.15;
    let best = null, bestScore = -Infinity;
    for (const e of game.brawlers) {
      if (e.team === bot.team || !e.alive) continue;
      if (!botCanSee(bot, e)) continue;
      const d = dist(bot.x, bot.y, e.x, e.y);
      let score = 1200 - d;
      score += e.gems * (enemyLocked ? 260 : 90);    // hunt the gem carrier
      score += (1 - e.hp / e.maxHp) * 500;           // finish off the wounded
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (best !== ai.target) ai.reaction = cfg.reaction;
    ai.target = best;
  }
  if (ai.target && (!ai.target.alive || !botCanSee(bot, ai.target))) ai.target = null;
  ai.reaction = Math.max(0, ai.reaction - dt);

  const range = specRange(bot.def.attack);
  let target = ai.target;
  if (!target && game.safes) {
    const safe = game.safes[1 - bot.team];
    if (safe && !safe.dead && dist(bot.x, bot.y, safe.x, safe.y) < range * 0.9 &&
        GameMap.lineOfSight(bot.x, bot.y, safe.x, safe.y)) {
      target = { x: safe.x, y: safe.y, vx: 0, vy: 0, radius: safe.radius, gems: 0,
        hp: safe.hp, maxHp: safe.maxHp, alive: true, structure: true };
    }
  }
  const targetDist = target ? dist(bot.x, bot.y, target.x, target.y) : Infinity;
  const lowHp = bot.hp / bot.maxHp < cfg.retreatHp;

  /* ---- aiming ---- */
  let aim = bot.angle;
  let aimDist = range;
  if (target) {
    const speed = bot.def.attack.speed || 700;
    const flight = targetDist / speed;
    const lead = cfg.leadAccuracy;
    const px = target.x + target.vx * flight * lead;
    const py = target.y + target.vy * flight * lead;
    aim = Math.atan2(py - bot.y, px - bot.x) + rand(-cfg.aimError, cfg.aimError);
    aimDist = clamp(dist(bot.x, bot.y, px, py), 60, range);
  }
  inp.aim = aim;
  inp.aimDist = aimDist;

  /* ---- combat ---- */
  const atkEmit = bot.def.attack.emit;
  const brawlerish = atkEmit === 'melee' || atkEmit === 'dash' || atkEmit === 'alternate';
  const engageDist = Math.max(range * 1.3, brawlerish ? 300 : 0);
  const lobber = atkEmit === 'lob' || bot.def.attack.ignoreWalls;
  const canShoot = target && ai.reaction <= 0 && targetDist < range * 0.92 &&
    (lobber || target.structure || GameMap.lineOfSight(bot.x, bot.y, target.x, target.y));

  // Nori: hold to wind the hook when the target is out of swing range,
  // otherwise just tap for the arc.
  if (bot.def.trait === 'chargeHook') {
    const swing = bot.def.attack.reach || 140;
    if (target && targetDist > swing * 1.15 && targetDist < (bot.def.hook.range || 430)) {
      inp.holding = bot.chargeUp < HOOK.maxCharge * 0.8;
    } else if (target && targetDist <= swing * 1.15) {
      inp.holding = bot.chargeUp < HOOK.tapTime * 0.5;
    } else {
      inp.holding = false;
    }
  }

  if (canShoot) {
    if (bot.hyperReady && bot.superReady) inp.hyper = true;
    if (bot.superReady && Math.random() < cfg.superChance) {
      inp.super = decideSuper(bot, game, target, targetDist);
    }
    if (!inp.super) inp.fire = bot.ammo > 0;
  }

  // Medic supports even without a target in sight.
  if (!inp.super && bot.superReady && bot.def.super.emit === 'self' && bot.def.super.teamHeal) {
    let hurt = 0;
    for (const a of game.brawlers) {
      if (a.team !== bot.team || !a.alive) continue;
      if (dist(bot.x, bot.y, a.x, a.y) < (bot.def.super.teamRadius || 250) && a.hp < a.maxHp * 0.6) hurt++;
    }
    if (hurt >= 2) inp.super = true;
  }

  /* ---- where to go ---- */
  let goalX, goalY, direct = false;

  if (lowHp && !enemyLocked && target && targetDist < engageDist * 1.2) {
    // Back off toward friendly ground. Never when the clock is against us.
    const away = Math.atan2(bot.y - target.y, bot.x - target.x);
    goalX = clamp(bot.x + Math.cos(away) * 260, TILE, WORLD_W - TILE);
    goalY = clamp(bot.y + Math.sin(away) * 260, TILE, WORLD_H - TILE);
    direct = true;
  } else if (target && targetDist < engageDist) {
    // Ranged kits hold a firing distance and strafe. Melee kits commit —
    // orbiting at knife range just means eating damage without dealing any.
    const ideal = brawlerish ? range * 0.55 : range * (lobber ? 0.7 : 0.6);
    const toward = Math.atan2(target.y - bot.y, target.x - bot.x);
    const push = targetDist < ideal * 0.8 ? -1 : targetDist > ideal * 1.15 ? 1 : 0;
    const strafe = toward + Math.PI / 2 * ai.strafeDir;
    const closing = brawlerish ? 230 : 120;
    const sidestep = brawlerish ? 18 : 90;
    goalX = bot.x + Math.cos(toward) * push * closing + Math.cos(strafe) * sidestep;
    goalY = bot.y + Math.sin(toward) * push * closing + Math.sin(strafe) * sidestep;
    direct = true;
  } else {
    const goal = game.mode && game.mode.botGoal ? game.mode.botGoal(game, bot) : null;
    if (goal) {
      goalX = goal.x;
      goalY = goal.y;
    } else {
      // Nothing mode-specific to do: contest the middle.
      goalX = GameMap.centerX() + Math.cos(ai.wanderAngle) * 90;
      goalY = GameMap.centerY() + Math.sin(ai.wanderAngle) * 90;
      ai.wanderAngle += dt * 0.7;
    }
  }

  if (target && !inp.fire) inp.aim = aim;

  steer(bot, game, goalX, goalY, direct, dt);

  // Keep some space from team-mates so they do not clump into one blob.
  for (const a of game.brawlers) {
    if (a === bot || !a.alive || a.team !== bot.team) continue;
    const d = dist(bot.x, bot.y, a.x, a.y);
    if (d < 46 && d > 0.01) {
      inp.mx += (bot.x - a.x) / d * 0.5;
      inp.my += (bot.y - a.y) / d * 0.5;
    }
  }

  // Do not stand in a damaging puddle.
  for (const area of game.areas) {
    if (area.team === bot.team) continue;
    const d = dist(bot.x, bot.y, area.x, area.y);
    if (d < area.radius + 30 && d > 0.01) {
      inp.mx += (bot.x - area.x) / d * 1.4;
      inp.my += (bot.y - area.y) / d * 1.4;
    }
  }

  if (!target) {
    // Face where we are walking when nothing to shoot at.
    const m = Math.hypot(inp.mx, inp.my);
    if (m > 0.05) inp.aim = Math.atan2(inp.my, inp.mx);
  }
}

function decideSuper(bot, game, target, targetDist) {
  const sup = bot.def.super;
  const reach = specRange(sup);
  switch (sup.emit) {
    case 'dash':
    case 'leap':
    case 'teleport':
      return targetDist < reach * 0.95 && targetDist > (bot.radius + 30);
    case 'self':
      // Buffs and shields are worth it once someone is actually shooting at us.
      return bot.hp < bot.maxHp * 0.75 || targetDist < reach;
    case 'summon':
    case 'walls':
      return true;
    case 'melee':
      return targetDist < reach * 1.1;
    default:
      return targetDist < reach * 0.85;
  }
}

/* Whoever on a team is holding the most gems — the one worth protecting or killing. */
function topCarrier(game, team) {
  let best = null;
  for (const b of game.brawlers) {
    if (b.team !== team || !b.alive || b.gems === 0) continue;
    if (!best || b.gems > best.gems) best = b;
  }
  return best;
}

function nearestGem(bot, game) {
  let best = null, bestD = Infinity;
  for (const g of game.gems) {
    const d = dist2(bot.x, bot.y, g.x, g.y);
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

/* Walk toward a world point, following the BFS field when the way is blocked. */
function steer(bot, game, gx, gy, direct, dt) {
  const ai = bot.ai;
  const inp = bot.input;

  if (direct || GameMap.lineOfSight(bot.x, bot.y, gx, gy)) {
    const a = Math.atan2(gy - bot.y, gx - bot.x);
    inp.mx += Math.cos(a);
    inp.my += Math.sin(a);
    // Nudge around any wall we are grinding against.
    if (GameMap.solidAt(bot.x + Math.cos(a) * (bot.radius + 10), bot.y + Math.sin(a) * (bot.radius + 10))) {
      inp.mx += Math.cos(a + Math.PI / 2 * ai.strafeDir) * 0.9;
      inp.my += Math.sin(a + Math.PI / 2 * ai.strafeDir) * 0.9;
    }
    return;
  }

  const goalTx = clamp(Math.floor(gx / TILE), 0, MAP_W - 1);
  const goalTy = clamp(Math.floor(gy / TILE), 0, MAP_H - 1);
  ai.fieldTimer -= dt;
  const key = goalTy * MAP_W + goalTx;
  if (!ai.field || ai.fieldGoal !== key || ai.fieldTimer <= 0) {
    ai.field = GameMap.flowField(goalTx, goalTy);
    ai.fieldGoal = key;
    ai.fieldTimer = 0.35;
  }

  const bx = clamp(Math.floor(bot.x / TILE), 0, MAP_W - 1);
  const by = clamp(Math.floor(bot.y / TILE), 0, MAP_H - 1);
  const here = ai.field[by * MAP_W + bx];
  let bestD = here < 0 ? Infinity : here;
  let bx2 = null, by2 = null;

  for (const [nx, ny] of [[bx + 1, by], [bx - 1, by], [bx, by + 1], [bx, by - 1]]) {
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
    const d = ai.field[ny * MAP_W + nx];
    if (d >= 0 && d < bestD) { bestD = d; bx2 = nx; by2 = ny; }
  }

  if (bx2 === null) {
    const a = Math.atan2(gy - bot.y, gx - bot.x);
    inp.mx += Math.cos(a);
    inp.my += Math.sin(a);
    return;
  }

  const a = Math.atan2((by2 + 0.5) * TILE - bot.y, (bx2 + 0.5) * TILE - bot.x);
  inp.mx += Math.cos(a);
  inp.my += Math.sin(a);
}
