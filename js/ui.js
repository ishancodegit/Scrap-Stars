/* Home screen, mode picker, brawler picker and the result screen. */

const UI = {
  brawler: BRAWLERS[0].id,
  mode: 'gem',
  map: null,

  init() {
    Settings.load();
    Ranked.load();
    Progress.load();
    Quests.load();
    this._buildBrawlers();
    this._buildModes();
    this._rollMap();
    // Go through show() so the arena canvas and the scenery start in the same
    // state a normal navigation would leave them in.
    this.show('home');

    on('play', () => this.startMatch());
    on('again', () => this.startMatch());
    on('pick-brawler', () => this.show('brawlers'));
    on('pick-mode', () => this.show('modes'));
    on('brawlers-back', () => this.show('home'));
    on('modes-back', () => this.show('home'));
    on('result-home', () => { Game.state = 'menu'; this.show('home'); });

    on('mode-card', () => this.show('modes'));
    on('pick-road', () => { this._buildRoad(); this.show('road'); });
    on('road-back', () => this.show('home'));
    on('pick-skin', () => { this._buildSkins(); this.show('skins'); });
    on('skins-back', () => this.show('home'));
    on('pick-friends', () => this._openFriends());
    on('pick-quests', () => { this._buildQuests(); this.show('quests'); });
    on('pick-settings', () => { this._buildSettings(); this.show('settings'); });
    on('resume', () => this.togglePause(false));
    on('quit', () => this.leaveMatch());
    on('settings-back', () => this.show('home'));
    on('set-tutorial', () => Tutorial.open(true));
    on('tut-next', () => Tutorial.next());
    on('tut-skip', () => Tutorial.close());
    on('quests-back', () => this.show('home'));
    on('friends-back', () => { Net.close(); this._resetFriends(); this.show('home'); });
    this._wireFriends();

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (e.target && e.target.tagName === 'INPUT') return;
      if (k === 'm') {
        const muted = Sfx.toggle();
        document.getElementById('muted').textContent = muted ? 'Sound: off (M)' : 'Sound: on (M)';
      }
      if ((k === 'p' || k === 'escape') && Game.state === 'playing') { this.togglePause(); return; }
      if (k === 'enter') {
        if (!document.getElementById('tutorial').classList.contains('hidden')) {
          Tutorial.next();
          return;
        }
        const onHome = !document.getElementById('home').classList.contains('hidden');
        const onResult = !document.getElementById('result').classList.contains('hidden');
        if (onHome || onResult) { this.startMatch(); return; }
      }
      // Escape backs out of whatever menu is open, which is otherwise only
      // reachable by finding and clicking the Back button.
      if (k === 'escape') {
        for (const id of ['brawlers', 'modes', 'road', 'skins', 'quests', 'settings', 'friends', 'tutorial']) {
          if (!document.getElementById(id).classList.contains('hidden')) {
            if (id === 'friends' && typeof Net !== 'undefined') Net.close();
            if (id === 'tutorial') { Tutorial.close(); return; }
            this.show('home');
            return;
          }
        }
      }
    });
  },

  /*
   * Pausing only stops your own screen — a friend's match keeps running, so
   * this never claims to have stopped anything but the local simulation.
   */
  togglePause(force) {
    if (Game.state !== 'playing') return;
    Game.paused = force === undefined ? !Game.paused : force;
    document.getElementById('paused').classList.toggle('hidden', !Game.paused);
  },

  leaveMatch() {
    Game.paused = false;
    Game.state = 'menu';
    if (typeof Net !== 'undefined' && Net.active) Net.close();
    this.show('home');
  },

  /*
   * Screens that sit over a live or just-finished match keep the arena behind
   * them; everything else is a menu and belongs over the scenery.
   */
  OVER_MATCH: ['result', 'paused'],

  show(which) {
    const overMatch = this.OVER_MATCH.includes(which);
    // The arena canvas holds its last frame forever once drawing stops, so
    // leaving a match left the finished board sitting behind the menus.
    document.getElementById('game').classList.toggle('hidden', !overMatch);
    if (overMatch) Backdrop.stop(); else Backdrop.start();

    for (const id of ['home', 'brawlers', 'modes', 'road', 'skins', 'quests', 'settings', 'friends', 'result', 'paused', 'tutorial']) {
      document.getElementById(id).classList.toggle('hidden', id !== which);
    }
    if (which === 'home') this._refreshHome();
  },

  /* ---------------- home ---------------- */

  /* Ranked rolls its underlying mode at kick-off, so show it as such. */
  _modeCard() {
    return this.mode === 'ranked' ? RANKED_CARD : MODES[this.mode];
  },

  _rollMap() {
    const id = this.mode === 'ranked' ? pick(MODE_LIST).id : this.mode;
    this.rolled = id;
    this.map = pick(mapsFor(id));
  },

  _refreshHome() {
    const def = BRAWLER_BY_ID[this.brawler];
    const card = this._modeCard();

    const worn = skinnedDef(def, Progress.equippedSkin(def.id));
    paintPortrait(document.getElementById('home-portrait'), worn, 1.5);
    paintPortrait(document.getElementById('rail-portrait'), worn, 0.85);
    paintPortrait(document.getElementById('rail-skin'), worn, 0.85);
    document.getElementById('home-brawler-name').textContent = worn.skinName || def.name;
    const cls = document.getElementById('home-brawler-class');
    cls.textContent = CLASSES[def.cls];
    cls.style.color = def.color;

    document.getElementById('home-mode-name').textContent = card.name;
    document.getElementById('mode-tag').textContent = card.tag;
    document.getElementById('home-map-name').textContent =
      this.mode === 'ranked' ? `${MODES[this.rolled].name} · ${this.map.name}` : this.map.name;
    paintModeIcon(document.getElementById('home-mode-icon'), card);
    paintModeIcon(document.getElementById('rail-mode'), card);

    // Rank plate.
    const tier = Ranked.tier();
    const badge = document.getElementById('rank-badge');
    const bctx = badge.getContext('2d');
    bctx.clearRect(0, 0, badge.width, badge.height);
    bctx.save();
    bctx.translate(badge.width / 2, badge.height / 2);
    drawRankBadge(bctx, 46, tier);
    bctx.restore();
    document.getElementById('rank-name').textContent = tier.name;
    document.getElementById('rank-name').style.color = tier.glow;
    document.getElementById('rank-fill').style.width = `${Math.round(Ranked.progress() * 100)}%`;
    const next = Ranked.nextAt();
    document.getElementById('rank-elo').textContent =
      next == null ? `${Ranked.elo} trophies` : `${Ranked.elo} / ${next} trophies`;
    document.getElementById('stat-record').textContent =
      `${Ranked.won}W · ${Math.max(0, Ranked.played - Ranked.won)}L`;
    document.getElementById('stat-best').textContent = `Best ${Ranked.best}`;
    document.getElementById('stat-coins').textContent = Progress.coins;
    document.getElementById('stat-credits').textContent = Progress.credits;

    // The road icon is whoever you are saving toward.
    const step = nextRoadStep();
    paintPortrait(document.getElementById('rail-road'), step ? step.def : def, 0.85);
    paintFriendsIcon(document.getElementById('rail-friends'));
    paintQuestIcon(document.getElementById('rail-quests'));
    paintGearIcon(document.getElementById('rail-settings'));
    // A dot on the rail is the only nudge; nothing nags.
    document.getElementById('quest-dot').classList.toggle('hidden', Quests.claimable() === 0);
  },

  /* Three segmented pickers, each writing straight through to Settings. */
  _buildSettings() {
    const seg = (host, options, current, onPick) => {
      const el = document.getElementById(host);
      el.innerHTML = '';
      for (const o of options) {
        const btn = document.createElement('button');
        btn.className = 'segbtn' + (o.id === current ? ' on' : '');
        btn.innerHTML = `<b>${o.name}</b>${o.hint ? `<span>${o.hint}</span>` : ''}`;
        btn.addEventListener('click', () => {
          onPick(o.id);
          Sfx.resume();
          Sfx.play('tick');
          this._buildSettings();
        });
        el.appendChild(btn);
      }
    };

    seg('zoom-opts', ZOOM_STEPS, Settings.zoom, (id) => {
      Settings.set('zoom', id);
      Renderer.resize();                 // apply without needing a new match
    });
    seg('sound-opts', [{ id: 'on', name: 'On' }, { id: 'off', name: 'Off' }],
        Settings.sound ? 'on' : 'off', (id) => Settings.set('sound', id === 'on'));
    seg('flash-opts', [{ id: 'on', name: 'On' }, { id: 'off', name: 'Reduced' }],
        Settings.flashes ? 'on' : 'off', (id) => Settings.set('flashes', id === 'on'));
  },

  _buildQuests() {
    const list = document.getElementById('quest-list');
    list.innerHTML = '';
    for (const q of Quests.today()) {
      const row = document.createElement('div');
      row.className = 'roadrow questrow' + (q.claimed ? ' owned' : q.done ? ' next' : '');
      row.innerHTML = `
        <div class="qmark">${q.claimed ? '\u2713' : q.done ? '\u2605' : ''}</div>
        <div class="roadbody">
          <div class="cname">${q.text}</div>
          <div class="pbar"><span style="width:${Math.round(q.have / q.goal * 100)}%"></span></div>
          <div class="qprog">${q.have.toLocaleString()} / ${q.goal.toLocaleString()}</div>
        </div>
        <div class="roadact"></div>`;
      const act = row.querySelector('.roadact');
      if (q.claimed) {
        act.innerHTML = '<span class="ownedtag">CLAIMED</span>';
      } else {
        const btn = document.createElement('button');
        btn.className = 'upbtn roadbtn';
        btn.textContent = `${q.reward} credits`;
        btn.disabled = !q.done;
        btn.addEventListener('click', () => {
          if (Quests.claim(q.id)) {
            Sfx.resume();
            Sfx.play('levelup');
            this._buildQuests();
            this._refreshHome();
          }
        });
        act.appendChild(btn);
      }
      list.appendChild(row);
    }
  },

  /* ---------------- pickers ---------------- */

  _buildBrawlers() {
    const grid = document.getElementById('brawler-grid');
    grid.innerHTML = '';
    for (const b of BRAWLERS) {
      const owned = Progress.isUnlocked(b.id);
      const card = document.createElement('button');
      card.className = 'card brawler' + (b.id === this.brawler ? ' active' : '') + (owned ? '' : ' locked');
      card.dataset.id = b.id;
      card.innerHTML = `
        <canvas class="portrait" width="150" height="150"></canvas>
        <div class="cname">${b.name}</div>
        <div class="ccls" style="color:${b.color}">${CLASSES[b.cls]}</div>
        <div class="cblurb">${b.blurb}</div>
        <div class="cstats">
          <span><i style="background:#34d399"></i><b class="s-hp"></b></span>
          <span><i style="background:#f97316"></i><b class="s-dmg"></b></span>
          <span><i style="background:#60a5fa"></i>${Math.round(specRange(b.attack))}</span>
        </div>
        <div class="ctip">${b.tip}</div>
        <div class="plevel"><span class="pnum"></span><span class="pbar"><span></span></span></div>
        <div class="mastery"><i class="mbadge"></i><span class="mbar"><i></i></span><b class="mnum"></b></div>
        <button class="upbtn"></button>
        <button class="trybtn">TRY IN RANGE</button>`;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.upbtn') || e.target.closest('.trybtn')) return;
        if (!Progress.isUnlocked(b.id)) {            // locked: send them to the road
          this._buildRoad();
          this.show('road');
          return;
        }
        this.brawler = b.id;
        for (const el of grid.children) el.classList.toggle('active', el.dataset.id === b.id);
        Sfx.resume();
        Sfx.play('tick');
        setTimeout(() => this.show('home'), 140);
      });
      card.querySelector('.upbtn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (Progress.upgrade(b.id)) {
          Sfx.resume();
          Sfx.play('charged');
          this._paintPower(card, b);
          for (const el of grid.children) this._paintPower(el, BRAWLER_BY_ID[el.dataset.id]);
          this._refreshHome();
        }
      });
      // The range is where you find out whether you want a fighter, so it is
      // deliberately open to the ones you have not bought.
      card.querySelector('.trybtn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.brawler = b.id;
        this.mode = 'practice';
        this.startMatch();
      });
      grid.appendChild(card);
      paintPortrait(card.querySelector('.portrait'),
        skinnedDef(b, Progress.equippedSkin(b.id)), 1);
      this._paintPower(card, b);
      this._paintMastery(card, b);
    }
  },

  /* Mastery badge and the bar toward the next one. */
  _paintMastery(card, b) {
    const badge = card.querySelector('.mbadge');
    if (!badge) return;
    const pts = Progress.masteryOf(b.id);
    const tier = masteryTier(pts);
    const none = tier.id === 'none';
    badge.style.background = none ? 'transparent' : tier.color;
    const num = card.querySelector('.mnum');
    num.textContent = none ? `${pts}` : `${tier.name} \u00b7 ${pts.toLocaleString()}`;
    num.style.color = none ? 'var(--muted)' : tier.color;
    const bar = card.querySelector('.mbar i');
    bar.style.width = `${Math.round(masteryProgress(pts) * 100)}%`;
    bar.style.background = none ? '#6b5b95' : tier.color;
  },

  /* ---------------- Recruit Track ---------------- */

  _buildRoad() {
    const list = document.getElementById('road-list');
    list.innerHTML = '';
    const next = nextRoadStep();
    for (const step of roadSteps()) {
      const b = step.def;
      const isNext = !!next && next.id === step.id;
      const row = document.createElement('div');
      row.className = 'roadrow' + (step.unlocked ? ' owned' : '') + (isNext ? ' next' : '');
      row.innerHTML = `
        <canvas class="roadart" width="130" height="130"></canvas>
        <div class="roadbody">
          <div class="cname">${b.name}</div>
          <div class="ccls" style="color:${b.color}">${CLASSES[b.cls]}</div>
          <div class="cblurb">${b.blurb}</div>
        </div>
        <div class="roadact"></div>`;
      const act = row.querySelector('.roadact');
      if (step.unlocked) {
        act.innerHTML = '<span class="ownedtag">OWNED</span>';
      } else {
        const btn = document.createElement('button');
        btn.className = 'upbtn roadbtn';
        btn.textContent = `${step.cost} credits`;
        // Only the next brawler on the road can be bought — that is what makes
        // it a road rather than a shop.
        btn.disabled = !isNext || !Progress.canUnlock(step.id);
        btn.addEventListener('click', () => {
          if (Progress.unlock(step.id)) {
            Sfx.resume();
            Sfx.play('win');
            this.brawler = step.id;
            this._buildRoad();
            this._buildBrawlers();
            this._refreshHome();
          }
        });
        act.appendChild(btn);
      }
      list.appendChild(row);
      paintPortrait(row.querySelector('.roadart'), b, 0.9);
      if (!step.unlocked) row.querySelector('.roadart').classList.add('silhouette');
    }
  },

  /* ---------------- skins ---------------- */

  _buildSkins() {
    const def = BRAWLER_BY_ID[this.brawler];
    document.getElementById('skins-title').textContent = `${def.name} skins`;
    const grid = document.getElementById('skin-grid');
    grid.innerHTML = '';
    const worn = Progress.equippedSkin(def.id);
    for (const skin of skinsFor(def.id)) {
      const owned = Progress.ownsSkin(def.id, skin.id);
      const card = document.createElement('button');
      card.className = 'card skin' + (skin.id === worn ? ' active' : '') + (owned ? '' : ' locked');
      card.innerHTML = `
        <canvas class="portrait" width="150" height="150"></canvas>
        <div class="cname">${skin.name}</div>
        <div class="ccls">${owned ? (skin.id === worn ? 'EQUIPPED' : 'OWNED') : 'FROM PRIZE PODS'}</div>`;
      card.addEventListener('click', () => {
        if (!owned) return;
        Progress.equipSkin(def.id, skin.id);
        Sfx.resume();
        Sfx.play('tick');
        this._buildSkins();
        this._buildBrawlers();
        this._refreshHome();
      });
      grid.appendChild(card);
      paintPortrait(card.querySelector('.portrait'), skinnedDef(def, skin.id), 1);
      if (!owned) card.querySelector('.portrait').classList.add('silhouette');
    }
  },

  /* Power chip, progress toward the next level, and the upgrade button. */
  _paintPower(card, b) {
    if (!card || !b) return;
    const st = Progress.of(b.id);
    const cost = upgradeCost(st.level);
    card.querySelector('.pnum').textContent = `PWR ${st.level}`;
    const m = powerMult(st.level);
    const hpEl = card.querySelector('.s-hp');
    const dmgEl = card.querySelector('.s-dmg');
    if (hpEl) hpEl.textContent = Math.round(b.hp * m);
    if (dmgEl) dmgEl.textContent = dmgLabel(b.attack, m);
    const maxed = st.level >= MAX_POWER;
    card.querySelector('.pbar span').style.width =
      maxed ? '100%' : `${Math.round(clamp(st.points / cost.points, 0, 1) * 100)}%`;
    const btn = card.querySelector('.upbtn');
    if (maxed) {
      btn.textContent = 'MAX POWER';
      btn.disabled = true;
    } else {
      btn.textContent = `${st.points}/${cost.points} pts · ${cost.coins} coins`;
      btn.disabled = !Progress.canUpgrade(b.id);
    }
  },

  _buildModes() {
    const list = document.getElementById('mode-list');
    list.innerHTML = '';
    for (const m of PICKER_MODES) {
      const card = document.createElement('button');
      card.className = 'card mode' + (m.id === 'ranked' ? ' ranked' : '') + (m.id === this.mode ? ' active' : '');
      card.dataset.id = m.id;
      const maps = m.id === 'ranked' ? null : mapsFor(m.id).map((x) => x.name).join(' · ');
      card.innerHTML = `
        <canvas class="modeicon" width="96" height="96"></canvas>
        <div class="mbody">
          <div class="cname">${m.name} <em>${m.tag}</em></div>
          <div class="cblurb">${m.blurb}</div>
          ${maps ? `<div class="cmaps">${maps}</div>` : ''}
        </div>`;
      card.addEventListener('click', () => {
        this.mode = m.id;
        this._rollMap();
        for (const el of list.children) el.classList.toggle('active', el.dataset.id === m.id);
        Sfx.resume();
        Sfx.play('tick');
        setTimeout(() => this.show('home'), 140);
      });
      list.appendChild(card);
      paintModeIcon(card.querySelector('.modeicon'), m);
    }
  },

  startMatch() {
    Backdrop.stop();
    document.getElementById('game').classList.remove('hidden');
    for (const id of ['home', 'brawlers', 'modes', 'road', 'skins', 'quests', 'settings', 'friends', 'result', 'paused', 'tutorial']) {
      document.getElementById(id).classList.add('hidden');
    }
    this._rollMap();
    Game.start(this.brawler, this.rolled, Game.difficulty, {
      ranked: this.mode === 'ranked',
      map: this.map,
    });
  },

  showResult(winner) {
    this.show('result');
    const title = document.getElementById('result-title');
    if (winner === Game.playerTeam) { title.textContent = 'VICTORY'; title.className = 'win'; }
    else if (winner === -1) { title.textContent = 'DRAW'; title.className = 'draw'; }
    else { title.textContent = 'DEFEAT'; title.className = 'lose'; }

    const s = Game.mode.score ? Game.mode.score(Game) : ['0', '0'];
    document.getElementById('result-sub').textContent =
      `${Game.mode.name} · ${Game.mapDef ? Game.mapDef.name + ' · ' : ''}` +
      `${s[Game.playerTeam]} — ${s[1 - Game.playerTeam]}`;

    // Ranked settlement.
    const box = document.getElementById('rank-result');
    box.classList.toggle('hidden', !Game.rankResult);
    if (Game.rankResult) {
      const r = Game.rankResult;
      const d = document.getElementById('result-delta');
      d.textContent = `${r.delta >= 0 ? '+' : ''}${r.delta}`;
      d.className = 'delta' + (r.delta < 0 ? ' down' : '');
      document.getElementById('result-tier').textContent =
        r.promoted ? `Promoted to ${r.tier.name}!`
          : r.demoted ? `Dropped to ${r.tier.name}`
            : `${r.tier.name} · ${Ranked.elo} trophies`;
      document.getElementById('result-fill').style.width = `${Math.round(Ranked.progress() * 100)}%`;
      const rb = document.getElementById('result-badge');
      const rc = rb.getContext('2d');
      rc.clearRect(0, 0, rb.width, rb.height);
      rc.save();
      rc.translate(rb.width / 2, rb.height / 2);
      drawRankBadge(rc, 44, r.tier);
      rc.restore();
    }

    // Mastery with the fighter you actually played. A badge crossed mid-match
    // is the headline; otherwise it is just the bar creeping forward.
    const mg = document.getElementById('mastery-gain');
    const gain = Game.masteryGain || 0;
    mg.classList.toggle('hidden', !gain || !Game.player);
    if (gain && Game.player) {
      const before = Game.masteryBefore || 0;
      const now = before + gain;
      const tier = masteryTier(now);
      const promoted = tier !== masteryTier(before);
      document.getElementById('mgain-title').textContent =
        promoted ? `${tier.name} Mastery — ${Game.player.def.name}!`
          : `${Game.player.def.name} Mastery`;
      document.getElementById('mgain-fill').style.width =
        `${Math.round(masteryProgress(now) * 100)}%`;
      document.getElementById('mgain-fill').style.background = tier.color;
      const next = MASTERY_TIERS[MASTERY_TIERS.indexOf(tier) + 1];
      document.getElementById('mgain-sub').textContent = next
        ? `+${gain} · ${(next.at - now).toLocaleString()} to ${next.name}`
        : `+${gain} · ${now.toLocaleString()} total`;
      mg.classList.toggle('promoted', promoted);
      const mb = document.getElementById('mgain-badge');
      const mc = mb.getContext('2d');
      mc.clearRect(0, 0, mb.width, mb.height);
      mc.save();
      mc.translate(mb.width / 2, mb.height / 2);
      drawMasteryBadge(mc, 30, tier);
      mc.restore();
    }

    // What this match moved along, so daily progress is visible where it was
    // actually earned rather than only on a screen you might not open.
    const gains = document.getElementById('quest-gains');
    const moved = Game.questGains || [];
    gains.classList.toggle('hidden', moved.length === 0);
    gains.innerHTML = moved.map((q) => `
      <div class="gainrow${q.justFinished ? ' done' : ''}">
        <span class="gaintext">${q.text}</span>
        <span class="gainbar"><i style="width:${Math.round(q.have / q.goal * 100)}%"></i></span>
        <span class="gainnum">${q.justFinished
          ? `+${q.reward} cr`
          : `${q.have.toLocaleString()} / ${q.goal.toLocaleString()}`}</span>
      </div>`).join('');

    // Prize Pods earned this match. The button only announces them — the
    // opening itself takes over the whole screen.
    this._paintDropButton();

    // MVP is whoever contributed most, not simply who has the most kills —
    // a support who healed and chipped all match should be able to win it.
    const scored = Game.brawlers.map((b) => ({
      b, score: (b.damageDealt || 0) + b.kills * 1200 - b.deaths * 300,
    })).sort((x, y) => y.score - x.score);
    const mvp = scored.length ? scored[0].b : null;

    const rows = scored.map(({ b }) => `
        <tr class="${b.team === Game.playerTeam ? 'ally' : 'enemy'}">
          <td>${b === mvp ? '<i class="mvp">MVP</i> ' : ''}${b.name === 'You' ? '<b>You</b>' : b.name}</td>
          <td>${b.def.name}</td>
          <td>${Math.round(b.damageDealt || 0).toLocaleString()}</td>
          <td>${b.kills}</td>
          <td>${b.deaths}</td>
        </tr>`).join('');
    document.getElementById('scoreboard').innerHTML =
      `<tr><th>Player</th><th>Fighter</th><th>Damage</th><th>K</th><th>D</th></tr>${rows}`;
  },

  /* ---------------- play with a friend ---------------- */

  /*
   * Two browsers have to hand each other one message each. A broker can do it
   * invisibly, but every broker is a service that can be blocked or down, so
   * it is never the only route: the links below carry the same two messages by
   * hand and depend on nothing but the players.
   */

  _link(param, blob) {
    return location.origin + location.pathname + '?' + param + '=' + encodeURIComponent(blob);
  },

  /* Accept a pasted link or a bare code — people paste whichever they have. */
  _unlink(text) {
    const t = String(text || '').trim();
    if (!t) return '';
    const m = t.match(/[?&]a=([^&\s]+)/);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    return t.replace(/\s+/g, '');
  },

  _say(text) {
    const el = document.getElementById('friend-status');
    if (el) el.textContent = text;
  },

  _pane(which) {
    document.getElementById('f-host').classList.toggle('hidden', which !== 'host');
    document.getElementById('f-guest').classList.toggle('hidden', which !== 'guest');
    document.getElementById('f-join').classList.toggle('hidden', which !== 'host');
    document.getElementById('friends-title').textContent =
      which === 'guest' ? 'Almost there' : 'Play with a friend';
  },

  _resetFriends() {
    Net.diag = [];
    const dl = document.getElementById('diag-log');
    if (dl) dl.innerHTML = '';
    document.getElementById('f-reply-in').value = '';
    document.getElementById('join-room-code').value = '';
    document.getElementById('f-room-line').classList.add('hidden');
    document.getElementById('f-room-code').textContent = '····';
  },

  /*
   * Opening the screen builds an invite straight away, then tries for a room
   * code on top. The link works whether or not the code ever arrives.
   */
  async _openFriends() {
    this._resetFriends();
    this._pane('host');
    this.show('friends');
    this._say('Getting your invite ready…');
    try {
      this._invite = await Net.createInvite();
      this._say('Send the invite link. Paste their reply below when it comes back.');
    } catch (e) {
      this._say('Could not build an invite: ' + e.message);
      return;
    }
    // A room code is a shortcut, not a requirement — failure here is silent.
    Net.hostRoomWith(this._invite,
      (code) => {
        document.getElementById('f-room-code').textContent = code;
        document.getElementById('f-room-line').classList.remove('hidden');
        this._armWhenConnected();
      },
      () => { /* the link path is already live */ });
    this._armWhenConnected();
  },

  _armWhenConnected() {
    clearInterval(this._armTimer);
    this._armTimer = setInterval(() => {
      if (!Net.connected) return;
      clearInterval(this._armTimer);
      if (Net.isHost) this.startMatch();
    }, 120);
    setTimeout(() => clearInterval(this._armTimer), 180000);
  },

  /* Arrived on someone's invite link. */
  async _acceptInvite(blob) {
    this._resetFriends();
    this._pane('guest');
    this.show('friends');
    this._say('Reading the invite…');
    try {
      this._reply = await Net.joinWithInvite(blob, 'Friend');
      this._say('Send the reply link back — then just wait here.');
    } catch (e) {
      this._say('That invite link was incomplete. Ask them to send it again.');
    }
  },

  _wireFriends() {
    Net.onDiag = (lines) => {
      const el = document.getElementById('diag-log');
      if (el) el.innerHTML = lines.map((l) => '<li>' + l + '</li>').join('');
    };

    Net.onStatus = (s) => {
      const text = {
        connecting: 'Connecting…',
        connected: 'Connected! Starting the match…',
        failed: 'That did not connect. Try a fresh invite.',
        lost: 'Your friend disconnected.',
      }[s];
      if (text) this._say(text);
    };

    Net.onInit = (init) => {
      for (const id of ['home', 'brawlers', 'modes', 'road', 'skins', 'quests', 'settings', 'friends', 'result', 'paused', 'tutorial']) {
        document.getElementById(id).classList.add('hidden');
      }
      Game.startAsGuest(init);
    };

    on('f-copy-invite', () => {
      if (!this._invite) return this._say('The invite is still being built.');
      this._copy(this._link('i', this._invite), 'Invite link copied. Send it over.');
    });

    on('f-copy-reply', () => {
      if (!this._reply) return this._say('The reply is still being built.');
      this._copy(this._link('a', this._reply), 'Reply link copied. Send it back to them.');
    });

    on('f-connect', async () => {
      const blob = this._unlink(document.getElementById('f-reply-in').value);
      if (!blob) return this._say('Paste their reply link first.');
      try {
        await Net.acceptReply(blob);
        this._say('Connecting…');
        this._armWhenConnected();
      } catch (e) {
        this._say('That reply did not parse — paste the whole link.');
      }
    });

    on('join-room-go', () => this._joinRoom(document.getElementById('join-room-code').value));
  },

  _copy(text, okMsg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => this._say(okMsg))
        .catch(() => this._say(text));
    } else {
      this._say(text);
    }
  },

  _joinRoom(raw) {
    const code = String(raw || '').trim().toUpperCase();
    if (code.length !== 4) return this._say('Room codes are four characters.');
    this._pane('guest');
    this._say('Looking for room ' + code + '…');
    Net.joinRoom(code, 'Friend', () =>
      this._say('Could not reach that room. Ask them for the invite link instead.'));
  },

  /* The bait on the result screen: how many drops are waiting, and a lid. */
  _paintDropButton() {
    const btn = document.getElementById('drop-open');
    const n = Progress.drops;
    btn.classList.toggle('hidden', n <= 0);
    if (n <= 0) return;
    document.getElementById('drop-count').textContent =
      `OPEN ${n} PRIZE POD${n === 1 ? '' : 'S'}`;
    const cv = document.getElementById('drop-canvas');
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.translate(cv.width / 2, cv.height / 2);
    drawStarrDrop(c, 44, '#c084fc', false);
    c.restore();
    btn.onclick = () => {
      Sfx.resume();
      StarrDrop.begin(Progress.drops, this.brawler, () => {
        this._paintDropButton();
        this._paintAllPower();
        this._refreshHome();
      });
    };
  },
};

