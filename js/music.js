/*
 * The soundtrack.
 *
 * Written rather than recorded: there are no audio files anywhere in this
 * project, so the music is composed here as note data and played through the
 * same WebAudio graph as the sound effects. That keeps the whole game a single
 * download and means the score can react to the match instead of looping over
 * the top of it.
 *
 * Two pieces. The menu theme is slow and warm and mostly gets out of the way.
 * The battle theme is the same key a fifth up, so cutting between them at
 * kick-off sounds like a transition rather than like one track stopping and
 * another starting.
 *
 * Scheduling is the standard WebAudio look-ahead: a timer wakes every 25ms and
 * books every note that falls inside the next tenth of a second, straight onto
 * the audio clock. Notes are therefore sample-accurate even when the main
 * thread is busy drawing a fight, which a setTimeout-per-note scheme never is.
 */

const LOOKAHEAD = 0.12;      // seconds of music booked ahead of the clock
const TICK_MS = 25;          // how often we go and book some more

/* MIDI note number to Hz. */
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* Which sixteenths of the bar the battle lead lands on, and on what degree. */
const RIFF = { 0: 0, 3: 3, 6: 7, 10: 10, 12: 7 };

/*
 * Both themes in one shape: a chord loop, and one function per layer that says
 * what that layer plays on a given sixteenth. Writing them as functions rather
 * than as note lists keeps the loop short without making it repetitive — the
 * lead can look at where it is in the bar and answer itself.
 */
const THEMES = {
  menu: {
    bpm: 92,
    /* Am — F — C — G. Root notes, one bar each. */
    chords: [57, 53, 48, 55],
    voices: [
      // Bass: root on the one, fifth on the three. Round and unhurried.
      { at: (s) => s % 8 === 0, note: (c, s) => c - 12 + (s % 16 === 8 ? 7 : 0),
        type: 'triangle', gain: 0.16, dur: 0.7 },
      // Pad: the chord underneath everything, quiet enough to sit below the UI.
      { at: (s) => s % 16 === 0, note: (c) => c, type: 'sine', gain: 0.075, dur: 1.9 },
      { at: (s) => s % 16 === 0, note: (c) => c + 7, type: 'sine', gain: 0.055, dur: 1.9 },
      // Arpeggio: the part you actually hum. Minor pentatonic over the chord.
      { at: (s) => s % 2 === 0, note: (c, s) => c + 12 + [0, 3, 7, 10, 12, 10, 7, 3][(s / 2) % 8],
        type: 'triangle', gain: 0.062, dur: 0.24 },
    ],
  },
  battle: {
    bpm: 138,
    /* Am — F — G — Em: the same colour, but it never settles. */
    chords: [57, 53, 55, 52],
    voices: [
      // Driving eighth-note bass — this is what makes it feel like a fight.
      { at: (s) => s % 2 === 0, note: (c, s) => c - 12 + (s % 8 === 6 ? 3 : 0),
        type: 'square', gain: 0.11, dur: 0.16 },
      { at: (s) => s % 16 === 0, note: (c) => c, type: 'sawtooth', gain: 0.045, dur: 1.2 },
      // Lead riff. Sparse and syncopated: it answers the bass rather than
      // doubling it, which is what stops a four-chord loop wearing thin.
      { at: (s) => RIFF[s] !== undefined, note: (c, s) => c + 12 + RIFF[s],
        type: 'square', gain: 0.07, dur: 0.2 },
      // Kick and snare, as tuned thumps rather than samples.
      { at: (s) => s % 8 === 0 || s % 16 === 11, note: () => 36,
        type: 'sine', gain: 0.28, dur: 0.16, drop: 0.35 },
      { at: (s) => s % 8 === 4, noise: true, gain: 0.13, dur: 0.11 },
    ],
    /*
     * Tension: what the last thirty seconds of a match adds. A hat on every
     * sixteenth and the lead doubled an octave up, so the score tightens
     * without the tune changing under the player.
     */
    tense: [
      { at: () => true, noise: true, gain: 0.028, dur: 0.03 },
      { at: (s) => s % 16 === 0 || s % 16 === 6, note: (c) => c + 24,
        type: 'triangle', gain: 0.045, dur: 0.18 },
    ],
  },
};

