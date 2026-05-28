export type QueueMode = "1v1" | "2v2" | "3v3" | "4v4";
export const BET_VALUES = [1, 2, 3, 5, 10] as const;
export type BetValue = (typeof BET_VALUES)[number];

export type WeaponMode = "normal" | "fulump";
export const WEAPON_MODES: WeaponMode[] = ["normal", "fulump"];
export const WEAPON_MODE_LABEL: Record<WeaponMode, string> = {
  normal: "Normal",
  fulump: "Full UMP & XM8",
};

export type Format = "mobile" | "emulador";
export const FORMATS: Format[] = ["mobile", "emulador"];

export interface QueueEntry {
  userId: string;
  username: string;
  betValue: BetValue;
  weaponMode: WeaponMode;
  format: Format;
  joinedAt: Date;
}

export interface Match {
  id: string;
  mode: QueueMode;
  betValue: BetValue;
  weaponMode: WeaponMode;
  format: Format;
  players: QueueEntry[];
  createdAt: Date;
  channelId?: string;
}

interface PendingMatch {
  match: Match;
  threadId: string;
  confirmations: Set<string>;
  adminName: string;
}

const QUEUE_SIZES: Record<QueueMode, number> = {
  "1v1": 2,
  "2v2": 2,
  "3v3": 2,
  "4v4": 2,
};

function queueKey(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format): string {
  return `${mode}:${betValue}:${weaponMode}:${format}`;
}

class QueueManager {
  private queues = new Map<string, QueueEntry[]>();
  private matches: Match[] = [];
  private pendingMatches = new Map<string, PendingMatch>();

  private getQueue(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format): QueueEntry[] {
    const key = queueKey(mode, betValue, weaponMode, format);
    if (!this.queues.has(key)) this.queues.set(key, []);
    return this.queues.get(key)!;
  }

  join(
    mode: QueueMode,
    betValue: BetValue,
    weaponMode: WeaponMode,
    format: Format,
    userId: string,
    username: string
  ): { alreadyInQueue: boolean; inPendingMatch: boolean; alreadyInMode: QueueMode | null; position: number } {
    if (this.isInPendingMatch(userId)) {
      return { alreadyInQueue: false, inPendingMatch: true, alreadyInMode: null, position: 0 };
    }

    const alreadyInMode = this.isInAnyQueue(userId);
    if (alreadyInMode) {
      const queue = this.getQueueForUser(userId);
      const position = queue ? queue.findIndex((e) => e.userId === userId) + 1 : 1;
      return { alreadyInQueue: true, inPendingMatch: false, alreadyInMode, position };
    }

    const queue = this.getQueue(mode, betValue, weaponMode, format);
    queue.push({ userId, username, betValue, weaponMode, format, joinedAt: new Date() });
    return { alreadyInQueue: false, inPendingMatch: false, alreadyInMode: null, position: queue.length };
  }

  private getQueueForUser(userId: string): QueueEntry[] | null {
    for (const q of this.queues.values()) {
      if (q.some((e) => e.userId === userId)) return q;
    }
    return null;
  }

  leave(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format, userId: string): boolean {
    const queue = this.getQueue(mode, betValue, weaponMode, format);
    const idx = queue.findIndex((e) => e.userId === userId);
    if (idx === -1) return false;
    queue.splice(idx, 1);
    return true;
  }

  leaveAll(userId: string): string[] {
    const removed: string[] = [];
    for (const [key, queue] of this.queues.entries()) {
      const idx = queue.findIndex((e) => e.userId === userId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        removed.push(key);
      }
    }
    return removed;
  }

  tryMatch(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format): Match | null {
    const queue = this.getQueue(mode, betValue, weaponMode, format);
    const needed = QUEUE_SIZES[mode];
    if (queue.length < needed) return null;

    const players = queue.splice(0, needed);
    const match: Match = {
      id: `${mode}-${betValue}-${weaponMode}-${format}-${Date.now()}`,
      mode,
      betValue,
      weaponMode,
      format,
      players,
      createdAt: new Date(),
    };
    this.matches.push(match);
    return match;
  }

