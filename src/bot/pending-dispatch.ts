import type { Match } from "./queue-manager.js";

interface PendingDispatch {
  match: Match;
  guildId: string;
}

class PendingDispatchManager {
  private queue: PendingDispatch[] = [];

  add(match: Match, guildId: string): void {
    this.queue.push({ match, guildId });
  }

  getAll(): PendingDispatch[] {
    return [...this.queue];
  }

  remove(matchId: string): boolean {
    const idx = this.queue.findIndex((p) => p.match.id === matchId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  count(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

export const pendingDispatch = new PendingDispatchManager();
