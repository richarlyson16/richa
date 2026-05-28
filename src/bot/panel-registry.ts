import type { QueueMode, BetValue, Format } from "./queue-manager.js";

interface PanelRef {
  channelId: string;
  messageId: string;
}

const registry = new Map<string, PanelRef>();

function key(mode: QueueMode, betValue: BetValue, format: Format): string {
  return `${mode}:${betValue}:${format}`;
}

export function registerPanel(mode: QueueMode, betValue: BetValue, format: Format, channelId: string, messageId: string): void {
  registry.set(key(mode, betValue, format), { channelId, messageId });
}

export function getPanelRef(mode: QueueMode, betValue: BetValue, format: Format): PanelRef | null {
  return registry.get(key(mode, betValue, format)) ?? null;
}
