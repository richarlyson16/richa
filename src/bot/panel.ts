import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { QueueMode, BetValue, WeaponMode, Format } from "./queue-manager.js";
import { BET_VALUES } from "./queue-manager.js";

export function buildQueueCustomId(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format): string {
  return `queue:${mode}:${betValue}:${weaponMode}:${format}`;
}

export function parseQueueCustomId(customId: string): { mode: QueueMode; betValue: BetValue; weaponMode: WeaponMode; format: Format } | null {
  const parts = customId.split(":");
  if (parts.length !== 5 || parts[0] !== "queue") return null;
  const mode = parts[1] as QueueMode;
  const betValue = Number(parts[2]) as BetValue;
  const weaponMode = parts[3] as WeaponMode;
  const format = parts[4] as Format;
  if (!["1v1", "2v2", "3v3", "4v4"].includes(mode)) return null;
  if (!BET_VALUES.includes(betValue as BetValue)) return null;
  if (!["normal", "fulump"].includes(weaponMode)) return null;
  if (!["mobile", "emulador"].includes(format)) return null;
  return { mode, betValue, weaponMode, format };
}

export function buildLeaveCustomId(): string {
  return "queue:leave";
}

export function buildMatchConfirmRows(matchId: string): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`match:confirm:${matchId}`)
        .setLabel("✅ Confirmar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`match:cancel:${matchId}`)
        .setLabel("❌ Cancelar")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

export function buildMatchCloseRows(matchId: string): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`match:close:${matchId}`)
        .setLabel("🔒 Fechar Sala")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

export function buildValueQueueRows(mode: QueueMode, betValue: BetValue, format: Format): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildQueueCustomId(mode, betValue, "normal", format))
        .setLabel("✅ Jogar Normal")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(buildQueueCustomId(mode, betValue, "fulump", format))
        .setLabel("⚙️ Full UMP & XM8")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildLeaveCustomId())
        .setLabel("❌ Sair da Fila")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}
