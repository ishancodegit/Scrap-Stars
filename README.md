# Scrap Stars

A 3v3 top-down arena brawler that runs in the browser. No build step, no
dependencies, no image or audio files — every character, prop and sound is
generated in code. Open `index.html` and play.

**11 brawlers · 5 game modes · momentum-based movement.**

## Modes

| Mode | Length | How you win |
|---|---|---|
| **Gem Grab** | 3:00 | Collect gems from the mine. Hold ten as a team for fifteen seconds. |
| **Brawl Ball** | 2:30 | Carry or kick the ball into their goal. First to two. |
| **Bounty** | 2:00 | Every kill is worth a star, and stars stack on whoever is winning. |
| **Heist** | 2:30 | Crack the enemy safe before they crack yours. |
| **Knockout** | 2:00 | No respawns. Wipe the other team twice. |

## Controls

| | |
|---|---|
| `W` `A` `S` `D` | move |
| Mouse | aim · click to shoot |
| `Space` / right-click | Super |
| `Q` / middle-click | Hypercharge |
| `P` pause · `M` mute | |

### On a phone

Landscape, twin-stick. Left thumb moves, right thumb aims — **drag to aim,
release to fire**, and a bare tap auto-aims at the nearest target. The Super is
the gold-ringed disc in the corner (the ring is its charge), Hypercharge sits
beside it. Ammo shows under your own nameplate. Portrait gets a rotate prompt.

## Movement

Movement is accelerative, the way Counter-Strike does it, not the instant
start-stop most top-down games use:

```
friction  bleeds the whole velocity vector every frame
accelerate tops it back up — only along the direction you asked for,
           and only up to that brawler's cap
```

You ramp from 0 to full speed over about 0.15s, carry momentum through a turn,
glide briefly when you let go, and keep sliding when something knocks you back
instead of the knockback being cancelled the instant you hold a key. Knockbacks
and vortex pulls are impulses straight into velocity, so friction handles them
for free.

## The brawlers

Eleven, deliberately — each one is the only thing in the game that does what it
does, and each has an attack, a Super and a Hypercharge.

**Shelly** shotgun cone · **Colt** a line of six bullets · **Bull** point-blank
barrels and a wall-smashing charge · **El Primo** four-punch combo and an elbow
drop · **Rico** bullets that ricochet off walls · **Barley** bottles that pool
into burning ground · **Poco** waves that pierce everyone and a chorus that
heals · **Piper** damage that scales with how far the shot flew · **Mortis**
attacks *by* dashing through you · **Spike** a cactus that bursts into spikes ·
**Nori** a wide rod swing that banks a fish per hit to grow his Super.

A Hypercharge fills only once the Super is already up, then grants speed,
damage and shield for six seconds *and* upgrades that brawler's Super.

## Art

Everything is drawn with canvas paths — one house style of chunky silhouettes,
thick dark ink outlines and a saturated body colour with a lighter rim.
Characters are drawn upright facing right and mirrored when aiming left, the
way a 2D cartoon reads; only the weapon rotates to the aim angle. The same
`Sprites` code draws the menu portraits, so the picker always matches the game.

## Running it

```
open index.html               # file:// works — everything is a classic script
python3 -m http.server 8000   # or serve it
```

## How it's put together

```
index.html        markup, home screen and menus
css/style.css     styling
js/config.js      tuning constants, movement values, palette, helpers
js/map.js         arena generation, collision, line of sight, flow fields
js/roster.js      the eleven brawlers, as data
js/sprites.js     all character and prop art
js/abilities.js   the ability engine — turns kit data into things happening
js/entities.js    brawlers, projectiles, lobs, beams, summons, gems
js/modes.js       the five game modes
js/ai.js          bot perception, targeting, navigation
js/input.js       keyboard, mouse and touch
js/render.js      all drawing, world and HUD
js/game.js        match state and the simulation loop
js/ui.js          home screen, pickers, result screen
```

Kits are **data, not code**. A brawler declares an `emit` kind plus rider
effects and the ability engine does the rest:

```js
attack: {
  emit: 'projectiles', count: 5, pattern: 'stream',
  interval: 0.055, damage: 295, bounce: 4,     // Rico
}
```

Emitters: `projectiles`, `lob`, `melee`, `beam`, `dash`, `leap`, `summon`,
`self`, `area`, `pull`, `walls`, `teleport`, `delayedArea`, `multi`. Riders:
`pierce`, `bounce`, `returns`, `homing`, `chain`, `sticky`, `splitOnEnd`,
`scale`, `knockback`, `stun`, `slow`, `poison`, `lifesteal`, `healAllies`,
`ignoreWalls`, `breakWalls`.

Modes are the same idea — a handful of hooks (`init`, `update`, `onKill`,
`score`, `banner`, `botGoal`, `interceptFire`). `botGoal` is what makes the bots
actually play the objective: chase the ball, hit the safe, hunt the gem carrier.

### Two things worth knowing

**Bots decide and act in two separate passes.** When they did both in one pass,
bots later in the array aimed at positions already updated that frame while
earlier ones aimed at stale ones — a free accuracy edge worth roughly a 3:1 win
rate on a provably symmetric map. Splitting the phases evened it out. Pass order
also alternates each frame so neither side is permanently first to a gem.

**Engagement range can't be tied to attack range.** Melee brawlers only started
chasing within 1.3× their reach — 135px for a punch — so they never committed
and sat at 0.3 K/D. They now commit from 300px and drive straight in instead of
orbiting.

## Balance

Tuned against a 40-match bot-vs-bot simulation, checked per brawler and per
side. The damage-dealer cluster sits between about 1.2 and 1.4 K/D. Melee
brawlers and the support sit below 1.0 there — bots are worse than people at
using cover to close distance, and Poco's value is healing rather than kills —
so those numbers understate them in human hands. Per-brawler samples are ~20
matches, so treat any single figure as ±0.3.

## Licence

MIT — see [LICENSE](LICENSE). A fan project and a homage, built from scratch;
it contains no assets, code or data from any commercial game.
