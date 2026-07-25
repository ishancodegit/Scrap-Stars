/* Global configuration, tuning values and shared helpers. */

const TILE = 48;
const MAP_W = 29;           // odd, so there is a true centre tile
const MAP_H = 21;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;

const TEAM_BLUE = 0;
const TEAM_RED = 1;

const TEAM_COLOR = ['#38bdf8', '#fb7185'];
const TEAM_DARK = ['#0c4a6e', '#7f1d34'];
const TEAM_NAME = ['Blue', 'Red'];

/* Match rules (Gem Grab). */
const GEMS_TO_WIN = 10;
const LOCK_SECONDS = 15;     // countdown once a team holds enough gems
const MATCH_SECONDS = 180;
const GEM_SPAWN_EVERY = 2.6;
const MAX_LOOSE_GEMS = 12;
const RESPAWN_SECONDS = 3.2;

/* Visibility */
const BUSH_REVEAL_DIST = 96;  // you can see hidden enemies this close
const ATTACK_REVEAL = 1.1;    // seconds you stay revealed after attacking

/*
 * Hypercharge. Every Hypercharge grants the same stat package while active and
 * upgrades that brawler's Super; only the Super upgrade differs per brawler.
 * The meter fills from damage dealt once the Super itself is already charged.
 */
const HYPER = {
  duration: 6,
  speedMult: 1.20,
  damageMult: 1.05,
  shieldMult: 0.95,          // incoming damage multiplier
  chargeMult: 1.4,           // hyper meter gain relative to super charge gain
};

const STATUS_TICK = 0.25;

const PALETTE = {
  bg: '#0a0b0f',
  floor: '#1b2330',
  floorAlt: '#19202c',
  grid: 'rgba(255,255,255,.028)',
  rock: '#39414f',
  rockTop: '#4b5567',
  crate: '#7c5230',
  crateTop: '#9a6a3f',
  bush: '#1f7a4d',
  bushTop: '#2ea56a',
  gem: '#a855f7',
  accent: '#22d3ee',
};

const RARITY = {
  starting: { name: 'Starting', color: '#9aa0ad' },
  rare: { name: 'Rare', color: '#34d399' },
  superrare: { name: 'Super Rare', color: '#38bdf8' },
  epic: { name: 'Epic', color: '#c084fc' },
  mythic: { name: 'Mythic', color: '#fb7185' },
  legendary: { name: 'Legendary', color: '#facc15' },
  ultra: { name: 'Ultra Legendary', color: '#f472b6' },
};

const CLASSES = {
  damage: 'Damage Dealer',
  tank: 'Tank',
  marksman: 'Marksman',
  artillery: 'Artillery',
  controller: 'Controller',
  assassin: 'Assassin',
  support: 'Support',
};

const BOT_NAMES = [
  'Rusty', 'Nova', 'Clank', 'Vex', 'Piston', 'Zephyr',
  'Dozer', 'Ember', 'Ratchet', 'Sable', 'Wrench', 'Onyx',
];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const angDiff = (a, b) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
