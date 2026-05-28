import type { QueueMode, Format } from "./queue-manager.js";

export interface ChannelConfig {
  guildId: string;
  channelId: string;
  mode: QueueMode;
  format: Format;
}

export const CHANNEL_CONFIG: ChannelConfig[] = [
  { guildId: "1506320659658182836", channelId: "1506320664355930155", mode: "1v1", format: "mobile" },
  { guildId: "1506320659658182836", channelId: "1506320664355930156", mode: "2v2", format: "mobile" },
  { guildId: "1506320659658182836", channelId: "1506320664355930157", mode: "3v3", format: "mobile" },
  { guildId: "1506320659658182836", channelId: "1506320664355930158", mode: "4v4", format: "mobile" },
  { guildId: "1506320659658182836", channelId: "1506320664355930160", mode: "1v1", format: "emulador" },
  { guildId: "1506320659658182836", channelId: "1506320664355930161", mode: "2v2", format: "emulador" },
  { guildId: "1506320659658182836", channelId: "1506320664355930162", mode: "3v3", format: "emulador" },
  { guildId: "1506320659658182836", channelId: "1506320664699867267", mode: "4v4", format: "emulador" },
];

export const GUILD_ID = "1506320659658182836";
export const NOTIFICATIONS_CHANNEL_ID = "1506320661466058931";
export const MATCH_CHANNEL_ID = "1506483469906350121";
export const ADMIN_PANEL_CHANNEL_ID = "1506320660945703068";

export const PANEL_IMAGE_URL = "";

const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "";
export const PANEL_THUMBNAIL_URL = domain
  ? `https://${domain}/api/assets/thumb-ghost.png`
  : "";
