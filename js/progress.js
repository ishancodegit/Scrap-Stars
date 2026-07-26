/*
 * Power levels, the collection, and Prize Pods.
 *
 * Every brawler has a power level from 1 to 11. Levelling raises health and
 * damage by a flat step each time, so the curve is readable rather than
 * exponential: level 11 is exactly 40% above level 1, not several times it.
 * Levels cost power points earned per brawler plus coins from the common pool.
 *
 * Prize Pods work the way the real ones do: every drop starts as Rare and
 * then rolls to climb the rarity ladder, one step at a time, before it opens.
 * The climb is the drama — a Legendary is a Rare that got lucky four times in
 * a row, which is why the reveal animates each step instead of just naming a
 * tier. What it pays out scales with wherever it stopped.
 */

const MAX_POWER = 11;
const POWER_STEP = 0.04;                 // +4% health and damage per level

/* Power points and coins needed to go from level N to N+1. */
function upgradeCost(level) {
  const points = [0, 20, 30, 50, 80, 130, 210, 340, 550, 890, 1440][level] || 0;
  const coins = [0, 20, 35, 75, 140, 290, 480, 800, 1250, 1875, 2800][level] || 0;
  return { points, coins };
}

function powerMult(level) {
  return 1 + (clamp(level, 1, MAX_POWER) - 1) * POWER_STEP;
}

/*
 * `up` is the chance this tier upgrades to the next one, chosen so the odds of
 * *stopping* on each tier match the published Brawl Stars Starr Drop rates:
 * 50 / 28 / 15 / 5 / 2 percent. Solving backwards from those marginals is why
 * they are not round numbers.
 *
 * The rates that were here before were guessed, and they were miserable —
 * Mythic landed near one drop in eighty. This puts it at one in twenty, and
 * something Mythic or better inside about fourteen pods.
 */
const DROP_RARITIES = [
  { id: 'rare', name: 'Rare', color: '#4ade80', up: 0.5000 },
  { id: 'superrare', name: 'Super Rare', color: '#38bdf8', up: 0.4400 },
  { id: 'epic', name: 'Epic', color: '#c084fc', up: 0.3182 },
  { id: 'mythic', name: 'Mythic', color: '#fb7185', up: 0.2857 },
  { id: 'legendary', name: 'Legendary', color: '#fbbf24', up: 0 },
];

