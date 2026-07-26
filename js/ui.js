/* Home screen, mode picker, brawler picker and the result screen. */

const UI = {
  brawler: BRAWLERS[0].id,
  mode: 'gem',
  map: null,

  init() {
    Ranked.load();
    Progress.load();
    this._buildBrawlers();
    this._buildModes();
    this._rollMap();
    this._refreshHome();

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
    on('friends-back', () => { Net.close(); this._resetFriends(); this.show('home'); });
    this._wireFriends();

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
  },

  show(which) {
    for (const id of ['home', 'brawlers', 'modes', 'road', 'skins', 'friends', 'result', 'paused']) {
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
        <button class="upbtn"></button>`;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.upbtn')) return;      // upgrading is not picking
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
      grid.appendChild(card);
      paintPortrait(card.querySelector('.portrait'),
        skinnedDef(b, Progress.equippedSkin(b.id)), 1);
      this._paintPower(card, b);
    }
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
    for (const id of ['home', 'brawlers', 'modes', 'road', 'skins', 'friends', 'result', 'paused']) {
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

    // Prize Pods earned this match. The button only announces them — the
    // opening itself takes over the whole screen.
    this._paintDropButton();

    const rows = Game.brawlers
      .slice()
      .sort((a, b) => (b.kills - a.kills) || (b.deaths - a.deaths))
      .map((b) => `
        <tr class="${b.team === Game.playerTeam ? 'ally' : 'enemy'}">
          <td>${b.name === 'You' ? '<b>You</b>' : b.name}</td>
          <td>${b.def.name}</td>
          <td>${b.kills}</td>
          <td>${b.deaths}</td>
        </tr>`).join('');
    document.getElementById('scoreboard').innerHTML =
      `<tr><th>Player</th><th>Brawler</th><th>K</th><th>D</th></tr>${rows}`;
  },

  /* ---------------- play with a friend ---------------- */

  _resetFriends() {
    for (const id of ['host-code', 'host-reply', 'join-code', 'join-reply', 'join-room-code']) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
    document.getElementById('host-room-code').textContent = '\u00b7\u00b7\u00b7\u00b7';
    document.getElementById('manual-wrap').classList.add('hidden');
    document.getElementById('show-manual').classList.remove('hidden');
    this._say('');
  },

  _say(text) {
    const el = document.getElementById('friend-status');
    if (el) el.textContent = text;
  },

  /* Open the screen and get a room going straight away — one less thing to press. */
  _openFriends() {
    this._resetFriends();
    this.show('friends');
    this._say('Getting a room ready\u2026');
    Net.hostRoom(
      (code) => {
        document.getElementById('host-room-code').textContent = code;
        this._say('Waiting for your friend\u2026');
        this._armWhenConnected();
      },
      () => {
        document.getElementById('host-room-code').textContent = '—';
        this._showManual('Could not reach the room service. Swap the codes below instead.');
      },
    );
  },

  /* The host owns the match, so it launches for both once the link is up. */
  _armWhenConnected() {
    clearInterval(this._armTimer);
    this._armTimer = setInterval(() => {
      if (!Net.connected) return;
      clearInterval(this._armTimer);
      if (Net.isHost) this.startMatch();
    }, 120);
    setTimeout(() => clearInterval(this._armTimer), 120000);
  },

  async _showManual(why) {
    document.getElementById('manual-wrap').classList.remove('hidden');
    document.getElementById('show-manual').classList.add('hidden');
    if (!document.getElementById('host-code').value) {
      try {
        // Building an invite flips Net's own status, so restore the reason we
        // ended up here afterwards rather than letting it be overwritten.
        document.getElementById('host-code').value = await Net.createInvite();
      } catch (e) { /* fall through to the message below */ }
    }
    this._say(why || 'Swap the codes below with your friend.');
  },

  _wireFriends() {
    Net.onStatus = (s) => {
      const text = {
        creating: 'Getting a room ready\u2026',
        waiting: 'Waiting for your friend\u2026',
        joining: 'Looking for the room\u2026',
        connecting: 'Connecting\u2026',
        connected: 'Connected! Starting the match\u2026',
        failed: 'That did not connect. Check the code and try again.',
        nosignal: 'Could not reach the room service \u2014 swap codes by hand.',
        lost: 'Your friend disconnected.',
      }[s];
      if (text) this._say(text);
    };

    // A guest is told about the match rather than starting one.
    Net.onInit = (init) => {
      for (const id of ['home', 'brawlers', 'modes', 'road', 'skins', 'friends', 'result', 'paused']) {
        document.getElementById(id).classList.add('hidden');
      }
      Game.startAsGuest(init);
    };

    on('host-copy-link', () => {
      const code = document.getElementById('host-room-code').textContent.trim();
      if (!code || code.length !== 4) return this._say('The room is not ready yet.');
      const link = location.origin + location.pathname + '?room=' + code;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link)
          .then(() => this._say('Link copied. Send it over \u2014 they just open it.'))
          .catch(() => this._say(link));
      } else {
        this._say(link);
      }
    });

    on('join-room-go', () => this._joinRoom(document.getElementById('join-room-code').value));
    on('show-manual', () => this._showManual());
    on('host-copy', () => copyBox('host-code', 'friend-status'));
    on('join-copy', () => copyBox('join-reply', 'friend-status'));

    on('host-connect', async () => {
      const code = document.getElementById('host-reply').value.trim();
      if (!code) return this._say('Paste the reply code first.');
      try {
        await Net.acceptReply(code);
        this._armWhenConnected();
      } catch (e) {
        this._say('That reply code did not parse. Copy the whole thing.');
      }
    });

    on('join-go', async () => {
      const code = document.getElementById('join-code').value.trim();
      if (!code) return this._say('Paste their invite code first.');
      try {
        document.getElementById('join-reply').value = await Net.joinWithInvite(code, 'Friend');
        this._say('Send that reply code back \u2014 the match starts on their screen.');
      } catch (e) {
        this._say('That invite code did not parse. Copy the whole thing.');
      }
    });
  },

  _joinRoom(raw) {
    const code = String(raw || '').trim().toUpperCase();
    if (code.length !== 4) return this._say('Room codes are four characters.');
    this._resetFriends();
    this.show('friends');
    document.getElementById('host-room-code').textContent = code;
    this._say('Looking for room ' + code + '\u2026');
    Net.joinRoom(code, 'Friend', () =>
      this._showManual('Could not reach the room service. Swap the codes below instead.'));
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
  for (const el of grid.children) this._paintPower(el, BRAWLER_BY_ID[el.dataset.id]);
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

/* An invite link drops you straight into your friend's room. */
function joinFromUrl() {
  const code = new URLSearchParams(location.search).get('room');
  if (code && code.trim().length === 4) UI._joinRoom(code);
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  Renderer.init(canvas);
  Input.init(canvas);
  StarrDrop.init();
  UI.init();
  Game._last = performance.now();
  requestAnimationFrame((t) => Game.frame(t));
  joinFromUrl();
});