/* Damage readout for a kit, whatever shape its attack takes. */
function dmgLabel(a, mult) {
  if (!a) return '—';
  const m = mult || 1;
  const v = (x) => Math.round((x || 0) * m);
  if (a.emit === 'alternate') return a.parts.map((x) => v(x.damage)).join(' / ');
  if (a.emit === 'beam') return `${v(a.dps)}/s`;
  const n = a.count > 1 ? `×${a.count}` : '';
  return `${v(a.damage)}${n}`;
}

UI._paintAllPower = function () {
  const grid = document.getElementById('brawler-grid');
  for (const el of grid.children) {
    const def = BRAWLER_BY_ID[el.dataset.id];
    this._paintPower(el, def);
    this._paintMastery(el, def);
  }
};

/* Copy a code box to the clipboard, with a fallback for insecure origins. */
function copyBox(boxId, statusId) {
  const box = document.getElementById(boxId);
  const say = (msg) => { document.getElementById(statusId).textContent = msg; };
  if (!box.value) return say('Nothing to copy yet.');
  box.select();
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(box.value)
      .then(() => say('Copied. Send it to your friend.'))
      .catch(() => say('Press Ctrl/Cmd+C to copy the selected code.'));
  } else {
    say('Press Ctrl/Cmd+C to copy the selected code.');
  }
}

