export interface AdminEntry {
  userId: string;
  username: string;
  activeSince: Date;
}

export interface AdminStats {
  userId: string;
  username: string;
  matchesAdministered: number;
  isActive: boolean;
  activeSince?: Date;
}

class AdminManager {
  private queue: AdminEntry[] = [];
  private stats = new Map<string, { username: string; matchesAdministered: number }>();

  join(userId: string, username: string): boolean {
    if (this.queue.some((a) => a.userId === userId)) return false;
    this.queue.push({ userId, username, activeSince: new Date() });
    if (!this.stats.has(userId)) {
      this.stats.set(userId, { username, matchesAdministered: 0 });
    } else {
      this.stats.get(userId)!.username = username;
    }
    return true;
  }

  leave(userId: string): boolean {
    const idx = this.queue.findIndex((a) => a.userId === userId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  isActive(userId: string): boolean {
    return this.queue.some((a) => a.userId === userId);
  }

  getAll(): AdminEntry[] {
    return [...this.queue];
  }

  getCount(): number {
    return this.queue.length;
  }

  getNext(): AdminEntry | null {
    if (this.queue.length === 0) return null;
    const admin = this.queue.shift()!;
    this.queue.push(admin);
    return admin;
  }

  recordMatch(userId: string): void {
    const entry = this.stats.get(userId);
    if (entry) {
      entry.matchesAdministered++;
    }
  }

  getAllStats(): AdminStats[] {
    const result: AdminStats[] = [];
    for (const [userId, data] of this.stats.entries()) {
      const active = this.queue.find((a) => a.userId === userId);
      result.push({
        userId,
        username: data.username,
        matchesAdministered: data.matchesAdministered,
        isActive: !!active,
        activeSince: active?.activeSince,
      });
    }
    result.sort((a, b) => b.matchesAdministered - a.matchesAdministered);
    return result;
  }
}

export const adminManager = new AdminManager();
