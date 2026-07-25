# Scrap Stars

A 3v3 top-down arena brawler that runs in the browser. No build step, no
dependencies, no assets — every sprite, sound and effect is generated in code.
Open `index.html` and play.

**107 brawlers**, each with their own attack, Super and Hypercharge.

## The mode

Gem Grab. A mine in the middle of the arena spits out a gem every few seconds.
Hold **10 gems as a team** and a **15-second countdown** starts — survive it and
you win. Kill a carrier and every gem they hold spills onto the floor, so a lead
is never safe. Matches also end at 3:00, highest count wins.

## Controls

| | |
|---|---|
| `W` `A` `S` `D` | move |
| Mouse | aim · click to shoot |
| `Space` / right-click | Super |
| `Q` / middle-click | Hypercharge |
| `P` pause · `M` mute | |

### On a phone

Landscape, twin-stick, laid out like the mobile game it's paying homage to:

- **Left thumb** — floating move stick, appears wherever you press.
- **Right thumb** — attack stick. **Drag to aim, release to fire.** A cone
  shows direct fire; throwers get a landing circle instead. A bare tap
  auto-aims at the nearest target you can see.
- **Super** — big disc in the corner; the gold ring around it fills as the
  Super charges and glows when it's ready.
- **Hypercharge** — smaller disc beside it with its own orange ring.
- Ammo sits under your own nameplate, one segment per shot.

Portrait shows a rotate prompt — the game is landscape only.

## What's in it

- **107 brawlers** across seven rarity tiers, filterable and searchable in the
  picker, each with a stat line and a plain-English breakdown of its kit.
- **Kits that behave like the originals.** Shelly fans a shotgun cone, Colt
  walks a line of six bullets, Rico ricochets off walls, Piper hits harder the
  further the shot travels, Carl's pickaxe flies out and comes back (and he
  can't fire until it does), Belle's bolt chains between targets, Spike's cactus
  bursts into spikes, Squeak's blob sticks then splits, Nori swings a fishing
  rod and banks a fish for every hit to grow his Super, Meeple's d20 lets the
  whole team shoot through walls, Najia's snakes chase you down and keep biting.
- **Supers and Hypercharges.** Every brawler has both. A Hypercharge fills only
  once the Super is already up, then grants the usual speed/damage/shield
  package for a few seconds *and* upgrades that brawler's Super while it lasts.
- **Bots that actually play the mode.** They path with a BFS flow field, lead
  their shots, strafe at their preferred range, hide in bushes, hunt the gem
  carrier, escort their own carrier when ahead, and abandon the mine entirely to
  break a countdown when they're locked out.
- Destructible crates, bushes that hide you, knockback, poison, slow, stun,
  shields, invisibility, turrets and pets, temporary walls, and a camera that
  keeps the arena in frame.
- Nameplates carry the hit points inside the bar and draw above the foliage, so
  a brawler sitting in a bush is still readable. Everyone stands on a team ring.

## Running it

Any static host, or just open the file:

```
open index.html            # file:// works — everything is a classic script
python3 -m http.server 8000   # or serve it, if you prefer
```

## How it's put together

```
index.html          markup + menus
css/style.css       styling
js/config.js        tuning constants, palette, helpers
js/map.js           arena generation, collision, line of sight, flow fields
js/abilities.js     the ability engine — turns kit data into things happening
js/entities.js      brawlers, projectiles, lobs, beams, summons, gems
js/roster.js        brawler data — Starting → Epic
js/roster2.js       brawler data — Mythic → Ultra Legendary
js/roster3.js       brawler data — the rest, including the 2025/26 intake
js/ai.js            bot perception, targeting, navigation
js/input.js         keyboard, mouse and touch
js/render.js        all drawing, world and HUD
js/game.js          match state and the simulation loop
js/ui.js            brawler picker and result screen
```

Kits are **data, not code**. A brawler describes what it does with an `emit`
kind plus rider effects, and the ability engine does the rest:

```js
{
  id: 'rico', name: 'Rico', rarity: 'superrare', cls: 'damage',
  attack: {
    emit: 'projectiles', count: 5, pattern: 'stream', interval: 0.06,
    damage: 300, speed: 860, range: 460, bounce: 4,
  },
  super: { /* … */ },
  hyper: { name: 'Trick Shot', super: { count: 12, bounce: 8 } },
}
```

Emitters: `projectiles`, `lob`, `melee`, `beam`, `dash`, `leap`, `summon`,
`self`, `area`, `pull`, `walls`, `teleport`, `delayedArea`, `random`, `multi`.
Rider effects any damaging spec can carry: `pierce`, `bounce`, `returns`,
`homing`, `chain`, `sticky`, `splitOnEnd`, `scale`, `knockback`, `stun`,
`slow`, `poison`, `lifesteal`, `healAllies`, `ignoreWalls`, `breakWalls`.

Adding a brawler means adding one object. No engine changes.

### One thing worth knowing

Bots decide and act in **two separate passes** over the roster. When they did
both in a single pass, bots later in the array aimed at positions already
updated that frame while earlier ones aimed at stale ones — a free accuracy
edge that handed the trailing team roughly a **3:1 win rate** on a provably
symmetric map. Splitting the phases took kills across 36 test matches to
505–500. The pass order also alternates each frame so neither side is
permanently first to a contested gem.

## Accuracy notes

This is a fan project and a homage, built from scratch. It contains no assets,
code or data from the original game.

- **Stats are tuned for this engine.** Health and damage numbers are balanced
  for how this game plays, not copied from live balance tables — those change
  every patch.
- **Kits are modelled on behaviour.** Most brawlers play the way they do in the
  original. Where I couldn't verify a kit from a source, the entry is marked
  `derived: true` and shows a `~` in the picker — those are built from the
  brawler's class rather than presented as accurate. 36 of 107 are flagged this
  way, mostly the 2025/26 intake and a few Supers with mechanics this engine
  doesn't model (mind control, revives, mode-switching).
- Corrections welcome — a fix is usually a few lines of data.

Brawl Stars is a trademark of Supercell. This project is not affiliated with,
endorsed by, or connected to Supercell in any way.

## Licence

MIT — see [LICENSE](LICENSE).
