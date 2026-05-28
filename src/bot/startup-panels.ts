import { type Client, ChannelType } from "discord.js";
import { CHANNEL_CONFIG, ADMIN_PANEL_CHANNEL_ID, GUILD_ID } from "./channel-config.js";
import { queueManager, BET_VALUES } from "./queue-manager.js";
import { valueQueueEmbed, valueQueueEmbedV2 } from "./embeds.js";
import { buildValueQueueRows } from "./panel.js";
import { registerPanel } from "./panel-registry.js";
import { adminManager } from "./admin-manager.js";
import { buildAdminPanelEmbed, buildAdminPanelRows } from "./admin-panel.js";
import { registerAdminPanel } from "./admin-panel-registry.js";
import { logger } from "../lib/logger.js";

export async function postStartupPanels(client: Client) {
  for (const config of CHANNEL_CONFIG) {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      const channel = await guild.channels.fetch(config.channelId);

      if (!channel || channel.type !== ChannelType.GuildText) {
        logger.warn({ channelId: config.channelId, mode: config.mode, format: config.format }, "Canal não encontrado ou não é de texto");
        continue;
      }

      const messages = await channel.messages.fetch({ limit: 50 });
      const botMessages = messages.filter((m) => m.author.id === client.user!.id);
      for (const msg of botMessages.values()) {
        await msg.delete().catch(() => null);
      }

      for (const val of [...BET_VALUES].reverse()) {
        const status = queueManager.getValueQueueStatus(config.mode, val, config.format);
        const embed = valueQueueEmbedV2(config.mode, val, config.format, status);
        const msg = await channel.send({
          embeds: [embed],
          components: buildValueQueueRows(config.mode, val, config.format),
        });
        registerPanel(config.mode, val, config.format, channel.id, msg.id);
      }

      logger.info(
        { channelId: config.channelId, mode: config.mode, format: config.format, panels: BET_VALUES.length },
        "Painéis por valor postados no canal configurado"
      );
    } catch (err) {
      logger.error({ err, channelId: config.channelId, mode: config.mode, format: config.format }, "Erro ao postar painéis no canal");
    }
  }

  await postAdminPanel(client);
}

export async function postAdminPanel(client: Client) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(ADMIN_PANEL_CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildText) {
      logger.warn({ channelId: ADMIN_PANEL_CHANNEL_ID }, "Canal de admins não encontrado ou não é de texto");
      return;
    }

    const messages = await channel.messages.fetch({ limit: 20 });
    const botMessages = messages.filter((m) => m.author.id === client.user!.id);
    for (const msg of botMessages.values()) {
      await msg.delete().catch(() => null);
    }

    const msg = await channel.send({
      embeds: [buildAdminPanelEmbed(adminManager.getAll())],
      components: buildAdminPanelRows(),
    });

    registerAdminPanel(channel.id, msg.id);
    logger.info({ channelId: ADMIN_PANEL_CHANNEL_ID }, "Painel de admins postado");
  } catch (err) {
    logger.error({ err, channelId: ADMIN_PANEL_CHANNEL_ID }, "Erro ao postar painel de admins");
  }
}
