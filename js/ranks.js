/*
 * Ranked play: trophies, tiers and the bots that come with them.
 *
 * Your rating is a single number. The tier it falls in decides both the badge
 * you wear and how good the opposition is — Bronze bots barely lead their
 * shots, Master bots hit what they aim at and never waste a Super.
 */

const RANKS = [
  { id: 'bronze', name: 'Bronze', min: 0, color: '#c07a45', glow: '#e0a06a' },
  { id: 'silver', name: 'Silver', min: 200, color: '#b9c4cf', glow: '#e2e8f0' },
  { id: 'gold', name: 'Gold', min: 400, color: '#f0b429', glow: '#fde68a' },
  { id: 'diamond', name: 'Diamond', min: 600, color: '#4fd1e5', glow: '#a5f3fc' },
  { id: 'mythic', name: 'Mythic', min: 800, color: '#e152a0', glow: '#f9a8d4' },
  { id: 'legendary', name: 'Legendary', min: 1000, color: '#ef4444', glow: '#fca5a5' },
  { id: 'master', name: 'Master', min: 1200, color: '#a855f7', glow: '#d8b4fe' },
];

/*
 * Bot skill per tier. aimError is radians of spray, reaction is how long they
 * take to register a new target, leadAccuracy is how much of the target's
 * velocity they compensate for, retreatHp is how early they disengage.
 */
const RANK_BOTS = {
  bronze:    { aimError: 0.30, reaction: 0.60, superChance: 0.30, leadAccuracy: 0.25, retreatHp: 0.18 },
  silver:    { aimError: 0.22, reaction: 0.46, superChance: 0.45, leadAccuracy: 0.45, retreatHp: 0.24 },
  gold:      { aimError: 0.16, reaction: 0.34, superChance: 0.62, leadAccuracy: 0.62, retreatHp: 0.29 },
  diamond:   { aimError: 0.115, reaction: 0.25, superChance: 0.78, leadAccuracy: 0.78, retreatHp: 0.33 },
  mythic:    { aimError: 0.080, reaction: 0.17, superChance: 0.90, leadAccuracy: 0.90, retreatHp: 0.37 },
  legendary: { aimError: 0.050, reaction: 0.11, superChance: 1.00, leadAccuracy: 1.00, retreatHp: 0.41 },
  master:    { aimError: 0.026, reaction: 0.06, superChance: 1.00, leadAccuracy: 1.00, retreatHp: 0.46 },
};

const Ranked = {
  elo: 0,
  best: 0,
  played: 0,
  won: 0,

  load() {
    try {
      const raw = localStorage.getItem('scrapstars.rank');
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { /* first run, or storage blocked — defaults are fine */ }
    this.elo = clamp(this.elo || 0, 0, 4000);
  },

  save() {
    try {
      localStorage.setItem('scrapstars.rank', JSON.stringify({
        elo: this.elo, best: this.best, played: this.played, won: this.won,
      }));
    } catch (e) { /* nothing we can do, and nothing worth breaking play over */ }
  },

  tier(elo) {
    const v = elo == null ? this.elo : elo;
    let out = RANKS[0];
    for (const r of RANKS) if (v >= r.min) out = r;
    return out;
  },

  /* Progress through the current tier, 0..1. Master has no ceiling. */
  progress() {
    const t = this.tier();
    const i = RANKS.indexOf(t);
    if (i === RANKS.length - 1) return 1;
    const span = RANKS[i + 1].min - t.min;
    return clamp((this.elo - t.min) / span, 0, 1);
  },

  nextAt() {
    const i = RANKS.indexOf(this.tier());
    return i === RANKS.length - 1 ? null : RANKS[i + 1].min;
  },

  botProfile() { return RANK_BOTS[this.tier().id]; },

  /*
   * Settle a ranked match. Higher tiers move less per game, so climbing out
   * of Bronze is quick and holding Master is not.
   */
  settle(won, draw) {
    const i = RANKS.indexOf(this.tier());
    const swing = Math.round(34 - i * 3);          // 34 at Bronze down to 16 at Master
    const before = this.elo;
    const beforeTier = this.tier().id;

    if (draw) this.elo += 1;
    else if (won) this.elo += swing;
    else this.elo = Math.max(0, this.elo - Math.round(swing * 0.8));

    this.played++;
    if (won) this.won++;
    this.best = Math.max(this.best, this.elo);
    this.save();

    const afterTier = this.tier().id;
    return {
      delta: this.elo - before,
      promoted: RANKS.findIndex((r) => r.id === afterTier) > RANKS.findIndex((r) => r.id === beforeTier),
      demoted: RANKS.findIndex((r) => r.id === afterTier) < RANKS.findIndex((r) => r.id === beforeTier),
      tier: this.tier(),
    };
  },
};

/* Draw a rank badge: a shield in the tier's colour with a trophy on it. */
function drawRankBadge(ctx, r, tier) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.82, -r * 0.55);
  ctx.lineTo(r * 0.82, r * 0.32);
  ctx.quadraticCurveTo(r * 0.82, r * 0.95, 0, r);
  ctx.quadraticCurveTo(-r * 0.82, r * 0.95, -r * 0.82, r * 0.32);
  ctx.lineTo(-r * 0.82, -r * 0.55);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, tier.glow);
  g.addColorStop(1, tier.color);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,15,10,.75)';
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.stroke();

  // Trophy.
  ctx.fillStyle = 'rgba(60,30,12,.8)';
  ctx.beginPath();
  ctx.arc(0, -r * 0.06, r * 0.34, Math.PI, 0);
  ctx.rect(-r * 0.34, -r * 0.06, r * 0.68, r * 0.28);
  ctx.fill();
  ctx.fillRect(-r * 0.1, r * 0.2, r * 0.2, r * 0.22);
  ctx.fillRect(-r * 0.3, r * 0.4, r * 0.6, r * 0.14);
  ctx.restore();
}
