/*
 * Character and prop art, drawn with paths — no image files anywhere.
 *
 * House style: chunky silhouettes, thick dark ink outline, one saturated body
 * colour with a lighter rim. Everyone is drawn upright facing right and gets
 * mirrored when aiming left, the way a 2D cartoon character reads; only the
 * weapon actually rotates to the aim angle.
 */

const INK = '#3b1f14';

function ink(ctx, w) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w || 3;
  ctx.stroke();
}
function circlePath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function ellPath(ctx, x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
}
function shape(ctx, pts, close) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close !== false) ctx.closePath();
}
function fillInk(ctx, color, w) {
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, w);
}

const Sprites = {
  /* Full character: legs, torso, head, face, then the brawler's own flourishes. */
  drawBrawler(ctx, b, time) {
    const d = b.def;
    const R = b.radius;
    const facingLeft = Math.cos(b.angle) < 0;
    const bob = Math.sin(time * 8 + b.id) * (Math.hypot(b.vx, b.vy) > 30 ? R * 0.05 : R * 0.015);

    ctx.save();
    ctx.translate(b.x, b.y + bob);

    // Weapon arm points where you aim, drawn behind the body when it swings back.
    const behind = Math.abs(angDiff(b.angle, facingLeft ? Math.PI : 0)) > Math.PI / 2;
    if (behind) this._weapon(ctx, b, R);

    ctx.save();
    ctx.scale(facingLeft ? -1 : 1, 1);
    this._legs(ctx, d, R, time, Math.hypot(b.vx, b.vy));
    this._torso(ctx, d, R);
    const art = ART[d.art];
    if (art) art(ctx, d, R, time);
    else this._head(ctx, d, R);
    ctx.restore();

    if (!behind) this._weapon(ctx, b, R);
    ctx.restore();
  },

  _legs(ctx, d, R, time, speed) {
    const swing = speed > 30 ? Math.sin(time * 12) * R * 0.22 : 0;
    ellPath(ctx, -R * 0.34 + swing, R * 0.86, R * 0.26, R * 0.20);
    fillInk(ctx, '#2f2a33', 2.5);
    ellPath(ctx, R * 0.34 - swing, R * 0.86, R * 0.26, R * 0.20);
    fillInk(ctx, '#2f2a33', 2.5);
  },

  _torso(ctx, d, R) {
    shape(ctx, [
      [-R * 0.62, R * 0.78], [-R * 0.72, -R * 0.10],
      [R * 0.72, -R * 0.10], [R * 0.62, R * 0.78],
    ]);
    ctx.fillStyle = d.color;
    ctx.fill();
    // Lighter rim along the top so the body reads as rounded.
    shape(ctx, [[-R * 0.72, -R * 0.10], [R * 0.72, -R * 0.10], [R * 0.66, R * 0.16], [-R * 0.66, R * 0.16]]);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fill();
    shape(ctx, [
      [-R * 0.62, R * 0.78], [-R * 0.72, -R * 0.10],
      [R * 0.72, -R * 0.10], [R * 0.62, R * 0.78],
    ]);
    ink(ctx, 3);
  },

  _head(ctx, d, R, opt) {
    const o = opt || {};
    const hy = -R * 0.72;
    circlePath(ctx, 0, hy, R * 0.78);
    fillInk(ctx, o.skin || d.skin || '#eec9a4', 3);
    if (o.noFace) return;
    // Eyes sit forward of centre so the head reads as turned.
    ellPath(ctx, R * 0.12, hy - R * 0.06, R * 0.20, R * 0.24);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ink(ctx, 2);
    ellPath(ctx, R * 0.42, hy - R * 0.06, R * 0.17, R * 0.22);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ink(ctx, 2);
    circlePath(ctx, R * 0.18, hy - R * 0.04, R * 0.09);
    ctx.fillStyle = INK;
    ctx.fill();
    circlePath(ctx, R * 0.46, hy - R * 0.04, R * 0.08);
    ctx.fill();
  },

  /* Held weapon, rotated to the aim angle. */
  _weapon(ctx, b, R) {
    const d = b.def;
    ctx.save();
    ctx.rotate(b.angle);
    ctx.translate(R * 0.5, R * 0.12);
    const w = WEAPON[d.art];
    if (w) w(ctx, d, R);
    ctx.restore();
  },

  /* ---------------- props ---------------- */

  gem(ctx, r) {
    shape(ctx, [
      [0, -r], [r * 0.86, -r * 0.28], [r * 0.56, r * 0.86],
      [-r * 0.56, r * 0.86], [-r * 0.86, -r * 0.28],
    ]);
    ctx.fillStyle = PALETTE.gem;
    ctx.fill();
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    shape(ctx, [[0, -r], [r * 0.3, -r * 0.1], [-r * 0.3, -r * 0.1]]);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fill();
  },

  ball(ctx, r, time) {
    circlePath(ctx, 0, 0, r);
    fillInk(ctx, '#f8fafc', 2.5);
    ctx.save();
    ctx.rotate(time * 1.4);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      circlePath(ctx, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.24);
      ctx.fillStyle = '#1f2937';
      ctx.fill();
    }
    circlePath(ctx, 0, 0, r * 0.28);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    ctx.restore();
  },

  safe(ctx, w, h, team, pct) {
    shape(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
    fillInk(ctx, '#4b5563', 4);
    shape(ctx, [[-w / 2 + 6, -h / 2 + 6], [w / 2 - 6, -h / 2 + 6], [w / 2 - 6, h / 2 - 6], [-w / 2 + 6, h / 2 - 6]]);
    fillInk(ctx, TEAM_COLOR[team], 3);
    circlePath(ctx, 0, 0, h * 0.22);
    fillInk(ctx, '#e5e7eb', 3);
    ctx.save();
    ctx.rotate(pct * Math.PI * 2);
    shape(ctx, [[-h * 0.16, 0], [h * 0.16, 0]]);
    ink(ctx, 4);
    ctx.restore();
  },
};

