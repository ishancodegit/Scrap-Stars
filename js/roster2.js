/*
 * The roster, part 2 — Mythic, Legendary and Ultra Legendary.
 *
 * Same rules as part 1: kits mirror how the brawler actually plays, stats are
 * tuned for this engine. Entries carrying `derived: true` are ones whose real
 * kit I could not verify from a source; those are built from the brawler's
 * class and are flagged in the picker rather than presented as accurate.
 */

BRAWLERS.push(

  /* ---------------- Mythic ---------------- */
  {
    id: 'mortis', name: 'Mortis', rarity: 'mythic', cls: 'assassin', icon: '🦇', color: '#7c3aed',
    blurb: 'Attacks by dashing through you with the shovel.',
    hp: 5200, speed: 210, radius: 18, ammo: 3, reload: 1.7, superCharge: 3800,
    attack: { emit: 'dash', distance: 190, speed: 900, damage: 620, cooldown: 0.5, range: 190 },
    super: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.7, damage: 460, speed: 620,
      range: 340, radius: 10, pierce: true, lifesteal: 0.45,
    },
    hyper: { name: 'Vampire Bats', charge: 4400, super: { count: 8, damage: 560, lifesteal: 0.6 } },
  },
  {
    id: 'tara', name: 'Tara', rarity: 'mythic', cls: 'damage', icon: '🔮', color: '#a855f7',
    blurb: 'Three cards that skewer a whole line, then a black hole.',
    hp: 4400, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.16, damage: 380, speed: 780,
      range: 400, radius: 6, cooldown: 0.4, pierce: true,
    },
    super: {
      emit: 'pull', range: 420, radius: 180, strength: 700, dps: 500, duration: 1.6, color: '#a855f7',
    },
    hyper: { name: 'Event Horizon', charge: 4400, super: { radius: 240, strength: 900, dps: 700 } },
  },
  {
    id: 'gene', name: 'Gene', rarity: 'mythic', cls: 'controller', icon: '🧞', color: '#f472b6',
    blurb: 'Shot splits at the end of its flight, and that hand always finds someone.',
    hp: 4600, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 520, speed: 720, range: 420, radius: 8, cooldown: 0.42,
      splitOnEnd: { count: 5, damage: 260, speed: 520, range: 140, radius: 6 },
    },
    super: {
      emit: 'pull', projectile: true, damage: 300, speed: 900, range: 520, radius: 10,
      pullStrength: 900,
    },
    hyper: { name: 'Lamp Genie', charge: 4400, super: { damage: 500, pullStrength: 1200 } },
  },
  {
    id: 'max', name: 'Max', rarity: 'mythic', cls: 'support', icon: '⚡', color: '#fbbf24',
    blurb: 'Four-shot burst, and everyone runs faster when she says so.',
    hp: 4200, speed: 220, radius: 17, ammo: 3, reload: 1.4, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 4, pattern: 'stream', interval: 0.07, damage: 260, speed: 840,
      range: 400, radius: 5, cooldown: 0.34,
    },
    super: {
      emit: 'self', teamRadius: 320, haste: { mult: 1.4, duration: 4 },
      teamHaste: { mult: 1.4, duration: 4 }, color: '#fbbf24',
    },
    hyper: { name: 'Run n Gun', charge: 4200, super: { haste: { mult: 1.6, duration: 5 }, teamHaste: { mult: 1.6, duration: 5 } } },
  },
  {
    id: 'bibi', name: 'Bibi', rarity: 'mythic', cls: 'tank', icon: '⚾', color: '#f472b6',
    blurb: 'Swings for the fence — and the home run bar sends you flying.',
    hp: 6200, speed: 210, radius: 19, ammo: 3, reload: 1.5, superCharge: 4200,
    attack: { emit: 'melee', arc: 1.0, reach: 116, damage: 660, cooldown: 0.46, knockback: 120 },
    super: {
      emit: 'projectiles', count: 1, damage: 500, speed: 620, range: 460, radius: 14,
      bounce: 4, pierce: true, knockback: 460,
    },
    hyper: { name: 'Home Run', charge: 4800, super: { damage: 700, knockback: 620, bounce: 6 } },
  },
  {
    id: 'frank', name: 'Frank', rarity: 'mythic', cls: 'tank', icon: '🔨', color: '#a3e635',
    blurb: 'Slow wind-up, huge arc, and the Super leaves them standing still.',
    hp: 8600, speed: 195, radius: 21, ammo: 1, reload: 1.9, superCharge: 4600,
    attack: { emit: 'melee', arc: 1.3, reach: 170, damage: 1100, cooldown: 0.9 },
    super: {
      emit: 'melee', arc: 1.6, reach: 210, damage: 900, stun: 1.8, cooldown: 0.5, breakWalls: true,
    },
    hyper: { name: 'Shockwave', charge: 5200, super: { reach: 260, damage: 1200, stun: 2.4 } },
  },
  {
    id: 'pam', name: 'Pam', rarity: 'mythic', cls: 'support', icon: '🔩', color: '#f59e0b',
    blurb: 'Scrap scattergun, and a turret that patches the team up.',
    hp: 6000, speed: 200, radius: 18, ammo: 3, reload: 1.5, superCharge: 4000,
    attack: {
      emit: 'projectiles', count: 8, pattern: 'random', spread: 0.5, damage: 180, speed: 700,
      range: 400, radius: 5, cooldown: 0.42, speedJitter: true,
    },
    super: {
      emit: 'summon', kind: 'heal', hp: 3000, heal: 500, cooldown: 0.9, range: 260,
      radius: 17, life: 30, placeRange: 110,
    },
    hyper: { name: 'Mama\'s Hug', charge: 4600, super: { heal: 720, range: 320, hp: 4000 } },
  },
  {
    id: 'piper', name: 'Piper', rarity: 'mythic', cls: 'marksman', icon: '☂️', color: '#f9a8d4',
    blurb: 'The further the shot travels, the more it hurts.',
    hp: 3200, speed: 205, radius: 16, ammo: 3, reload: 1.6, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 1000, speed: 900, range: 600, radius: 6,
      cooldown: 0.4, scale: { near: 0.42, far: 1.15 },
    },
    super: {
      emit: 'leap', range: 380, speed: 620,
      onArrive: { emit: 'lob', count: 4, pattern: 'cluster', patternSize: 60, damage: 600, aoe: 70, speed: 700, range: 10, radius: 9 },
    },
    hyper: { name: 'Ambush', charge: 4400, super: { onArrive: { emit: 'lob', count: 6, pattern: 'cluster', patternSize: 80, damage: 800, aoe: 90, speed: 700, range: 10, radius: 10 } } },
  },
  {
    id: 'bonnie', name: 'Bonnie', rarity: 'mythic', cls: 'marksman', icon: '🎪', color: '#fb7185',
    blurb: 'Fires herself out of the cannon and brawls where she lands.',
    hp: 4200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 760, speed: 860, range: 540, radius: 8,
      cooldown: 0.42, aoe: 50,
    },
    super: {
      emit: 'leap', range: 480, speed: 800,
      onArrive: { emit: 'area', range: 0, radius: 120, damage: 800, duration: 0.1, knockback: 260 },
    },
    hyper: { name: 'Cannonball', charge: 4400, super: { range: 600, onArrive: { emit: 'area', range: 0, radius: 160, damage: 1100, duration: 0.1, knockback: 360 } } },
  },
  {
    id: 'mandy', name: 'Mandy', rarity: 'mythic', cls: 'marksman', icon: '🍬', color: '#fda4af',
    blurb: 'Stand still and the candy beam reaches clean across the map.',
    hp: 3400, speed: 205, radius: 16, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 700, speed: 900, range: 560, radius: 6, cooldown: 0.38,
    },
    super: { emit: 'beam', dps: 2600, range: 620, arc: 0.06, duration: 1.6, color: '#fda4af' },
    hyper: { name: 'Sweet Dreams', charge: 4400, super: { dps: 3400, duration: 2.2, arc: 0.1 } },
  },
  {
    id: 'stu', name: 'Stu', rarity: 'mythic', cls: 'assassin', icon: '🏎️', color: '#fb923c',
    blurb: 'Every Super is another dash — he never stops moving.',
    hp: 3600, speed: 215, radius: 17, ammo: 2, reload: 1.2, superCharge: 1800,
    attack: {
      emit: 'projectiles', count: 2, pattern: 'stream', interval: 0.1, damage: 380, speed: 800,
      range: 380, radius: 7, cooldown: 0.36,
    },
    super: { emit: 'dash', distance: 340, speed: 1000, damage: 300, throughWalls: false },
    hyper: { name: 'Nitro Boost', charge: 2600, super: { distance: 460, damage: 500 } },
  },
  {
    id: 'nani', name: 'Nani', rarity: 'mythic', cls: 'marksman', icon: '🛰️', color: '#38bdf8',
    blurb: 'Three shots that converge on one point, plus a guided drone.',
    hp: 3200, speed: 205, radius: 16, ammo: 3, reload: 1.6, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.1, damage: 440, speed: 860,
      range: 520, radius: 6, cooldown: 0.4,
    },
    super: {
      emit: 'projectiles', count: 1, damage: 1600, speed: 520, range: 620, radius: 12,
      homing: 2.6, aoe: 110, breakWalls: true,
    },
    hyper: { name: 'Peep Show', charge: 4400, super: { damage: 2100, aoe: 140, homing: 3.4 } },
  },
  {
    id: 'surge', name: 'Surge', rarity: 'mythic', cls: 'damage', icon: '🕹️', color: '#22d3ee',
    blurb: 'Shot splits on impact, and every Super upgrades him further.',
    hp: 4200, speed: 200, radius: 17, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 1, damage: 520, speed: 780, range: 420, radius: 7, cooldown: 0.4,
      splitOnEnd: { count: 2, damage: 320, speed: 640, range: 160, radius: 6 },
    },
    super: {
      emit: 'self', haste: { mult: 1.25, duration: 12 }, shield: 1200, heal: 800, color: '#22d3ee',
    },
    hyper: { name: 'Power Surge', charge: 4200, super: { shield: 2200, haste: { mult: 1.4, duration: 14 } } },
  },
  {
    id: 'colette', name: 'Colette', rarity: 'mythic', cls: 'damage', icon: '🎟️', color: '#f472b6',
    blurb: 'Takes a slice of your health bar, then runs straight through you.',
    hp: 4400, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 1, damage: 480, speed: 760, range: 440, radius: 9,
      cooldown: 0.4, pierce: true,
    },
    super: { emit: 'dash', distance: 460, speed: 820, damage: 900, throughWalls: false },
    hyper: { name: 'Ticket Rush', charge: 4200, super: { distance: 600, damage: 1200 } },
  },
  {
    id: 'eightbit', name: '8-Bit', rarity: 'mythic', cls: 'damage', icon: '🕹️', color: '#f59e0b',
    blurb: 'Slow, heavy laser volleys and a booster that buffs the whole team.',
    hp: 6000, speed: 190, radius: 19, ammo: 3, reload: 1.6, superCharge: 4200,
    attack: {
      emit: 'projectiles', count: 4, pattern: 'fan', spread: 0.2, damage: 340, speed: 760,
      range: 480, radius: 6, cooldown: 0.44,
    },
    super: {
      emit: 'summon', kind: 'heal', hp: 3200, heal: 260, cooldown: 1.2, range: 300,
      radius: 18, life: 40, placeRange: 100,
    },
    hyper: { name: 'Extra Life', charge: 4800, super: { heal: 400, range: 360, hp: 4200 } },
  },
  {
    id: 'grom', name: 'Grom', rarity: 'mythic', cls: 'artillery', icon: '💥', color: '#fb923c',
    blurb: 'Shrapnel cross that detonates exactly where he wants it.',
    hp: 3400, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'lob', count: 5, pattern: 'cross', patternSize: 46, damage: 380, aoe: 52,
      speed: 700, range: 480, radius: 7, breakWalls: true,
    },
    super: {
      emit: 'lob', count: 1, damage: 1300, aoe: 130, speed: 600, range: 500, radius: 13,
      breakWalls: true, knockback: 200,
    },
    hyper: { name: 'Watchtower', charge: 4400, super: { damage: 1700, aoe: 170 } },
  },
  {
    id: 'gale', name: 'Gale', rarity: 'mythic', cls: 'controller', icon: '❄️', color: '#7dd3fc',
    blurb: 'Snow spread that slows, and a gust that clears the whole lane.',
    hp: 4800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.46, damage: 240, speed: 720,
      range: 400, radius: 6, cooldown: 0.4, slow: { mult: 0.75, duration: 1.2 },
    },
    super: {
      emit: 'projectiles', count: 7, pattern: 'fan', spread: 0.5, damage: 300, speed: 900,
      range: 420, radius: 10, knockback: 560, pierce: true, stun: 0.4,
    },
    hyper: { name: 'Blustery Day', charge: 4400, super: { knockback: 780, damage: 420, stun: 0.7 } },
  },
  {
    id: 'meg', name: 'Meg', rarity: 'mythic', cls: 'tank', icon: '🤖', color: '#fbbf24',
    blurb: 'Fragile alone — then the mech shows up.',
    hp: 3400, speed: 210, radius: 17, ammo: 3, reload: 1.4, superCharge: 3200,
    attack: {
      emit: 'projectiles', count: 1, damage: 380, speed: 800, range: 400, radius: 6, cooldown: 0.34,
    },
    super: { emit: 'self', shield: 5200, haste: { mult: 1.1, duration: 14 }, heal: 1200, color: '#fbbf24' },
    hyper: { name: 'Mecha Overdrive', charge: 3800, super: { shield: 7000, heal: 2000 } },
  },
  {
    id: 'rt', name: 'R-T', rarity: 'mythic', cls: 'damage', icon: '📺', color: '#38bdf8',
    blurb: 'Marks a target so every follow-up bites twice as hard.',
    hp: 4200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 2, pattern: 'stream', interval: 0.09, damage: 380, speed: 820,
      range: 460, radius: 6, cooldown: 0.38,
    },
    super: {
      emit: 'summon', kind: 'turret', hp: 2600, damage: 420, range: 380, cooldown: 0.7,
      bulletSpeed: 780, radius: 16, life: 26, placeRange: 60,
      shot: { damage: 420, radius: 6, speed: 780 },
    },
    hyper: { name: 'Split Decision', charge: 4400, super: { hp: 3400, damage: 540 } },
  },
  {
    id: 'chuck', name: 'Chuck', rarity: 'mythic', cls: 'tank', icon: '🚂', color: '#f59e0b',
    blurb: 'Plants posts and rides between them, flattening anyone in the way.',
    hp: 5600, speed: 200, radius: 18, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 1, damage: 620, speed: 780, range: 380, radius: 8, cooldown: 0.42,
    },
    super: { emit: 'dash', distance: 520, speed: 900, damage: 900, knockback: 220, breakWalls: true },
    hyper: { name: 'Full Steam', charge: 4200, super: { distance: 700, damage: 1200 } },
  },
  {
    id: 'cordelius', name: 'Cordelius', rarity: 'mythic', cls: 'assassin', icon: '🍄', color: '#a78bfa',
    blurb: 'Drags one victim into the shadow realm for a private conversation.',
    hp: 4600, speed: 210, radius: 17, ammo: 3, reload: 1.4, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.28, damage: 380, speed: 760,
      range: 360, radius: 7, cooldown: 0.36,
    },
    super: {
      emit: 'projectiles', count: 1, damage: 500, speed: 820, range: 420, radius: 11,
      stun: 1.4, poison: { dps: 420, duration: 3 },
    },
    hyper: { name: 'Mushroom Cloud', charge: 4200, super: { stun: 2, poison: { dps: 560, duration: 4 } } },
  },
  {
    id: 'kit', name: 'Kit', rarity: 'mythic', cls: 'support', icon: '🐱', color: '#f9a8d4',
    blurb: 'Pounces onto whoever needs it — friend for a ride, enemy for a pin.',
    hp: 4600, speed: 215, radius: 16, ammo: 3, reload: 1.4, superCharge: 3400,
    attack: {
      emit: 'projectiles', count: 1, damage: 440, speed: 740, range: 360, radius: 9,
      cooldown: 0.4, healAllies: true, heal: 500,
    },
    super: {
      emit: 'leap', range: 400, speed: 800,
      onArrive: { emit: 'area', range: 0, radius: 90, damage: 700, duration: 0.1, stun: 1.2 },
    },
    hyper: { name: 'Cat Nap', charge: 4000, super: { range: 520, onArrive: { emit: 'area', range: 0, radius: 120, damage: 950, duration: 0.1, stun: 1.8 } } },
  },
  {
    id: 'hank', name: 'Hank', rarity: 'mythic', cls: 'tank', icon: '🎈', color: '#38bdf8',
    blurb: 'Charges up a bubble that pops for enormous area damage.',
    hp: 7400, speed: 200, radius: 20, ammo: 3, reload: 1.7, superCharge: 4400,
    attack: {
      emit: 'lob', count: 1, damage: 900, aoe: 96, speed: 520, range: 420, radius: 12,
    },
    super: {
      emit: 'projectiles', count: 6, pattern: 'fan', spread: 1.6, damage: 500, speed: 620,
      range: 300, radius: 10, knockback: 300,
    },
    hyper: { name: 'Barrage', charge: 5000, super: { count: 9, damage: 640, knockback: 420 } },
  },
  {
    id: 'maisie', name: 'Maisie', rarity: 'mythic', cls: 'marksman', icon: '🌊', color: '#38bdf8',
    blurb: 'Shockwave shots and a wave that shoves the whole team off her.',
    hp: 4000, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 660, speed: 820, range: 480, radius: 9,
      cooldown: 0.4, aoe: 46,
    },
    super: {
      emit: 'projectiles', count: 5, pattern: 'fan', spread: 0.6, damage: 500, speed: 760,
      range: 360, radius: 12, knockback: 480, pierce: true,
    },
    hyper: { name: 'Shockwave', charge: 4400, super: { count: 8, damage: 640, knockback: 620 } },
  },
  {
    id: 'tick', name: 'Tick', rarity: 'mythic', cls: 'artillery', icon: '💀', color: '#94a3b8',
    blurb: 'Three mines that crawl and pop, and a head that hunts you down.',
    hp: 2800, speed: 205, radius: 16, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'lob', count: 3, pattern: 'cluster', patternSize: 52, damage: 460, aoe: 62,
      speed: 640, range: 480, radius: 8,
    },
    super: {
      emit: 'projectiles', count: 1, damage: 1400, speed: 260, range: 560, radius: 14,
      homing: 2.2, aoe: 130, ignoreWalls: true,
    },
    hyper: { name: 'Headfirst', charge: 4200, super: { damage: 1800, aoe: 160, speed: 340 } },
  },

  /* ---------------- Legendary ---------------- */
  {
    id: 'spike', name: 'Spike', rarity: 'legendary', cls: 'damage', icon: '🌵', color: '#22c55e',
    blurb: 'Cactus grenade that bursts into spikes flying every which way.',
    hp: 3200, speed: 200, radius: 16, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 1, damage: 340, speed: 660, range: 340, radius: 8, cooldown: 0.4,
      splitOnHit: true,
      splitOnEnd: { count: 6, damage: 340, speed: 540, range: 150, radius: 6 },
    },
    super: {
      emit: 'area', range: 420, radius: 130, dps: 560, slow: 0.55, duration: 3.4,
      damage: 320, color: '#22c55e',
    },
    hyper: { name: 'Cactus Cannon', charge: 4200, super: { radius: 175, dps: 740, slow: 0.4, duration: 4.2 } },
  },
  {
    id: 'crow', name: 'Crow', rarity: 'legendary', cls: 'assassin', icon: '🐦‍⬛', color: '#6366f1',
    blurb: 'Poisoned daggers — the damage keeps ticking long after the hit.',
    hp: 3600, speed: 215, radius: 16, ammo: 3, reload: 1.4, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.24, damage: 300, speed: 800,
      range: 400, radius: 6, cooldown: 0.36, poison: { dps: 200, duration: 2.4 },
    },
    super: {
      emit: 'leap', range: 420, speed: 760,
      onArrive: { emit: 'area', range: 0, radius: 130, damage: 600, duration: 0.1, poison: { dps: 320, duration: 3 } },
    },
    hyper: { name: 'Carrion Crow', charge: 4200, super: { range: 520, onArrive: { emit: 'area', range: 0, radius: 170, damage: 800, duration: 0.1, poison: { dps: 460, duration: 4 } } } },
  },
  {
    id: 'leon', name: 'Leon', rarity: 'legendary', cls: 'assassin', icon: '🦎', color: '#4ade80',
    blurb: 'Four blades that hurt most point-blank, then he simply vanishes.',
    hp: 4200, speed: 215, radius: 17, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 4, pattern: 'fan', spread: 0.34, damage: 340, speed: 800,
      range: 420, radius: 6, cooldown: 0.38, scale: { near: 1.2, far: 0.6 },
    },
    super: { emit: 'self', invis: 6, haste: { mult: 1.2, duration: 6 }, color: '#4ade80' },
    hyper: { name: 'Smoke Bomb', charge: 4200, super: { invis: 8, haste: { mult: 1.35, duration: 8 } } },
  },
  {
    id: 'sandy', name: 'Sandy', rarity: 'legendary', cls: 'controller', icon: '😴', color: '#fcd34d',
    blurb: 'Kicks up a sandstorm that hides the entire team.',
    hp: 4800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 460, speed: 740, range: 420, radius: 12,
      cooldown: 0.4, pierce: true,
    },
    super: {
      emit: 'multi',
      parts: [
        { emit: 'self', invis: 5.5, teamRadius: 260, color: '#fcd34d' },
        { emit: 'area', range: 0, radius: 200, dps: 260, duration: 5.5, color: '#fcd34d' },
      ],
    },
    hyper: {
      name: 'Sandstorm', charge: 4400, derived: true,
      super: {
        emit: 'multi',
        parts: [
          { emit: 'self', invis: 7.5, teamRadius: 340, color: '#fcd34d' },
          { emit: 'area', range: 0, radius: 260, dps: 380, duration: 7.5, slow: 0.7, color: '#fcd34d' },
        ],
      },
    },
  },
  {
    id: 'amber', name: 'Amber', rarity: 'legendary', cls: 'controller', icon: '🔥', color: '#f97316',
    blurb: 'Holds down a stream of fire, then floods the ground with fuel.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.2, superCharge: 3600,
    attack: { emit: 'beam', dps: 1500, range: 360, arc: 0.14, duration: 0.35, color: '#f97316' },
    super: {
      emit: 'area', range: 380, radius: 150, dps: 800, duration: 4, damage: 300, color: '#f97316',
    },
    hyper: { name: 'Firestarter', charge: 4200, super: { radius: 200, dps: 1050, duration: 5 } },
  },
  {
    id: 'nori', name: 'Nori', rarity: 'legendary', cls: 'assassin', icon: '🎣', color: '#38bdf8',
    blurb: 'Swings the rod in a wide arc, and every hit lands a fish — the more fish, the bigger the catch.',
    hp: 4400, speed: 212, radius: 17, ammo: 3, reload: 1.45, superCharge: 3600,
    trait: 'fish',
    attack: {
      emit: 'melee', arc: 1.5, reach: 128, damage: 520, cooldown: 0.42, catchFish: true,
    },
    /* Dives into a puddle; a giant fish surfaces a beat later. Both the puddle
     * and the fish scale with how many fish have been caught. */
    super: {
      emit: 'delayedArea', range: 320, radius: 110, delay: 1.05, damage: 900,
      perFish: { radius: 14, damage: 170 }, maxFish: 6, color: '#38bdf8',
    },
    hyper: { name: 'Big Catch', charge: 4200, derived: true, super: { delay: 0.8, damage: 1250, radius: 145 } },
  },
  {
    id: 'lily', name: 'Lily', rarity: 'legendary', cls: 'assassin', icon: '🌸', color: '#c084fc',
    blurb: 'Steps into the shadows and comes out behind you.',
    hp: 4000, speed: 215, radius: 17, ammo: 3, reload: 1.4, superCharge: 3400,
    attack: { emit: 'melee', hits: 2, interval: 0.12, arc: 1.0, reach: 104, damage: 480, cooldown: 0.4 },
    super: { emit: 'teleport', range: 420, invis: 2.4 },
    hyper: { name: 'Shadow Realm', charge: 4000, derived: true, super: { range: 560, invis: 3.4 } },
  },
  {
    id: 'melodie', name: 'Melodie', rarity: 'legendary', cls: 'assassin', icon: '🎵', color: '#f472b6',
    blurb: 'Notes orbit her and fly off at whoever gets close.',
    hp: 4200, speed: 215, radius: 17, ammo: 3, reload: 1.35, superCharge: 3400,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.3, damage: 340, speed: 820,
      range: 340, radius: 7, cooldown: 0.34,
    },
    super: {
      emit: 'summon', kind: 'pet', count: 3, spread: 1.6, hp: 700, damage: 280, speed: 250,
      cooldown: 0.6, radius: 10, life: 16, placeRange: 60, range: 240,
    },
    hyper: { name: 'Crescendo', charge: 4000, derived: true, super: { count: 5, damage: 360 } },
  },
  {
    id: 'angelo', name: 'Angelo', rarity: 'legendary', cls: 'marksman', icon: '🏹', color: '#a3e635',
    blurb: 'Draws the bow for a poisoned arrow that carries across the map.',
    hp: 3200, speed: 205, radius: 16, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 1, damage: 620, speed: 940, range: 620, radius: 6, cooldown: 0.4,
      poison: { dps: 240, duration: 2.4 },
    },
    super: {
      emit: 'area', range: 520, radius: 140, dps: 620, duration: 3.4, damage: 400, color: '#a3e635',
    },
    hyper: { name: 'Toxic Tide', charge: 4200, derived: true, super: { radius: 185, dps: 820 } },
  },
  {
    id: 'draco', name: 'Draco', rarity: 'legendary', cls: 'tank', icon: '🐉', color: '#ef4444',
    blurb: 'Switches into dragon form and stops being anyone\'s problem but yours.',
    hp: 6600, speed: 205, radius: 19, ammo: 3, reload: 1.5, superCharge: 4000,
    attack: { emit: 'melee', arc: 1.0, reach: 112, damage: 560, cooldown: 0.44 },
    super: {
      emit: 'multi',
      parts: [
        { emit: 'self', shield: 2600, haste: { mult: 1.25, duration: 8 }, color: '#ef4444' },
        { emit: 'area', range: 0, radius: 140, damage: 700, duration: 0.1 },
      ],
    },
    hyper: { name: 'Dragon Form', charge: 4600, derived: true, super: {} },
  },
  {
    id: 'kenji', name: 'Kenji', rarity: 'legendary', cls: 'assassin', icon: '🍜', color: '#fbbf24',
    blurb: 'Dashes through the line and comes out the other side healthier.',
    hp: 5000, speed: 212, radius: 18, ammo: 3, reload: 1.45, superCharge: 3600,
    attack: { emit: 'melee', arc: 1.2, reach: 126, damage: 560, cooldown: 0.44 },
    super: { emit: 'dash', distance: 380, speed: 880, damage: 800, lifesteal: 0.5 },
    hyper: { name: 'Noodle Master', charge: 4200, derived: true, super: { distance: 480, damage: 1050, lifesteal: 0.7 } },
  },
  {
    id: 'shade', name: 'Shade', rarity: 'legendary', cls: 'assassin', icon: '👤', color: '#818cf8',
    blurb: 'Slips through walls as a shadow and reappears in your back line.',
    hp: 4200, speed: 215, radius: 17, ammo: 3, reload: 1.4, superCharge: 3400,
    attack: { emit: 'melee', arc: 1.1, reach: 110, damage: 460, cooldown: 0.4 },
    super: { emit: 'dash', distance: 420, speed: 900, damage: 500, throughWalls: true },
    hyper: { name: 'Spooked', charge: 4000, derived: true, super: { distance: 560, damage: 700 } },
  },
  {
    id: 'moe', name: 'Moe', rarity: 'legendary', cls: 'damage', icon: '🐀', color: '#a16207',
    blurb: 'Spits rocks, then tunnels in on a drill.',
    hp: 4800, speed: 205, radius: 18, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.3, damage: 360, speed: 760,
      range: 420, radius: 7, cooldown: 0.4,
    },
    super: { emit: 'dash', distance: 460, speed: 820, damage: 800, breakWalls: true, knockback: 240 },
    hyper: { name: 'Drill Bit', charge: 4400, derived: true, super: { distance: 600, damage: 1050 } },
  },
  {
    id: 'clancy', name: 'Clancy', rarity: 'legendary', cls: 'damage', icon: '🎫', color: '#fb923c',
    blurb: 'Every hit tickets him up a level, and the volleys get nastier.',
    hp: 4400, speed: 205, radius: 17, ammo: 3, reload: 1.4, superCharge: 3400,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'stream', interval: 0.07, damage: 340, speed: 840,
      range: 460, radius: 6, cooldown: 0.36,
    },
    super: {
      emit: 'projectiles', count: 8, pattern: 'stream', interval: 0.05, damage: 380, speed: 900,
      range: 500, radius: 7, pierce: true,
    },
    hyper: { name: 'Ticket Master', charge: 4000, derived: true, super: { count: 12, damage: 460 } },
  },
  {
    id: 'berry', name: 'Berry', rarity: 'legendary', cls: 'support', icon: '🍨', color: '#f9a8d4',
    blurb: 'Leaves sundae puddles that top the team up while they stand in them.',
    hp: 4600, speed: 205, radius: 17, ammo: 3, reload: 1.45, superCharge: 3600,
    attack: {
      emit: 'lob', count: 1, damage: 420, aoe: 66, speed: 620, range: 400, radius: 9,
      puddle: { dps: 0, heal: 340, duration: 3.2, radius: 70 },
    },
    super: {
      emit: 'area', range: 300, radius: 160, heal: 620, dps: 200, duration: 4.2, color: '#f9a8d4',
    },
    hyper: { name: 'Sweet Relief', charge: 4200, derived: true, super: { radius: 210, heal: 820 } },
  },
  {
    id: 'larry', name: 'Larry & Lawrie', rarity: 'legendary', cls: 'artillery', icon: '👮', color: '#60a5fa',
    blurb: 'Lobs from the desk, then calls his brother in for backup.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'lob', count: 3, pattern: 'line', patternSize: 44, damage: 380, aoe: 56,
      speed: 660, range: 460, radius: 8,
    },
    super: {
      emit: 'summon', kind: 'turret', hp: 3000, damage: 420, range: 340, cooldown: 0.65,
      bulletSpeed: 720, radius: 16, life: 26, placeRange: 120,
      shot: { damage: 420, radius: 6, speed: 720 },
    },
    hyper: { name: 'Backup', charge: 4400, derived: true, super: { hp: 4000, damage: 540 } },
  },
  {
    id: 'juju', name: 'Juju', rarity: 'legendary', cls: 'artillery', icon: '🪆', color: '#a3e635',
    blurb: 'Her attack changes with the ground she is standing on.',
    hp: 4200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'lob', count: 1, damage: 620, aoe: 72, speed: 640, range: 440, radius: 9,
    },
    super: {
      emit: 'summon', kind: 'turret', hp: 2400, damage: 380, range: 320, cooldown: 0.8,
      bulletSpeed: 680, radius: 15, life: 24, placeRange: 120,
      shot: { damage: 380, radius: 7, speed: 680 },
    },
    hyper: { name: 'Totem Rage', charge: 4400, derived: true, super: { hp: 3200, damage: 500 } },
  },
  {
    id: 'glowy', name: 'Glowy', rarity: 'legendary', cls: 'support', icon: '🫧', color: '#67e8f9',
    blurb: 'A long glow beam that burns enemies and mends allies at the same time.',
    hp: 4000, speed: 205, radius: 17, ammo: 3, reload: 1.45, superCharge: 3600,
    attack: {
      emit: 'beam', dps: 900, heal: 700, healAllies: true, range: 420, arc: 0.1,
      duration: 0.4, color: '#67e8f9',
    },
    /* Reveals its face in a wide cone: light damage, and the targets scatter. */
    super: {
      emit: 'projectiles', count: 9, pattern: 'fan', spread: 1.5, damage: 260, speed: 700,
      range: 320, radius: 10, pierce: true, knockback: 380, slow: { mult: 0.6, duration: 2 },
    },
    hyper: { name: 'Full Beam', charge: 4200, derived: true, super: { count: 13, damage: 360, knockback: 520 } },
  },
  {
    id: 'alli', name: 'Alli', rarity: 'legendary', cls: 'assassin', icon: '🐊', color: '#16a34a',
    blurb: 'Attacks by lunging forward, and speeds up when she smells blood.',
    hp: 5400, speed: 210, radius: 18, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: { emit: 'dash', distance: 180, speed: 880, damage: 620, cooldown: 0.5, range: 180 },
    super: {
      emit: 'leap', range: 420, speed: 780,
      onArrive: { emit: 'area', range: 0, radius: 120, damage: 900, duration: 0.1, knockback: 220 },
    },
    hyper: { name: 'Death Roll', charge: 4200, derived: true, super: { range: 540, onArrive: { emit: 'area', range: 0, radius: 160, damage: 1200, duration: 0.1, knockback: 320 } } },
  },
);

const BRAWLER_BY_ID = {};
for (const b of BRAWLERS) BRAWLER_BY_ID[b.id] = b;

/* Longest reach of a kit, whatever shape it takes — used by the bots. */
function specRange(spec) {
  if (!spec) return 0;
  if (spec.emit === 'melee') return spec.reach || 90;
  if (spec.emit === 'dash') return spec.distance || spec.range || 200;
  if (spec.emit === 'leap') return spec.range || 300;
  if (spec.emit === 'beam') return spec.range || 300;
  if (spec.emit === 'self') return spec.teamRadius || 60;
  if (spec.emit === 'multi') return Math.max(...spec.parts.map(specRange));
  return spec.range || 300;
}
