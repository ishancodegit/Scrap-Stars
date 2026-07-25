/*
 * The roster, part 1 — Starting through Epic.
 *
 * Each kit is described with the ability vocabulary in abilities.js so the
 * brawler plays the way it does in the real game: Shelly fans a shotgun cone,
 * Colt walks a line of bullets, Rico ricochets off walls, Carl's pickaxe comes
 * back to him, Belle's bolt chains between targets.
 *
 * Stat values are tuned for this engine, not copied from live balance tables.
 * `hyper.derived: true` marks a Hypercharge whose real in-game effect I could
 * not verify — those upgrade the Super in the obvious direction instead.
 */

const BRAWLERS = [

  /* ---------------- Starting ---------------- */
  {
    id: 'shelly', name: 'Shelly', rarity: 'starting', cls: 'damage', icon: '🐚', color: '#f43f5e',
    blurb: 'Shotgun cone that shreds anything that gets close.',
    hp: 5600, speed: 200, radius: 17, ammo: 3, reload: 1.55, superCharge: 4200,
    attack: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.42, damage: 340,
      speed: 780, range: 330, radius: 6, cooldown: 0.35, speedJitter: true,
    },
    super: {
      emit: 'projectiles', count: 9, pattern: 'fan', spread: 0.62, damage: 480,
      speed: 820, range: 400, radius: 8, knockback: 280, breakWalls: true, speedJitter: true,
    },
    hyper: { name: 'Clam Slam', charge: 5000, super: { count: 11, damage: 540, knockback: 420 } },
  },

  /* ---------------- Rare ---------------- */
  {
    id: 'nita', name: 'Nita', rarity: 'rare', cls: 'damage', icon: '🐻', color: '#f59e0b',
    blurb: 'Shockwave that punches through, and a bear that hunts for her.',
    hp: 5200, speed: 200, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 620, speed: 700, range: 330,
      radius: 14, cooldown: 0.4, pierce: true,
    },
    super: {
      emit: 'summon', kind: 'pet', hp: 4200, damage: 640, speed: 190, cooldown: 0.7,
      radius: 20, life: 24, placeRange: 90, range: 300,
    },
    hyper: { name: 'Overbearing', charge: 4400, super: { hp: 5600, damage: 820, speed: 230 } },
  },
  {
    id: 'colt', name: 'Colt', rarity: 'rare', cls: 'damage', icon: '🔫', color: '#3b82f6',
    blurb: 'Walks a straight line of six bullets down the lane.',
    hp: 3600, speed: 205, radius: 16, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 6, pattern: 'stream', interval: 0.055, damage: 300,
      speed: 900, range: 500, radius: 5, cooldown: 0.36, jitter: 0.012,
    },
    super: {
      emit: 'projectiles', count: 10, pattern: 'stream', interval: 0.05, damage: 320,
      speed: 950, range: 540, radius: 6, breakWalls: true,
    },
    hyper: { name: 'Silver Bullet', charge: 4300, super: { count: 12, damage: 380, pierce: true } },
  },
  {
    id: 'bull', name: 'Bull', rarity: 'rare', cls: 'tank', icon: '🐂', color: '#ef4444',
    blurb: 'Point-blank double barrel, then charges straight through the wall.',
    hp: 7000, speed: 198, radius: 20, ammo: 3, reload: 1.6, superCharge: 4600,
    attack: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.38, damage: 400,
      speed: 720, range: 240, radius: 7, cooldown: 0.38, speedJitter: true,
    },
    super: {
      emit: 'dash', distance: 420, speed: 760, damage: 1000, knockback: 300,
      breakWalls: true, stun: 0.25,
    },
    hyper: { name: 'Full Throttle', charge: 5200, super: { distance: 520, damage: 1300, knockback: 420 } },
  },
  {
    id: 'jessie', name: 'Jessie', rarity: 'rare', cls: 'controller', icon: '🔧', color: '#22d3ee',
    blurb: 'Energy orb that arcs from target to target, plus a scrappy turret.',
    hp: 4400, speed: 200, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 560, speed: 760, range: 380, radius: 8,
      cooldown: 0.4, chain: { count: 2, range: 190 },
    },
    super: {
      emit: 'summon', kind: 'turret', hp: 3600, damage: 380, range: 300, cooldown: 0.55,
      bulletSpeed: 700, radius: 17, life: 30, placeRange: 130,
      shot: { damage: 380, radius: 6, speed: 700 },
    },
    hyper: { name: 'Shocker', charge: 4300, super: { hp: 4600, damage: 520, cooldown: 0.38 } },
  },
  {
    id: 'brock', name: 'Brock', rarity: 'rare', cls: 'marksman', icon: '🚀', color: '#f97316',
    blurb: 'Long single rocket, then a rain of them on one spot.',
    hp: 3400, speed: 205, radius: 16, ammo: 3, reload: 1.6, superCharge: 4000,
    attack: {
      emit: 'projectiles', count: 1, damage: 900, speed: 820, range: 560, radius: 8,
      cooldown: 0.36, aoe: 56, breakWalls: true,
    },
    super: {
      emit: 'lob', count: 5, pattern: 'cluster', patternSize: 70, damage: 700, aoe: 78,
      speed: 620, range: 560, radius: 10, breakWalls: true,
    },
    hyper: { name: 'Rocket Fuel', charge: 4500, super: { count: 7, damage: 820, patternSize: 90 } },
  },
  {
    id: 'dynamike', name: 'Dynamike', rarity: 'rare', cls: 'artillery', icon: '🧨', color: '#facc15',
    blurb: 'Two sticks of dynamite over the wall, then the big barrel.',
    hp: 3600, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'lob', count: 2, pattern: 'cluster', patternSize: 42, damage: 520, aoe: 66,
      speed: 620, range: 420, radius: 9, breakWalls: true,
    },
    super: {
      emit: 'lob', count: 1, damage: 1400, aoe: 120, speed: 520, range: 460,
      radius: 14, knockback: 340, breakWalls: true,
    },
    hyper: { name: 'Big Bang', charge: 4400, super: { damage: 1800, aoe: 150, knockback: 460 } },
  },
  {
    id: 'bo', name: 'Bo', rarity: 'rare', cls: 'controller', icon: '🏹', color: '#16a34a',
    blurb: 'Three exploding arrows, and mines that stun whoever walks in.',
    hp: 4600, speed: 205, radius: 17, ammo: 3, reload: 1.6, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.34, damage: 460,
      speed: 740, range: 400, radius: 7, cooldown: 0.4,
    },
    super: {
      emit: 'summon', kind: 'mine', count: 3, spread: 1.1, hp: 1, damage: 800, aoe: 96,
      trigger: 58, radius: 13, life: 40, placeRange: 150, stun: 1.2,
    },
    hyper: { name: 'Tripwire', charge: 4400, super: { damage: 1000, aoe: 120, stun: 1.6 } },
  },
  {
    id: 'elprimo', name: 'El Primo', rarity: 'rare', cls: 'tank', icon: '🤼', color: '#dc2626',
    blurb: 'Four-punch combo, then an elbow drop from orbit.',
    hp: 7600, speed: 205, radius: 20, ammo: 3, reload: 1.5, superCharge: 4400,
    attack: {
      emit: 'melee', hits: 4, interval: 0.11, arc: 0.9, reach: 96, damage: 380, cooldown: 0.5,
    },
    super: {
      emit: 'leap', range: 420, speed: 620,
      onArrive: { emit: 'area', range: 0, radius: 110, damage: 1100, duration: 0.1, knockback: 220 },
    },
    hyper: { name: 'Asteroid Belt', charge: 5000, super: { onArrive: { emit: 'area', range: 0, radius: 140, damage: 1500, duration: 0.1, knockback: 320 } } },
  },

  /* ---------------- Super Rare ---------------- */
  {
    id: 'barley', name: 'Barley', rarity: 'superrare', cls: 'artillery', icon: '🍾', color: '#f59e0b',
    blurb: 'Bottles that pool into burning ground and deny the lane.',
    hp: 3600, speed: 205, radius: 17, ammo: 3, reload: 1.55, superCharge: 3800,
    attack: {
      emit: 'lob', count: 1, damage: 380, aoe: 74, speed: 600, range: 420, radius: 9,
      puddle: { dps: 420, duration: 2.4, radius: 74 },
    },
    super: {
      emit: 'lob', count: 4, pattern: 'spread', spread: 0.7, patternSize: 80, damage: 380,
      aoe: 74, speed: 600, range: 440, radius: 9,
      puddle: { dps: 460, duration: 3, radius: 78 },
    },
    hyper: { name: 'Last Call', charge: 4300, super: { count: 6, puddle: { dps: 560, duration: 3.6, radius: 86 } } },
  },
  {
    id: 'poco', name: 'Poco', rarity: 'superrare', cls: 'support', icon: '🎸', color: '#f472b6',
    blurb: 'Sound waves that pass through everyone, and a chorus that heals the team.',
    hp: 5200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 1, damage: 460, speed: 660, range: 380, radius: 24,
      cooldown: 0.4, pierce: true,
    },
    super: {
      emit: 'self', teamRadius: 320, teamHeal: 2200, heal: 2200, color: '#f472b6',
    },
    hyper: { name: 'Encore', charge: 4400, super: { teamRadius: 400, teamHeal: 3000, heal: 3000 } },
  },
  {
    id: 'rosa', name: 'Rosa', rarity: 'superrare', cls: 'tank', icon: '🥊', color: '#22c55e',
    blurb: 'Three quick jabs, then a shield that laughs off chip damage.',
    hp: 6400, speed: 200, radius: 19, ammo: 3, reload: 1.5, superCharge: 4200,
    attack: { emit: 'melee', hits: 3, interval: 0.12, arc: 0.8, reach: 100, damage: 420, cooldown: 0.5 },
    super: { emit: 'self', shield: 3200, haste: { mult: 1.1, duration: 4 }, color: '#22c55e' },
    hyper: { name: 'Thorn Guard', charge: 4800, super: { shield: 4400, haste: { mult: 1.25, duration: 5 } } },
  },
  {
    id: 'rico', name: 'Rico', rarity: 'superrare', cls: 'damage', icon: '🎱', color: '#a78bfa',
    blurb: 'Bullets that ricochet off walls and punish anyone hiding behind them.',
    hp: 3600, speed: 205, radius: 16, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 5, pattern: 'stream', interval: 0.06, damage: 300,
      speed: 860, range: 460, radius: 5, cooldown: 0.36, bounce: 4,
    },
    super: {
      emit: 'projectiles', count: 9, pattern: 'stream', interval: 0.055, damage: 340,
      speed: 900, range: 520, radius: 6, bounce: 6,
    },
    hyper: { name: 'Trick Shot', charge: 4400, super: { count: 12, damage: 400, bounce: 8 } },
  },
  {
    id: 'darryl', name: 'Darryl', rarity: 'superrare', cls: 'tank', icon: '🛢️', color: '#f97316',
    blurb: 'Twin barrels up close and a barrel roll that bounces off walls.',
    hp: 6600, speed: 200, radius: 19, ammo: 3, reload: 1.5, superCharge: 4200,
    attack: {
      emit: 'projectiles', count: 6, pattern: 'fan', spread: 0.44, damage: 300,
      speed: 740, range: 260, radius: 6, cooldown: 0.36, speedJitter: true,
    },
    super: { emit: 'dash', distance: 380, speed: 820, damage: 700, knockback: 260, breakWalls: true },
    hyper: { name: 'Rolling Thunder', charge: 4800, super: { distance: 480, damage: 900, knockback: 380 } },
  },
  {
    id: 'penny', name: 'Penny', rarity: 'superrare', cls: 'artillery', icon: '💰', color: '#eab308',
    blurb: 'Coin pouch that sprays shrapnel behind whoever it hits.',
    hp: 4400, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 560, speed: 740, range: 400, radius: 8, cooldown: 0.4,
      splitOnEnd: { count: 3, damage: 300, speed: 520, range: 130, radius: 6 },
    },
    super: {
      emit: 'summon', kind: 'turret', hp: 2800, damage: 640, range: 420, cooldown: 1.5,
      bulletSpeed: 560, radius: 18, life: 30, placeRange: 140,
      shot: { damage: 640, radius: 9, speed: 560, aoe: 70, ignoreWalls: true },
    },
    hyper: { name: 'Cannon Barrage', charge: 4400, super: { damage: 820, cooldown: 1.1 } },
  },
  {
    id: 'carl', name: 'Carl', rarity: 'superrare', cls: 'damage', icon: '⛏️', color: '#06b6d4',
    blurb: 'Pickaxe that flies out and comes back — he cannot fire until it does.',
    hp: 5200, speed: 200, radius: 18, ammo: 1, reload: 0.1, superCharge: 4000,
    attack: {
      emit: 'projectiles', count: 1, damage: 460, speed: 700, range: 340, radius: 9,
      cooldown: 0.1, returns: true, pierce: true, refillOnCatch: true,
    },
    super: {
      emit: 'dash', distance: 300, speed: 380, damage: 420,
      onArrive: { emit: 'area', range: 0, radius: 100, damage: 300, duration: 0.1 },
    },
    hyper: { name: 'Tailspin', charge: 4500, super: { distance: 420, damage: 560 } },
  },
  {
    id: 'jacky', name: 'Jacky', rarity: 'superrare', cls: 'tank', icon: '🚧', color: '#fbbf24',
    blurb: 'Drills everything in a ring around her, then yanks them all in.',
    hp: 6200, speed: 205, radius: 19, ammo: 3, reload: 1.5, superCharge: 4200,
    attack: { emit: 'melee', arc: 6.28, reach: 118, damage: 620, cooldown: 0.45, breakWalls: true },
    super: {
      emit: 'pull', range: 60, radius: 170, strength: 420, dps: 600, duration: 1.2, color: '#fbbf24',
    },
    hyper: { name: 'Hardware Rush', charge: 4800, super: { radius: 220, strength: 560, dps: 800 } },
  },
  {
    id: 'gus', name: 'Gus', rarity: 'superrare', cls: 'support', icon: '👻', color: '#c4b5fd',
    blurb: 'Wobbly ghost shots, and a bubble that soaks a hit for a friend.',
    hp: 4200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 520, speed: 640, range: 380, radius: 10,
      cooldown: 0.4, pierce: true,
    },
    super: { emit: 'self', teamRadius: 300, teamShield: 2400, shield: 1600, color: '#c4b5fd' },
    hyper: { name: 'Spirit Shield', charge: 4300, super: { teamShield: 3400, shield: 2400 } },
  },

  /* ---------------- Epic ---------------- */
  {
    id: 'bea', name: 'Bea', rarity: 'epic', cls: 'marksman', icon: '🐝', color: '#facc15',
    blurb: 'Small sting, but the follow-up shot hits like a truck.',
    hp: 3200, speed: 205, radius: 16, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 1, damage: 480, speed: 900, range: 520, radius: 6,
      cooldown: 0.36, chargeOnHit: true,
    },
    super: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.5, damage: 420, speed: 700,
      range: 400, radius: 8, slow: { mult: 0.6, duration: 2.4 },
    },
    hyper: { name: 'Hive Mind', charge: 4200, super: { count: 8, damage: 520, slow: { mult: 0.45, duration: 3 } } },
  },
  {
    id: 'emz', name: 'Emz', rarity: 'epic', cls: 'controller', icon: '💅', color: '#e879f9',
    blurb: 'Hairspray cone that lingers and drags everyone down to her pace.',
    hp: 5400, speed: 205, radius: 17, ammo: 3, reload: 1.6, superCharge: 4000,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.36, damage: 360, speed: 620,
      range: 340, radius: 12, cooldown: 0.42, pierce: true, slow: { mult: 0.7, duration: 1.4 },
    },
    super: {
      emit: 'area', range: 40, radius: 190, dps: 620, slow: 0.6, duration: 3.4, color: '#e879f9',
    },
    hyper: { name: 'Bad Karma', charge: 4500, super: { radius: 240, dps: 800, duration: 4.2 } },
  },
  {
    id: 'mrp', name: 'Mr. P', rarity: 'epic', cls: 'controller', icon: '🧳', color: '#60a5fa',
    blurb: 'Suitcase that bounces and bursts, backed by an endless porter queue.',
    hp: 4200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 520, speed: 700, range: 420, radius: 8,
      cooldown: 0.4, bounce: 2,
      splitOnEnd: { count: 4, damage: 260, speed: 480, range: 110, radius: 5 },
    },
    super: {
      emit: 'summon', kind: 'turret', hp: 2200, damage: 380, range: 280, cooldown: 0.9,
      bulletSpeed: 640, radius: 15, life: 40, placeRange: 120,
      shot: { damage: 380, radius: 6, speed: 640 },
    },
    hyper: { name: 'Home Delivery', charge: 4300, super: { count: 2, hp: 2800, damage: 460 } },
  },
  {
    id: 'sprout', name: 'Sprout', rarity: 'epic', cls: 'artillery', icon: '🌱', color: '#4ade80',
    blurb: 'Bouncing seed bomb, and a hedge that cuts the map in half.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'lob', count: 1, damage: 700, aoe: 76, speed: 600, range: 440, radius: 9, breakWalls: true,
    },
    super: { emit: 'walls', range: 400, length: 5, duration: 9 },
    hyper: { name: 'Overgrowth', charge: 4300, super: { length: 7, duration: 12 } },
  },
  {
    id: 'byron', name: 'Byron', rarity: 'epic', cls: 'support', icon: '💉', color: '#a3e635',
    blurb: 'One dart: poison for them, medicine for you.',
    hp: 3400, speed: 205, radius: 16, ammo: 3, reload: 1.6, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 260, speed: 800, range: 520, radius: 6, cooldown: 0.4,
      pierce: true, healAllies: true, heal: 460, poison: { dps: 340, duration: 2.4 },
    },
    super: {
      emit: 'area', range: 460, radius: 120, dps: 420, heal: 400, duration: 3.2, color: '#a3e635',
    },
    hyper: { name: 'Malaise', charge: 4300, super: { radius: 160, dps: 560, heal: 560, duration: 4 } },
  },
  {
    id: 'squeak', name: 'Squeak', rarity: 'epic', cls: 'controller', icon: '🫧', color: '#c084fc',
    blurb: 'Sticky blob that clings on, then bursts into shards.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 420, speed: 620, range: 380, radius: 9,
      cooldown: 0.42, sticky: 0.6, aoe: 68,
      splitOnEnd: { count: 4, damage: 220, speed: 460, range: 110, radius: 5 },
    },
    super: {
      emit: 'projectiles', count: 1, damage: 700, speed: 560, range: 420, radius: 13,
      sticky: 0.7, aoe: 100,
      splitOnEnd: { count: 7, damage: 340, speed: 500, range: 160, radius: 6 },
    },
    hyper: { name: 'Chain Reaction', charge: 4300, super: { damage: 900, aoe: 130, splitOnEnd: { count: 10, damage: 420, speed: 520, range: 190, radius: 7 } } },
  },
  {
    id: 'lou', name: 'Lou', rarity: 'epic', cls: 'controller', icon: '🍦', color: '#7dd3fc',
    blurb: 'Slush cone that chills targets solid.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.45, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.22, damage: 300, speed: 780,
      range: 420, radius: 6, cooldown: 0.36, slow: { mult: 0.7, duration: 1.6 },
    },
    super: {
      emit: 'area', range: 400, radius: 150, dps: 300, slow: 0.4, duration: 3.6, color: '#7dd3fc',
    },
    hyper: { name: 'Cold Snap', charge: 4300, super: { radius: 190, dps: 420, slow: 0.3, duration: 4.4 } },
  },
  {
    id: 'ruffs', name: 'Colonel Ruffs', rarity: 'epic', cls: 'support', icon: '🎖️', color: '#fbbf24',
    blurb: 'Laser that splits in two at range, plus supply drops for the squad.',
    hp: 4000, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 460, speed: 800, range: 460, radius: 6, cooldown: 0.4,
      splitOnEnd: { count: 2, damage: 300, speed: 700, range: 150, radius: 5 },
    },
    super: { emit: 'self', teamRadius: 320, teamShield: 2000, shield: 2000, teamHaste: { mult: 1.15, duration: 6 }, color: '#fbbf24' },
    hyper: { name: 'Air Support', charge: 4300, super: { teamShield: 3000, shield: 3000 } },
  },
  {
    id: 'belle', name: 'Belle', rarity: 'epic', cls: 'marksman', icon: '⚡', color: '#38bdf8',
    blurb: 'Bolt that hops from one target to the next.',
    hp: 3400, speed: 205, radius: 16, ammo: 3, reload: 1.6, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 640, speed: 820, range: 540, radius: 7,
      cooldown: 0.42, chain: { count: 2, range: 220 },
    },
    super: {
      emit: 'projectiles', count: 1, damage: 400, speed: 860, range: 560, radius: 8,
      pierce: true, reveal: 8, slow: { mult: 0.75, duration: 4 },
    },
    hyper: { name: 'Nest Egg', charge: 4300, super: { damage: 620, chain: { count: 3, range: 240 } } },
  },
  {
    id: 'buzz', name: 'Buzz', rarity: 'epic', cls: 'assassin', icon: '🛟', color: '#fb923c',
    blurb: 'Lifeguard torpedo — buoy out, stun in.',
    hp: 5400, speed: 210, radius: 18, ammo: 3, reload: 1.4, superCharge: 3800,
    attack: { emit: 'melee', arc: 1.1, reach: 112, damage: 620, cooldown: 0.42 },
    super: {
      emit: 'dash', distance: 300, speed: 900, damage: 800, stun: 1.1, breakWalls: false,
    },
    hyper: { name: 'Torpedo', charge: 4300, super: { distance: 400, damage: 1000, stun: 1.5 } },
  },
  {
    id: 'griff', name: 'Griff', rarity: 'epic', cls: 'controller', icon: '🪙', color: '#fcd34d',
    blurb: 'Throws the till at you — three rows of coins.',
    hp: 4600, speed: 205, radius: 17, ammo: 3, reload: 1.55, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 9, pattern: 'fan', spread: 0.5, damage: 200, speed: 760,
      range: 360, radius: 5, cooldown: 0.4, speedJitter: true,
    },
    super: {
      emit: 'projectiles', count: 15, pattern: 'fan', spread: 0.72, damage: 240, speed: 800,
      range: 440, radius: 6, speedJitter: true, breakWalls: true,
    },
    hyper: { name: 'Cash Flow', charge: 4400, super: { count: 20, damage: 280 } },
  },
  {
    id: 'ash', name: 'Ash', rarity: 'epic', cls: 'tank', icon: '🗑️', color: '#84cc16',
    blurb: 'Angrier as he takes hits, and never short of rats.',
    hp: 7000, speed: 200, radius: 19, ammo: 3, reload: 1.6, superCharge: 4400,
    attack: { emit: 'melee', arc: 0.9, reach: 118, damage: 700, cooldown: 0.48 },
    super: {
      emit: 'summon', kind: 'pet', count: 3, spread: 1.4, hp: 1200, damage: 300, speed: 210,
      cooldown: 0.7, radius: 12, life: 20, placeRange: 80, range: 260,
    },
    hyper: { name: 'Rat Pack', charge: 5000, super: { count: 5, hp: 1600, damage: 380 } },
  },
  {
    id: 'lola', name: 'Lola', rarity: 'epic', cls: 'damage', icon: '🎭', color: '#f472b6',
    blurb: 'Star of the show, with a scene partner who copies her work.',
    hp: 4600, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 1, damage: 560, speed: 780, range: 440, radius: 8,
      cooldown: 0.4, pierce: true,
    },
    super: {
      emit: 'summon', kind: 'turret', hp: 3000, damage: 460, range: 380, cooldown: 0.7,
      bulletSpeed: 780, radius: 17, life: 26, placeRange: 130,
      shot: { damage: 460, radius: 7, speed: 780, pierce: true },
    },
    hyper: { name: 'Curtain Call', charge: 4400, super: { hp: 4000, damage: 600 } },
  },
  {
    id: 'fang', name: 'Fang', rarity: 'epic', cls: 'assassin', icon: '👟', color: '#ef4444',
    blurb: 'Roundhouse kicks, and a flying kick that resets on a kill.',
    hp: 5200, speed: 210, radius: 18, ammo: 3, reload: 1.45, superCharge: 3900,
    attack: { emit: 'melee', arc: 1.0, reach: 120, damage: 640, cooldown: 0.44 },
    super: {
      emit: 'leap', range: 360, speed: 700,
      onArrive: { emit: 'area', range: 0, radius: 130, damage: 1000, duration: 0.1, knockback: 200 },
    },
    hyper: { name: 'Roundhouse', charge: 4400, super: { range: 460, onArrive: { emit: 'area', range: 0, radius: 170, damage: 1300, duration: 0.1, knockback: 300 } } },
  },
  {
    id: 'eve', name: 'Eve', rarity: 'epic', cls: 'damage', icon: '👽', color: '#22d3ee',
    blurb: 'Energy that floats straight over walls, and hatchlings that chase.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 420, speed: 560, range: 400, radius: 9,
      cooldown: 0.42, ignoreWalls: true,
      splitOnEnd: { count: 3, damage: 240, speed: 460, range: 120, radius: 6, ignoreWalls: true },
    },
    super: {
      emit: 'summon', kind: 'pet', count: 2, spread: 1.0, hp: 900, damage: 260, speed: 230,
      cooldown: 0.8, radius: 11, life: 18, placeRange: 70, range: 240,
    },
    hyper: { name: 'Brood', charge: 4300, super: { count: 4, hp: 1200, damage: 320 } },
  },
  {
    id: 'janet', name: 'Janet', rarity: 'epic', cls: 'marksman', icon: '🎤', color: '#fbbf24',
    blurb: 'Cone that tightens with distance, then a bombing run from the rafters.',
    hp: 3600, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.3, damage: 340, speed: 820,
      range: 520, radius: 6, cooldown: 0.38,
    },
    super: {
      emit: 'area', range: 520, radius: 150, dps: 900, duration: 2.2, damage: 500, color: '#fbbf24',
    },
    hyper: { name: 'Drop the Bass', charge: 4400, super: { radius: 200, dps: 1200, damage: 700 } },
  },
  {
    id: 'otis', name: 'Otis', rarity: 'epic', cls: 'controller', icon: '🎨', color: '#818cf8',
    blurb: 'Ink that bounces round corners and gums up their guns.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 520, speed: 760, range: 440, radius: 8,
      cooldown: 0.4, bounce: 3,
    },
    super: {
      emit: 'projectiles', count: 1, damage: 300, speed: 800, range: 480, radius: 12,
      pierce: true, stun: 1.6,
    },
    hyper: { name: 'Silent Treatment', charge: 4300, super: { stun: 2.2, damage: 460 } },
  },
  {
    id: 'sam', name: 'Sam', rarity: 'epic', cls: 'assassin', icon: '🥊', color: '#f97316',
    blurb: 'Throws the knuckle busters out, then rips them back through everyone.',
    hp: 5600, speed: 210, radius: 18, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: { emit: 'melee', hits: 2, interval: 0.13, arc: 0.9, reach: 104, damage: 500, cooldown: 0.46 },
    super: {
      emit: 'pull', range: 320, radius: 150, strength: 460, dps: 700, duration: 1.2, color: '#f97316',
    },
    hyper: { name: 'Knuckle Buster', charge: 4400, super: { radius: 200, strength: 600, dps: 900 } },
  },
  {
    id: 'buster', name: 'Buster', rarity: 'epic', cls: 'tank', icon: '🎬', color: '#64748b',
    blurb: 'Projector cone up close, and a shield that eats incoming fire.',
    hp: 6800, speed: 200, radius: 19, ammo: 3, reload: 1.6, superCharge: 4300,
    attack: {
      emit: 'projectiles', count: 4, pattern: 'fan', spread: 0.4, damage: 340, speed: 700,
      range: 280, radius: 7, cooldown: 0.42,
    },
    super: { emit: 'self', shield: 3600, teamRadius: 200, teamShield: 1600, color: '#64748b' },
    hyper: { name: 'Blockbuster', charge: 4900, super: { shield: 5000, teamShield: 2400 } },
  },
  {
    id: 'gray', name: 'Gray', rarity: 'epic', cls: 'support', icon: '🎩', color: '#94a3b8',
    blurb: 'Gentlemanly cane shots and a portal out of trouble.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 2, pattern: 'stream', interval: 0.1, damage: 420, speed: 780,
      range: 460, radius: 7, cooldown: 0.4,
    },
    super: { emit: 'teleport', range: 420 },
    hyper: { name: 'Walking Stick', charge: 4300, super: { range: 560, invis: 1.4 } },
  },
  {
    id: 'mico', name: 'Mico', rarity: 'epic', cls: 'assassin', icon: '🐒', color: '#f59e0b',
    blurb: 'Never touches the ground — bounces from head to head.',
    hp: 4200, speed: 215, radius: 17, ammo: 3, reload: 1.4, superCharge: 3800,
    attack: { emit: 'melee', hits: 2, interval: 0.12, arc: 1.0, reach: 100, damage: 440, cooldown: 0.4 },
    super: {
      emit: 'leap', range: 460, speed: 780,
      onArrive: { emit: 'area', range: 0, radius: 100, damage: 700, duration: 0.1 },
    },
    hyper: { name: 'Monkey Business', charge: 4300, super: { range: 600, onArrive: { emit: 'area', range: 0, radius: 130, damage: 950, duration: 0.1 } } },
  },
  {
    id: 'charlie', name: 'Charlie', rarity: 'epic', cls: 'controller', icon: '🕷️', color: '#a855f7',
    blurb: 'Wraps whoever she catches in a cocoon and leaves them there.',
    hp: 4400, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 1, damage: 460, speed: 720, range: 420, radius: 8,
      cooldown: 0.42, slow: { mult: 0.7, duration: 1.6 },
    },
    super: {
      emit: 'projectiles', count: 1, damage: 300, speed: 700, range: 460, radius: 10, stun: 2.2,
    },
    hyper: { name: 'Spin a Web', charge: 4400, super: { stun: 3, damage: 500 } },
  },
  {
    id: 'pearl', name: 'Pearl', rarity: 'epic', cls: 'damage', icon: '🍪', color: '#fb923c',
    blurb: 'The longer she bakes, the more the tray hurts.',
    hp: 4400, speed: 205, radius: 17, ammo: 3, reload: 1.45, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 1, damage: 480, speed: 760, range: 380, radius: 8,
      cooldown: 0.38, aoe: 54,
    },
    super: {
      emit: 'area', range: 340, radius: 130, dps: 700, duration: 3, damage: 600, color: '#fb923c',
    },
    hyper: { name: 'Overbaked', charge: 4400, super: { radius: 170, dps: 900, damage: 800 } },
  },
  {
    id: 'willow', name: 'Willow', rarity: 'epic', cls: 'controller', icon: '🧙', color: '#8b5cf6',
    blurb: 'Curses you, then takes the wheel for a moment.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'lob', count: 1, damage: 620, aoe: 70, speed: 620, range: 420, radius: 9,
      slow: { mult: 0.7, duration: 1.8 },
    },
    /* Real Super mind-controls a target; here it roots and drains them instead. */
    super: {
      emit: 'projectiles', count: 1, damage: 500, speed: 700, range: 460, radius: 10,
      stun: 2.4, poison: { dps: 300, duration: 3 },
    },
    hyper: { name: 'Hex', charge: 4400, derived: true, super: { stun: 3.2, damage: 700 } },
  },
  {
    id: 'doug', name: 'Doug', rarity: 'epic', cls: 'support', icon: '🌭', color: '#f59e0b',
    blurb: 'Serves food that patches the team back up.',
    hp: 5600, speed: 200, radius: 18, ammo: 3, reload: 1.5, superCharge: 4000,
    attack: {
      emit: 'projectiles', count: 1, damage: 420, speed: 660, range: 360, radius: 12,
      cooldown: 0.42, pierce: true, healAllies: true, heal: 520,
    },
    /* Real Super revives a fallen ally; here it is a heavy team heal. */
    super: { emit: 'self', teamRadius: 340, teamHeal: 3000, heal: 2000, color: '#f59e0b' },
    hyper: { name: 'Second Helping', charge: 4500, derived: true, super: { teamHeal: 4200, teamRadius: 420 } },
  },
  {
    id: 'chester', name: 'Chester', rarity: 'epic', cls: 'damage', icon: '🃏', color: '#ec4899',
    blurb: 'Never the same twice — the Super rolls whatever it feels like.',
    hp: 4400, speed: 205, radius: 17, ammo: 3, reload: 1.4, superCharge: 3400,
    attack: {
      emit: 'projectiles', count: 2, pattern: 'stream', interval: 0.09, damage: 400, speed: 800,
      range: 400, radius: 7, cooldown: 0.36,
    },
    super: { emit: 'random', options: ['stun', 'poison', 'blast', 'heal'] },
    hyper: { name: 'Jackpot', charge: 4000, derived: true, super: { boosted: true } },
  },
];
