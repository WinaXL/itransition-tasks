import { PlayerStats } from './types';

/**
 * Tracks display names for connected sockets without authentication.
 * Duplicate raw names get a numeric suffix ("John", "John 2", "John 3", ...).
 * Also keeps per-display-name statistics for the lifetime of the process.
 */
export class NameRegistry {
  private socketToName = new Map<string, string>();
  private activeNames = new Set<string>();
  private stats = new Map<string, PlayerStats>();

  private normalize(raw: string): string {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed) return 'Sailor';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  /** Find an existing stats key that matches case-insensitively. */
  private findCanonicalName(name: string): string | undefined {
    const lower = name.toLowerCase();
    for (const key of this.stats.keys()) {
      if (key.toLowerCase() === lower) return key;
    }
    return undefined;
  }

  private resolveCandidate(base: string): string {
    const canonical = this.findCanonicalName(base);
    if (canonical && !this.activeNames.has(canonical)) {
      return canonical;
    }

    let candidate = base;
    let suffix = 2;
    while (this.activeNames.has(candidate)) {
      candidate = `${base} ${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  /** Register a socket under a unique display name derived from the requested name. */
  register(socketId: string, requestedName: string): string {
    this.release(socketId);

    const base = this.normalize(requestedName).slice(0, 24);
    const candidate = this.resolveCandidate(base);

    this.activeNames.add(candidate);
    this.socketToName.set(socketId, candidate);
    if (!this.stats.has(candidate)) {
      this.stats.set(candidate, {
        name: candidate,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        totalShipsSunk: 0,
      });
    }
    return candidate;
  }

  release(socketId: string): void {
    const name = this.socketToName.get(socketId);
    if (name) {
      this.activeNames.delete(name);
      this.socketToName.delete(socketId);
    }
  }

  getName(socketId: string): string | undefined {
    return this.socketToName.get(socketId);
  }

  getStats(name: string): PlayerStats | undefined {
    const direct = this.stats.get(name);
    if (direct) return direct;
    const canonical = this.findCanonicalName(name);
    return canonical ? this.stats.get(canonical) : undefined;
  }

  private ensureStats(name: string): PlayerStats {
    let entry = this.stats.get(name);
    if (!entry) {
      entry = { name, gamesPlayed: 0, wins: 0, losses: 0, totalShipsSunk: 0 };
      this.stats.set(name, entry);
    }
    return entry;
  }

  recordResult(winner: string, loser: string, winnerShipsSunk: number, loserShipsSunk: number): void {
    const w = this.ensureStats(winner);
    w.gamesPlayed += 1;
    w.wins += 1;
    w.totalShipsSunk += winnerShipsSunk;

    const l = this.ensureStats(loser);
    l.gamesPlayed += 1;
    l.losses += 1;
    l.totalShipsSunk += loserShipsSunk;
  }

  leaderboard(limit = 5): PlayerStats[] {
    return [...this.stats.values()]
      .sort((a, b) => b.wins - a.wins || b.totalShipsSunk - a.totalShipsSunk)
      .slice(0, limit);
  }
}
