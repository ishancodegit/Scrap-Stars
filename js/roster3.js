/*
 * The roster, part 3 — the rest of the line-up, including the 2025/26 intake.
 *
 * Kits here were checked against write-ups of each brawler rather than guessed:
 * Lumi's maces come back to her, Najia's snakes chase and poison, Ollie
 * hypnotises on landing, Gigi spins up and blinks to a target, Meeple's pawns
 * home and the d20 lets the team shoot through walls, Pierce marks a group and
 * then homes in on them. The handful I could not find sources for are marked
 * `derived: true` and built from their class.
 */

BRAWLERS.push(

  {
    id: 'edgar', name: 'Edgar', rarity: 'epic', cls: 'assassin', icon: '🧣', color: '#f43f5e',
    blurb: 'Heals off every punch he lands, then jumps straight onto your marksman.',
    hp: 4400, speed: 220, radius: 17, ammo: 2, reload: 1.1, superCharge: 2200,
    attack: {
      emit: 'melee', hits: 2, interval: 0.11, arc: 0.9, reach: 100, damage: 420,
      cooldown: 0.38, lifesteal: 0.35,
    },
    super: {
      emit: 'leap', range: 460, speed: 820,
      onArrive: { emit: 'area', range: 0, radius: 70, damage: 200, duration: 0.1 },
    },
    hyper: { name: 'Hard Landing', charge: 3000, super: { range: 580, onArrive: { emit: 'area', range: 0, radius: 110, damage: 600, duration: 0.1, knockback: 200 } } },
  },
  {
    id: 'meeple', name: 'Meeple', rarity: 'epic', cls: 'controller', icon: '🎲', color: '#a78bfa',
    blurb: 'Pawns that steer themselves, and a d20 that lets the team shoot through walls.',
    hp: 4200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 2, pattern: 'fan', spread: 0.18, damage: 380, speed: 720,
      range: 420, radius: 7, cooldown: 0.4, homing: 1.4,
    },
    super: {
      emit: 'area', range: 260, radius: 180, duration: 6, teamPierceWalls: true,
      dps: 120, color: '#a78bfa',
    },
    hyper: { name: 'Natural 20', charge: 4300, derived: true, super: { radius: 240, duration: 8, dps: 220 } },
  },
  {
    id: 'ollie', name: 'Ollie', rarity: 'epic', cls: 'tank', icon: '🎧', color: '#c084fc',
    blurb: 'Narrow soundwave that skewers a line, then drops the beat and hypnotises everyone.',
    hp: 6800, speed: 200, radius: 19, ammo: 3, reload: 1.6, superCharge: 4200,
    attack: {
      emit: 'projectiles', count: 1, damage: 560, speed: 760, range: 400, radius: 11,
      cooldown: 0.42, pierce: true,
    },
    super: {
      emit: 'dash', distance: 320, speed: 780, damage: 500,
      onArrive: {
        emit: 'pull', range: 0, radius: 190, strength: 300, dps: 300,
        duration: 2.2, color: '#c084fc',
      },
    },
    hyper: { name: 'Drop the Beat', charge: 4800, derived: true, super: { distance: 420, damage: 700 } },
  },
  {
    id: 'gigi', name: 'Gigi', rarity: 'epic', cls: 'assassin', icon: '💃', color: '#fb7185',
    blurb: 'Spins herself up — faster, and dangerous to stand next to — then blinks onto a target.',
    hp: 4600, speed: 210, radius: 17, ammo: 3, reload: 1.5, superCharge: 3600,
    attack: {
      emit: 'multi',
      range: 120,
      parts: [
        { emit: 'melee', arc: 6.28, reach: 116, damage: 480, cooldown: 0.44 },
        { emit: 'self', haste: { mult: 1.3, duration: 1.2 } },
      ],
      cooldown: 0.44,
    },
    super: {
      emit: 'delayedArea', range: 420, radius: 120, delay: 0.7, damage: 1100, color: '#fb7185',
    },
    hyper: { name: 'Dizzy Spell', charge: 4200, derived: true, super: { radius: 160, damage: 1450, delay: 0.5 } },
  },
  {
    id: 'trunk', name: 'Trunk', rarity: 'epic', cls: 'tank', icon: '🧳', color: '#65a30d',
    blurb: 'Soaks punishment and turns it straight back into Super charge.',
    hp: 7800, speed: 196, radius: 20, ammo: 3, reload: 1.7, superCharge: 4200,
    trait: 'chargeFromDamage',
    attack: {
      emit: 'projectiles', count: 4, pattern: 'fan', spread: 0.44, damage: 340, speed: 700,
      range: 260, radius: 7, cooldown: 0.42,
    },
    super: {
      emit: 'area', range: 240, radius: 150, dps: 620, slow: 0.6, duration: 3.6, color: '#65a30d',
    },
    hyper: { name: 'Heavy Baggage', charge: 4800, derived: true, super: { radius: 200, dps: 820 } },
  },
  {
    id: 'bolt', name: 'Bolt', rarity: 'epic', cls: 'tank', icon: '🔌', color: '#38bdf8',
    blurb: 'Reloads at a crawl, but overdrive turns him into a shielded lightning trail.',
    hp: 7200, speed: 200, radius: 20, ammo: 2, reload: 2.4, superCharge: 4200,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.3, damage: 620, speed: 760,
      range: 340, radius: 8, cooldown: 0.5,
    },
    super: {
      emit: 'multi',
      parts: [
        { emit: 'self', shield: 3000, haste: { mult: 1.35, duration: 6 }, color: '#38bdf8' },
        { emit: 'area', range: 0, radius: 130, dps: 520, duration: 6, color: '#38bdf8' },
      ],
    },
    hyper: { name: 'Overdrive', charge: 4800, derived: true, super: {} },
  },
  {
    id: 'damian', name: 'Damian', rarity: 'mythic', cls: 'tank', icon: '🎸', color: '#dc2626',
    blurb: 'Charges his Super off the beating he takes, then lands and traps the lot of you.',
    hp: 7400, speed: 208, radius: 19, ammo: 3, reload: 1.35, superCharge: 4000,
    trait: 'chargeFromDamage',
    attack: { emit: 'melee', hits: 2, interval: 0.12, arc: 1.0, reach: 108, damage: 480, cooldown: 0.4 },
    super: {
      emit: 'leap', range: 440, speed: 700,
      onArrive: {
        emit: 'area', range: 0, radius: 180, damage: 700, duration: 2.4,
        dps: 260, slow: 0.35, color: '#dc2626',
      },
    },
    hyper: { name: 'Encore', charge: 4600, derived: true, super: { range: 560 } },
  },
  {
    id: 'finx', name: 'Finx', rarity: 'mythic', cls: 'controller', icon: '🌀', color: '#2dd4bf',
    blurb: 'Drops a field that speeds your shots up and drags theirs down.',
    hp: 4000, speed: 210, radius: 17, ammo: 3, reload: 1.35, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 620, speed: 860, range: 540, radius: 7, cooldown: 0.38,
    },
    super: {
      emit: 'area', range: 380, radius: 190, duration: 6, slow: 0.6, dps: 180,
      teamHasteField: true, color: '#2dd4bf',
    },
    hyper: { name: 'Time Dilation', charge: 4400, derived: true, super: { radius: 250, duration: 8, slow: 0.45 } },
  },
  {
    id: 'lumi', name: 'Lumi', rarity: 'mythic', cls: 'damage', icon: '🔨', color: '#facc15',
    blurb: 'Maces that fly out and come home, then three blasts, each bigger than the last.',
    hp: 4800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3900,
    attack: {
      emit: 'projectiles', count: 1, damage: 500, speed: 700, range: 360, radius: 10,
      cooldown: 0.42, returns: true, pierce: true,
    },
    super: {
      emit: 'multi',
      range: 460,
      parts: [
        { emit: 'delayedArea', range: 200, radius: 80, delay: 0.35, damage: 500, color: '#facc15' },
        { emit: 'delayedArea', range: 330, radius: 115, delay: 0.75, damage: 700, color: '#facc15' },
        { emit: 'delayedArea', range: 460, radius: 155, delay: 1.15, damage: 900, stun: 1.4, color: '#facc15' },
      ],
    },
    hyper: { name: 'Triple Strike', charge: 4400, derived: true, super: {} },
  },
  {
    id: 'mina', name: 'Mina', rarity: 'mythic', cls: 'assassin', icon: '👡', color: '#f472b6',
    blurb: 'Cycles her swings and slides along with them; the Super throws you into the air.',
    hp: 5000, speed: 214, radius: 18, ammo: 3, reload: 1.4, superCharge: 3700,
    attack: {
      emit: 'melee', arc: 1.4, reach: 118, damage: 520, cooldown: 0.4,
    },
    super: {
      emit: 'projectiles', count: 1, damage: 800, speed: 700, range: 420, radius: 20,
      pierce: true, knockback: 620, stun: 0.8,
    },
    hyper: { name: 'Whirlwind', charge: 4300, derived: true, super: { damage: 1050, knockback: 820, stun: 1.2 } },
  },
  {
    id: 'najia', name: 'Najia', rarity: 'mythic', cls: 'damage', icon: '🐍', color: '#84cc16',
    blurb: 'The jar goes through you; the snakes come after you and keep biting.',
    hp: 4200, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 460, speed: 780, range: 460, radius: 8,
      cooldown: 0.4, pierce: true, poison: { dps: 260, duration: 2 },
    },
    super: {
      emit: 'summon', kind: 'pet', count: 3, spread: 1.2, hp: 800, damage: 260, speed: 245,
      cooldown: 0.7, radius: 11, life: 16, placeRange: 90, range: 300,
      poison: { dps: 240, duration: 2 },
    },
    hyper: { name: 'Snake Pit', charge: 4400, derived: true, super: { count: 5, hp: 1100, damage: 340 } },
  },
  {
    id: 'pierce', name: 'Pierce', rarity: 'mythic', cls: 'marksman', icon: '🐚', color: '#22d3ee',
    blurb: 'Marks everyone in a radius, then the shots find them on their own.',
    hp: 3600, speed: 205, radius: 16, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 640, speed: 860, range: 520, radius: 7, cooldown: 0.4,
    },
    super: {
      emit: 'multi',
      range: 460,
      parts: [
        { emit: 'delayedArea', range: 400, radius: 150, delay: 0.6, damage: 300, reveal: 6, color: '#22d3ee' },
        { emit: 'projectiles', count: 6, pattern: 'stream', interval: 0.12, damage: 420, speed: 700, range: 560, radius: 7, homing: 3.2 },
      ],
    },
    hyper: { name: 'Target Lock', charge: 4400, derived: true, super: {} },
  },
  {
    id: 'ziggy', name: 'Ziggy', rarity: 'mythic', cls: 'controller', icon: '⚡', color: '#fde047',
    blurb: 'Calls lightning down on a spot, then sends a storm rolling across the map.',
    hp: 3800, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'lob', count: 1, damage: 620, aoe: 68, speed: 900, range: 500, radius: 9,
    },
    super: {
      emit: 'projectiles', count: 1, damage: 700, speed: 420, range: 620, radius: 34,
      pierce: true, ignoreWalls: true, slow: { mult: 0.55, duration: 2 },
    },
    hyper: { name: 'Thunderstorm', charge: 4400, derived: true, super: { damage: 950, radius: 46 } },
  },
  {
    id: 'jaeyong', name: 'Jae-yong', rarity: 'mythic', cls: 'support', icon: '🎏', color: '#38bdf8',
    blurb: 'Frontline support who keeps the squad standing.',
    hp: 5400, speed: 208, radius: 18, ammo: 3, reload: 1.45, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 480, speed: 720, range: 380, radius: 12,
      cooldown: 0.4, pierce: true, healAllies: true, heal: 480,
    },
    super: { emit: 'self', teamRadius: 320, teamHeal: 2000, teamShield: 1400, shield: 1400, color: '#38bdf8' },
    hyper: { name: 'Rally', charge: 4400, derived: true, super: { teamHeal: 2800, teamShield: 2200 } },
  },
  {
    id: 'wendy', name: 'Wendy', rarity: 'mythic', cls: 'support', icon: '🕯️', color: '#fbcfe8',
    blurb: 'Newest name on the sheet — mends allies and chips away at everyone else.',
    hp: 4400, speed: 208, radius: 17, ammo: 3, reload: 1.45, superCharge: 3700,
    attack: {
      emit: 'projectiles', count: 2, pattern: 'fan', spread: 0.2, damage: 380, speed: 760,
      range: 420, radius: 8, cooldown: 0.4, healAllies: true, heal: 380,
    },
    super: {
      emit: 'area', range: 340, radius: 160, heal: 560, dps: 320, duration: 4, color: '#fbcfe8',
    },
    hyper: { name: 'Candlelight', charge: 4300, derived: true, super: { radius: 210, heal: 760 } },
  },
  {
    id: 'kaze', name: 'Kaze', rarity: 'mythic', cls: 'assassin', icon: '🍥', color: '#f87171',
    blurb: 'Fast, close and gone again before you turn round.',
    hp: 4400, speed: 216, radius: 17, ammo: 3, reload: 1.35, superCharge: 3500,
    attack: {
      emit: 'projectiles', count: 3, pattern: 'fan', spread: 0.26, damage: 340, speed: 820,
      range: 360, radius: 6, cooldown: 0.36,
    },
    super: { emit: 'dash', distance: 400, speed: 950, damage: 700, throughWalls: true },
    hyper: { name: 'Gale Force', charge: 4100, derived: true, super: { distance: 520, damage: 950 } },
  },
  {
    id: 'starrnova', name: 'Starr Nova', rarity: 'ultra', cls: 'assassin', icon: '✨', color: '#e879f9',
    blurb: 'Two piercing sparkles, right then left — then she transforms mid-dash.',
    hp: 4800, speed: 212, radius: 17, ammo: 3, reload: 1.4, superCharge: 3600,
    attack: {
      emit: 'projectiles', count: 2, pattern: 'stream', interval: 0.12, damage: 460, speed: 840,
      range: 460, radius: 7, cooldown: 0.38, pierce: true,
    },
    super: { emit: 'dash', distance: 460, speed: 900, damage: 900, breakWalls: true, knockback: 240 },
    hyper: { name: 'Supernova', charge: 4200, derived: true, super: { distance: 600, damage: 1200 } },
  },
  {
    id: 'sirius', name: 'Sirius', rarity: 'ultra', cls: 'controller', icon: '🌟', color: '#818cf8',
    blurb: 'Collects shadows of everyone he fights, then sends the whole set out at once.',
    hp: 3400, speed: 205, radius: 17, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 520, speed: 840, range: 560, radius: 7,
      cooldown: 0.4, pierce: true,
    },
    super: {
      emit: 'summon', kind: 'pet', count: 4, spread: 1.8, hp: 1000, damage: 300, speed: 230,
      cooldown: 0.7, radius: 13, life: 18, placeRange: 90, range: 280, color: '#818cf8',
    },
    hyper: { name: 'Shadow Army', charge: 4400, derived: true, super: { count: 6, hp: 1400, damage: 380 } },
  },
  {
    id: 'buzzlightyear', name: 'Buzz Lightyear', rarity: 'legendary', cls: 'damage', icon: '🚀', color: '#7dd3fc',
    blurb: 'Laser blast that leaves you burning, and a five-shot frenzy to finish.',
    hp: 4800, speed: 205, radius: 18, ammo: 3, reload: 1.5, superCharge: 3800,
    attack: {
      emit: 'projectiles', count: 1, damage: 780, speed: 880, range: 480, radius: 8,
      cooldown: 0.4, poison: { dps: 240, duration: 2.4 },
    },
    super: {
      emit: 'projectiles', count: 5, pattern: 'stream', interval: 0.1, damage: 460, speed: 900,
      range: 500, radius: 8, poison: { dps: 240, duration: 2.4 },
    },
    hyper: { name: 'To Infinity', charge: 4400, derived: true, super: { count: 8, damage: 560 } },
  },
);

const BRAWLER_BY_ID_FINAL = {};
for (const b of BRAWLERS) BRAWLER_BY_ID_FINAL[b.id] = b;
Object.assign(BRAWLER_BY_ID, BRAWLER_BY_ID_FINAL);
