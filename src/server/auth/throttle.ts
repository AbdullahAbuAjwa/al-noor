type Entry = { failures: number; windowStart: number; lockedUntil: number };

export type ThrottleOptions = {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
  maxEntries: number;
};

const defaults: ThrottleOptions = {
  maxFailures: 5,
  windowMs: 10 * 60_000,
  lockMs: 60_000,
  maxEntries: 5_000,
};

// Per-username cool-down for repeated failed logins. Client addresses are not
// reliable behind Docker port publishing or a proxy, so they are not the key.
// The short lock limits online guessing without a long account lockout (D23).
export class LoginThrottle {
  private readonly options: ThrottleOptions;
  private readonly entries = new Map<string, Entry>();

  constructor(options: Partial<ThrottleOptions> = {}) {
    this.options = { ...defaults, ...options };
  }

  retryAfterMs(key: string, now: Date): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    const time = now.getTime();
    if (entry.lockedUntil > time) return entry.lockedUntil - time;
    if (time - entry.windowStart >= this.options.windowMs)
      this.entries.delete(key);
    return 0;
  }

  recordFailure(key: string, now: Date) {
    const time = now.getTime();
    let entry = this.entries.get(key);
    if (!entry || time - entry.windowStart >= this.options.windowMs) {
      entry = { failures: 0, windowStart: time, lockedUntil: 0 };
    }
    entry.failures += 1;
    if (entry.failures >= this.options.maxFailures) {
      entry.lockedUntil = time + this.options.lockMs;
      entry.failures = 0;
      entry.windowStart = time;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.prune(time);
  }

  reset(key: string) {
    this.entries.delete(key);
  }

  private prune(time: number) {
    if (this.entries.size <= this.options.maxEntries) return;
    for (const [key, entry] of this.entries) {
      if (
        entry.lockedUntil <= time &&
        time - entry.windowStart >= this.options.windowMs
      ) {
        this.entries.delete(key);
      }
    }
    // Map order is least recently updated first; drop the oldest if still full.
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.options.maxEntries) break;
      this.entries.delete(key);
    }
  }
}
