/*
 * Skins and the Starr Road.
 *
 * A skin is a palette swap, not a separate sprite: the art in sprites.js is
 * driven entirely by `color`, `skin` and `hair` on the brawler def, so a skin
 * is just those three fields plus a name, applied by cloning the def. That
 * keeps every brawler's animation, kit and hitbox identical to the default —
 * a skin can never change how a fight plays out.
 *
 * The Starr Road is the unlock track. Brawlers cost credits, which drop from
 * Starr Drops, and the road is walked in order so there is always exactly one
 * next thing to save for.
 */

/* Skins per brawler. The first entry is always the default and costs nothing. */
const SKINS = {
  shelly: [
    { id: 'default', name: 'Shelly' },
    { id: 'star', name: 'Star Shelly', color: '#facc15', skin: '#f0c3a0', hair: '#7c2d12', rarity: 'epic' },
    { id: 'void', name: 'Void Shelly', color: '#4c1d95', skin: '#c9b6d8', hair: '#1e1b4b', rarity: 'mythic' },
  ],
  colt: [
    { id: 'default', name: 'Colt' },
    { id: 'gold', name: 'Gold Colt', color: '#eab308', skin: '#e8b892', hair: '#4a2c0a', rarity: 'epic' },
    { id: 'midnight', name: 'Midnight Colt', color: '#1e293b', skin: '#b58a63', hair: '#0f172a', rarity: 'mythic' },
  ],
  bull: [
    { id: 'default', name: 'Bull' },
    { id: 'chrome', name: 'Chrome Bull', color: '#94a3b8', skin: '#cbd5e1', hair: '#475569', rarity: 'epic' },
  ],
  elprimo: [
    { id: 'default', name: 'El Primo' },
    { id: 'jade', name: 'El Jade', color: '#10b981', skin: '#d9a06a', hair: '#064e3b', rarity: 'epic' },
    { id: 'inferno', name: 'El Inferno', color: '#dc2626', skin: '#f0a882', hair: '#450a0a', rarity: 'legendary' },
  ],
  rico: [
    { id: 'default', name: 'Rico' },
    { id: 'neon', name: 'Neon Rico', color: '#22d3ee', skin: '#e2e8f0', hair: '#0e7490', rarity: 'epic' },
  ],
  barley: [
    { id: 'default', name: 'Barley' },
    { id: 'copper', name: 'Copper Barley', color: '#b45309', skin: '#94a3b8', hair: '#78350f', rarity: 'epic' },
  ],
  poco: [
    { id: 'default', name: 'Poco' },
    { id: 'mariachi', name: 'Mariachi Poco', color: '#7c3aed', skin: '#f5f5f4', hair: '#2e1065', rarity: 'epic' },
  ],
  piper: [
    { id: 'default', name: 'Piper' },
    { id: 'noir', name: 'Noir Piper', color: '#334155', skin: '#e8c4a0', hair: '#1e293b', rarity: 'epic' },
    { id: 'bloom', name: 'Bloom Piper', color: '#f472b6', skin: '#f7d7bd', hair: '#be185d', rarity: 'mythic' },
  ],
  mortis: [
    { id: 'default', name: 'Mortis' },
    { id: 'plague', name: 'Plague Mortis', color: '#166534', skin: '#d6d3d1', hair: '#052e16', rarity: 'mythic' },
  ],
  spike: [
    { id: 'default', name: 'Spike' },
    { id: 'sakura', name: 'Sakura Spike', color: '#fb7185', skin: '#fce7f3', hair: '#9d174d', rarity: 'legendary' },
  ],
  nori: [
    { id: 'default', name: 'Nori' },
    { id: 'tide', name: 'Tide Nori', color: '#0ea5e9', skin: '#e0f2fe', hair: '#075985', rarity: 'mythic' },
  ],
  kenji: [
    { id: 'default', name: 'Kenji' },
    { id: 'oni', name: 'Oni Kenji', color: '#b91c1c', skin: '#e8c4a0', hair: '#450a0a', rarity: 'legendary' },
  ],
  frank: [
    { id: 'default', name: 'Frank' },
    { id: 'rust', name: 'Rust Frank', color: '#78350f', skin: '#a8a29e', hair: '#292524', rarity: 'epic' },
  ],
};

function skinsFor(id) { return SKINS[id] || [{ id: 'default', name: (BRAWLER_BY_ID[id] || {}).name || id }]; }

function skinById(brawlerId, skinId) {
  return skinsFor(brawlerId).find((s) => s.id === skinId) || skinsFor(brawlerId)[0];
}

/*
 * A def wearing a skin. Returns the original object when the skin is the
 * default, so the common path allocates nothing.
 */
function skinnedDef(def, skinId) {
  if (!def || !skinId || skinId === 'default') return def;
  const s = skinById(def.id, skinId);
  if (!s || s.id === 'default') return def;
  return Object.assign({}, def, {
    color: s.color || def.color,
    skin: s.skin || def.skin,
    hair: s.hair || def.hair,
    skinName: s.name,
  });
}

/*
 * The Starr Road. Shelly is free so there is always something to play; every
 * other brawler costs credits, rising along the track so later unlocks feel
 * earned rather than handed over.
 */
const ROAD_ORDER = ['shelly', 'colt', 'bull', 'poco', 'barley', 'rico', 'elprimo',
  'piper', 'frank', 'mortis', 'spike', 'nori', 'kenji'];

function roadCost(index) {
  if (index <= 0) return 0;
  return [0, 30, 60, 100, 160, 240, 340, 460, 600, 780, 1000, 1300, 1700][index] || 1700;
}

/* Every brawler on the road, in order, with its cost and unlock state. */
function roadSteps() {
  return ROAD_ORDER.map((id, i) => ({
    id,
    def: BRAWLER_BY_ID[id],
    cost: roadCost(i),
    unlocked: Progress.isUnlocked(id),
  })).filter((s) => s.def);
}

/* The next brawler you can save toward, or null once the road is walked. */
function nextRoadStep() {
  return roadSteps().find((s) => !s.unlocked) || null;
}
