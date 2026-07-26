/*
 * Room codes.
 *
 * Copy-pasting a kilobyte of SDP works but is miserable, so this swaps it for
 * a four-character code. Two players need to hand each other one message each;
 * that is the whole job, and it does not justify running a server.
 *
 * So it borrows one: a public MQTT broker, spoken over a WebSocket. No account,
 * no key, no project to create. The room code is just a topic name — the host
 * retains its offer on `<room>/offer`, the guest picks it up whenever it joins
 * and answers on `<room>/answer`. Once WebRTC connects, the broker is dropped
 * and every packet after that is peer to peer.
 *
 * Only the handshake goes through the broker, and it carries nothing but ICE
 * candidates and codec lists — no gameplay and nothing personal. Rooms are
 * four characters from an unambiguous alphabet, so a collision means two
 * strangers hearing each other's offers; the code checks that what came back
 * is an answer to its own offer and ignores anything else.
 *
 * The broker is the one part of this that can be down without warning, so
 * every entry point falls back to the manual code exchange, which needs
 * nothing but the two players.
 */

/*
 * How two players find a route to each other.
 *
 * STUN is enough when at least one side is behind an ordinary home router: it
 * discovers the public address and the two punch a hole straight through. It
 * is not enough behind symmetric NAT, which mobile carriers and most school
 * and office networks use — there the port changes per destination, so the
 * address one side learns is useless to the other.
 *
 * That case needs a relay to sit in the middle and forward packets, which is
 * what TURN is. Without one, roughly one pairing in five simply cannot connect
 * however long it waits, and mobile-data to mobile-data almost never does.
 * These are the free open relays; they are rate limited and not fast, but a
 * relayed match beats no match.
 */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const SIGNAL = {
  // Public brokers, tried in order. Any one of them being down or blocked on a
  // given network should not be the end of the feature.
  urls: [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
  ],
  prefix: 'scrapstars/rooms/',
  // Rooms read out loud, so no O/0 or I/1.
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  connectTimeout: 9000,
  keepAlive: 45,
};

/*
 * The slice of MQTT 3.1.1 this needs: connect, subscribe, publish, ping.
 * Writing it out is less code than shipping a library, and it means the page
 * still has no dependencies and no CDN to be blocked.
 */
const Mqtt = {
  /* Remaining Length is a base-128 varint, up to four bytes. */
  _varint(n) {
    const out = [];
    do {
      let byte = n % 128;
      n = Math.floor(n / 128);
      if (n > 0) byte |= 0x80;
      out.push(byte);
    } while (n > 0);
    return out;
  },

  _readVarint(buf, i) {
    let mult = 1, value = 0, byte;
    do {
      if (i >= buf.length) return null;
      byte = buf[i++];
      value += (byte & 127) * mult;
      mult *= 128;
      if (mult > 128 * 128 * 128) return null;
    } while (byte & 0x80);
    return { value, next: i };
  },

  _str(s) {
    const bytes = new TextEncoder().encode(s);
    return [bytes.length >> 8, bytes.length & 255, ...bytes];
  },

  packet(type, flags, body) {
    return new Uint8Array([(type << 4) | flags, ...this._varint(body.length), ...body]);
  },

  connect(clientId) {
    const body = [
      ...this._str('MQTT'), 4,            // protocol name + level
      0x02,                               // clean session, no will, no auth
      SIGNAL.keepAlive >> 8, SIGNAL.keepAlive & 255,
      ...this._str(clientId),
    ];
    return this.packet(1, 0, body);
  },

  subscribe(id, topic) {
    return this.packet(8, 2, [id >> 8, id & 255, ...this._str(topic), 0]);
  },

  /* QoS 0. Retain keeps an offer waiting for a guest who has not joined yet. */
  publish(topic, payload, retain) {
    const bytes = new TextEncoder().encode(payload);
    return this.packet(3, retain ? 1 : 0, [...this._str(topic), ...bytes]);
  },

  pingreq() { return this.packet(12, 0, []); },
  disconnect() { return this.packet(14, 0, []); },

  /*
   * Pull whole packets out of a stream. Returns the ones that completed plus
   * whatever bytes are left over, since a WebSocket frame can split or merge
   * them however it likes.
   */
  parse(buf) {
    const out = [];
    let i = 0;
    while (i < buf.length) {
      const type = buf[i] >> 4;
      const header = this._readVarint(buf, i + 1);
      if (!header) break;
      const end = header.next + header.value;
      if (end > buf.length) break;                 // packet still arriving
      const body = buf.subarray(header.next, end);
      if (type === 3) {                            // PUBLISH
        const tlen = (body[0] << 8) | body[1];
        out.push({
          type,
          topic: new TextDecoder().decode(body.subarray(2, 2 + tlen)),
          payload: new TextDecoder().decode(body.subarray(2 + tlen)),
        });
      } else {
        out.push({ type });
      }
      i = end;
    }
    return { packets: out, rest: buf.subarray(i) };
  },
};

