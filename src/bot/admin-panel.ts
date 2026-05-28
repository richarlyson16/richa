import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { AdminEntry } from "./admin-manager.js";

export const ADMIN_JOIN_ID = "admin:iniciar";
export const ADMIN_LEAVE_ID = "admin:sair";

export function buildAdminPanelEmbed(admins: AdminEntry[]) {
  const list =
    admins.length === 0
      ? "_Nenhum administrador ativo no momento._"
      : admins.map((a, i) => `${i + 1}. <@${a.userId}> — ativo desde <t:${Math.floor(a.activeSince.getTime() / 1000)}:R>`).join("\n");

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("👮 Administradores Online")
    .setDescription(list)
    .addFields({ name: "Total ativo", value: `${admins.length}`, inline: true })
    .setFooter({ text: "Clique em Iniciar para entrar de plantão • Sair para encerrar" })
    .setTimestamp();
}

export function buildAdminPanelRows() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ADMIN_JOIN_ID)
        .setLabel("▶️ Iniciar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(ADMIN_LEAVE_ID)
        .setLabel("⏹️ Sair")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}