const Progress = {
  coins: 0,
  brawlers: {},        // id -> { level, points }
  drops: 0,            // unopened Prize Pods
  opened: 0,
  credits: 0,          // Recruit Track currency
  unlocked: {},        // id -> true
  skins: {},           // id -> { skinId: true }
  equipped: {},        // id -> skinId

  load() {
    try {
      const raw = localStorage.getItem('scrapstars.progress');
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { /* first run or storage blocked */ }
    this._migrateIds();
    for (const b of BRAWLERS) {
      if (!this.brawlers[b.id]) this.brawlers[b.id] = { level: 1, points: 0 };
    }
    // The first brawler on the road is always yours, including for saves made
    // before the road existed.
    this.unlocked[ROAD_ORDER[0]] = true;
  },

  save() {
    try {
      localStorage.setItem('scrapstars.progress', JSON.stringify({
        coins: this.coins, brawlers: this.brawlers, drops: this.drops, opened: this.opened,
        credits: this.credits, unlocked: this.unlocked, skins: this.skins, equipped: this.equipped,
      }));
    } catch (e) { /* nothing worth breaking play over */ }
  },

  /*
   * The roster was renamed, so a save from before then keys everything under
   * the old ids. Carry those forward rather than silently wiping a collection.
   */
  _migrateIds() {
    const RENAMED = {
      shelly: 'buckshot', colt: 'sixer', bull: 'ramrod', elprimo: 'haymaker',
      rico: 'carom', barley: 'tonic', poco: 'chorus', piper: 'longshot',
      mortis: 'shade', spike: 'thorn', nori: 'angler', kenji: 'ronin',
      frank: 'sledge',
    };
    for (const [was, now] of Object.entries(RENAMED)) {
      for (const bag of [this.brawlers, this.unlocked, this.skins, this.equipped]) {
        if (bag && bag[was] !== undefined) {
          if (bag[now] === undefined) bag[now] = bag[was];
          delete bag[was];
        }
      }
    }
  },

  of(id) { return this.brawlers[id] || (this.brawlers[id] = { level: 1, points: 0 }); },
  level(id) { return this.of(id).level; },

  /* ---------------- collection ---------------- */

  isUnlocked(id) { return id === ROAD_ORDER[0] || !!this.unlocked[id]; },
  unlockedIds() { return BRAWLERS.filter((b) => this.isUnlocked(b.id)).map((b) => b.id); },

  canUnlock(id) {
    const step = nextRoadStep();
    return !!step && step.id === id && this.credits >= step.cost;
  },

  unlockCost(id) {
    const step = roadSteps().find((s) => s.id === id);
    return step ? step.cost : 0;
  },

  unlock(id) {
    if (!this.canUnlock(id)) return false;
    this.credits -= this.unlockCost(id);
    this.unlocked[id] = true;
    this.save();
    return true;
  },

  ownsSkin(brawlerId, skinId) {
    return skinId === 'default' || !!(this.skins[brawlerId] && this.skins[brawlerId][skinId]);
  },

  grantSkin(brawlerId, skinId) {
    if (!this.skins[brawlerId]) this.skins[brawlerId] = {};
    this.skins[brawlerId][skinId] = true;
  },

  equippedSkin(brawlerId) {
    const s = this.equipped[brawlerId];
    return s && this.ownsSkin(brawlerId, s) ? s : 'default';
  },

  equipSkin(brawlerId, skinId) {
    if (!this.ownsSkin(brawlerId, skinId)) return false;
    this.equipped[brawlerId] = skinId;
    this.save();
    return true;
  },

  /* Skins for this brawler you do not own yet, rarest first. */
  _lockedSkins(brawlerId) {
    return skinsFor(brawlerId).filter((s) => s.id !== 'default' && !this.ownsSkin(brawlerId, s.id));
  },

  /* ---------------- power ---------------- */

  canUpgrade(id) {
    const b = this.of(id);
    if (b.level >= MAX_POWER) return false;
    const c = upgradeCost(b.level);
    return b.points >= c.points && this.coins >= c.coins;
  },

  upgrade(id) {
    if (!this.canUpgrade(id)) return false;
    const b = this.of(id);
    const c = upgradeCost(b.level);
    b.points -= c.points;
    this.coins -= c.coins;
    b.level++;
    this.save();
    return true;
  },

  /*
   * Matches pay out: a win is always a drop, a loss is a coin flip, so a bad
   * run still moves you forward slowly.
   */
  awardMatch(won) {
    const drops = won ? 1 : (Math.random() < 0.5 ? 1 : 0);
    this.drops += drops;
    this.coins += won ? 40 : 15;
    this.save();
    return drops;
  },

  /*
   * Roll the rarity ladder. Every drop starts Rare and climbs while the dice
   * keep saying yes. Returns the whole chain so the reveal can play each step.
   */
  rollRarity() {
    const chain = [DROP_RARITIES[0]];
    let i = 0;
    while (i < DROP_RARITIES.length - 1 && Math.random() < DROP_RARITIES[i].up) {
      i++;
      chain.push(DROP_RARITIES[i]);
    }
    return chain;
  },

  /* Open one Prize Pod. Returns what it paid out, for the reveal. */
  openDrop(preferId) {
    if (this.drops <= 0) return null;
    this.drops--;
    this.opened++;

    if (typeof Quests !== 'undefined') Quests.bump('pods', 1);
    const chain = this.rollRarity();
    const rarity = chain[chain.length - 1];
    const tier = DROP_RARITIES.indexOf(rarity);
    const owned = this.unlockedIds();
    const id = (preferId && this.isUnlocked(preferId)) ? preferId : pick(owned.map((x) => BRAWLER_BY_ID[x])).id;
    const b = this.of(id);
    const reward = { rarity, chain, brawler: BRAWLER_BY_ID[id] };

    // Best prizes first, each gated on there being something left to give.
    const lockedSkins = this._lockedSkins(id);
    const nextStep = nextRoadStep();

    if (tier >= 4 && lockedSkins.length) {
      const skin = lockedSkins[lockedSkins.length - 1];
      this.grantSkin(id, skin.id);
      reward.kind = 'skin';
      reward.skin = skin;
      reward.text = skin.name;
      reward.sub = 'NEW SKIN';
    } else if (tier >= 3 && nextStep && Math.random() < 0.5) {
      const credits = Math.round((40 + tier * 45) * rand(0.85, 1.2));
      this.credits += credits;
      reward.kind = 'credits';
      reward.amount = credits;
      reward.text = `${credits} credits`;
      reward.sub = 'RECRUIT TRACK';
    } else if (tier >= 3 && b.level < MAX_POWER) {
      b.level++;
      reward.kind = 'level';
      reward.text = `POWER ${b.level}`;
      reward.sub = 'LEVEL UP';
    } else if (tier >= 2 && lockedSkins.length && Math.random() < 0.22) {
      const skin = lockedSkins[0];
      this.grantSkin(id, skin.id);
      reward.kind = 'skin';
      reward.skin = skin;
      reward.text = skin.name;
      reward.sub = 'NEW SKIN';
    } else if (Math.random() < 0.3) {
      const credits = Math.round((14 + tier * 22) * rand(0.85, 1.2));
      this.credits += credits;
      reward.kind = 'credits';
      reward.amount = credits;
      reward.text = `${credits} credits`;
      reward.sub = 'RECRUIT TRACK';
    } else if (Math.random() < 0.55) {
      const points = Math.round((18 + tier * 26) * rand(0.85, 1.2));
      b.points += points;
      reward.kind = 'points';
      reward.amount = points;
      reward.text = `${points} power points`;
      reward.sub = 'POWER POINTS';
    } else {
      const coins = Math.round((35 + tier * 70) * rand(0.85, 1.2));
      this.coins += coins;
      reward.kind = 'coins';
      reward.amount = coins;
      reward.text = `${coins} coins`;
      reward.sub = 'COINS';
    }

    this.save();
    return reward;
  },
};

/* Draw a Prize Pod: a rounded capsule with a seam and a star on the front. */
function drawStarrDrop(ctx, r, color, open) {
  ctx.save();
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.62, -r, r * 0.92, -r * 0.42, r * 0.92, r * 0.05);
  ctx.bezierCurveTo(r * 0.92, r * 0.64, r * 0.55, r * 0.96, 0, r * 0.96);
  ctx.bezierCurveTo(-r * 0.55, r * 0.96, -r * 0.92, r * 0.64, -r * 0.92, r * 0.05);
  ctx.bezierCurveTo(-r * 0.92, -r * 0.42, -r * 0.62, -r, 0, -r);
  ctx.closePath();

  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.22, color);
  g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(18,7,31,.9)';
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.stroke();

  // Seam where the lid meets the base.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(18,7,31,.55)';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.28);
  ctx.quadraticCurveTo(0, -r * 0.12, r, -r * 0.28);
  ctx.stroke();
  // Gloss down the upper left.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.52, r * 0.24, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Star.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.21 : r * 0.5;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr + r * 0.14;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = open ? '#fff' : '#f6ecff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(18,7,31,.7)';
  ctx.lineWidth = Math.max(1.5, r * 0.055);
  ctx.stroke();
  ctx.restore();
}
