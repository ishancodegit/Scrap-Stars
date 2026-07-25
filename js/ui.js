/* Menus: brawler picker, difficulty, pause and the result screen. */

const UI = {
  selected: BRAWLERS[0].id,
  filter: 'all',
  search: '',

  init() {
    this._buildFilters();
    this._buildGrid();

    document.getElementById('play').addEventListener('click', () => this.startMatch());
    document.getElementById('again').addEventListener('click', () => this.startMatch());
    document.getElementById('menu-btn').addEventListener('click', () => {
      document.getElementById('result').classList.add('hidden');
      document.getElementById('menu').classList.remove('hidden');
      Game.state = 'menu';
    });

    const box = document.getElementById('search');
    box.addEventListener('input', () => {
      this.search = box.value.trim().toLowerCase();
      this._buildGrid();
    });

    for (const el of document.querySelectorAll('.diff')) {
      el.addEventListener('click', () => {
        for (const d of document.querySelectorAll('.diff')) d.classList.remove('active');
        el.classList.add('active');
        Game.difficulty = el.dataset.diff;
      });
    }

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (e.target && e.target.tagName === 'INPUT') return;
      if (k === 'm') {
        const muted = Sfx.toggle();
        document.getElementById('muted').textContent = muted ? 'Sound: off (M)' : 'Sound: on (M)';
      }
      if ((k === 'p' || k === 'escape') && Game.state === 'playing') {
        Game.paused = !Game.paused;
        document.getElementById('paused').classList.toggle('hidden', !Game.paused);
      }
    });

    document.getElementById('count').textContent = `${BRAWLERS.length} brawlers`;
  },

  _buildFilters() {
    const bar = document.getElementById('filters');
    const tiers = [['all', 'All']].concat(Object.keys(RARITY).map((k) => [k, RARITY[k].name]));
    bar.innerHTML = '';
    for (const [key, label] of tiers) {
      const b = document.createElement('button');
      b.className = 'chip' + (key === this.filter ? ' active' : '');
      b.textContent = label;
      b.dataset.key = key;
      if (key !== 'all') b.style.setProperty('--chip', RARITY[key].color);
      b.addEventListener('click', () => {
        this.filter = key;
        for (const c of bar.children) c.classList.toggle('active', c.dataset.key === key);
        this._buildGrid();
      });
      bar.appendChild(b);
    }
  },

  _buildGrid() {
    const grid = document.getElementById('brawler-grid');
    grid.innerHTML = '';
    const list = BRAWLERS.filter((b) => {
      if (this.filter !== 'all' && b.rarity !== this.filter) return false;
      if (this.search && !(`${b.name} ${b.cls} ${b.rarity}`.toLowerCase().includes(this.search))) return false;
      return true;
    });

    if (!list.length) {
      grid.innerHTML = '<p class="empty">Nobody by that name.</p>';
      return;
    }

    for (const b of list) {
      const rar = RARITY[b.rarity] || RARITY.rare;
      const card = document.createElement('button');
      card.className = 'brawler' + (b.id === this.selected ? ' active' : '');
      card.dataset.id = b.id;
      card.innerHTML = `
        <div class="bicon" style="background:${b.color}22;border-color:${b.color}66">${b.icon}</div>
        <div class="bmeta">
          <div class="bname">${b.name}${b.hyper && b.hyper.derived ? '<span class="approx" title="Kit approximated — not verified against the live game">~</span>' : ''}</div>
          <div class="brole" style="color:${rar.color}">${rar.name} · ${CLASSES[b.cls] || b.cls}</div>
          <div class="bblurb">${b.blurb}</div>
          <div class="bstats">
            <span><i style="background:#34d399"></i>${b.hp}</span>
            <span><i style="background:#f97316"></i>${this._dmgLabel(b.attack)}</span>
            <span><i style="background:#60a5fa"></i>${Math.round(specRange(b.attack))}</span>
          </div>
        </div>`;
      card.addEventListener('click', () => {
        this.selected = b.id;
        for (const el of grid.children) {
          if (el.classList) el.classList.toggle('active', el.dataset.id === b.id);
        }
        this._showDetail(b);
        Sfx.resume();
      });
      grid.appendChild(card);
    }
    const cur = BRAWLER_BY_ID[this.selected];
    if (cur) this._showDetail(cur);
  },

  _dmgLabel(a) {
    if (!a) return '—';
    if (a.emit === 'beam') return `${a.dps}/s`;
    const n = a.count && a.count > 1 ? `×${a.count}` : '';
    return `${a.damage || 0}${n}`;
  },

  _showDetail(b) {
    const el = document.getElementById('detail');
    if (!el) return;
    const rar = RARITY[b.rarity] || RARITY.rare;
    el.innerHTML = `
      <div class="dhead">
        <div class="bicon big" style="background:${b.color}22;border-color:${b.color}66">${b.icon}</div>
        <div>
          <h3>${b.name}</h3>
          <p style="color:${rar.color}">${rar.name} · ${CLASSES[b.cls] || b.cls}</p>
        </div>
      </div>
      <dl>
        <dt>Attack</dt><dd>${this._describe(b.attack)}</dd>
        <dt>Super</dt><dd>${this._describe(b.super)}</dd>
        ${b.hyper ? `<dt>Hypercharge</dt><dd><b>${b.hyper.name}</b> — upgrades the Super, plus ${Math.round((HYPER.speedMult - 1) * 100)}% speed and ${Math.round((HYPER.damageMult - 1) * 100)}% damage for ${HYPER.duration}s.${b.hyper.derived ? ' <i>(approximated)</i>' : ''}</dd>` : ''}
      </dl>`;
  },

  _describe(s) {
    if (!s) return '—';
    const bits = [];
    switch (s.emit) {
      case 'projectiles':
        bits.push(s.pattern === 'stream' ? `a line of ${s.count} shots`
          : s.count > 1 ? `${s.count} projectiles in a spread` : 'a single shot');
        break;
      case 'lob': bits.push(`${s.count > 1 ? s.count + ' lobbed shots' : 'a lobbed shot'} that clears walls`); break;
      case 'melee': bits.push(s.hits > 1 ? `${s.hits} quick swings` : 'a close-range swing'); break;
      case 'beam': bits.push('a sustained beam'); break;
      case 'dash': bits.push('a dash that damages everything in the path'); break;
      case 'leap': bits.push('a leap that slams down on landing'); break;
      case 'summon': bits.push(`${s.count > 1 ? s.count + ' helpers' : 'a helper'} that fights for you`); break;
      case 'self': bits.push('a buff for you and nearby team-mates'); break;
      case 'area': bits.push('a patch of ground that keeps dealing damage'); break;
      case 'pull': bits.push('a vortex that drags enemies in'); break;
      case 'walls': bits.push('a temporary wall'); break;
      case 'teleport': bits.push('a blink to where you are aiming'); break;
      case 'delayedArea': bits.push('a marked patch that erupts a moment later'); break;
      case 'random': bits.push('a different effect every time'); break;
      case 'multi': bits.push(s.parts.map((p) => this._describe(p)).join(', plus ')); break;
      default: bits.push(s.emit);
    }
    if (s.pierce) bits.push('pierces');
    if (s.bounce) bits.push(`bounces off walls ${s.bounce}×`);
    if (s.returns) bits.push('comes back to you');
    if (s.chain) bits.push(`chains to ${s.chain.count} more`);
    if (s.homing) bits.push('tracks its target');
    if (s.splitOnEnd) bits.push(`bursts into ${s.splitOnEnd.count} shards`);
    if (s.scale) bits.push(s.scale.far > s.scale.near ? 'hits harder at range' : 'hits harder up close');
    if (s.poison) bits.push('poisons');
    if (s.slow) bits.push('slows');
    if (s.stun) bits.push('stuns');
    if (s.knockback) bits.push('knocks back');
    if (s.lifesteal) bits.push('heals you for part of the damage');
    if (s.healAllies) bits.push('heals allies it passes through');
    if (s.ignoreWalls) bits.push('ignores walls');
    if (s.throughWalls) bits.push('phases through walls');
    if (s.breakWalls) bits.push('smashes cover');
    return bits.join(', ');
  },

  startMatch() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('result').classList.add('hidden');
    document.getElementById('paused').classList.add('hidden');
    Game.start(this.selected, Game.difficulty);
  },

  showResult(winner) {
    const box = document.getElementById('result');
    const title = document.getElementById('result-title');
    const sub = document.getElementById('result-sub');
    box.classList.remove('hidden');
    if (winner === Game.playerTeam) { title.textContent = 'Victory'; title.className = 'win'; }
    else if (winner === -1) { title.textContent = 'Draw'; title.className = 'draw'; }
    else { title.textContent = 'Defeat'; title.className = 'lose'; }

    sub.textContent = `${TEAM_NAME[Game.playerTeam]} ${Game.teamGems[Game.playerTeam]} — ` +
      `${Game.teamGems[1 - Game.playerTeam]} ${TEAM_NAME[1 - Game.playerTeam]}`;

    const rows = Game.brawlers
      .slice()
      .sort((a, b) => (b.kills - a.kills) || (b.gems - a.gems))
      .map((b) => `
        <tr class="${b.team === Game.playerTeam ? 'ally' : 'enemy'}">
          <td>${b.def.icon} ${b.name === 'You' ? '<b>You</b>' : b.name}</td>
          <td>${b.def.name}</td>
          <td>${b.kills}</td>
          <td>${b.deaths}</td>
        </tr>`).join('');
    document.getElementById('scoreboard').innerHTML =
      `<tr><th>Player</th><th>Brawler</th><th>K</th><th>D</th></tr>${rows}`;
  },
};

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  Renderer.init(canvas);
  Input.init(canvas);
  UI.init();
  Game._last = performance.now();
  requestAnimationFrame((t) => Game.frame(t));
});
