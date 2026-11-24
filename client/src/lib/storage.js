// localStorage can throw (private mode, blocked storage) — never let that break the game.
const memory = new Map();

export const storage = {
  get(key) {
    try { return localStorage.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; }
  },
  set(key, value) {
    memory.set(key, value);
    try { localStorage.setItem(key, value); } catch { /* memory fallback */ }
  },
  remove(key) {
    memory.delete(key);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export const hostKey = (code) => `fyt_host_${code}`;
export const playerKey = (code) => `fyt_player_${code}`;

export function deviceId() {
  let id = storage.get('fyt_device');
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 64);
    storage.set('fyt_device', id);
  }
  return id;
}