const Rooms = {
  ws: null,
  room: null,
  _buf: new Uint8Array(0),
  _ping: 0,
  _subId: 1,
  onMessage: null,
  onReady: null,
  onFail: null,

  newCode() {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += SIGNAL.alphabet[Math.floor(Math.random() * SIGNAL.alphabet.length)];
    }
    return s;
  },

  connect(room, subTopic, attempt) {
    this.close();
    this.room = room;
    this._sub = subTopic;
    const which = attempt || 0;
    let settled = false;
    const fail = (why) => {
      if (settled) return;
      settled = true;
      this.close();
      // Move down the list before giving up entirely.
      if (which + 1 < SIGNAL.urls.length) return this.connect(room, subTopic, which + 1);
      if (this.onFail) this.onFail(why);
    };

    let ws;
    try {
      ws = new WebSocket(SIGNAL.urls[which], 'mqtt');
    } catch (e) {
      return fail('no-websocket');
    }
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    const timer = setTimeout(() => fail('timeout'), SIGNAL.connectTimeout);

    ws.onopen = () => ws.send(Mqtt.connect('ss-' + Math.random().toString(36).slice(2, 10)));
    ws.onerror = () => fail('error');
    ws.onclose = () => fail('closed');

    ws.onmessage = (e) => {
      const chunk = new Uint8Array(e.data);
      const merged = new Uint8Array(this._buf.length + chunk.length);
      merged.set(this._buf);
      merged.set(chunk, this._buf.length);
      const { packets, rest } = Mqtt.parse(merged);
      this._buf = rest;

      for (const pk of packets) {
        if (pk.type === 2) {                       // CONNACK
          ws.send(Mqtt.subscribe(this._subId++, SIGNAL.prefix + room + '/' + subTopic));
        } else if (pk.type === 9) {                // SUBACK — the room is live
          clearTimeout(timer);
          settled = true;
          this._ping = setInterval(() => {
            if (ws.readyState === 1) ws.send(Mqtt.pingreq());
          }, SIGNAL.keepAlive * 500);
          if (this.onReady) this.onReady();
        } else if (pk.type === 3 && this.onMessage) {
          try { this.onMessage(JSON.parse(pk.payload)); } catch (err) { /* not ours */ }
        }
      }
    };
  },

  publish(topic, obj, retain) {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(Mqtt.publish(SIGNAL.prefix + this.room + '/' + topic, JSON.stringify(obj), retain));
  },

  /* Clear the retained offer so the room does not answer strangers later. */
  clearRetained(topic) {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(Mqtt.publish(SIGNAL.prefix + this.room + '/' + topic, '', true));
  },

  close() {
    clearInterval(this._ping);
    if (this.ws) {
      try {
        if (this.ws.readyState === 1) this.ws.send(Mqtt.disconnect());
        this.ws.close();
      } catch (e) { /* already gone */ }
    }
    this.ws = null;
    this._buf = new Uint8Array(0);
  },
};