  addPendingMatch(match: Match, threadId: string, adminName: string): void {
    this.pendingMatches.set(match.id, { match, threadId, confirmations: new Set(), adminName });
  }

  confirmMatch(matchId: string, userId: string): { allConfirmed: boolean; match: Match; needed: number; adminName: string } | null {
    const pending = this.pendingMatches.get(matchId);
    if (!pending) return null;
    pending.confirmations.add(userId);
    const allConfirmed = pending.confirmations.size >= pending.match.players.length;
    return { allConfirmed, match: pending.match, needed: pending.match.players.length, adminName: pending.adminName };
  }

  cancelMatch(matchId: string): Match | null {
    const pending = this.pendingMatches.get(matchId);
    if (!pending) return null;
    this.pendingMatches.delete(matchId);
    return pending.match;
  }

  removePendingMatch(matchId: string): void {
    this.pendingMatches.delete(matchId);
  }

  isInPendingMatch(userId: string): string | null {
    for (const [matchId, pending] of this.pendingMatches.entries()) {
      if (pending.match.players.some((p) => p.userId === userId)) return matchId;
    }
    return null;
  }

  getPendingMatch(matchId: string): PendingMatch | null {
    return this.pendingMatches.get(matchId) ?? null;
  }

  getQueueSize(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format): number {
    return this.getQueue(mode, betValue, weaponMode, format).length;
  }

  getNeededPlayers(mode: QueueMode): number {
    return QUEUE_SIZES[mode];
  }

  getValueQueueStatus(
    mode: QueueMode,
    betValue: BetValue,
    format: Format
  ): Record<WeaponMode, { players: QueueEntry[]; needed: number }> {
    const needed = QUEUE_SIZES[mode];
    return {
      normal: { players: [...this.getQueue(mode, betValue, "normal", format)], needed },
      fulump: { players: [...this.getQueue(mode, betValue, "fulump", format)], needed },
    };
  }

  getAllQueueSizes(): Record<QueueMode, Record<BetValue, { current: number; needed: number }>> {
    const modes: QueueMode[] = ["1v1", "2v2", "3v3", "4v4"];
    const result = {} as Record<QueueMode, Record<BetValue, { current: number; needed: number }>>;
    for (const mode of modes) {
      result[mode] = {} as Record<BetValue, { current: number; needed: number }>;
      for (const val of BET_VALUES) {
        const total = WEAPON_MODES.reduce(
          (acc, wm) => acc + FORMATS.reduce((a, fmt) => a + this.getQueueSize(mode, val, wm, fmt), 0),
          0
        );
        result[mode][val] = { current: total, needed: QUEUE_SIZES[mode] };
      }
    }
    return result;
  }

  isInAnyQueue(userId: string): QueueMode | null {
    for (const [key, queue] of this.queues.entries()) {
      if (queue.some((e) => e.userId === userId)) {
        return key.split(":")[0] as QueueMode;
      }
    }
    return null;
  }

  getPlayerQueueInfo(userId: string): { mode: QueueMode; betValue: BetValue; weaponMode: WeaponMode; format: Format; position: number } | null {
    for (const [key, queue] of this.queues.entries()) {
      const idx = queue.findIndex((e) => e.userId === userId);
      if (idx !== -1) {
        const [mode, val, wm, fmt] = key.split(":") as [QueueMode, string, WeaponMode, Format];
        return { mode, betValue: Number(val) as BetValue, weaponMode: wm, format: fmt, position: idx + 1 };
      }
    }
    return null;
  }

  removeExpired(maxAgeMs: number): QueueEntry[] {
    const now = Date.now();
    const expired: QueueEntry[] = [];
    for (const queue of this.queues.values()) {
      const toRemove = queue.filter((e) => now - e.joinedAt.getTime() >= maxAgeMs);
      for (const entry of toRemove) {
        const idx = queue.indexOf(entry);
        if (idx !== -1) queue.splice(idx, 1);
        expired.push(entry);
      }
    }
    return expired;
  }
}

export const queueManager = new QueueManager();
