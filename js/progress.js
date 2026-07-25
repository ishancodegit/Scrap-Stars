/*
 * Power levels and Starr Drops.
 *
 * Every brawler has a power level from 1 to 11. Levelling raises health and
 * damage by a flat step each time, so the curve is readable rather than
 * exponential: level 11 is exactly 40% above level 1, not several times it.
 * Levels cost power points earned per brawler plus coins from the common pool.
 *
 * Starr Drops are the reward at the end of a match — a rarity roll that pays
 * out coins, power points, or a straight level-up.
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

const DROP_RARITIES = [
  { id: 'rare', name: 'Rare', color: '#4ade80', weight: 50 },
  { id: 'superrare', name: 'Super Rare', color: '#38bdf8', weight: 28 },
  { id: 'epic', name: 'Epic', color: '#c084fc', weight: 14 },
  { id: 'mythic', name: 'Mythic', color: '#fb7185', weight: 6 },
  { id: 'legendary', name: 'Legendary', color: '#fbbf24', weight: 2 },
];

const Progress = {
  coins: 0,
  brawlers: {},        // id -> { level, points }
  drops: 0,            // unopened Starr Drops
  opened: 0,

  load() {
    try {
      const raw = localStorage.getItem('scrapstars.progress');
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { /* first run or storage blocked */ }
    for (const b of BRAWLERS) {
      if (!this.brawlers[b.id]) this.brawlers[b.id] = { level: 1, points: 0 };
    }
  },

  save() {
    try {
      localStorage.setItem('scrapstars.progress', JSON.stringify({
        coins: this.coins, brawlers: this.brawlers, drops: this.drops, opened: this.opened,
      }));
    } catch (e) { /* nothing worth breaking play over */ }
  },

  of(id) { return this.brawlers[id] || (this.brawlers[id] = { level: 1, points: 0 }); },
  level(id) { return this.of(id).level; },

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

  /* Roll one Starr Drop. Returns what it paid out, for the reveal. */
  openDrop(preferId) {
    if (this.drops <= 0) return null;
    this.drops--;
    this.opened++;

    const total = DROP_RARITIES.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    let rarity = DROP_RARITIES[0];
    for (const r of DROP_RARITIES) {
      if (roll < r.weight) { rarity = r; break; }
      roll -= r.weight;
    }

    const tier = DROP_RARITIES.indexOf(rarity);
    const id = preferId || pick(BRAWLERS).id;
    const b = this.of(id);
    const reward = { rarity, brawler: BRAWLER_BY_ID[id] };

    // Legendary and mythic can hand over a level outright; the rest pay in
    // points and coins that scale with how rare the drop was.
    if (tier >= 3 && b.level < MAX_POWER) {
      b.level++;
      reward.kind = 'level';
      reward.text = `${reward.brawler.name} → Power ${b.level}`;
    } else if (Math.random() < 0.55) {
      const points = Math.round((18 + tier * 26) * rand(0.85, 1.2));
      b.points += points;
      reward.kind = 'points';
      reward.amount = points;
      reward.text = `${points} power points`;
    } else {
      const coins = Math.round((35 + tier * 70) * rand(0.85, 1.2));
      this.coins += coins;
      reward.kind = 'coins';
      reward.amount = coins;
      reward.text = `${coins} coins`;
    }

    this.save();
    return reward;
  },
};

/* Draw a Starr Drop: a rounded capsule with a seam and a star on the front. */
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