/* Two brawlers side by side, for the Friends rail button. */
function paintFriendsIcon(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h * 0.62);
  ctx.scale(w / 150, w / 150);
  for (const [dx, col, flip] of [[-26, '#38bdf8', 1], [26, '#fb7185', -1]]) {
    ctx.save();
    ctx.translate(dx, 0);
    ctx.scale(flip, 1);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12071f';
    ctx.lineWidth = 5;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-17, 20); ctx.lineTo(-20, -6); ctx.lineTo(20, -6); ctx.lineTo(17, 20);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -26, 21, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c3a0';
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* A scroll with a tick on it, for the Quests rail button. */
function paintQuestIcon(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(w / 150, w / 150);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12071f';
  ctx.lineWidth = 6;
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath();
  ctx.moveTo(-34, -44); ctx.lineTo(34, -44); ctx.lineTo(34, 44); ctx.lineTo(-34, 44);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b9a06a';
  ctx.lineWidth = 5;
  for (const y of [-20, 0]) {
    ctx.beginPath();
    ctx.moveTo(-20, y); ctx.lineTo(20, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-18, 22); ctx.lineTo(-4, 34); ctx.lineTo(22, 8);
  ctx.stroke();
  ctx.restore();
}

/* A gear, for the Settings rail button. */
function paintGearIcon(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  ctx.clearRect(0, 0, w, canvas.height);
  ctx.save();
  ctx.translate(w / 2, canvas.height / 2);
  ctx.scale(w / 150, w / 150);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = a + Math.PI / 8;
    ctx.lineTo(Math.cos(a) * 48, Math.sin(a) * 48);
    ctx.lineTo(Math.cos(a + 0.22) * 48, Math.sin(a + 0.22) * 48);
    ctx.lineTo(Math.cos(b - 0.06) * 34, Math.sin(b - 0.06) * 34);
    ctx.lineTo(Math.cos(b + 0.28) * 34, Math.sin(b + 0.28) * 34);
  }
  ctx.closePath();
  ctx.fillStyle = '#cbd5e1';
  ctx.fill();
  ctx.strokeStyle = '#12071f';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2170';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function on(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

/* Draw a brawler into a menu canvas using the same art the game uses. */
function paintPortrait(canvas, def, zoom) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const scale = (w / 96) * (zoom || 1);
  ctx.save();
  ctx.translate(w / 2, h * 0.66);
  ctx.scale(scale, scale);
  // Ground disc so the character is not floating.
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  const stub = {
    def, radius: 22, angle: 0.25, vx: 0, vy: 0, id: 3,
    x: 0, y: 0,
  };
  Sprites.drawBrawler(ctx, stub, 0.6);
  ctx.restore();
}

