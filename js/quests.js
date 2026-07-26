/*
 * Daily quests.
 *
 * Three a day, rerolled at local midnight, each paying credits — the currency
 * that walks the Recruit Track. The point is to give a reason to come back
 * that is not "grind the same mode", so they ask for different things: win in
 * a particular mode, deal damage, land Supers, play a fighter you have been
 * ignoring.
 *
 * Everything is derived from the day number rather than stored as a rolled
 * list, so the three quests are stable across a reload without needing to be
 * saved, and two devices on the same day agree.
 */

const QUEST_POOL = [
  { id: 'win', text: 'Win {n} {match|matches}', goal: [2, 3, 4], reward: [40, 60, 80], track: 'wins' },
  { id: 'damage', text: 'Deal {n} damage', goal: [20000, 35000, 50000], reward: [35, 55, 75], track: 'damage' },
  { id: 'kills', text: 'Defeat {n} {opponent|opponents}', goal: [8, 14, 20], reward: [35, 55, 75], track: 'kills' },
  { id: 'supers', text: 'Land {n} {Super|Supers}', goal: [10, 18, 26], reward: [30, 50, 70], track: 'supers' },
  { id: 'play', text: 'Play {n} {match|matches}', goal: [3, 5, 8], reward: [25, 40, 60], track: 'played' },
  { id: 'mvp', text: 'Finish as MVP {n} {time|times}', goal: [1, 2, 3], reward: [50, 80, 110], track: 'mvp' },
  { id: 'pods', text: 'Open {n} {Prize Pod|Prize Pods}', goal: [3, 5, 8], reward: [30, 45, 65], track: 'pods' },
];

/*
 * Fill in the count, choosing between the halves of `{one|many}`. The braces
 * matter: an unbracketed form cannot hold a phrase with a space in it, which
 * turned "Open 1 Prize Pod" into "Open 1 Prize Pod Pods".
 */
function questText(template, n) {
  return template
    .replace(/\{([^{}|]*)\|([^{}]*)\}/g, (_, one, many) => (n === 1 ? one : many))
    .replace('{n}', n.toLocaleString());
}

/* Days since the epoch, in local time — quests turn over at local midnight. */
function questDay() {
  const d = new Date();
  return Math.floor((d - d.getTimezoneOffset() * 60000) / 86400000);
}

const Quests = {
  day: -1,
  progress: {},        // track -> number
  claimed: {},         // quest id -> true

  load() {
    try {
      const raw = localStorage.getItem('scrapstars.quests');
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { /* first run or storage blocked */ }
    this.rollover();
  },

  save() {
    try {
      localStorage.setItem('scrapstars.quests', JSON.stringify({
        day: this.day, progress: this.progress, claimed: this.claimed,
      }));
    } catch (e) { /* nothing worth breaking play over */ }
  },

  /* A new day wipes progress and hands out a new three. */
  rollover() {
    const d = questDay();
    if (this.day === d) return;
    this.day = d;
    this.progress = {};
    this.claimed = {};
    this.save();
  },

  /*
   * Today's three, picked by stepping through the pool with a stride that is
   * coprime with its length, so consecutive days never repeat a quest and the
   * whole pool is seen before any of it comes round again.
   */
  today() {
    this.rollover();
    const n = QUEST_POOL.length;
    const out = [];
    for (let i = 0; i < 3; i++) {
      const q = QUEST_POOL[(this.day * 3 + i * 3) % n];
      const tier = (this.day + i) % 3;
      out.push({
        id: q.id,
        track: q.track,
        goal: q.goal[tier],
        reward: q.reward[tier],
        text: questText(q.text, q.goal[tier]),
        done: (this.progress[q.track] || 0) >= q.goal[tier],
        claimed: !!this.claimed[q.id],
        have: Math.min(this.progress[q.track] || 0, q.goal[tier]),
      });
    }
    return out;
  },

  /* Count something toward every quest that tracks it. */
  bump(track, amount) {
    this.rollover();
    this.progress[track] = (this.progress[track] || 0) + (amount || 1);
    this.save();
  },

  claim(id) {
    const q = this.today().find((x) => x.id === id);
    if (!q || !q.done || q.claimed) return 0;
    this.claimed[id] = true;
    Progress.credits += q.reward;
    Progress.save();
    this.save();
    return q.reward;
  },

  claimable() { return this.today().filter((q) => q.done && !q.claimed).length; },

  /* Roll up everything one finished match contributed. */
  recordMatch(game, won, wasMvp) {
    const p = game.player;
    if (!p) return;
    this.bump('played', 1);
    if (won) this.bump('wins', 1);
    if (wasMvp) this.bump('mvp', 1);
    this.bump('kills', p.kills);
    this.bump('damage', Math.round(p.damageDealt || 0));
    this.bump('supers', p.supersLanded || 0);
  },
};
