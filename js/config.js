/* Global configuration, tuning values and shared helpers. */

const TILE = 48;
const MAP_W = 27;
const MAP_H = 19;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;

const TEAM_BLUE = 0;
const TEAM_RED = 1;

const TEAM_COLOR = ['#38bdf8', '#fb7185'];
const TEAM_NAME = ['Blue', 'Red'];

const RESPAWN_SECONDS = 3.0;
const BUSH_REVEAL_DIST = 96;
const ATTACK_REVEAL = 1.1;

/*
 * Movement, Counter-Strike style: input picks a direction, not a velocity.
 * Friction bleeds speed off every frame and accelerate() only tops you up to
 * the cap along the direction you asked for, so you ramp up, carry momentum
 * round corners, and keep sliding when knocked back.
 */
const MOVE = {
  // Applied to every fighter's walk speed, so the roster keeps its relative
  // pacing. Scaling here rather than editing each entry also keeps it clear
  // of the `speed` fields on projectiles, which mean something else entirely.
  speedScale: 0.9,
  accel: 11,        // how hard you claw up to full speed
  friction: 8.5,    // how fast you shed it when you let go
  stopSpeed: 60,    // floor so you actually come to rest
  airAccel: 3.2,    // steering authority while dashing or knocked back
};

const HYPER = {
  duration: 6,
  speedMult: 1.20,
  damageMult: 1.10,
  shieldMult: 0.92,
  chargeMult: 1.4,
};

const STATUS_TICK = 0.25;

/* Nori's rod: tap to swing, hold to wind up the hook. */
const HOOK = {
  tapTime: 0.18,      // shorter than this and it is just a swing
  maxCharge: 0.75,
  reelSpeed: 1150,
};

/* Warm desert arena. */
const PALETTE = {
  bg: '#5d3626',
  floor: '#e2a074',
  floorAlt: '#dc9668',
  floorSpeck: 'rgba(120,64,34,.10)',
  rock: '#b0573a',
  rockTop: '#d07a56',
  rockSide: '#89401f',
  crate: '#a9773f',
  crateTop: '#cb9758',
  bush: '#39913a',
  bushTop: '#5cbf4d',
  bushDark: '#256b28',
  gem: '#a855f7',
  accent: '#22d3ee',
  ink: '#3b1f14',
};

const CLASSES = {
  damage: 'Damage Dealer',
  tank: 'Tank',
  marksman: 'Marksman',
  artillery: 'Artillery',
  support: 'Support',
  assassin: 'Assassin',
};

/*
 * Handles for everyone else in the lobby. They read like accounts rather than
 * like a difficulty setting, because who you are matched against is not
 * something the game should be narrating at you mid-fight.
 */
const BOT_NAMES = [
  'Nova', 'kaz', 'Piston99', 'mochi', 'Vexed', 'sable_',
  'ONYX', 'Ratchet', 'zeph', 'DozerX', 'Ember', 'wr3nch',
  'lumi', 'TK_Ghost', 'quill', 'Static', 'nine', 'Rook',
];

/*
 * Quick chat. Four is the whole set on purpose — enough to say the useful
 * things, too few to spam anything unpleasant. Keys 1-4, or hold the emote
 * button on a touchscreen.
 */
const EMOTES = [
  { key: '1', icon: '!', label: 'Help!', color: '#fbbf24' },
  { key: '2', icon: '\u2713', label: 'Nice!', color: '#4ade80' },
  { key: '3', icon: '\u2190', label: 'Retreat', color: '#38bdf8' },
  { key: '4', icon: '\u2691', label: 'Attack', color: '#fb7185' },
];

/* Match bookends. */
const INTRO_SECONDS = 2.3;      // team lineup card before the countdown
const OUTRO_SECONDS = 2.6;      // slow-motion beat before the result screen
const OUTRO_SLOWMO = 0.18;      // how far time is dilated during it

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