const Music = {
  current: null,        // 'menu' | 'battle' | null
  tension: 0,           // 0..1, fades the tense layer in
  _timer: 0,
  _step: 0,             // sixteenth counter since the piece started
  _next: 0,             // audio-clock time the next sixteenth falls on
  _bus: null,

  get enabled() {
    if (typeof Settings !== 'undefined' && !Settings.music) return false;
    if (typeof Sfx !== 'undefined' && Sfx.muted) return false;
    return true;
  },

  /*
   * One gain node for the whole score, hung off the effects master. Supers and
   * kills therefore duck the music automatically by fighting it for headroom,
   * and one mute switch still silences everything.
   */
  _ensure() {
    if (typeof Sfx === 'undefined') return false;
    Sfx.ensure();
    if (!Sfx.ctx) return false;
    if (!this._bus) {
      this._bus = Sfx.ctx.createGain();
      this._bus.gain.value = 0.9;
      this._bus.connect(Sfx.master);
    }
    return true;
  },

  play(which) {
    if (this.current === which) return;
    this.current = which;
    this._step = 0;
    if (!which) return this.stop(true);
    if (!this._ensure()) return;
    if (Sfx.ctx.state === 'suspended') Sfx.ctx.resume();
    this._next = Sfx.ctx.currentTime + 0.06;
    if (!this._timer) this._timer = setInterval(() => this._schedule(), TICK_MS);
  },

  stop(keepCurrent) {
    if (!keepCurrent) this.current = null;
    clearInterval(this._timer);
    this._timer = 0;
  },

  /* 0 at the start of a match, 1 in the closing seconds. */
  setTension(v) { this.tension = clamp(v, 0, 1); },

  /*
   * Pull the score down for a moment so something loud can land on top of it.
   * Recovers on its own; nothing has to remember to undo it.
   */
  duck(amount = 0.45, seconds = 0.5) {
    if (!this._bus || !Sfx.ctx) return;
    const t = Sfx.ctx.currentTime;
    const g = this._bus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.9 * (1 - amount), t + 0.04);
    g.linearRampToValueAtTime(0.9, t + seconds);
  },

  /*
   * Hold the score down until told otherwise — for a pause sheet, where the
   * music carrying on at full volume is the tell that nothing really stopped.
   */
  dim(on) {
    if (!this._bus || !Sfx.ctx) return;
    const t = Sfx.ctx.currentTime;
    const g = this._bus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(on ? 0.22 : 0.9, t + 0.25);
  },

  _schedule() {
    if (!this.current || !this._ensure()) return;
    if (!this.enabled) { this._next = Sfx.ctx.currentTime + 0.06; return; }
    const theme = THEMES[this.current];
    if (!theme) return;
    const sixteenth = 60 / theme.bpm / 4;
    const until = Sfx.ctx.currentTime + LOOKAHEAD;

    // A tab left in the background stops firing timers; catching up by playing
    // every missed note at once would be a wall of noise, so skip forward.
    if (this._next < Sfx.ctx.currentTime - 0.5) this._next = Sfx.ctx.currentTime;

    while (this._next < until) {
      this._bar(theme, this._step, this._next, sixteenth);
      this._step++;
      this._next += sixteenth;
    }
  },

  /* Every voice that has something to say on this sixteenth. */
  _bar(theme, step, when, sixteenth) {
    const s = step % 16;
    const chord = theme.chords[Math.floor(step / 16) % theme.chords.length];
    for (const v of theme.voices) {
      if (v.at(s)) this._voice(v, chord, s, when, sixteenth, 1);
    }
    if (theme.tense && this.tension > 0.01) {
      for (const v of theme.tense) {
        if (v.at(s)) this._voice(v, chord, s, when, sixteenth, this.tension);
      }
    }
  },

  _voice(v, chord, s, when, sixteenth, mix) {
    const ctx = Sfx.ctx;
    const dur = (v.dur || 0.2);
    const g = ctx.createGain();
    g.connect(this._bus);
    const peak = v.gain * mix;

    if (v.noise) {
      const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      g.gain.setValueAtTime(peak, when);
      src.connect(g);
      src.start(when);
      src.stop(when + dur + 0.02);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = v.type || 'triangle';
    const f = hz(v.note(chord, s));
    osc.frequency.setValueAtTime(f, when);
    // A kick is a pitch that falls, not a note.
    if (v.drop) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * v.drop), when + dur);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0006, when + dur);
    osc.connect(g);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  },
};