/* ------------------------------------------------------------------ */
/* Per-brawler heads and flourishes. Drawn in local space, facing right. */

const ART = {
  buckshot(ctx, d, R) {
    Sprites._head(ctx, d, R);
    const hy = -R * 0.72;
    // Swept-back hair with a shaved side.
    ctx.beginPath();
    ctx.moveTo(-R * 0.8, hy - R * 0.1);
    ctx.quadraticCurveTo(-R * 0.2, hy - R * 1.15, R * 0.62, hy - R * 0.5);
    ctx.quadraticCurveTo(R * 0.1, hy - R * 0.55, -R * 0.25, hy - R * 0.3);
    fillInk(ctx, d.hair, 2.5);
    ellPath(ctx, -R * 0.72, hy + R * 0.1, R * 0.2, R * 0.34, 0.3);
    fillInk(ctx, d.hair, 2);
  },
  sixer(ctx, d, R) {
    Sprites._head(ctx, d, R);
    const hy = -R * 0.72;
    // Cowboy hat: brim then crown.
    ellPath(ctx, 0, hy - R * 0.62, R * 1.2, R * 0.24);
    fillInk(ctx, '#1e3a8a', 2.5);
    shape(ctx, [[-R * 0.5, hy - R * 0.66], [-R * 0.38, hy - R * 1.2],
      [R * 0.38, hy - R * 1.2], [R * 0.5, hy - R * 0.66]]);
    fillInk(ctx, '#1e40af', 2.5);
  },
  ramrod(ctx, d, R) {
    Sprites._head(ctx, d, R);
    const hy = -R * 0.72;
    // Mohawk plus a beard.
    for (let i = -2; i <= 2; i++) {
      shape(ctx, [[i * R * 0.16 - R * 0.08, hy - R * 0.6],
        [i * R * 0.16, hy - R * 1.15 + Math.abs(i) * R * 0.12],
        [i * R * 0.16 + R * 0.08, hy - R * 0.6]]);
      fillInk(ctx, d.hair, 2);
    }
    ctx.beginPath();
    ctx.arc(R * 0.05, hy + R * 0.34, R * 0.55, 0, Math.PI);
    fillInk(ctx, d.hair, 2.5);
  },
  haymaker(ctx, d, R) {
    const hy = -R * 0.72;
    // Luchador mask instead of a face.
    circlePath(ctx, 0, hy, R * 0.8);
    fillInk(ctx, '#dc2626', 3);
    shape(ctx, [[-R * 0.8, hy - R * 0.1], [R * 0.8, hy - R * 0.1],
      [R * 0.5, hy - R * 0.55], [-R * 0.5, hy - R * 0.55]]);
    fillInk(ctx, '#fbbf24', 2.5);
    ellPath(ctx, R * 0.16, hy - R * 0.02, R * 0.2, R * 0.16);
    fillInk(ctx, '#fff', 2);
    ellPath(ctx, R * 0.5, hy - R * 0.02, R * 0.16, R * 0.14);
    fillInk(ctx, '#fff', 2);
    circlePath(ctx, R * 0.2, hy, R * 0.08);
    ctx.fillStyle = INK; ctx.fill();
  },
  carom(ctx, d, R) {
    const hy = -R * 0.72;
    // Robot: rounded shell, visor, antenna.
    circlePath(ctx, 0, hy, R * 0.8);
    fillInk(ctx, '#e2e8f0', 3);
    shape(ctx, [[-R * 0.62, hy - R * 0.18], [R * 0.66, hy - R * 0.22],
      [R * 0.66, hy + R * 0.2], [-R * 0.62, hy + R * 0.16]]);
    fillInk(ctx, '#1e293b', 2.5);
    ellPath(ctx, R * 0.28, hy, R * 0.16, R * 0.1);
    ctx.fillStyle = '#67e8f9'; ctx.fill();
    shape(ctx, [[0, hy - R * 0.78], [0, hy - R * 1.25]], false);
    ink(ctx, 3);
    circlePath(ctx, 0, hy - R * 1.32, R * 0.16);
    fillInk(ctx, d.color, 2);
  },
  tonic(ctx, d, R) {
    const hy = -R * 0.72;
    circlePath(ctx, 0, hy, R * 0.78);
    fillInk(ctx, '#94a3b8', 3);
    // Bartender's bowtie and a flat cap.
    shape(ctx, [[-R * 0.85, hy - R * 0.5], [R * 0.85, hy - R * 0.5],
      [R * 0.6, hy - R * 0.95], [-R * 0.6, hy - R * 0.95]]);
    fillInk(ctx, '#334155', 2.5);
    ellPath(ctx, R * 0.2, hy - R * 0.02, R * 0.19, R * 0.19);
    fillInk(ctx, '#fff', 2);
    circlePath(ctx, R * 0.26, hy, R * 0.09);
    ctx.fillStyle = INK; ctx.fill();
    shape(ctx, [[-R * 0.2, R * 0.02], [R * 0.2, R * 0.02], [0, R * 0.2]]);
    fillInk(ctx, '#ef4444', 2);
  },
  chorus(ctx, d, R) {
    const hy = -R * 0.72;
    // Skull face under a sombrero.
    circlePath(ctx, 0, hy, R * 0.76);
    fillInk(ctx, '#f8fafc', 3);
    circlePath(ctx, R * 0.16, hy - R * 0.04, R * 0.17);
    ctx.fillStyle = INK; ctx.fill();
    circlePath(ctx, R * 0.52, hy - R * 0.04, R * 0.14);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
      shape(ctx, [[i * R * 0.16 + R * 0.2, hy + R * 0.34], [i * R * 0.16 + R * 0.2, hy + R * 0.56]], false);
      ink(ctx, 2);
    }
    ellPath(ctx, 0, hy - R * 0.62, R * 1.35, R * 0.3);
    fillInk(ctx, '#facc15', 2.5);
    ellPath(ctx, 0, hy - R * 0.9, R * 0.55, R * 0.34);
    fillInk(ctx, '#fbbf24', 2.5);
  },
  longshot(ctx, d, R) {
    Sprites._head(ctx, d, R);
    const hy = -R * 0.72;
    // Wide sun hat with a ribbon.
    ellPath(ctx, 0, hy - R * 0.55, R * 1.45, R * 0.3);
    fillInk(ctx, '#fce7f3', 2.5);
    ellPath(ctx, 0, hy - R * 0.85, R * 0.6, R * 0.36);
    fillInk(ctx, '#fbcfe8', 2.5);
    shape(ctx, [[-R * 0.6, hy - R * 0.62], [R * 0.6, hy - R * 0.62]], false);
    ctx.strokeStyle = '#db2777'; ctx.lineWidth = 3; ctx.stroke();
  },
  shade(ctx, d, R) {
    Sprites._head(ctx, d, R, { skin: '#e6ecf5' });
    const hy = -R * 0.72;
    // Slicked-back widow's peak.
    ctx.beginPath();
    ctx.moveTo(-R * 0.78, hy - R * 0.2);
    ctx.quadraticCurveTo(0, hy - R * 1.3, R * 0.78, hy - R * 0.2);
    ctx.quadraticCurveTo(R * 0.3, hy - R * 0.42, 0, hy - R * 0.2);
    ctx.quadraticCurveTo(-R * 0.3, hy - R * 0.42, -R * 0.78, hy - R * 0.2);
    fillInk(ctx, d.hair, 2.5);
    // Collar.
    shape(ctx, [[-R * 0.7, -R * 0.1], [0, R * 0.3], [R * 0.7, -R * 0.1]]);
    fillInk(ctx, '#111827', 2.5);
  },
  thorn(ctx, d, R) {
    const hy = -R * 0.7;
    // Cactus body: spikes radiating off a round head.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      shape(ctx, [
        [Math.cos(a) * R * 0.6, hy + Math.sin(a) * R * 0.6],
        [Math.cos(a) * R * 1.25, hy + Math.sin(a) * R * 1.25],
        [Math.cos(a + 0.4) * R * 0.6, hy + Math.sin(a + 0.4) * R * 0.6],
      ]);
      fillInk(ctx, d.hair, 2);
    }
    circlePath(ctx, 0, hy, R * 0.72);
    fillInk(ctx, d.skin, 3);
    ellPath(ctx, R * 0.14, hy - R * 0.04, R * 0.18, R * 0.2);
    fillInk(ctx, '#fff', 2);
    ellPath(ctx, R * 0.46, hy - R * 0.04, R * 0.15, R * 0.18);
    fillInk(ctx, '#fff', 2);
    circlePath(ctx, R * 0.2, hy - R * 0.02, R * 0.08);
    ctx.fillStyle = INK; ctx.fill();
    circlePath(ctx, R * 0.48, hy - R * 0.02, R * 0.07);
    ctx.fill();
    // Little flower on top.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      circlePath(ctx, Math.cos(a) * R * 0.2, hy - R * 1.1 + Math.sin(a) * R * 0.2, R * 0.15);
      fillInk(ctx, '#fb7185', 1.5);
    }
  },
  sledge(ctx, d, R) {
    Sprites._head(ctx, d, R);
    const hy = -R * 0.72;
    // Flat-top hair and the bolts.
    shape(ctx, [[-R * 0.78, hy - R * 0.24], [-R * 0.72, hy - R * 0.78],
      [R * 0.72, hy - R * 0.78], [R * 0.78, hy - R * 0.24]]);
    fillInk(ctx, d.hair, 2.5);
    for (const sx of [-1, 1]) {
      circlePath(ctx, sx * R * 0.86, hy + R * 0.06, R * 0.16);
      fillInk(ctx, '#94a3b8', 2);
    }
    // Stitches.
    shape(ctx, [[-R * 0.3, hy + R * 0.4], [R * 0.34, hy + R * 0.4]], false);
    ink(ctx, 2);
  },
  ronin(ctx, d, R) {
    Sprites._head(ctx, d, R);
    const hy = -R * 0.72;
    // Topknot and a headband.
    circlePath(ctx, -R * 0.1, hy - R * 0.95, R * 0.26);
    fillInk(ctx, d.hair, 2.5);
    ctx.beginPath();
    ctx.arc(0, hy - R * 0.08, R * 0.8, Math.PI * 1.05, Math.PI * 1.95);
    fillInk(ctx, d.hair, 2.5);
    shape(ctx, [[-R * 0.85, hy - R * 0.28], [R * 0.85, hy - R * 0.34],
      [R * 0.85, hy - R * 0.06], [-R * 0.85, hy]]);
    fillInk(ctx, '#e11d48', 2.5);
    // Trailing headband tail.
    shape(ctx, [[-R * 0.8, hy - R * 0.2], [-R * 1.25, hy + R * 0.16],
      [-R * 1.15, hy + R * 0.36], [-R * 0.78, hy + R * 0.02]]);
    fillInk(ctx, '#e11d48', 2);
  },
  angler(ctx, d, R) {
    Sprites._head(ctx, d, R);
    const hy = -R * 0.72;
    // Bowl cut and a bucket hat.
    ctx.beginPath();
    ctx.arc(0, hy - R * 0.05, R * 0.8, Math.PI, 0);
    fillInk(ctx, d.hair, 2.5);
    ellPath(ctx, 0, hy - R * 0.6, R * 1.15, R * 0.24);
    fillInk(ctx, '#0ea5e9', 2.5);
    ellPath(ctx, 0, hy - R * 0.82, R * 0.55, R * 0.3);
    fillInk(ctx, '#38bdf8', 2.5);
  },
};

