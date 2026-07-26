/* Match state and the simulation loop. */

const Game = {
  state: 'menu',            // menu | playing | over
  difficulty: 'normal',
  playerTeam: TEAM_BLUE,
  player: null,
  mode: MODES.gem,

  brawlers: [],
  projectiles: [],
  lobs: [],
  beams: [],
  summons: [],
  gems: [],
  areas: [],
  telegraphs: [],
  tempWalls: [],
  swings: [],
  links: [],
  particles: [],
  pulses: [],
  texts: [],
  feed: [],

  ranked: false,
  mapDef: null,
  botProfile: null,
  rankResult: null,
  teamScore: [0, 0],
  safes: [],
  goals: [],
  ball: null,
  lockTeam: -1,
  lockTimer: 0,
  gemTimer: 0,
  noRespawn: false,
  roundBreak: 0,
  goalBreak: 0,
  time: 0,
  timeLeft: 180,
  paused: false,
  result: null,
  tickParity: 0,
  countdown: 0,
  stopTimer: 0,
  callout: null,
  _last: 0,

  start(brawlerId, modeId, difficulty, opts) {
    const o = opts || {};
    this.difficulty = difficulty || 'normal';
    this.ranked = !!o.ranked;
    this.mode = MODES[modeId] || MODES.gem;
    this.mapDef = o.map || pick(mapsFor(this.mode.id));
    // Ranked opposition is set by your own tier, not by a difficulty button.
    this.botProfile = this.ranked ? Ranked.botProfile() : (DIFFICULTY[this.difficulty] || DIFFICULTY.normal);
    for (const key of ['brawlers', 'projectiles', 'lobs', 'beams', 'summons', 'gems',
      'areas', 'telegraphs', 'tempWalls', 'swings', 'links', 'particles', 'pulses',
      'texts', 'feed', 'safes', 'goals']) {
      this[key] = [];
    }
    this.teamScore = [0, 0];
    this.ball = null;
    this.lockTeam = -1;
    this.lockTimer = 0;
    this.noRespawn = false;
    this.roundBreak = 0;
    this.goalBreak = 0;
    this.time = 0;
    this.timeLeft = this.mode.time;
    this.paused = false;
    this.result = null;
    this.tickParity = 0;

    GameMap.generate(this.mapDef.style);

    const names = BOT_NAMES.slice();
    for (let i = names.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [names[i], names[j]] = [names[j], names[i]];
    }

    const pool = BRAWLERS.filter((b) => b.id !== brawlerId);
    const takeDef = () => pool.splice(randInt(0, pool.length - 1), 1)[0] || pick(BRAWLERS);

    const mine = BRAWLER_BY_ID[brawlerId] || BRAWLERS[0];
    this.player = new Brawler(skinnedDef(mine, Progress.equippedSkin(mine.id)), this.playerTeam, false, 'You');
    this.brawlers.push(this.player);

    for (let i = 0; i < 2; i++) {
      const bot = new Brawler(takeDef(), this.playerTeam, true, names.pop());
      bot.ai = makeBrain();
      this.brawlers.push(bot);
    }
    // Hosting: the first teammate slot belongs to the friend, not to a bot.
    if (typeof Net !== 'undefined' && Net.isHost && Net.connected) {
      const mate = this.brawlers[1];
      mate.isBot = false;
      mate.isRemote = true;
      mate.ai = null;
      mate.name = Net.guestName;
    }
    for (let i = 0; i < 3; i++) {
      const bot = new Brawler(takeDef(), 1 - this.playerTeam, true, names.pop());
      bot.ai = makeBrain();
      this.brawlers.push(bot);
    }

    const slot = [0, 0];
    for (const b of this.brawlers) {
      const s = GameMap.spawns[b.team][slot[b.team]++ % 3];
      b.spawnAt(s.x, s.y);
    }

    if (this.mode.init) this.mode.init(this);

    Renderer.camX = this.player.x;
    Renderer.camY = this.player.y;
    this.state = 'playing';
    this.countdown = 3.2;
    this.stopTimer = 0;
    this.callout = null;
    Sfx.resume();
    if (typeof Net !== 'undefined' && Net.isHost && Net.connected) Net._sendInit();
  },

  /*
   * Join a friend's match. The guest never simulates: it rebuilds the world the
   * host described, then does nothing but draw whatever arrives and send back
   * what its player is pressing.
   */
  startAsGuest(init) {
    if (!init || !init.line || !init.line.length) return;   // nothing to be yet
    this.mode = MODES[init.mode] || MODES.gem;
    this.mapDef = { name: init.map || 'Arena', style: init.style };
    this.ranked = false;
    this.rankResult = null;
    for (const key of ['brawlers', 'projectiles', 'lobs', 'beams', 'summons', 'gems',
      'areas', 'telegraphs', 'tempWalls', 'swings', 'links', 'particles', 'pulses',
      'texts', 'feed', 'safes', 'goals']) {
      this[key] = [];
    }
    this.teamScore = [0, 0];
    this.ball = null;
    this.lockTeam = -1;
    this.lockTimer = 0;
    this.time = 0;
    this.timeLeft = init.time || this.mode.time;
    this.paused = false;
    this.result = null;

    // The map is generated randomly, so it has to be copied rather than re-rolled.
    GameMap.style = init.style;
    for (let i = 0; i < GameMap.grid.length && i < init.tiles.length; i++) {
      GameMap.grid[i] = +init.tiles[i];
    }
    GameMap.spawns = init.spawns.map((side) => side.map(([x, y]) => ({ x, y })));

    for (const row of init.line) {
      const base = BRAWLER_BY_ID[row.d] || BRAWLERS[0];
      const def = Object.assign({}, base, { color: row.c, skin: row.s, hair: row.h });
      const b = new Brawler(def, row.t, false, row.n);
      b.power = row.p;
      b.powerMult = powerMult(row.p);
      b.maxHp = Math.round(base.hp * b.powerMult);
      b.hp = b.maxHp;
      this.brawlers.push(b);
    }
    this.playerTeam = this.brawlers[init.you] ? this.brawlers[init.you].team : TEAM_BLUE;
    this.player = this.brawlers[init.you] || this.brawlers[0];
    this.player.name = 'You';

    const slot = [0, 0];
    for (const b of this.brawlers) {
      const sp = GameMap.spawns[b.team][slot[b.team]++ % 3];
      b.spawnAt(sp.x, sp.y);
    }

    Renderer.camX = this.player.x;
    Renderer.camY = this.player.y;
    this.state = 'playing';
    this.countdown = 3.2;
    this.stopTimer = 0;
    this.callout = null;
    Sfx.resume();
  },

  /* ---------------- main loop ---------------- */

  frame(now) {
    let dt = Math.min((now - this._last) / 1000 || 0, 0.05);
    this._last = now;

    // The opening countdown and hit-stop both hold the simulation while the
    // presentation keeps running, so the screen never looks frozen.
    if (this.countdown > 0) {
      this.countdown -= dt;
      dt = 0;
    } else if (this.stopTimer > 0) {
      this.stopTimer -= dt;
      dt = 0;
    }
    if (this.callout) {
      this.callout.life -= Math.min((now - (this._calloutAt || now)) / 1000 || 0, 0.05);
      if (this.callout.life <= 0) this.callout = null;
    }
    this._calloutAt = now;

    if (this.state === 'playing' && !this.paused && dt > 0) this.update(dt);
    if (this.state !== 'menu') {
      Renderer.follow(this.player && this.player.alive ? this.player : null, dt);
      Renderer.draw(this, dt);
    }
    requestAnimationFrame((t) => this.frame(t));
  },

  update(dt) {
    this.time += dt;

    // A guest draws the host's world instead of running its own. Only local
    // sparkle — particles, floating numbers — advances here.
    if (typeof Net !== 'undefined' && Net.isGuest) {
      this._readPlayerInput();
      Net.guestTick(dt);
      Net.applySnapshot(dt);
      this._updateEffects(dt);
      return;
    }

    this.timeLeft = Math.max(0, this.timeLeft - dt);

    this._readPlayerInput();
    this._readRemoteInput();

    // Two phases on purpose. If each bot decided and acted in one pass, bots
    // later in the list would aim at positions already updated this frame while
    // earlier ones aimed at stale ones — worth roughly a 3:1 win rate to
    // whichever team sat at the end of the array. Everyone decides against the
    // same snapshot, then everyone acts.
    for (const b of this.brawlers) {
      if (b.isBot && b.alive) updateBot(b, this, dt);
    }

    // Alternate who acts first so neither side is permanently ahead on
    // contested gem pickups.
    this.tickParity ^= 1;
    const n = this.brawlers.length;
    for (let i = 0; i < n; i++) {
      this.brawlers[this.tickParity ? i : n - 1 - i].update(dt, this);
    }

    for (const p of this.projectiles) p.update(dt, this);
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    for (const l of this.lobs) l.update(dt, this);
    this.lobs = this.lobs.filter((l) => !l.dead);

    for (const b of this.beams) b.update(dt, this);
    this.beams = this.beams.filter((b) => !b.dead);

    for (const s of this.summons) s.update(dt, this);
    this.summons = this.summons.filter((s) => !s.dead || s.isSafe);

    for (const g of this.gems) g.update(dt);
    this.gems = this.gems.filter((g) => !g.dead);

    this._updateAreas(dt);
    this._updateTelegraphs(dt);
    this._updateTempWalls(dt);
    if (this.mode.update) this.mode.update(this, dt);
    this._updateEffects(dt);
    if (typeof Net !== 'undefined' && Net.isHost) Net.hostTick(dt);
  },

  /* Drive the friend's brawler from the last input packet that arrived. */
  _readRemoteInput() {
    if (typeof Net === 'undefined' || !Net.isHost || !Net.remoteInput) return;
    const b = this.brawlers.find((x) => x.isRemote);
    if (!b) return;
    const m = Net.remoteInput;
    const i = b.input;
    i.mx = m.x; i.my = m.y;
    i.aim = m.a; i.aimDist = m.d;
    i.fire = !!m.f;
    i.holding = !!m.o;
    // Super and Hyper are edge-triggered, so consume them once.
    i.super = !!m.s; i.hyper = !!m.h;
    if (m.s) m.s = 0;
    if (m.h) m.h = 0;
  },

  _readPlayerInput() {
    const p = this.player;
    if (!p) return;
    const inp = p.input;
    const mv = Input.moveVector();
    inp.mx = mv.x;
    inp.my = mv.y;

    if (Input.usingTouch) {
      const reach = specRange(p.def.attack);
      if (Input.aimStick) {
        // Holding the stick aims; the shot waits for the release.
        const v = Input.stickVector(Input.aimStick, Input.aimStick.r || 70);
        if (v.len > 0.15) {
          inp.aim = Math.atan2(v.y, v.x);
          inp.aimDist = 80 + v.len * (reach - 80);
        }
        inp.fire = false;
      } else if (Input.consumeAimRelease()) {
        if (Input.releaseAim) {
          inp.aim = Input.releaseAim.angle;
          inp.aimDist = 80 + Input.releaseAim.len * (reach - 80);
        } else {
          // Bare tap: point at the closest enemy we can actually see.
          const sol = AutoAim.solve(this, p, { spec: p.def.attack });
          if (sol) {
            inp.aim = sol.angle;
            inp.aimDist = sol.dist;
            p.lockTarget = sol.target;
            p.lockFlash = 0.25;
          }
        }
        Input.releaseAim = null;
        inp.fire = true;
      } else {
        inp.fire = false;
      }
    } else {
      const world = Renderer.screenToWorld(Input.mouseX, Input.mouseY);
      inp.aim = Math.atan2(world.y - p.y, world.x - p.x);
      inp.aimDist = dist(p.x, p.y, world.x, world.y);
      inp.fire = Input.firing;
    }

    inp.super = Input.consumeSuper();
    inp.hyper = Input.consumeHyper();
    const em = Input.consumeEmote();
    if (em >= 0) this.sendEmote(p, em);

    // A Super released from a drag goes where the drag pointed. A tapped one
    // goes wherever you were already aiming, or at the best target if nothing
    // was chosen — a Super is too expensive to waste on a mis-tap.
    if (inp.super) {
      const sa = Input.consumeSuperAim();
      const sSpec = p.def.super;
      if (sa) {
        const reach = specRange(sSpec);
        inp.aim = sa.angle;
        inp.aimDist = 80 + sa.len * (reach - 80);
      } else if (Input.usingTouch || Input.autoAim) {
        const sol = AutoAim.solve(this, p, { spec: sSpec });
        if (sol) { inp.aim = sol.angle; inp.aimDist = sol.dist; }
      }
    }
    // Charge-hook brawlers need to know the button is being held, not just fired.
    inp.holding = Input.usingTouch ? !!Input.aimStick : Input.firing;

    // Aim assist only nudges a shot that was already close to a target; it
    // never takes the aim away from where the player is actually pointing.
    if (Input.autoAim && inp.fire && p.attackCd <= 0 && p.ammo > 0) {
      const sol = AutoAim.assist(this, p, inp.aim, p.def.attack);
      if (sol) {
        inp.aim = sol.angle;
        inp.aimDist = sol.dist;
        p.lockTarget = sol.target;
        p.lockFlash = 0.25;
      }
    }
  },

  /* Show a quick-chat bubble, and tell the other side about it. */
  sendEmote(who, index) {
    const e = EMOTES[index];
    if (!who || !e) return;
    who.emote = { icon: e.icon, color: e.color, life: 2.2, max: 2.2 };
    Sfx.play('tick');
    if (typeof Net !== 'undefined' && Net.connected) {
      Net.send({ t: 'em', i: this.brawlers.indexOf(who), e: index });
    }
  },

  _nearestVisibleEnemy(from, maxDist) {
    let best = null, bestD = maxDist * maxDist;
    for (const b of this.brawlers) {
      if (!b.alive || b.team === from.team) continue;
      if (b.hidden && dist(from.x, from.y, b.x, b.y) > BUSH_REVEAL_DIST) continue;
      const d = dist2(from.x, from.y, b.x, b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  },

  _updateAreas(dt) {
    for (const a of this.areas) {
      a.life -= dt;
      a.tick -= dt;
      if (a.pull) {
        for (const b of this.brawlers) {
          if (!b.alive || b.team === a.team) continue;
          const d = dist(b.x, b.y, a.x, a.y);
          if (d > a.radius || d < 1) continue;
          b.push(((a.x - b.x) / d) * a.pull * dt * 4, ((a.y - b.y) / d) * a.pull * dt * 4);
        }
      }
      if (a.tick <= 0) {
        a.tick += STATUS_TICK;
        for (const b of this.brawlers) {
          if (!b.alive) continue;
          if (dist2(b.x, b.y, a.x, a.y) > a.radius * a.radius) continue;
          if (b.team === a.team) {
            if (a.heal) this.healTarget(b, a.heal * STATUS_TICK, a.owner);
            // Meeple's d20 lets the team shoot straight through cover.
            if (a.teamPierceWalls) b.pierceWallsUntil = Math.max(b.pierceWallsUntil, 0.4);
            if (a.teamHasteField) {
              b.hasteUntil = Math.max(b.hasteUntil, 0.4);
              b.hasteMult = 1.25;
            }
          } else {
            if (a.dps) this.damage(b, a.dps * STATUS_TICK, a.owner, true);
            if (a.slow) {
              b.slowUntil = Math.max(b.slowUntil, 0.5);
              b.slowMult = a.slow;
            }
          }
        }
      }
    }
    this.areas = this.areas.filter((a) => a.life > 0);
  },

  _updateTelegraphs(dt) {
    for (const t of this.telegraphs) {
      t.delay -= dt;
      if (t.delay > 0) continue;
      t.done = true;
      const dmg = t.damage * (t.owner.damageMult || 1);
      this.explode(t.x, t.y, t.radius, dmg, t.owner, t.color, t.spec);
      // The centre of Ronin's X hits twice as hard as the arms.
      if (t.centerMult > 1) {
        this.explode(t.x, t.y, t.radius * 0.34, dmg * (t.centerMult - 1), t.owner, t.color, t.spec);
      }
      this.shake(9);
    }
    this.telegraphs = this.telegraphs.filter((t) => !t.done);
  },

  _updateTempWalls(dt) {
    for (const w of this.tempWalls) {
      w.life -= dt;
      if (w.life > 0) continue;
      w.done = true;
      for (const t of w.tiles) {
        if (GameMap.get(t.tx, t.ty) === T_CRATE) GameMap.set(t.tx, t.ty, T_EMPTY);
      }
    }
    this.tempWalls = this.tempWalls.filter((w) => !w.done);
  },

  _updateEffects(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.02, dt);
      p.vy *= Math.pow(0.02, dt);
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const p of this.pulses) p.life -= dt;
    this.pulses = this.pulses.filter((p) => p.life > 0);

    for (const s of this.swings) s.life -= dt;
    this.swings = this.swings.filter((s) => s.life > 0);

    for (const l of this.links) l.life -= dt;
    this.links = this.links.filter((l) => l.life > 0);

    for (const t of this.texts) {
      t.life -= dt;
      t.y += t.vy * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);

    for (const f of this.feed) f.life -= dt;
    this.feed = this.feed.filter((f) => f.life > 0);

    for (const b of this.brawlers) {
      if (b.emote) {
        b.emote.life -= dt;
        if (b.emote.life <= 0) b.emote = null;
      }
    }
  },

  /* ---------------- world interactions ---------------- */

  explode(x, y, radius, damage, owner, color, spec) {
    for (const b of this.brawlers) {
      if (!b.alive || b.team === owner.team) continue;
      const d = dist(x, y, b.x, b.y);
      if (d > radius + b.radius) continue;
      const falloff = clamp(1 - (d / (radius + b.radius)) * 0.45, 0.55, 1);
      const angle = Math.atan2(b.y - y, b.x - x);
      if (spec) Abilities.applyHit(b, spec, owner, this, angle, damage * falloff);
      else this.damage(b, damage * falloff, owner);
    }
    for (const s of this.summons) {
      if (s.dead || s.team === owner.team) continue;
      if (dist(x, y, s.x, s.y) < radius + s.radius) s.takeDamage(damage, this);
    }
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const cx = (tx + ox + 0.5) * TILE, cy = (ty + oy + 0.5) * TILE;
        if (dist(x, y, cx, cy) < radius && GameMap.breakTile(tx + ox, ty + oy)) {
          this.crateSmashed(tx + ox, ty + oy);
        }
      }
    }
    this.burst(x, y, color, 16);
    this.shake(5);
  },

  /*
   * A short freeze on a heavy hit. Two or three frames is enough for a blow to
   * register as heavy rather than as a number going down.
   */
  hitStop(seconds) {
    this.stopTimer = Math.max(this.stopTimer || 0, seconds);
  },

  damage(target, amount, source, silent) {
    if (!target.alive || amount <= 0) return;
    if (target.spawnGuard > 0) return;

    let incoming = amount * target.incomingMult;
    if (target.shieldHp > 0) {
      const absorbed = Math.min(target.shieldHp, incoming);
      target.shieldHp -= absorbed;
      incoming -= absorbed;
    }
    const dealt = Math.min(target.hp, incoming);
    target.hp -= dealt;
    target.hurtFlash = 1;
    if (source && source !== target && source.team !== target.team) {
      source.damageDealt = (source.damageDealt || 0) + dealt;
    }
    // Only real blows freeze — chip damage from poison would stutter the game.
    if (dealt > 700 && (target === this.player || source === this.player)) {
      this.hitStop(dealt > 1600 ? 0.09 : 0.05);
    }

    if (source && source !== target && source.team !== target.team && source.addCharge) {
      source.addCharge(dealt);
    }
    if (target.def.trait === 'chargeFromDamage') target.addCharge(dealt * 0.9);
    // Ronin drinks a share of everything they land.
    if (source && source !== target && source.def && source.def.trait === 'lifesteal' &&
        source.team !== target.team && source.alive) {
      this.healTarget(source, dealt * 0.35, source);
    }
    if (!silent) Sfx.play('hit');

    if (target === this.player || (source && source === this.player)) {
      this.floatText(target.x, target.y - target.radius - 24, `-${Math.round(dealt)}`,
        target === this.player ? '#fca5a5' : '#ffffff', 15);
    }
    if (target.hp <= 0) this.kill(target, source);
  },

  healTarget(target, amount, source) {
    if (!target.alive || amount <= 0) return;
    const healed = Math.min(amount, target.maxHp - target.hp);
    target.hp += healed;
    if (healed <= 0) return;
    if (source && source !== target && source.addCharge) source.addCharge(healed * 0.8);
    this.floatText(target.x, target.y - target.radius - 24, `+${Math.round(healed)}`, '#6ee7b7', 14);
    this.burst(target.x, target.y, '#6ee7b7', 4);
  },

  kill(target, source) {
    target.alive = false;
    target.deaths++;
    target.respawnTimer = RESPAWN_SECONDS;
    target.hp = 0;
    if (source && source.team !== target.team) source.kills++;

    for (let i = 0; i < target.gems; i++) {
      const a = rand(0, Math.PI * 2);
      const spd = rand(90, 210);
      this.gems.push(new Gem(target.x, target.y, Math.cos(a) * spd, Math.sin(a) * spd));
    }
    target.gems = 0;
    target.fish = 0;

    this.burst(target.x, target.y, target.def.color, 26);
    this.shake(target === this.player ? 12 : 5);
    Sfx.play('death');

    // Consecutive kills inside a short window read as a streak.
    if (source && source.team !== target.team) {
      const now = this.time;
      source.streak = (now - (source.streakAt || -99) < 5) ? (source.streak || 0) + 1 : 1;
      source.streakAt = now;
      const call = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'RAMPAGE'][Math.min(source.streak, 4)];
      if (call) {
        this.callout = { text: call, life: 1.8, max: 1.8, mine: source === this.player };
        Sfx.play('charged');
      }
    }

    const killer = source ? (source === this.player ? 'You' : source.name) : 'the arena';
    const victim = target === this.player ? 'You' : target.name;
    this.log(`${killer} defeated ${victim}`,
      source && source.team === this.playerTeam ? TEAM_COLOR[this.playerTeam] : '#fca5a5');

    if (this.mode.onKill) this.mode.onKill(this, target, source);
  },

  respawn(b) {
    if (this.noRespawn) { b.respawnTimer = 999; return; }
    const spawns = GameMap.spawns[b.team];
    let best = spawns[0], bestScore = -Infinity;
    for (const s of spawns) {
      let score = 0;
      for (const e of this.brawlers) {
        if (!e.alive || e.team === b.team) continue;
        score += dist(s.x, s.y, e.x, e.y);
      }
      if (score > bestScore) { bestScore = score; best = s; }
    }
    b.spawnAt(best.x, best.y);
    this.burst(b.x, b.y, TEAM_COLOR[b.team], 14);
  },

  pickUpGems(b) {
    if (this.mode.id !== 'gem') return;
    for (const g of this.gems) {
      if (g.dead || g.delay > 0) continue;
      if (dist2(b.x, b.y, g.x, g.y) < (b.radius + g.radius + 4) ** 2) {
        g.dead = true;
        b.gems++;
        if (b === this.player) {
          Sfx.play('gem');
          this.floatText(b.x, b.y - b.radius - 26, '+1 GEM', PALETTE.gem, 15);
        }
        this.burst(g.x, g.y, PALETTE.gem, 6);
      }
    }
  },

  crateSmashed(tx, ty) {
    this.burst((tx + 0.5) * TILE, (ty + 0.5) * TILE, PALETTE.crateTop, 12);
    Sfx.play('crate');
  },

  visibleToPlayer(b) {
    const p = this.player;
    if (!p) return true;
    if (b === p || b.team === p.team) return true;
    if (!b.hidden) return true;
    return dist(p.x, p.y, b.x, b.y) < BUSH_REVEAL_DIST;
  },

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 220);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: rand(1.5, 4), color, life: rand(0.2, 0.5), maxLife: 0.5,
      });
    }
  },

  addLink(x1, y1, x2, y2, color) {
    this.links.push({ x1, y1, x2, y2, color, life: 0.25, maxLife: 0.25 });
  },

  floatText(x, y, text, color, size) {
    this.texts.push({ x, y, text, color, size: size || 14, vy: -34, life: 0.8, maxLife: 0.8 });
  },

  log(text, color) {
    this.feed.unshift({ text, color: color || '#e5e7eb', life: 3.6 });
    if (this.feed.length > 5) this.feed.pop();
  },

  shake(mag) { Renderer.shake(mag); },

  finish(winner) {
    if (this.state !== 'playing') return;
    this.state = 'over';
    this.result = winner;
    if (typeof Net !== 'undefined' && Net.isHost && Net.connected) Net.send({ t: 'end', w: winner });
    this.rankResult = this.ranked
      ? Ranked.settle(winner === this.playerTeam, winner === -1)
      : null;
    this.dropsWon = Progress.awardMatch(winner === this.playerTeam);
    Sfx.play(winner === this.playerTeam ? 'win' : 'lose');
    UI.showResult(winner);
  },
};
