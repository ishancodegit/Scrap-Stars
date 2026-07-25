/* Home screen, mode picker, brawler picker and the result screen. */

const UI = {
  brawler: BRAWLERS[0].id,
  mode: 'gem',

  init() {
    this._buildBrawlers();
    this._buildModes();
    this._refreshHome();

    on('play', () => this.startMatch());
    on('again', () => this.startMatch());
    on('pick-brawler', () => this.show('brawlers'));
    on('pick-mode', () => this.show('modes'));
    on('brawlers-back', () => this.show('home'));
    on('modes-back', () => this.show('home'));
    on('result-home', () => { Game.state = 'menu'; this.show('home'); });

    const aa = document.getElementById('autoaim');
    const paintAA = () => {
      aa.classList.toggle('on', Input.autoAim);
      aa.innerHTML = `Auto-aim: <b>${Input.autoAim ? 'On' : 'Off'}</b>`;
    };
    aa.addEventListener('click', () => { Input.autoAim = !Input.autoAim; paintAA(); });
    paintAA();

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
      if (k === 't') {
        Input.autoAim = !Input.autoAim;
        const el = document.getElementById('autoaim');
        el.classList.toggle('on', Input.autoAim);
        el.innerHTML = `Auto-aim: <b>${Input.autoAim ? 'On' : 'Off'}</b>`;
      }
      if ((k === 'p' || k === 'escape') && Game.state === 'playing') {
        Game.paused = !Game.paused;
        document.getElementById('paused').classList.toggle('hidden', !Game.paused);
      }
    });
  },

  show(which) {
    for (const id of ['home', 'brawlers', 'modes', 'result', 'paused']) {
      document.getElementById(id).classList.toggle('hidden', id !== which);
    }
    if (which === 'home') this._refreshHome();
  },

  /* ---------------- home ---------------- */

  _refreshHome() {
    const def = BRAWLER_BY_ID[this.brawler];
    const mode = MODES[this.mode];
    paintPortrait(document.getElementById('home-portrait'), def, 1.15);
    document.getElementById('home-brawler-name').textContent = def.name;
    document.getElementById('home-brawler-class').textContent = CLASSES[def.cls];
    document.getElementById('home-brawler-class').style.color = def.color;
    document.getElementById('home-mode-name').textContent = mode.name;
    document.getElementById('home-mode-blurb').textContent = mode.blurb;
    paintModeIcon(document.getElementById('home-mode-icon'), mode);
  },

  /* ---------------- pickers ---------------- */

  _buildBrawlers() {
    const grid = document.getElementById('brawler-grid');
    grid.innerHTML = '';
    for (const b of BRAWLERS) {
      const card = document.createElement('button');
      card.className = 'card brawler' + (b.id === this.brawler ? ' active' : '');
      card.dataset.id = b.id;
      card.innerHTML = `
        <canvas class="portrait" width="150" height="150"></canvas>
        <div class="cname">${b.name}</div>
        <div class="ccls" style="color:${b.color}">${CLASSES[b.cls]}</div>
        <div class="cblurb">${b.blurb}</div>
        <div class="cstats">
          <span><i style="background:#34d399"></i>${b.hp}</span>
          <span><i style="background:#f97316"></i>${b.attack.damage || 0}${b.attack.count > 1 ? '×' + b.attack.count : ''}</span>
          <span><i style="background:#60a5fa"></i>${Math.round(specRange(b.attack))}</span>
        </div>
        <div class="ctip">${b.tip}</div>`;
      card.addEventListener('click', () => {
        this.brawler = b.id;
        for (const el of grid.children) el.classList.toggle('active', el.dataset.id === b.id);
        Sfx.resume();
        Sfx.play('tick');
        setTimeout(() => this.show('home'), 140);
      });
      grid.appendChild(card);
      paintPortrait(card.querySelector('.portrait'), b, 1);
    }
  },

  _buildModes() {
    const list = document.getElementById('mode-list');
    list.innerHTML = '';
    for (const m of MODE_LIST) {
      const card = document.createElement('button');
      card.className = 'card mode' + (m.id === this.mode ? ' active' : '');
      card.dataset.id = m.id;
      card.innerHTML = `
        <canvas class="modeicon" width="96" height="96"></canvas>
        <div class="mbody">
          <div class="cname">${m.name} <em>${m.tag}</em></div>
          <div class="cblurb">${m.blurb}</div>
        </div>`;
      card.addEventListener('click', () => {
        this.mode = m.id;
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
    for (const id of ['home', 'brawlers', 'modes', 'result', 'paused']) {
      document.getElementById(id).classList.add('hidden');
    }
    Game.start(this.brawler, this.mode, Game.difficulty);
  },

  showResult(winner) {
    this.show('result');
    const title = document.getElementById('result-title');
    if (winner === Game.playerTeam) { title.textContent = 'VICTORY'; title.className = 'win'; }
    else if (winner === -1) { title.textContent = 'DRAW'; title.className = 'draw'; }
    else { title.textContent = 'DEFEAT'; title.className = 'lose'; }

    const s = Game.mode.score ? Game.mode.score(Game) : ['0', '0'];
    document.getElementById('result-sub').textContent =
      `${Game.mode.name} · ${s[Game.playerTeam]} — ${s[1 - Game.playerTeam]}`;

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
};

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

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  Renderer.init(canvas);
  Input.init(canvas);
  UI.init();
  Game._last = performance.now();
  requestAnimationFrame((t) => Game.frame(t));
});
