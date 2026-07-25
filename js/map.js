/* Arena generation, tile queries, collision, line of sight and flow-field paths. */

const T_EMPTY = 0;
const T_ROCK = 1;    // indestructible
const T_CRATE = 2;   // destructible by supers
const T_BUSH = 3;    // walkable, hides whoever stands in it

const GameMap = {
  grid: new Uint8Array(MAP_W * MAP_H),
  spawns: [[], []],
  centerTx: (MAP_W - 1) >> 1,
  centerTy: (MAP_H - 1) >> 1,

  idx(tx, ty) { return ty * MAP_W + tx; },

  get(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T_ROCK;
    return this.grid[ty * MAP_W + tx];
  },

  set(tx, ty, v) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    this.grid[ty * MAP_W + tx] = v;
  },

  solid(tx, ty) {
    const t = this.get(tx, ty);
    return t === T_ROCK || t === T_CRATE;
  },

  solidAt(x, y) {
    return this.solid(Math.floor(x / TILE), Math.floor(y / TILE));
  },

  bushAt(x, y) {
    return this.get(Math.floor(x / TILE), Math.floor(y / TILE)) === T_BUSH;
  },

  centerX() { return (this.centerTx + 0.5) * TILE; },
  centerY() { return (this.centerTy + 0.5) * TILE; },

  /* Smash a destructible tile; returns true if something broke. */
  breakTile(tx, ty) {
    if (this.get(tx, ty) === T_CRATE) {
      this.set(tx, ty, T_EMPTY);
      return true;
    }
    return false;
  },

  generate(style) {
    this.style = MAP_STYLES[style] ? style : 'balanced';
    for (let attempt = 0; attempt < 40; attempt++) {
      this._layout(MAP_STYLES[this.style]);
      if (this._connected()) return;
    }
  },

  _layout(cfg) {
    this.grid.fill(T_EMPTY);

    // Solid border wall.
    for (let x = 0; x < MAP_W; x++) { this.set(x, 0, T_ROCK); this.set(x, MAP_H - 1, T_ROCK); }
    for (let y = 0; y < MAP_H; y++) { this.set(0, y, T_ROCK); this.set(MAP_W - 1, y, T_ROCK); }

    const cx = this.centerTx;

    // Scatter cover across the left half only, then mirror it 180° so both
    // teams get an identical arena.
    const shapes = [
      [[0, 0]],
      [[0, 0], [1, 0]],
      [[0, 0], [0, 1]],
      [[0, 0], [1, 0], [0, 1]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1]],
    ];

    for (let i = 0; i < 26; i++) {
      const shape = pick(shapes);
      const tx = randInt(2, cx);
      const ty = randInt(2, MAP_H - 3);
      const type = Math.random() < 0.42 ? T_CRATE : T_ROCK;
      for (const [ox, oy] of shape) this._place(tx + ox, ty + oy, type);
    }

    for (let i = 0; i < 16; i++) {
      const shape = pick(shapes);
      const tx = randInt(2, cx);
      const ty = randInt(2, MAP_H - 3);
      for (const [ox, oy] of shape) this._place(tx + ox, ty + oy, T_BUSH, true);
    }

    // 180° rotational mirror of the left half onto the right half.
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (x > cx || (x === cx && y > this.centerTy)) {
          this.set(x, y, this.get(MAP_W - 1 - x, MAP_H - 1 - y));
        }
      }
    }

    // Bushes flanking the gem mine, and a clear pocket around it.
    this._clearArea(this.centerTx, this.centerTy, 2);
    this.set(this.centerTx - 2, this.centerTy - 2, T_BUSH);
    this.set(this.centerTx + 2, this.centerTy + 2, T_BUSH);
    this.set(this.centerTx + 2, this.centerTy - 2, T_BUSH);
    this.set(this.centerTx - 2, this.centerTy + 2, T_BUSH);

    // Spawn pockets: three per team down each side.
    this.spawns = [[], []];
    const rows = [3, this.centerTy, MAP_H - 4];
    for (const ty of rows) {
      this._clearArea(2, ty, 1);
      this._clearArea(MAP_W - 3, ty, 1);
      this.spawns[TEAM_BLUE].push({ x: 2.5 * TILE, y: (ty + 0.5) * TILE });
      this.spawns[TEAM_RED].push({ x: (MAP_W - 2.5) * TILE, y: (ty + 0.5) * TILE });
    }
  },

  _place(tx, ty, type, overBush) {
    if (tx < 1 || ty < 1 || tx >= MAP_W - 1 || ty >= MAP_H - 1) return;
    const cur = this.get(tx, ty);
    if (cur !== T_EMPTY && !(overBush && cur === T_EMPTY)) return;
    this.set(tx, ty, type);
  },

  _clearArea(tx, ty, r) {
    for (let y = ty - r; y <= ty + r; y++) {
      for (let x = tx - r; x <= tx + r; x++) {
        if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
        this.set(x, y, T_EMPTY);
      }
    }
  },

  /* Every spawn point must be able to reach the mine. */
  _connected() {
    const seen = new Uint8Array(MAP_W * MAP_H);
    const queue = [this.idx(this.centerTx, this.centerTy)];
    seen[queue[0]] = 1;
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head];
      const x = i % MAP_W, y = (i / MAP_W) | 0;
      const near = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of near) {
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const ni = this.idx(nx, ny);
        if (seen[ni] || this.solid(nx, ny)) continue;
        seen[ni] = 1;
        queue.push(ni);
      }
    }
    for (const team of this.spawns) {
      for (const s of team) {
        const tx = Math.floor(s.x / TILE), ty = Math.floor(s.y / TILE);
        if (!seen[this.idx(tx, ty)]) return false;
      }
    }
    return true;
  },

  /* Clear shot between two world points? Crates and rocks block. */
  lineOfSight(x0, y0, x1, y1) {
    let tx = Math.floor(x0 / TILE), ty = Math.floor(y0 / TILE);
    const tx1 = Math.floor(x1 / TILE), ty1 = Math.floor(y1 / TILE);
    const dx = x1 - x0, dy = y1 - y0;
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tDeltaX = dx === 0 ? Infinity : Math.abs(TILE / dx);
    const tDeltaY = dy === 0 ? Infinity : Math.abs(TILE / dy);
    let tMaxX = dx === 0 ? Infinity
      : ((dx > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx));
    let tMaxY = dy === 0 ? Infinity
      : ((dy > 0 ? (ty + 1) * TILE - y0 : y0 - ty * TILE) / Math.abs(dy));

    let guard = 0;
    while (guard++ < 512) {
      if (tx === tx1 && ty === ty1) return true;
      if (tMaxX < tMaxY) { tMaxX += tDeltaX; tx += stepX; }
      else { tMaxY += tDeltaY; ty += stepY; }
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
      if (this.solid(tx, ty)) return false;
      if (tMaxX > 1 && tMaxY > 1) return true;
    }
    return false;
  },

  /*
   * Breadth-first distance field measured in tiles from a goal tile.
   * Bots walk downhill on it, which gets them round corners properly.
   */
  flowField(goalTx, goalTy) {
    const dist = new Int16Array(MAP_W * MAP_H).fill(-1);
    if (this.solid(goalTx, goalTy)) {
      const found = this._nearestOpen(goalTx, goalTy);
      if (!found) return dist;
      goalTx = found.tx; goalTy = found.ty;
    }
    const start = this.idx(goalTx, goalTy);
    dist[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head];
      const x = i % MAP_W, y = (i / MAP_W) | 0;
      const d = dist[i] + 1;
      const near = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of near) {
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const ni = this.idx(nx, ny);
        if (dist[ni] !== -1 || this.solid(nx, ny)) continue;
        dist[ni] = d;
        queue.push(ni);
      }
    }
    return dist;
  },

  _nearestOpen(tx, ty) {
    for (let r = 1; r < 8; r++) {
      for (let y = ty - r; y <= ty + r; y++) {
        for (let x = tx - r; x <= tx + r; x++) {
          if (!this.solid(x, y) && x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) {
            return { tx: x, ty: y };
          }
        }
      }
    }
    return null;
  },
};

