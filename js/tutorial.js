/*
 * The first run.
 *
 * Four cards, shown once, explaining the only things you cannot work out by
 * pressing buttons: that your Super is aimed by dragging, that bushes hide
 * you, and that the range exists. Movement and shooting are left out on
 * purpose — nobody needs telling that WASD walks.
 *
 * Each card draws its own little diagram rather than describing itself, and
 * the text adapts to whether there is a touchscreen, because "click" and
 * "tap" being wrong is exactly the kind of thing that makes a tutorial feel
 * written for somebody else.
 */

const TUTORIAL = [
  {
    title: 'Welcome to Scrap Stars',
    body: {
      pad: 'Left stick walks, right stick aims. Drag it and let go to shoot where you pointed — a bare tap fires at whoever is nearest.',
      key: 'WASD walks, the mouse aims, click to shoot. Auto-aim nudges shots that were already close.',
    },
    art: 'move',
  },
  {
    title: 'Supers are aimed, not just fired',
    body: {
      pad: 'Your Super fills as you deal damage. Drag off the Super button to aim it and let go — tapping fires it at the best target.',
      key: 'Your Super fills as you deal damage. Space fires it where the mouse points, or drag the Super button to aim it.',
    },
    art: 'super',
  },
  {
    title: 'Bushes hide you',
    body: {
      pad: 'Stand in a bush and nobody sees you until they are close, or until you attack. Most fights are won before they start.',
      key: 'Stand in a bush and nobody sees you until they are close, or until you attack. Most fights are won before they start.',
    },
    art: 'bush',
  },
  {
    title: 'Try anything in the Range',
    body: {
      pad: 'The Practice Range has no clock and no score, and every fighter is playable there — including the ones you have not unlocked.',
      key: 'The Practice Range has no clock and no score, and every fighter is playable there — including the ones you have not unlocked.',
    },
    art: 'range',
  },
];

const Tutorial = {
  step: 0,

  /* Shown once. A save that already has anything in it is not a first run. */
  shouldShow() {
    try {
      if (localStorage.getItem('scrapstars.tutorial') === 'done') return false;
    } catch (e) { return false; }
    return true;
  },

  markSeen() {
    try { localStorage.setItem('scrapstars.tutorial', 'done'); } catch (e) { /* fine */ }
  },

  open(fromSettings) {
    this.step = 0;
    this.replaying = !!fromSettings;
    UI.show('tutorial');
    this.paint();
  },

  next() {
    this.step++;
    if (this.step >= TUTORIAL.length) return this.close();
    this.paint();
  },

  /* Back where you came from — a replay from Settings should not eject you. */
  close() {
    this.markSeen();
    if (this.replaying) { UI._buildSettings(); UI.show('settings'); }
    else UI.show('home');
  },

  paint() {
    const card = TUTORIAL[this.step];
    document.getElementById('tut-step').textContent = `${this.step + 1} / ${TUTORIAL.length}`;
    document.getElementById('tut-title').textContent = card.title;
    document.getElementById('tut-body').textContent =
      Input.usingTouch ? card.body.pad : card.body.key;
    document.getElementById('tut-next').textContent =
      this.step === TUTORIAL.length - 1 ? 'PLAY' : 'NEXT';
    this.paintArt(card.art);
  },

  /* A small diagram per card. Drawn, so it always matches the real art. */
  paintArt(kind) {
    const cv = document.getElementById('tut-art');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);

    const hero = (x, angle, def) => {
      ctx.save();
      ctx.translate(x, 14);
      ctx.scale(1.5, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(0, 24, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      Sprites.drawBrawler(ctx, {
        def: def || BRAWLERS[0], radius: 22, angle, vx: 0, vy: 0, id: 2, x: 0, y: 0,
      }, 0.6);
      ctx.restore();
    };

    if (kind === 'move') {
      ctx.strokeStyle = 'rgba(125,211,252,.85)';
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(-120, 40);
      ctx.quadraticCurveTo(-30, -30, 90, 20);
      ctx.stroke();
      ctx.setLineDash([]);
      hero(-120, 0.3);
      hero(90, 0.3);
    } else if (kind === 'super') {
      ctx.fillStyle = 'rgba(250,204,21,.28)';
      ctx.beginPath();
      ctx.moveTo(-70, 20);
      ctx.arc(-70, 20, 170, -0.5, 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.stroke();
      hero(-70, 0);
    } else if (kind === 'bush') {
      for (const bx of [-40, 10, 60, 35, -10]) {
        ctx.fillStyle = '#39913a';
        ctx.beginPath();
        ctx.arc(bx, 26 + (bx % 20) * 0.6, 34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.45;
      hero(10, 0.3);
      ctx.globalAlpha = 1;
      for (const bx of [-40, 60, 35]) {
        ctx.fillStyle = '#5cbf4d';
        ctx.beginPath();
        ctx.arc(bx, 20 + (bx % 20) * 0.6, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'range') {
      for (const [dx, r] of [[70, 34], [70, 23], [70, 12]]) {
        ctx.beginPath();
        ctx.arc(dx, 6, r, 0, Math.PI * 2);
        ctx.fillStyle = r === 23 ? '#fb7185' : '#f8fafc';
        ctx.fill();
        ctx.strokeStyle = '#3b1f14';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      hero(-80, 0);
    }
    ctx.restore();
  },
};
