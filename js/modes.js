/*
 * Game modes.
 *
 * Each mode is a small object of hooks the match loop calls. Everything the
 * mode needs — objectives, the ball, round state — it sets up in init() and
 * tears down by virtue of the match starting fresh.
 *
 *   init(game)                 build objectives, set the clock
 *   update(game, dt)           per-frame rules
 *   onKill(game, victim, killer)
 *   score(game)                -> [blueText, redText] for the top bar
 *   banner(game)               -> optional big centre text
 *   botGoal(game, bot)         -> {x,y} the bots should head for
 *   interceptFire(game, b)     -> true if the attack button does something else
 */

const MODES = {

  /* ---------------- Gem Grab ---------------- */
  gem: {
    id: 'gem', name: 'Gem Grab', tag: '3v3', time: 180, icon: 'gem',
    blurb: 'Collect gems from the mine. Hold ten for fifteen seconds to win.',
    init(g) {
      g.gemTimer = 1.2;
      g.lockTeam = -1;
      g.lockTimer = 0;
    },
    update(g, dt) {
      g.gemTimer -= dt;
      if (g.gemTimer <= 0) {
        g.gemTimer += 2.6;
        if (g.gems.length < 12) {
          const a = rand(0, Math.PI * 2);
          const gem = new Gem(GameMap.centerX(), GameMap.centerY(), Math.cos(a) * 120, Math.sin(a) * 120);
          g.gems.push(gem);
          g.burst(gem.x, gem.y, PALETTE.gem, 8);
        }
      }

      g.teamScore = [0, 0];
      for (const b of g.brawlers) g.teamScore[b.team] += b.gems;

      const [blue, red] = g.teamScore;
      let leader = -1;
      if (blue >= 10 || red >= 10) {
        if (blue > red && blue >= 10) leader = 0;
        else if (red > blue && red >= 10) leader = 1;
      }

      if (leader === -1) {
        g.lockTeam = -1;
      } else {
        if (g.lockTeam !== leader) { g.lockTeam = leader; g.lockTimer = 15; }
        const before = Math.ceil(g.lockTimer);
        g.lockTimer -= dt;
        if (Math.ceil(g.lockTimer) !== before && g.lockTimer > 0) Sfx.play('tick');
        if (g.lockTimer <= 0) return g.finish(leader);
      }
      if (g.timeLeft <= 0) g.finish(this._leadOrDraw(g));
    },
    _leadOrDraw(g) {
      if (g.teamScore[0] === g.teamScore[1]) return -1;
      return g.teamScore[0] > g.teamScore[1] ? 0 : 1;
    },
    score(g) { return [String(g.teamScore[0]), String(g.teamScore[1])]; },
    banner(g) {
      if (g.lockTeam === -1) return null;
      return {
        text: String(Math.ceil(g.lockTimer)),
        sub: g.lockTeam === g.playerTeam ? 'HOLD THE GEMS!' : 'BREAK THEIR HOLD!',
        color: TEAM_COLOR[g.lockTeam],
      };
    },
    botGoal(g, bot) {
      const enemyLocked = g.lockTeam === (1 - bot.team);
      const weAreLocked = g.lockTeam === bot.team;
      if (enemyLocked) {
        const carrier = topCarrier(g, 1 - bot.team);
        return carrier ? { x: carrier.x, y: carrier.y } : null;
      }
      if (weAreLocked) {
        const home = GameMap.spawns[bot.team][1];
        const mine = { x: GameMap.centerX(), y: GameMap.centerY() };
        if (bot.gems > 0) return { x: lerp(home.x, mine.x, 0.45), y: lerp(home.y, mine.y, 0.45) };
        const friend = topCarrier(g, bot.team);
        if (friend) return { x: friend.x, y: friend.y };
      }
      const gem = nearestGem(bot, g);
      if (gem) return { x: gem.x, y: gem.y };
      return null;
    },
  },

  /* ---------------- Bounty ---------------- */
  bounty: {
    id: 'bounty', name: 'Bounty', tag: '3v3', time: 120, icon: 'star',
    blurb: 'Every kill is worth a star, and stars stack on whoever is winning.',
    init(g) {
      for (const b of g.brawlers) b.stars = 0;
      g.teamScore = [0, 0];
    },
    update(g, dt) {
      if (g.timeLeft <= 0) {
        g.finish(g.teamScore[0] === g.teamScore[1] ? -1 : (g.teamScore[0] > g.teamScore[1] ? 0 : 1));
      }
    },
    onKill(g, victim, killer) {
      if (!killer || killer.team === victim.team) return;
      // A bounty is worth the target's own star count plus one.
      const worth = (victim.stars || 0) + 1;
      g.teamScore[killer.team] += worth;
      killer.stars = Math.min(7, (killer.stars || 0) + 1);
      victim.stars = 0;
      g.floatText(victim.x, victim.y - 40, `+${worth}`, TEAM_COLOR[killer.team], 18);
    },
    score(g) { return [String(g.teamScore[0]), String(g.teamScore[1])]; },
    botGoal(g, bot) {
      const mine = { x: GameMap.centerX(), y: GameMap.centerY() };
      // Protect a fat bounty by hanging back a little.
      if ((bot.stars || 0) >= 4) {
        const home = GameMap.spawns[bot.team][1];
        return { x: lerp(home.x, mine.x, 0.55), y: lerp(home.y, mine.y, 0.55) };
      }
      return null;
    },
  },

  /* ---------------- Heist ---------------- */
  heist: {
    id: 'heist', name: 'Heist', tag: '3v3', time: 150, icon: 'safe',
    blurb: 'Crack the enemy safe before they crack yours.',
    init(g) {
      g.safes = [];
      for (const team of [0, 1]) {
        const home = GameMap.spawns[team][1];
        const x = team === 0 ? 3.5 * TILE : WORLD_W - 3.5 * TILE;
        const y = home.y;
        GameMap._clearArea(Math.floor(x / TILE), Math.floor(y / TILE), 1);
        const owner = g.brawlers.find((b) => b.team === team) || g.brawlers[0];
        const safe = new Summon(owner, {
          kind: 'safe', hp: 32000, radius: 34, life: Infinity, range: 0,
          color: TEAM_COLOR[team],
        }, x, y);
        safe.team = team;
        safe.isSafe = true;
        g.summons.push(safe);
        g.safes[team] = safe;
      }
      g.teamScore = [0, 0];
    },
    update(g, dt) {
      for (const team of [0, 1]) {
        const safe = g.safes[team];
        if (safe && safe.dead) return g.finish(1 - team);
      }
      if (g.timeLeft <= 0) {
        const a = g.safes[0] ? g.safes[0].hp / g.safes[0].maxHp : 0;
        const b = g.safes[1] ? g.safes[1].hp / g.safes[1].maxHp : 0;
        g.finish(Math.abs(a - b) < 0.001 ? -1 : (a > b ? 0 : 1));
      }
    },
    score(g) {
      return [0, 1].map((t) => {
        const s = g.safes && g.safes[t];
        return s ? `${Math.max(0, Math.round((s.hp / s.maxHp) * 100))}%` : '—';
      });
    },
    botGoal(g, bot) {
      const target = g.safes && g.safes[1 - bot.team];
      if (!target || target.dead) return null;
      const own = g.safes[bot.team];
      // Hurt safe at home? Fall back and defend it instead.
      if (own && own.hp < own.maxHp * 0.45 && Math.random() < 0.5) {
        return { x: own.x, y: own.y };
      }
      return { x: target.x, y: target.y };
    },
  },

  /* ---------------- Knockout ---------------- */
  knockout: {
    id: 'knockout', name: 'Knockout', tag: '3v3', time: 120, icon: 'skull',
    blurb: 'No respawns. Wipe the other team twice to take the match.',
    init(g) {
      g.noRespawn = true;
      g.teamScore = [0, 0];
      g.roundBreak = 0;
    },
    update(g, dt) {
      if (g.roundBreak > 0) {
        g.roundBreak -= dt;
        if (g.roundBreak <= 0) this._newRound(g);
        return;
      }
      const alive = [0, 0];
      for (const b of g.brawlers) if (b.alive) alive[b.team]++;

      if (alive[0] === 0 || alive[1] === 0) {
        const winner = alive[0] === 0 ? 1 : 0;
        if (alive[0] === 0 && alive[1] === 0) {
          g.roundBreak = 2.4;
          g.log('Round drawn', '#facc15');
          return;
        }
        g.teamScore[winner]++;
        g.log(`${TEAM_NAME[winner]} takes the round`, TEAM_COLOR[winner]);
        if (g.teamScore[winner] >= 2) return g.finish(winner);
        g.roundBreak = 2.4;
        return;
      }
      if (g.timeLeft <= 0) {
        // Clock out: the team with more left standing takes the round.
        const winner = alive[0] === alive[1] ? -1 : (alive[0] > alive[1] ? 0 : 1);
        if (winner === -1) return g.finish(-1);
        g.teamScore[winner]++;
        if (g.teamScore[winner] >= 2) return g.finish(winner);
        g.roundBreak = 2.4;
      }
    },
    _newRound(g) {
      const slot = [0, 0];
      for (const b of g.brawlers) {
        const s = GameMap.spawns[b.team][slot[b.team]++ % 3];
        b.spawnAt(s.x, s.y);
        b.charge = 0;
        b.hyperCharge = 0;
      }
      g.projectiles.length = 0;
      g.lobs.length = 0;
      g.areas.length = 0;
      g.timeLeft = 120;
      g.log('Round start', '#e5e7eb');
    },
    score(g) { return [String(g.teamScore[0]), String(g.teamScore[1])]; },
    banner(g) {
      if (g.roundBreak > 0) return { text: String(Math.ceil(g.roundBreak)), sub: 'NEXT ROUND', color: '#facc15' };
      return null;
    },
  },

  /* ---------------- Brawl Ball ---------------- */
  brawlball: {
    id: 'brawlball', name: 'Brawl Ball', tag: '3v3', time: 150, icon: 'ball',
    blurb: 'Carry or kick the ball into their goal. First to two.',
    init(g) {
      g.teamScore = [0, 0];
      g.goals = [
        { x: 2.0 * TILE, y: WORLD_H / 2, team: 0 },
        { x: WORLD_W - 2.0 * TILE, y: WORLD_H / 2, team: 1 },
      ];
      for (const go of g.goals) {
        GameMap._clearArea(Math.floor(go.x / TILE), Math.floor(go.y / TILE), 2);
      }
      GameMap._clearArea(GameMap.centerTx, GameMap.centerTy, 1);
      this._resetBall(g);
      g.goalBreak = 0;
    },
    _resetBall(g) {
      g.ball = {
        x: GameMap.centerX(), y: GameMap.centerY(),
        vx: 0, vy: 0, radius: 13, carrier: null, cooldown: 0,
      };
    },
    update(g, dt) {
      if (g.goalBreak > 0) {
        g.goalBreak -= dt;
        if (g.goalBreak <= 0) {
          const slot = [0, 0];
          for (const b of g.brawlers) {
            const s = GameMap.spawns[b.team][slot[b.team]++ % 3];
            b.spawnAt(s.x, s.y);
          }
          this._resetBall(g);
        }
        return;
      }

      const ball = g.ball;
      if (!ball) return;
      ball.cooldown = Math.max(0, ball.cooldown - dt);

      if (ball.carrier) {
        if (!ball.carrier.alive) {
          // Dropped where they fell.
          ball.x = ball.carrier.x;
          ball.y = ball.carrier.y;
          ball.carrier = null;
          ball.cooldown = 0.5;
        } else {
          const a = ball.carrier.angle;
          ball.x = ball.carrier.x + Math.cos(a) * (ball.carrier.radius + 10);
          ball.y = ball.carrier.y + Math.sin(a) * (ball.carrier.radius + 10);
        }
      } else {
        moveAndCollide(ball, ball.vx * dt, ball.vy * dt);
        if (ball.hitWallX) ball.vx *= -0.55;
        if (ball.hitWallY) ball.vy *= -0.55;
        const f = Math.pow(0.12, dt);
        ball.vx *= f;
        ball.vy *= f;
        if (Math.hypot(ball.vx, ball.vy) < 8) { ball.vx = 0; ball.vy = 0; }

        if (ball.cooldown <= 0) {
          for (const b of g.brawlers) {
            if (!b.alive) continue;
            if (dist2(b.x, b.y, ball.x, ball.y) < (b.radius + ball.radius + 4) ** 2) {
              ball.carrier = b;
              Sfx.play('gem');
              break;
            }
          }
        }
      }

      for (const go of g.goals) {
        if (dist(ball.x, ball.y, go.x, go.y) > 46) continue;
        const scorer = 1 - go.team;
        g.teamScore[scorer]++;
        g.log(`${TEAM_NAME[scorer]} scores!`, TEAM_COLOR[scorer]);
        Sfx.play(scorer === g.playerTeam ? 'win' : 'lose');
        g.burst(ball.x, ball.y, TEAM_COLOR[scorer], 40);
        g.shake(16);
        if (ball.carrier) ball.carrier = null;
        if (g.teamScore[scorer] >= 2) return g.finish(scorer);
        g.goalBreak = 2.2;
        return;
      }

      if (g.timeLeft <= 0) {
        g.finish(g.teamScore[0] === g.teamScore[1] ? -1 : (g.teamScore[0] > g.teamScore[1] ? 0 : 1));
      }
    },
    /* Holding the ball replaces your attack with a kick. */
    interceptFire(g, b) {
      const ball = g.ball;
      if (!ball || ball.carrier !== b) return false;
      const a = b.angle;
      ball.carrier = null;
      ball.x = b.x + Math.cos(a) * (b.radius + 14);
      ball.y = b.y + Math.sin(a) * (b.radius + 14);
      ball.vx = Math.cos(a) * 760;
      ball.vy = Math.sin(a) * 760;
      ball.cooldown = 0.25;
      Sfx.play('super_shot');
      g.burst(ball.x, ball.y, '#f8fafc', 10);
      return true;
    },
    score(g) { return [String(g.teamScore[0]), String(g.teamScore[1])]; },
    banner(g) {
      if (g.goalBreak > 0) return { text: 'GOAL!', sub: '', color: '#facc15' };
      return null;
    },
    botGoal(g, bot) {
      const ball = g.ball;
      if (!ball) return null;
      const enemyGoal = g.goals.find((x) => x.team !== bot.team);
      if (ball.carrier === bot) return { x: enemyGoal.x, y: enemyGoal.y };
      if (ball.carrier && ball.carrier.team === bot.team) {
        // Escort, roughly goalwards of the carrier.
        return { x: lerp(ball.carrier.x, enemyGoal.x, 0.4), y: lerp(ball.carrier.y, enemyGoal.y, 0.4) };
      }
      return { x: ball.x, y: ball.y };
    },
  },
};

const MODE_LIST = [MODES.gem, MODES.brawlball, MODES.bounty, MODES.heist, MODES.knockout];

/*
 * Ranked is not a rule set of its own — it is any of the above played for
 * rating, against bots pitched at your tier. The picker shows it as a card;
 * starting a ranked match rolls one of the real modes.
 */
const RANKED_CARD = {
  id: 'ranked',
  name: 'Ranked',
  tag: '3v3 · rated',
  icon: 'rank',
  blurb: 'A random mode, played for trophies. The bots match your tier — Bronze barely aims, Master does not miss.',
};

const PICKER_MODES = [RANKED_CARD].concat(MODE_LIST);