/*
 * Move a circular body and push it back out of solid tiles.
 * Axes are resolved separately so bodies slide along walls instead of sticking.
 */
function moveAndCollide(body, dx, dy) {
  const r = body.radius;

  body.x += dx;
  if (dx !== 0) {
    const minTy = Math.floor((body.y - r) / TILE), maxTy = Math.floor((body.y + r) / TILE);
    const tx = Math.floor((body.x + (dx > 0 ? r : -r)) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      if (GameMap.solid(tx, ty)) {
        body.x = dx > 0 ? tx * TILE - r - 0.01 : (tx + 1) * TILE + r + 0.01;
        body.hitWallX = true;
        break;
      }
    }
  }

  body.y += dy;
  if (dy !== 0) {
    const minTx = Math.floor((body.x - r) / TILE), maxTx = Math.floor((body.x + r) / TILE);
    const ty = Math.floor((body.y + (dy > 0 ? r : -r)) / TILE);
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (GameMap.solid(tx, ty)) {
        body.y = dy > 0 ? ty * TILE - r - 0.01 : (ty + 1) * TILE + r + 0.01;
        body.hitWallY = true;
        break;
      }
    }
  }

  body.x = clamp(body.x, r, WORLD_W - r);
  body.y = clamp(body.y, r, WORLD_H - r);
}


/*
 * Arena flavours. Each named map below picks one of these, so Brawl Ball gets
 * open pitches you can actually run the ball down, and Heist gets dense cover
 * to sneak through.
 */
const MAP_STYLES = {
  open:     { cover: 13, bush: 10, crateRatio: 0.45, lanes: 0 },
  balanced: { cover: 22, bush: 15, crateRatio: 0.42, lanes: 0 },
  maze:     { cover: 34, bush: 12, crateRatio: 0.34, lanes: 0 },
  bushy:    { cover: 17, bush: 30, crateRatio: 0.5, lanes: 0 },
  lanes:    { cover: 12, bush: 12, crateRatio: 0.4, lanes: 6 },
};

/* Named maps, so a mode is somewhere rather than just something. */
const MAPS = {
  gem: [
    { name: 'Hard Rock Mine', style: 'balanced' },
    { name: 'Crystal Arcade', style: 'open' },
    { name: 'Undermine', style: 'maze' },
  ],
  brawlball: [
    { name: 'Backyard Bowl', style: 'open' },
    { name: 'Pinhole Punt', style: 'lanes' },
    { name: 'Sneaky Fields', style: 'bushy' },
  ],
  bounty: [
    { name: 'Snake Prairie', style: 'bushy' },
    { name: 'Shooting Star', style: 'open' },
    { name: 'Canal Grande', style: 'lanes' },
  ],
  heist: [
    { name: 'Safe Zone', style: 'balanced' },
    { name: 'Hot Potato', style: 'maze' },
    { name: 'Kaboom Canyon', style: 'lanes' },
  ],
  knockout: [
    { name: 'Goldarm Gulch', style: 'balanced' },
    { name: 'Belle\'s Rock', style: 'open' },
    { name: 'Flaring Phoenix', style: 'maze' },
  ],
};

function mapsFor(modeId) { return MAPS[modeId] || MAPS.gem; }
