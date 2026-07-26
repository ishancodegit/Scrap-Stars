/*
 * Skins and the Recruit Track.
 *
 * A skin is a palette swap, not a separate sprite: the art in sprites.js is
 * driven entirely by `color`, `skin` and `hair` on the brawler def, so a skin
 * is just those three fields plus a name, applied by cloning the def. That
 * keeps every brawler's animation, kit and hitbox identical to the default —
 * a skin can never change how a fight plays out.
 *
 * The Recruit Track is the unlock path. Fighters cost credits, which drop from
 * Prize Pods, and it is walked in order so there is always exactly one next
 * thing to save for.
 */

/* Skins per brawler. The first entry is always the default and costs nothing. */
const SKINS = {
  buckshot: [
    { id: 'default', name: 'Buckshot' },
    { id: 'star', name: 'Solar Buckshot', color: '#facc15', skin: '#f0c3a0', hair: '#7c2d12', rarity: 'epic' },
    { id: 'void', name: 'Void Buckshot', color: '#4c1d95', skin: '#c9b6d8', hair: '#1e1b4b', rarity: 'mythic' },
  ],
  sixer: [
    { id: 'default', name: 'Sixer' },
    { id: 'gold', name: 'Gilded Sixer', color: '#eab308', skin: '#e8b892', hair: '#4a2c0a', rarity: 'epic' },
    { id: 'midnight', name: 'Midnight Sixer', color: '#1e293b', skin: '#b58a63', hair: '#0f172a', rarity: 'mythic' },
  ],
  ramrod: [
    { id: 'default', name: 'Ramrod' },
    { id: 'chrome', name: 'Chrome Ramrod', color: '#94a3b8', skin: '#cbd5e1', hair: '#475569', rarity: 'epic' },
  ],
  haymaker: [
    { id: 'default', name: 'Haymaker' },
    { id: 'jade', name: 'Jade Haymaker', color: '#10b981', skin: '#d9a06a', hair: '#064e3b', rarity: 'epic' },
    { id: 'inferno', name: 'Inferno Haymaker', color: '#dc2626', skin: '#f0a882', hair: '#450a0a', rarity: 'legendary' },
  ],
  carom: [
    { id: 'default', name: 'Carom' },
    { id: 'neon', name: 'Neon Carom', color: '#22d3ee', skin: '#e2e8f0', hair: '#0e7490', rarity: 'epic' },
  ],
  tonic: [
    { id: 'default', name: 'Tonic' },
    { id: 'copper', name: 'Copper Tonic', color: '#b45309', skin: '#94a3b8', hair: '#78350f', rarity: 'epic' },
  ],
  chorus: [
    { id: 'default', name: 'Chorus' },
    { id: 'mariachi', name: 'Maestro Chorus', color: '#7c3aed', skin: '#f5f5f4', hair: '#2e1065', rarity: 'epic' },
  ],
  longshot: [
    { id: 'default', name: 'Longshot' },
    { id: 'noir', name: 'Noir Longshot', color: '#334155', skin: '#e8c4a0', hair: '#1e293b', rarity: 'epic' },
    { id: 'bloom', name: 'Bloom Longshot', color: '#f472b6', skin: '#f7d7bd', hair: '#be185d', rarity: 'mythic' },
  ],
  shade: [
    { id: 'default', name: 'Shade' },
    { id: 'plague', name: 'Plague Shade', color: '#166534', skin: '#d6d3d1', hair: '#052e16', rarity: 'mythic' },
  ],
  thorn: [
    { id: 'default', name: 'Thorn' },
    { id: 'sakura', name: 'Blossom Thorn', color: '#fb7185', skin: '#fce7f3', hair: '#9d174d', rarity: 'legendary' },
  ],
  angler: [
    { id: 'default', name: 'Angler' },
    { id: 'tide', name: 'Tide Angler', color: '#0ea5e9', skin: '#e0f2fe', hair: '#075985', rarity: 'mythic' },
  ],
  ronin: [
    { id: 'default', name: 'Ronin' },
    { id: 'oni', name: 'Oni Ronin', color: '#b91c1c', skin: '#e8c4a0', hair: '#450a0a', rarity: 'legendary' },
  ],
  sledge: [
    { id: 'default', name: 'Sledge' },
    { id: 'rust', name: 'Rust Sledge', color: '#78350f', skin: '#a8a29e', hair: '#292524', rarity: 'epic' },
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
 * The Recruit Track. The first fighter is free so there is always something to play; every
 * other brawler costs credits, rising along the track so later unlocks feel
 * earned rather than handed over.
 */
const ROAD_ORDER = ['buckshot', 'sixer', 'ramrod', 'chorus', 'tonic', 'carom', 'haymaker',
  'longshot', 'sledge', 'shade', 'thorn', 'angler', 'ronin'];

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