/* Weapons, drawn along +x from the shoulder. */
const WEAPON = {
  buckshot(ctx, d, R) {
    shape(ctx, [[0, -R * 0.16], [R * 1.35, -R * 0.2], [R * 1.35, R * 0.14], [0, R * 0.18]]);
    fillInk(ctx, '#7c3f2b', 2.5);
    shape(ctx, [[R * 0.5, -R * 0.22], [R * 1.5, -R * 0.24], [R * 1.5, R * 0.06], [R * 0.5, R * 0.08]]);
    fillInk(ctx, '#64748b', 2.5);
  },
  sixer(ctx, d, R) {
    shape(ctx, [[0, -R * 0.14], [R * 1.05, -R * 0.16], [R * 1.05, R * 0.08], [0, R * 0.14]]);
    fillInk(ctx, '#cbd5e1', 2.5);
    shape(ctx, [[R * 0.1, R * 0.12], [R * 0.34, R * 0.12], [R * 0.28, R * 0.5], [R * 0.06, R * 0.5]]);
    fillInk(ctx, '#78350f', 2);
  },
  ramrod(ctx, d, R) {
    shape(ctx, [[0, -R * 0.2], [R * 1.2, -R * 0.26], [R * 1.2, R * 0.2], [0, R * 0.24]]);
    fillInk(ctx, '#44403c', 3);
    ellPath(ctx, R * 1.2, -R * 0.04, R * 0.14, R * 0.24);
    fillInk(ctx, '#78716c', 2);
  },
  haymaker(ctx, d, R) {
    circlePath(ctx, R * 0.85, 0, R * 0.42);
    fillInk(ctx, d.color, 3);
    circlePath(ctx, R * 0.85, 0, R * 0.2);
    fillInk(ctx, '#fbbf24', 2);
  },
  carom(ctx, d, R) {
    shape(ctx, [[0, -R * 0.16], [R * 1.3, -R * 0.2], [R * 1.3, R * 0.12], [0, R * 0.16]]);
    fillInk(ctx, '#e2e8f0', 2.5);
    circlePath(ctx, R * 1.3, -R * 0.04, R * 0.13);
    fillInk(ctx, '#a78bfa', 2);
  },
  tonic(ctx, d, R) {
    shape(ctx, [[R * 0.2, -R * 0.3], [R * 0.62, -R * 0.3], [R * 0.62, R * 0.34], [R * 0.2, R * 0.34]]);
    fillInk(ctx, '#16a34a', 2.5);
    shape(ctx, [[R * 0.62, -R * 0.12], [R * 1.0, -R * 0.1], [R * 1.0, R * 0.12], [R * 0.62, R * 0.14]]);
    fillInk(ctx, '#16a34a', 2);
  },
  chorus(ctx, d, R) {
    ellPath(ctx, R * 0.55, R * 0.1, R * 0.62, R * 0.44);
    fillInk(ctx, '#b45309', 2.5);
    circlePath(ctx, R * 0.62, R * 0.1, R * 0.16);
    ctx.fillStyle = INK; ctx.fill();
    shape(ctx, [[R * 1.1, R * 0.06], [R * 1.75, R * 0.0]], false);
    ink(ctx, 4);
  },
  longshot(ctx, d, R) {
    shape(ctx, [[0, -R * 0.08], [R * 1.5, -R * 0.12], [R * 1.5, R * 0.06], [0, R * 0.1]]);
    fillInk(ctx, '#e879b9', 2.5);
    ctx.beginPath();
    ctx.arc(R * 1.5, -R * 0.03, R * 0.34, -Math.PI / 2, Math.PI / 2);
    fillInk(ctx, '#f9a8d4', 2.5);
  },
  shade(ctx, d, R) {
    shape(ctx, [[0, 0], [R * 1.15, -R * 0.1]], false);
    ink(ctx, 4);
    shape(ctx, [[R * 1.1, -R * 0.36], [R * 1.55, -R * 0.3], [R * 1.5, R * 0.24], [R * 1.05, R * 0.16]]);
    fillInk(ctx, '#cbd5e1', 2.5);
  },
  thorn(ctx, d, R) {
    circlePath(ctx, R * 0.7, 0, R * 0.26);
    fillInk(ctx, d.hair, 2.5);
  },
  sledge(ctx, d, R) {
    // Big two-handed hammer.
    shape(ctx, [[0, R * 0.04], [R * 1.3, -R * 0.16]], false);
    ink(ctx, 6);
    shape(ctx, [[R * 1.15, -R * 0.62], [R * 1.85, -R * 0.74],
      [R * 1.95, R * 0.2], [R * 1.25, R * 0.3]]);
    fillInk(ctx, '#78716c', 3);
    shape(ctx, [[R * 1.22, -R * 0.5], [R * 1.8, -R * 0.6]], false);
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
  },
  ronin(ctx, d, R) {
    // Katana: long blade with a small guard.
    shape(ctx, [[R * 0.2, -R * 0.06], [R * 1.85, -R * 0.22],
      [R * 1.95, -R * 0.02], [R * 0.2, R * 0.12]]);
    fillInk(ctx, '#e2e8f0', 2.5);
    shape(ctx, [[R * 0.1, -R * 0.24], [R * 0.28, -R * 0.24],
      [R * 0.28, R * 0.3], [R * 0.1, R * 0.3]]);
    fillInk(ctx, '#facc15', 2);
    shape(ctx, [[-R * 0.35, R * 0.04], [R * 0.12, R * 0.02]], false);
    ink(ctx, 5);
  },
  angler(ctx, d, R) {
    shape(ctx, [[0, 0], [R * 1.7, -R * 0.5]], false);
    ink(ctx, 3.5);
    shape(ctx, [[R * 1.7, -R * 0.5], [R * 1.95, -R * 0.05]], false);
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    circlePath(ctx, R * 1.98, 0, R * 0.12);
    fillInk(ctx, '#e2e8f0', 1.5);
  },
};
