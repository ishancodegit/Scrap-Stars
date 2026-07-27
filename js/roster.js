/*
 * The roster — eleven brawlers, each one a distinct way to play.
 *
 * Trimmed down deliberately: every entry here has a mechanic nobody else has,
 * and every one is tuned to be worth picking. Kits are data (see abilities.js);
 * `art` names the sprite drawn for it in sprites.js.
 *
 * Balance target: about a 2.5s time-to-kill between evenly matched brawlers,
 * with squishy long-range picks trading survivability for reach.
 */

const BRAWLERS = [
  {
    id: 'buckshot', name: 'Buckshot', cls: 'damage', art: 'buckshot',
    color: '#f2596b', skin: '#f0c3a0', hair: '#3b2b2b',
    blurb: 'Shotgun cone. Forgiving to aim, brutal up close.',
    tip: 'Get close — the cone does full damage when every shell lands.',
    hp: 5400, speed: 220, radius: 17, ammo: 3, reload: 1.45, superCharge: 3400,
    attack: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.40, damage: 310,
      speed: 800, range: 330, radius: 6, cooldown: 0.34, speedJitter: true,
    },
    super: {
      emit: 'projectiles', count: 9, pattern: 'fan', spread: 0.60, damage: 460,
      speed: 840, range: 400, radius: 8, knockback: 300, breakWalls: true, speedJitter: true,
    },
    gadget: {
      name: 'Fast Shells', icon: 'reload',
      blurb: 'Slams a full clip in and moves you off the reload.',
      spec: { emit: 'self', ammo: true, haste: { duration: 2.2, mult: 1.25 }, color: '#f2596b' },
    },
    hyper: { name: 'Shell Shock', charge: 4200, super: { count: 12, damage: 520, knockback: 460 } },
  },
  {
    id: 'sixer', name: 'Sixer', cls: 'damage', art: 'sixer',
    color: '#3b82f6', skin: '#e8b892', hair: '#8a5a2b',
    blurb: 'Walks a line of six bullets straight down the lane.',
    tip: 'Lead your target. Every bullet that misses is damage you never get back.',
    hp: 3900, speed: 225, radius: 16, ammo: 3, reload: 1.45, superCharge: 3400,
    attack: {
      emit: 'projectiles', count: 6, pattern: 'stream', interval: 0.05, damage: 300,
      speed: 960, range: 500, radius: 5, cooldown: 0.34, jitter: 0.01,
    },
    super: {
      emit: 'projectiles', count: 10, pattern: 'stream', interval: 0.045, damage: 360,
      speed: 1000, range: 540, radius: 6, breakWalls: true,
    },
    gadget: {
      name: 'Silver Bullet', icon: 'bolt',
      blurb: 'One round that goes through everything in the lane.',
      aimed: true,
      spec: {
        emit: 'projectiles', count: 1, damage: 900, speed: 1250, range: 620,
        radius: 7, pierce: true, color: '#dbeafe',
      },
    },
    hyper: { name: 'Hot Streak', charge: 4200, super: { count: 12, damage: 420, pierce: true } },
  },
  {
    id: 'ramrod', name: 'Ramrod', cls: 'tank', art: 'ramrod',
    color: '#ef4444', skin: '#d9a06a', hair: '#7c2d12',
    blurb: 'Double barrel point-blank, then charges through the wall.',
    tip: 'The charge smashes crates — use it to open a lane or to escape.',
    hp: 7000, speed: 224, radius: 20, ammo: 3, reload: 1.55, superCharge: 3700,
    attack: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.36, damage: 395,
      speed: 760, range: 250, radius: 7, cooldown: 0.36, speedJitter: true,
    },
    super: {
      emit: 'dash', distance: 440, speed: 820, damage: 1100, knockback: 320,
      breakWalls: true, stun: 0.3,
    },
    gadget: {
      name: 'Tin Plate', icon: 'shield',
      blurb: 'Bolts on a shield that soaks the next burst.',
      spec: { emit: 'self', shield: 2600, color: '#ef4444' },
    },
    hyper: { name: 'Redline', charge: 4600, super: { distance: 560, damage: 1400, knockback: 460 } },
  },
  {
    id: 'haymaker', name: 'Haymaker', cls: 'tank', art: 'haymaker',
    color: '#f97316', skin: '#c97b45', hair: '#1f2937',
    blurb: 'Four-punch combo, then an elbow drop from orbit.',
    tip: 'Leap onto the squishy one at the back, not the tank in front.',
    hp: 8400, speed: 238, radius: 20, ammo: 3, reload: 1.35, superCharge: 3600,
    attack: {
      emit: 'melee', hits: 4, interval: 0.1, arc: 0.95, reach: 112, damage: 530, cooldown: 0.44,
    },
    super: {
      emit: 'leap', range: 440, speed: 640,
      onArrive: { emit: 'area', range: 0, radius: 118, damage: 1200, duration: 0.1, knockback: 260 },
    },
    gadget: {
      name: 'Suplex', icon: 'fist',
      blurb: 'Grabs whoever is in front and puts them on the floor.',
      aimed: true,
      spec: { emit: 'melee', arc: 1.3, reach: 130, damage: 500, stun: 1.0, color: '#f97316' },
    },
    hyper: {
      name: 'Meteor Drop', charge: 4600,
      super: { onArrive: { emit: 'area', range: 0, radius: 150, damage: 1600, duration: 0.1, knockback: 380, stun: 0.6 } },
    },
  },
  {
    id: 'carom', name: 'Carom', cls: 'damage', art: 'carom',
    color: '#a78bfa', skin: '#cbd5e1', hair: '#7c3aed',
    blurb: 'Bullets ricochet off walls and punish anyone hiding.',
    tip: 'Aim at the wall beside them, not at them.',
    hp: 3900, speed: 222, radius: 16, ammo: 3, reload: 1.45, superCharge: 3400,
    attack: {
      emit: 'projectiles', count: 5, pattern: 'stream', interval: 0.055, damage: 295,
      speed: 900, range: 470, radius: 5, cooldown: 0.34, bounce: 4,
    },
    super: {
      emit: 'projectiles', count: 9, pattern: 'stream', interval: 0.05, damage: 360,
      speed: 940, range: 540, radius: 6, bounce: 6,
    },
    gadget: {
      name: 'Kick Away', icon: 'burst',
      blurb: 'A ring that shoves everyone off you.',
      spec: {
        emit: 'area', range: 0, radius: 165, damage: 320, knockback: 460,
        duration: 0.1, color: '#a78bfa',
      },
    },
    hyper: { name: 'Bank Shot', charge: 4200, super: { count: 12, damage: 420, bounce: 8 } },
  },
  {
    id: 'tonic', name: 'Tonic', cls: 'artillery', art: 'tonic',
    color: '#fbbf24', skin: '#9aa0ad', hair: '#334155',
    blurb: 'Bottles that pool into burning ground and deny the lane.',
    tip: 'Throw where they are going, not where they are.',
    hp: 3800, speed: 218, radius: 17, ammo: 3, reload: 1.5, superCharge: 3400,
    attack: {
      emit: 'lob', count: 1, damage: 420, aoe: 76, speed: 620, range: 430, radius: 9,
      puddle: { dps: 440, duration: 2.4, radius: 76 },
    },
    super: {
      emit: 'lob', count: 4, pattern: 'spread', spread: 0.7, patternSize: 80, damage: 400,
      aoe: 76, speed: 620, range: 450, radius: 9,
      puddle: { dps: 480, duration: 3, radius: 80 },
    },
    gadget: {
      name: 'Sticky Syrup', icon: 'drop',
      blurb: 'Pours a patch nobody crosses in a hurry.',
      aimed: true,
      spec: { emit: 'area', range: 400, radius: 105, slow: 0.55, duration: 3.6, color: '#fbbf24' },
    },
    hyper: {
      name: 'Spill Over', charge: 4200,
      super: { count: 6, puddle: { dps: 600, duration: 3.6, radius: 88 } },
    },
  },
  {
    id: 'chorus', name: 'Chorus', cls: 'support', art: 'chorus',
    color: '#f472b6', skin: '#e9c49a', hair: '#1f2937',
    blurb: 'Sound waves through everyone, and a chorus that heals the team.',
    tip: 'Your attack passes through walls of people — line them up.',
    hp: 5200, speed: 220, radius: 17, ammo: 3, reload: 1.45, superCharge: 3300,
    attack: {
      emit: 'projectiles', count: 1, damage: 500, speed: 700, range: 390, radius: 26,
      cooldown: 0.38, pierce: true,
    },
    super: { emit: 'self', teamRadius: 340, teamHeal: 2400, heal: 2400, color: '#f472b6' },
    gadget: {
      name: 'Tuning Fork', icon: 'heart',
      blurb: 'A small chord that tops the team up between fights.',
      spec: { emit: 'self', teamRadius: 300, teamHeal: 1700, heal: 1700, color: '#f472b6' },
    },
    hyper: { name: 'Crescendo', charge: 4000, super: { teamRadius: 420, teamHeal: 3400, heal: 3400 } },
  },
  {
    id: 'longshot', name: 'Longshot', cls: 'marksman', art: 'longshot',
    color: '#f9a8d4', skin: '#f0c9a8', hair: '#f8c46a',
    blurb: 'The further the shot travels, the more it hurts.',
    tip: 'Never let them close. The Super jumps you out and drops bombs behind.',
    hp: 3700, speed: 224, radius: 16, ammo: 3, reload: 1.45, superCharge: 3200,
    attack: {
      emit: 'projectiles', count: 1, damage: 1050, speed: 940, range: 600, radius: 6,
      cooldown: 0.38, scale: { near: 0.58, far: 1.15 },
    },
    super: {
      emit: 'leap', range: 400, speed: 660,
      onArrive: {
        emit: 'lob', count: 4, pattern: 'cluster', patternSize: 62, damage: 620,
        aoe: 72, speed: 700, range: 10, radius: 9,
      },
    },
    gadget: {
      name: 'Powder Charge', icon: 'bomb',
      blurb: 'Lobs a charge over the wall you are hiding behind.',
      aimed: true,
      spec: {
        emit: 'lob', count: 1, damage: 950, aoe: 96, speed: 660, range: 430,
        radius: 10, color: '#f9a8d4',
      },
    },
    hyper: {
      name: 'Overwatch', charge: 4200,
      super: { onArrive: { emit: 'lob', count: 6, pattern: 'cluster', patternSize: 84, damage: 820, aoe: 92, speed: 700, range: 10, radius: 10 } },
    },
  },
  {
    id: 'shade', name: 'Shade', cls: 'assassin', art: 'shade',
    color: '#7c3aed', skin: '#dbe4ef', hair: '#1e1b4b',
    blurb: 'Attacks by dashing through you with the shovel.',
    tip: 'You have no ranged option. Pick your moment, then commit.',
    hp: 5400, speed: 240, radius: 18, ammo: 3, reload: 1.35, superCharge: 3000,
    attack: { emit: 'dash', distance: 235, speed: 1000, damage: 800, cooldown: 0.42, range: 235 },
    super: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.7, damage: 500,
      speed: 640, range: 350, radius: 11, pierce: true, lifesteal: 0.5,
    },
    gadget: {
      name: 'Full Circle', icon: 'spin',
      blurb: 'One spin of the shovel that catches everyone around you.',
      spec: { emit: 'melee', arc: 6.283, reach: 128, damage: 760, lifesteal: 0.4, color: '#7c3aed' },
    },
    hyper: { name: 'Night Feed', charge: 4000, super: { count: 8, damage: 600, lifesteal: 0.7 } },
  },
  {
    id: 'thorn', name: 'Thorn', cls: 'damage', art: 'thorn',
    color: '#22c55e', skin: '#4ade80', hair: '#15803d',
    blurb: 'Cactus grenade that bursts into spikes flying every which way.',
    tip: 'The shards do the real damage — land it on top of them.',
    hp: 3600, speed: 218, radius: 16, ammo: 3, reload: 1.45, superCharge: 3300,
    attack: {
      emit: 'projectiles', count: 1, damage: 330, speed: 680, range: 350, radius: 8,
      cooldown: 0.38, splitOnHit: true,
      splitOnEnd: { count: 6, damage: 320, speed: 560, range: 155, radius: 6 },
    },
    super: {
      emit: 'area', range: 430, radius: 135, dps: 600, slow: 0.55, duration: 3.4,
      damage: 340, color: '#22c55e',
    },
    gadget: {
      name: 'Pincushion', icon: 'star',
      blurb: 'Fires spines out in every direction at once.',
      spec: {
        emit: 'projectiles', count: 12, pattern: 'fan', spread: 6.283, damage: 300,
        speed: 580, range: 215, radius: 6, color: '#22c55e',
      },
    },
    hyper: {
      name: 'Bramble Burst', charge: 4000,
      super: { radius: 180, dps: 800, slow: 0.4, duration: 4.2 },
    },
  },
  {
    id: 'angler', name: 'Angler', cls: 'assassin', art: 'angler',
    color: '#38bdf8', skin: '#e8c9a5', hair: '#0f172a',
    blurb: 'Tap to swing the rod. Hold to wind up a hook that reels you in.',
    tip: 'Hold the attack to charge. A full charge vaults you clean over a wall.',
    hp: 5600, speed: 236, radius: 17, ammo: 3, reload: 1.3, superCharge: 3000,
    trait: 'chargeHook',
    /* Tap: a wide arc that banks a fish on every hit. */
    attack: { emit: 'melee', arc: 1.6, reach: 145, damage: 710, cooldown: 0.36, catchFish: true },
    /* Hold and release: the hook. Latches onto a brawler or a wall and pulls
     * Nori to it; at full charge he goes straight over the wall. */
    hook: {
      emit: 'projectiles', damage: 460, speed: 1250, range: 430, minRange: 190,
      radius: 8, cooldown: 0.5, hookPull: true, catchFish: true, color: '#7dd3fc',
    },
    super: {
      emit: 'delayedArea', range: 330, radius: 112, delay: 1.0, damage: 950,
      perFish: { radius: 15, damage: 190 }, maxFish: 6, color: '#38bdf8',
    },
    gadget: {
      name: 'Slip Away', icon: 'ghost',
      blurb: 'Ducks out of sight long enough to reset the fight.',
      spec: { emit: 'self', heal: 1500, invis: 2.4, haste: { duration: 2.4, mult: 1.2 }, color: '#38bdf8' },
    },
    hyper: { name: 'Deep Haul', charge: 4000, super: { delay: 0.8, damage: 1300, radius: 150 } },
  },
  {
    id: 'ronin', name: 'Ronin', cls: 'assassin', art: 'ronin',
    color: '#e11d48', skin: '#f0c9a4', hair: '#1f2937',
    blurb: 'Alternates a dash and a wide slash, and heals off everything he hits.',
    tip: 'Odd swings dash you in, even swings cut wide. Learn the rhythm.',
    hp: 6300, speed: 236, radius: 18, ammo: 3, reload: 1.35, superCharge: 3100,
    trait: 'lifesteal',
    /* Every other swing is a dash through them, then a wide katana arc. */
    attack: {
      emit: 'alternate',
      parts: [
        { emit: 'dash', distance: 205, speed: 1020, damage: 600, cooldown: 0.4, range: 205 },
        { emit: 'melee', arc: 1.9, reach: 136, damage: 960, cooldown: 0.4 },
      ],
    },
    /* Slashimi: a fish goes up, and an X comes down where it lands. */
    super: {
      emit: 'delayedArea', range: 430, radius: 132, delay: 0.85, damage: 880,
      centerMult: 2, shape: 'x', color: '#e11d48',
    },
    gadget: {
      name: 'Second Wind', icon: 'wind',
      blurb: 'A breath back and a burst of speed to spend it on.',
      spec: { emit: 'self', heal: 1500, haste: { duration: 2.6, mult: 1.35 }, color: '#e11d48' },
    },
    hyper: { name: 'Crosscut', charge: 4000, super: { radius: 172, damage: 1150, delay: 0.7 } },
  },
  {
    id: 'sledge', name: 'Sledge', cls: 'tank', art: 'sledge',
    color: '#84cc16', skin: '#9fb47a', hair: '#3f2a1a',
    blurb: 'Winds up, then flattens a whole arc with the hammer.',
    tip: 'The swing lands a beat after you start it — swing where they will be.',
    hp: 9400, speed: 212, radius: 21, ammo: 1, reload: 1.85, superCharge: 4200,
    attack: {
      emit: 'melee', arc: 1.3, reach: 190, damage: 1180, cooldown: 0.95, windup: 0.5,
      breakWalls: true,
    },
    super: {
      emit: 'melee', arc: 1.75, reach: 230, damage: 900, stun: 1.9, cooldown: 0.5,
      windup: 0.35, breakWalls: true,
    },
    gadget: {
      name: 'Magnet Head', icon: 'magnet',
      blurb: 'Drags everyone within reach into hammer range.',
      aimed: true,
      spec: { emit: 'pull', range: 170, radius: 230, strength: 340, duration: 0.9, color: '#84cc16' },
    },
    hyper: { name: 'Groundbreak', charge: 5000, super: { reach: 285, damage: 1250, stun: 2.5 } },
  },
];

const BRAWLER_BY_ID = {};
for (const b of BRAWLERS) BRAWLER_BY_ID[b.id] = b;

/* Longest reach of a kit, whatever shape it takes — used by the bots. */
function specRange(spec) {
  if (!spec) return 0;
  if (spec.emit === 'alternate') return Math.max(...spec.parts.map(specRange));
  if (spec.emit === 'melee') return spec.reach || 90;
  if (spec.emit === 'dash') return spec.distance || spec.range || 200;
  if (spec.emit === 'leap') return spec.range || 300;
  if (spec.emit === 'beam') return spec.range || 300;
  if (spec.emit === 'self') return spec.teamRadius || 60;
  if (spec.emit === 'multi') return Math.max(...spec.parts.map(specRange));
  return spec.range || 300;
}
