interface AdminPanelRef {
  channelId: string;
  messageId: string;
}

let ref: AdminPanelRef | null = null;

export function registerAdminPanel(channelId: string, messageId: string): void {
  ref = { channelId, messageId };
}

export function getAdminPanelRef(): AdminPanelRef | null {
  return ref;
}
