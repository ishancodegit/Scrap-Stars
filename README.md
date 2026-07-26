# Scrap Stars

A 3v3 top-down arena brawler that runs in the browser. No build step, no
dependencies, no image or audio files — every character, prop and sound is
generated in code. Open `index.html` and play.

**13 brawlers · 5 modes · a ranked ladder from Bronze to Master · power levels and Prize Pods.**

## Progression

Every brawler has a **power level from 1 to 11**. Each level adds a flat 4% to
health and damage, so level 11 is exactly **40% above level 1** — a real edge,
not a different game. Levels cost power points earned by that brawler plus
coins from the shared pool.

**Prize Pods** are the payout at the end of a match: always one for a win, a
coin flip for a loss. Each rolls a rarity — Rare 50%, Super Rare 28%, Epic 14%,
Mythic 6%, Legendary 2% — and pays out coins, power points, or at Mythic and
above a level outright. Open them on the result screen.

Bots are levelled to match the fight rather than to be a wall: in casual they
mirror whatever you brought, and in ranked their level tracks the tier, from 3
at Bronze to 11 at Master.

## Ranked

Pick **Ranked** and the game rolls one of the five modes on one of its maps and
puts trophies on it. Your rating decides your tier, and your tier decides the
opposition:

| Tier | From | Bots |
|---|---|---|
| Bronze | 0 | barely lead their shots, rarely use a Super |
| Silver | 200 | |
| Gold | 400 | |
| Diamond | 600 | |
| Mythic | 800 | |
| Legendary | 1000 | |
| Master | 1200 | near-perfect aim, instant reactions, never waste a Super |

Bronze bots spray about 17° off target and take 0.6s to react; Master bots are
within 1.5° and react in 0.06s. Wins move you 34 trophies at Bronze and 16 at
Master, losses cost 80% of a win, and the ladder persists in local storage.

## Modes

| Mode | Length | How you win |
|---|---|---|
| **Crystal Rush** | 3:00 | Collect gems from the mine. Hold ten as a team for fifteen seconds. |
| **Slam Ball** | 2:30 | Carry or kick the ball into their goal. First to two. |
| **Bounty** | 2:00 | Every kill is worth a star, and stars stack on whoever is winning. |
| **Heist** | 2:30 | Crack the enemy safe before they crack yours. |
| **Knockout** | 2:00 | No respawns. Wipe the other team twice. |

Each mode has three named maps with their own layout style — open pitches for
Slam Ball, dense cover for Heist, lanes for Bounty — rolled per match and
shown on the home screen and in the battle HUD.

## Controls

| | |
|---|---|
| `W` `A` `S` `D` | move |
| Mouse | aim · click to shoot |
| `E` / middle-click | **quick attack** — fires at the best target, no aiming |
| `Space` / right-click | Super |
| `Q` | Overdrive |
| `T` | toggle aim assist |
| `P` pause · `M` mute | |

### On a phone

Landscape, twin-stick. Left thumb moves, right thumb aims — **drag to aim,
release to fire**. A bare tap, or the **QUICK** button, fires at whatever
auto-aim picks. The Super is the gold-ringed disc in the corner (the ring is
its charge), Overdrive and Quick sit beside it. Ammo shows under your own
nameplate. Portrait gets a rotate prompt.

## Auto-aim

One target picker feeds everything that needs one — the quick attack, the
mobile tap, and the aim assist on manual shots. It scores candidates by how
close they are to dying, then by distance, biased toward whatever you're
already facing, so the lock is predictable and tends to finish kills rather
than spread damage.

- **Quick attack** (`E`) fires your normal attack straight at that target. Same
  ammo, same cooldown — the only thing it skips is having to point.
- **Aim assist** only nudges a shot that was already within ~18° of a target.
  Point somewhere else and your aim is left completely alone. Toggle with `T`
  or on the home screen.
- Shots are **led** by the projectile's flight time, and burst weapons
  **re-track between shots**. Against a target crossing at 180 px/s, Colt's
  six-bullet stream lands 6/6 with lead and re-tracking, 3/6 with lead alone,
  and 0/6 without.
- A brawler hiding in a bush is never a valid lock unless you're on top of
  them, so auto-aim can't be used as a bush detector.

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

Twelve, deliberately — each one is the only thing in the game that does what it
does, and each has an attack, a Super and a Overdrive.

**Shelly** shotgun cone · **Colt** a line of six bullets · **Bull** point-blank
barrels and a wall-smashing charge · **El Primo** four-punch combo and an elbow
drop · **Rico** bullets that ricochet off walls · **Barley** bottles that pool
into burning ground · **Poco** waves that pierce everyone and a chorus that
heals · **Piper** damage that scales with how far the shot flew · **Mortis**
attacks *by* dashing through you · **Spike** a cactus that bursts into spikes ·
**Nori** tap to swing the rod, hold to wind up a hook · **Kenji** alternates a
dash and a wide katana slash, healing off everything he lands.

Two of them have a mechanic rather than just a weapon:

- **Nori** — a tap swings the rod in a wide arc and banks a fish. *Holding*
  winds up a hook that latches onto a brawler **or a wall** and reels him to
  it; at full charge he goes clean over the wall he catches. Fish make his
  Super bigger — each one adds radius and damage, up to six.
- **Kenji** — his attack alternates. Odd swings **dash** through the enemy,
  even swings cut a **wide arc**, and he heals for 35% of everything he lands.
  His Super lobs a fish and brings an **X** down where it lands, with the
  centre of the X taking double damage.

A Overdrive fills only once the Super is already up, then grants speed,
damage and shield for six seconds *and* upgrades that brawler's Super.

## No screen shake

There deliberately isn't any. In a top-down game where you are tracking small
fast targets, jolting the camera on every explosion costs you the shot you were
lining up. Hit feedback lives in the flash, the particles and the damage
numbers instead.

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
js/ranks.js       ranked tiers, Elo, and the bot skill each tier implies
js/progress.js    power levels, upgrade costs, Prize Pods
js/roster.js      the thirteen brawlers, as data
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