/* Mode icons, drawn rather than shipped as images. */
function paintModeIcon(canvas, mode) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const s = w / 96;
  ctx.scale(s, s);

  switch (mode.icon) {
    case 'gem':
      Sprites.gem(ctx, 30);
      break;
    case 'ball':
      Sprites.ball(ctx, 30, 0);
      break;
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 14 : 32;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#3b1f14';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case 'safe': {
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#3b1f14';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(-28, -24, 56, 48);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'target': {
      for (const [r, col] of [[32, '#f8fafc'], [22, '#fb7185'], [11, '#f8fafc']]) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = '#3b1f14';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    }
    case 'rank': {
      drawRankBadge(ctx, 34, Ranked.tier());
      break;
    }
    case 'skull': {
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#3b1f14';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -4, 26, Math.PI, 0);
      ctx.rect(-26, -4, 52, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3b1f14';
      ctx.beginPath();
      ctx.arc(-11, -2, 7, 0, Math.PI * 2);
      ctx.arc(11, -2, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/* Links do the work: ?i= is an invite, ?a= a reply, ?room= a code. */
function joinFromUrl() {
  const q = new URLSearchParams(location.search);
  const invite = q.get('i');
  const room = q.get('room');
  if (invite) UI._acceptInvite(invite);
  else if (room && room.trim().length === 4) { UI.show('friends'); UI._joinRoom(room); }
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  Renderer.init(canvas);
  Input.init(canvas);
  Backdrop.init();
  StarrDrop.init();
  UI.init();
  Game._last = performance.now();
  requestAnimationFrame((t) => Game.frame(t));
  // An invite link is not a first run: somebody is waiting at the other end.
  if (Tutorial.shouldShow() && !location.search) Tutorial.open();
  joinFromUrl();
});
