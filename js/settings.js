/*
 * Player settings.
 *
 * How close the camera sits is the kind of thing no single number gets right
 * for everyone — it depends on the screen, how far away it is, and whether you
 * would rather read the fight in front of you or watch the whole arena. So it
 * is a control rather than a constant, and it remembers what you chose.
 */

const ZOOM_STEPS = [
  { id: 'wide', name: 'Wide', hint: 'See most of the arena', mult: 0.74 },
  { id: 'normal', name: 'Normal', hint: 'A balance of both', mult: 1 },
  { id: 'close', name: 'Close', hint: 'Big fighters, tight view', mult: 1.3 },
];

/* World units kept in view at Normal. Divided by the zoom multiplier. */
const VIEW_BASE = { w: 820, h: 500 };

const Settings = {
  zoom: 'wide',            // the complaint was claustrophobia, so start wide
  sound: true,
  flashes: true,           // screen flashes and the low-health vignette

  load() {
    try {
      const raw = localStorage.getItem('scrapstars.settings');
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { /* first run or storage blocked */ }
    if (!ZOOM_STEPS.some((z) => z.id === this.zoom)) this.zoom = 'wide';
    if (typeof Sfx !== 'undefined') Sfx.muted = !this.sound;
  },

  save() {
    try {
      localStorage.setItem('scrapstars.settings', JSON.stringify({
        zoom: this.zoom, sound: this.sound, flashes: this.flashes,
      }));
    } catch (e) { /* nothing worth breaking play over */ }
  },

  zoomStep() { return ZOOM_STEPS.find((z) => z.id === this.zoom) || ZOOM_STEPS[0]; },

  /* The world span the camera should keep in view, at the current setting. */
  viewSpan() {
    const m = this.zoomStep().mult;
    return { w: VIEW_BASE.w / m, h: VIEW_BASE.h / m };
  },

  set(key, value) {
    this[key] = value;
    if (key === 'sound' && typeof Sfx !== 'undefined') Sfx.muted = !value;
    this.save();
  },
};
