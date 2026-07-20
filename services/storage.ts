// Tiny typed localStorage wrapper. Every access is wrapped in try/catch so a
// quota error, disabled storage, or corrupt JSON never throws — we fall back.
// All keys are namespaced under `melon:`.

const PREFIX = 'melon:';

// Bump when the persisted shape changes in a breaking way. A stored version
// that differs from this is tolerated (warn, keep data) — no migrations yet.
export const SCHEMA_VERSION = 1;

export const storageKeys = {
  schemaVersion: `${PREFIX}schemaVersion`,
  // Data (owned by dataService)
  metrics: `${PREFIX}metrics`,
  logs: `${PREFIX}logs`,
  imports: `${PREFIX}imports`,
  campaigns: `${PREFIX}campaigns`,
  // Config (owned by AppContext)
  platforms: `${PREFIX}platforms`,
  metricsConfig: `${PREFIX}metricsConfig`,
  changeTypes: `${PREFIX}changeTypes`,
  theme: `${PREFIX}theme`,
} as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[melon storage] load failed for "${key}", using fallback`, e);
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[melon storage] save failed for "${key}"`, e);
  }
}

export function hasKey(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

// Remove every `melon:` key (used by the reset / clear controls).
export function clearAllMelonStorage(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[melon storage] clear failed', e);
  }
}
