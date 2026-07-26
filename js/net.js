/*
 * Playing with a friend.
 *
 * The game is hosted on static files with no backend of any kind, so there is
 * nothing to run a lobby server on. Instead two browsers talk directly over a
 * WebRTC data channel, and the one piece a server would normally do — handing
 * each side the other's connection details — is done by the players copying a
 * code to each other. Slightly manual, but it needs no accounts, no service,
 * and nothing to keep paying for.
 *
 * The host simulates everything and is the only authority. The guest sends
 * input and draws whatever the host last told it, interpolated so movement
 * stays smooth between snapshots. That means a laggy guest can never desync
 * the match — the worst it sees is a slightly stale world.
 *
 * ICE candidates are not trickled. Both sides wait for gathering to finish so
 * the code they hand over is complete on its own; there is no second channel
 * to send late candidates through.
 */

const NET = {
  snapshotHz: 20,
  inputHz: 30,
  // Enemies further than this from the guest are culled from snapshots while
  // hidden, so a guest cannot read bushes the host can see through.
  cullDist: 900,
};

const Net = {
  role: null,            // null | 'host' | 'guest'
  pc: null,
  ch: null,
  connected: false,
  status: 'idle',
  onStatus: null,
  onInit: null,

  remoteInput: null,     // host: latest input the guest sent
  snapshot: null,        // guest: latest world the host sent
  prevSnapshot: null,
  snapTime: 0,
  guestName: 'Friend',

  _sendAcc: 0,
  _inputAcc: 0,

  get active() { return this.role !== null; },
  get isHost() { return this.role === 'host'; },
  get isGuest() { return this.role === 'guest'; },

  _set(status) {
    this.status = status;
    if (this.onStatus) this.onStatus(status);
  },

  /* ---------------- signalling ---------------- */

  _newPeer() {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === 'failed' || s === 'disconnected' || s === 'closed') this._drop();
    };
    return pc;
  },

  /* Wait until every candidate is in the local description. */
  _gathered(pc) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      // Some networks never finish gathering; ship what we have rather than
      // leaving the player staring at a spinner.
      const done = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(done, 3000);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') done();
      });
    });
  },

  async _pack(obj) {
    const json = JSON.stringify(obj);
    if (typeof CompressionStream === 'undefined') return 'R' + btoa(json);
    const cs = new CompressionStream('deflate-raw');
    const buf = await new Response(
      new Blob([json]).stream().pipeThrough(cs)
    ).arrayBuffer();
    let s = '';
    for (const byte of new Uint8Array(buf)) s += String.fromCharCode(byte);
    return 'Z' + btoa(s);
  },

  async _unpack(code) {
    const body = code.trim().replace(/\s+/g, '');
    const kind = body[0];
    const raw = atob(body.slice(1));
    if (kind === 'R') return JSON.parse(raw);
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const ds = new DecompressionStream('deflate-raw');
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    return JSON.parse(out);
  },

  /* Host step 1: produce the invite code. */
  async createInvite() {
    this.close();
    this.role = 'host';
    this._set('creating');
    this.pc = this._newPeer();
    this.ch = this.pc.createDataChannel('play', { ordered: false, maxRetransmits: 0 });
    this._wireChannel(this.ch);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this._gathered(this.pc);
    this._set('waiting');
    return this._pack({ v: 1, d: this.pc.localDescription.sdp });
  },

  /* Host step 2: take the friend's reply. */
  async acceptReply(code) {
    const msg = await this._unpack(code);
    await this.pc.setRemoteDescription({ type: 'answer', sdp: msg.d });
    if (msg.name) this.guestName = String(msg.name).slice(0, 14) || 'Friend';
    this._set('connecting');
  },

  /* Guest: take the invite, produce the reply. */
  async joinWithInvite(code, name) {
    this.close();
    this.role = 'guest';
    this._set('joining');
    const msg = await this._unpack(code);
    this.pc = this._newPeer();
    this.pc.ondatachannel = (e) => { this.ch = e.channel; this._wireChannel(this.ch); };
    await this.pc.setRemoteDescription({ type: 'offer', sdp: msg.d });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this._gathered(this.pc);
    this._set('connecting');
    return this._pack({ v: 1, d: this.pc.localDescription.sdp, name: name || 'Friend' });
  },

  _wireChannel(ch) {
    ch.binaryType = 'arraybuffer';
    ch.onopen = () => {
      this.connected = true;
      this._set('connected');
      // Deliberately no init here: the host has not built a match yet, and an
      // init carrying an empty roster would leave the guest with nothing to be.
      // Game.start sends it once the world actually exists.
    };
    ch.onclose = () => this._drop();
    ch.onmessage = (e) => this._receive(e.data);
  },

  _drop() {
    if (!this.active) return;
    const wasConnected = this.connected;
    this.connected = false;
    this._set(wasConnected ? 'lost' : 'failed');
    if (wasConnected && typeof Game !== 'undefined' && Game.state === 'playing') {
      Game.log('Your friend disconnected', '#fca5a5');
      // The host can carry on against bots; a guest has nothing left to draw.
      if (this.isHost) {
        const g = Game.brawlers.find((b) => b.isRemote);
        if (g) { g.isRemote = false; g.isBot = true; g.ai = makeBrain(); }
      } else {
        Game.finish(-1);
      }
    }
    this.role = null;
  },

  close() {
    if (this.ch) { try { this.ch.close(); } catch (e) { /* already gone */ } }
    if (this.pc) { try { this.pc.close(); } catch (e) { /* already gone */ } }
    this.ch = null;
    this.pc = null;
    this.role = null;
    this.connected = false;
    this.snapshot = null;
    this.prevSnapshot = null;
    this.remoteInput = null;
  },

  send(obj) {
    if (!this.ch || this.ch.readyState !== 'open') return;
    try { this.ch.send(JSON.stringify(obj)); } catch (e) { /* channel full, skip a frame */ }
  },

  _receive(data) {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    if (msg.t === 'init') {
      if (this.onInit) this.onInit(msg);
    } else if (msg.t === 's') {
      this.prevSnapshot = this.snapshot;
      this.snapshot = msg;
      this.snapTime = 0;
    } else if (msg.t === 'i') {
      this.remoteInput = msg;
    } else if (msg.t === 'end') {
      if (typeof Game !== 'undefined' && Game.state === 'playing') Game.finish(msg.w);
    } else if (msg.t === 'log') {
      if (typeof Game !== 'undefined') Game.log(msg.m, msg.c);
    }
  },

  /* ---------------- match setup ---------------- */

  /*
   * Everything the guest needs to build an identical world once: the map it
   * cannot generate itself (generation is random), and who is in the lobby.
   */
  _sendInit() {
    const g = Game;
    let tiles = '';
    for (let i = 0; i < GameMap.grid.length; i++) tiles += GameMap.grid[i];
    this.send({
      t: 'init',
      mode: g.mode.id,
      map: g.mapDef ? g.mapDef.name : '',
      style: GameMap.style,
      tiles,
      spawns: GameMap.spawns.map((side) => side.map((s) => [Math.round(s.x), Math.round(s.y)])),
      time: g.mode.time,
      you: g.brawlers.findIndex((b) => b.isRemote),
      line: g.brawlers.map((b) => ({
        d: b.def.id, n: b.name, t: b.team,
        c: b.def.color, s: b.def.skin, h: b.def.hair, p: b.power,
      })),
    });
  },

  /* ---------------- per-frame traffic ---------------- */

  hostTick(dt) {
    if (!this.connected || !this.isHost) return;
    this._sendAcc += dt;
    const step = 1 / NET.snapshotHz;
    if (this._sendAcc < step) return;
    this._sendAcc = 0;
    this.send(this._snapshot());
  },

  guestTick(dt) {
    this.snapTime += dt;
    if (!this.connected || !this.isGuest) return;
    this._inputAcc += dt;
    const step = 1 / NET.inputHz;
    if (this._inputAcc < step) return;
    this._inputAcc = 0;
    const p = Game.player;
    if (!p) return;
    const i = p.input;
    this.send({
      t: 'i',
      x: +i.mx.toFixed(2), y: +i.my.toFixed(2),
      a: +i.aim.toFixed(3), d: Math.round(i.aimDist),
      f: i.fire ? 1 : 0, s: i.super ? 1 : 0, h: i.hyper ? 1 : 0, o: i.holding ? 1 : 0,
    });
  },

  _snapshot() {
    const g = Game;
    const guest = g.brawlers.find((b) => b.isRemote);
    const r1 = (v) => Math.round(v);
    const r3 = (v) => +v.toFixed(2);

    const bs = [];
    for (let i = 0; i < g.brawlers.length; i++) {
      const b = g.brawlers[i];
      // Do not hand the guest positions it has not earned.
      if (guest && b.team !== guest.team && b.hidden &&
          dist(b.x, b.y, guest.x, guest.y) > NET.cullDist) continue;
      bs.push([i, r1(b.x), r1(b.y), r3(b.angle), r1(b.hp), b.alive ? 1 : 0,
        b.gems, r1(b.charge), r1(b.hyperCharge), r3(b.hyperActive),
        r1(b.shieldHp), b.ammo, r3(b.respawnTimer), b.hidden ? 1 : 0]);
    }

    return {
      t: 's',
      tl: r3(g.timeLeft),
      sc: g.teamScore.slice(),
      lt: g.lockTeam, lk: r3(g.lockTimer),
      b: bs,
      p: g.projectiles.map((p) => [r1(p.x), r1(p.y), r3(p.angle), r1(p.radius), p.color]),
      l: g.lobs.map((l) => [r1(l.x), r1(l.y), r3(l.z || 0), l.color]),
      m: g.gems.map((x) => [r1(x.x), r1(x.y)]),
      a: g.areas.map((a) => [r1(a.x), r1(a.y), r1(a.radius), a.color || '#fff']),
      w: g.tempWalls.length,
      bl: g.ball ? [r1(g.ball.x), r1(g.ball.y), g.ball.carrier ? g.brawlers.indexOf(g.ball.carrier) : -1] : null,
      sf: g.safes.map((s) => [r1(s.x), r1(s.y), r1(s.hp), r1(s.maxHp), s.team]),
    };
  },

  /*
   * Push the last snapshot onto the guest's world. Positions are eased rather
   * than snapped: at 20Hz a hard assignment reads as a stutter, and the error
   * from easing is far smaller than the snapshot interval anyway.
   */
  applySnapshot(dt) {
    const s = this.snapshot;
    if (!s || !this.isGuest) return;
    const g = Game;

    g.timeLeft = s.tl;
    g.teamScore = s.sc;
    g.lockTeam = s.lt;
    g.lockTimer = s.lk;

    const seen = new Set();
    for (const row of s.b) {
      const [i, x, y, ang, hp, alive, gems, charge, hyper, hyperActive, shield, ammo, respawn, hidden] = row;
      const b = g.brawlers[i];
      if (!b) continue;
      seen.add(i);
      const k = 1 - Math.pow(0.0001, dt);          // frame-rate independent ease
      if (Math.hypot(x - b.x, y - b.y) > 260) { b.x = x; b.y = y; }   // teleport/respawn
      else { b.x += (x - b.x) * k; b.y += (y - b.y) * k; }
      b.angle = ang;
      if (hp < b.hp) b.hurtFlash = 1;
      b.hp = hp;
      b.alive = !!alive;
      b.gems = gems;
      b.charge = charge;
      b.hyperCharge = hyper;
      b.hyperActive = hyperActive;
      b.shieldHp = shield;
      b.ammo = ammo;
      b.respawnTimer = respawn;
      b.netHidden = !!hidden;
    }
    // Anything the host did not mention is out of sight.
    for (let i = 0; i < g.brawlers.length; i++) {
      if (!seen.has(i) && g.brawlers[i] !== g.player) g.brawlers[i].netHidden = true;
    }

    g.projectiles = s.p.map(([x, y, angle, radius, color]) =>
      ({ x, y, angle, radius, color, trail: [] }));
    g.lobs = s.l.map(([x, y, z, color]) => ({ x, y, z, color, shadow: true }));
    g.gems = s.m.map(([x, y]) => ({ x, y, radius: 9, delay: 0, bob: 0 }));
    g.areas = s.a.map(([x, y, radius, color]) => ({ x, y, radius, color, life: 1, maxLife: 1 }));
    g.safes = s.sf.map(([x, y, hp, maxHp, team]) => ({ x, y, hp, maxHp, team, radius: 34, isSafe: true }));
    if (s.bl) {
      g.ball = g.ball || {};
      g.ball.x = s.bl[0];
      g.ball.y = s.bl[1];
      g.ball.carrier = s.bl[2] >= 0 ? g.brawlers[s.bl[2]] : null;
    }
  },
};
