export const STORAGE_KEY = 'script-capture:v1';

export const DEFAULTS = {
  script: "Welcome — this is your teleprompter.\n\nDrag this panel by its top bar and park it right beside the lens, so your eyes stay close to camera.\n\nPress Space to roll the script, R to start recording. The script never appears in the recording.",
  rect: null,
  speed: 45,
  fontSize: 28,
  lineHeight: 1.5,
  opacity: 0.7,
  align: 'left',
  flip: false,
  mirror: true,
  guide: true,
  countdown: 3,
  autoScroll: true,
  hideChrome: false,
  quality: '1080',
  videoId: '',
  audioId: ''
};

export const state = Object.assign({}, DEFAULTS);
try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch (e) {}

// Cross-component notifications: recording status, take list changes, camera
// status/devices, and settings that are displayed in more than one component
// (speed, font size, panel position) all go through here instead of every
// component reaching into every other component's internals.
export const bus = new EventTarget();

let saveTimer;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }, 200);
}

// Persist + tell every component to re-sync whatever slice of `state` it renders.
export function commit() {
  save();
  bus.dispatchEvent(new CustomEvent('state:changed'));
}
