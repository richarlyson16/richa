import {
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type Client,
  ChannelType,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { queueManager, type QueueMode, type BetValue, type WeaponMode, type Format, BET_VALUES, WEAPON_MODE_LABEL } from "./queue-manager.js";
import {
  joinedQueueEmbed,
  alreadyInQueueEmbed,
  inPendingMatchEmbed,
  leftQueueEmbed,
  leftAllQueuesEmbed,
  notInQueueEmbed,
  noAdminOnlineEmbed,
  matchFoundEmbed,
  matchConfirmEmbed,
  matchStartedEmbed,
  matchCancelledEmbed,
  matchClosedEmbed,
  queuesStatusEmbed,
  valueQueueEmbed,
  valueQueueEmbedV2,
} from "./embeds.js";
import type { Match } from "./queue-manager.js";
import { buildValueQueueRows, parseQueueCustomId, buildLeaveCustomId, buildMatchConfirmRows, buildMatchCloseRows } from "./panel.js";
import { getPanelRef } from "./panel-registry.js";
import { NOTIFICATIONS_CHANNEL_ID, MATCH_CHANNEL_ID } from "./channel-config.js";
import { adminManager, type AdminEntry } from "./admin-manager.js";
import { buildAdminPanelEmbed, buildAdminPanelRows } from "./admin-panel.js";
import { getAdminPanelRef } from "./admin-panel-registry.js";
import { pendingDispatch } from "./pending-dispatch.js";
import { logger } from "../lib/logger.js";

const MODES: QueueMode[] = ["1v1", "2v2", "3v3", "4v4"];

async function refreshAdminPanel(interaction: ButtonInteraction): Promise<void> {
  const ref = getAdminPanelRef();
  if (!ref) return;
  try {
    const guild = interaction.guild;
    if (!guild) return;
    const channel = await guild.channels.fetch(ref.channelId);
    if (!channel || !("messages" in channel)) return;
    const message = await channel.messages.fetch(ref.messageId);
    await message.edit({
      embeds: [buildAdminPanelEmbed(adminManager.getAll())],
      components: buildAdminPanelRows(),
    });
  } catch (err) {
    logger.warn({ err }, "Não foi possível atualizar o painel de admins");
  }
}

async function refreshPanel(interaction: ButtonInteraction, mode: QueueMode, betValue: BetValue, format: Format): Promise<void> {
  const ref = getPanelRef(mode, betValue, format);
  if (!ref) return;
  try {
    const guild = interaction.guild;
    if (!guild) return;
    const channel = await guild.channels.fetch(ref.channelId);
    if (!channel || !("messages" in channel)) return;
    const message = await channel.messages.fetch(ref.messageId);
    const status = queueManager.getValueQueueStatus(mode, betValue, format);
    const embed = valueQueueEmbedV2(mode, betValue, format, status);
    await message.edit({
      embeds: [embed],
      components: buildValueQueueRows(mode, betValue, format),
    });
  } catch (err) {
    logger.warn({ err, mode, betValue, format }, "Não foi possível atualizar o painel");
  }
}

export async function createMatchThreadWithAdmin(
  guild: { channels: { fetch: (id: string) => Promise<any> } },
  match: Match,
  admin: AdminEntry
): Promise<void> {
  try {
    const baseChannel = await guild.channels.fetch(MATCH_CHANNEL_ID);
    if (!(baseChannel instanceof TextChannel)) {
      logger.error({ channelId: MATCH_CHANNEL_ID }, "Canal de partidas não é um canal de texto");
      return;
    }

    const weaponLabel = WEAPON_MODE_LABEL[match.weaponMode];
    const threadName = `${match.format} | ${match.mode} | R$${match.betValue} | ${weaponLabel}`.slice(0, 100);

    const thread = await baseChannel.threads.create({
      name: threadName,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Partida ${match.format} ${match.mode} | R$${match.betValue} | ${weaponLabel} | ID: ${match.id}`,
    });

    for (const player of match.players) {
      await thread.members.add(player.userId);
    }

    await thread.members.add(admin.userId);

    match.channelId = thread.id;
    queueManager.addPendingMatch(match, thread.id, admin.username);
    adminManager.recordMatch(admin.userId);

    await thread.send({
      content: match.players.map((p) => `<@${p.userId}>`).join(" ") + ` <@${admin.userId}>`,
      embeds: [matchConfirmEmbed(match, 0, admin.username)],
      components: buildMatchConfirmRows(match.id),
    });

    logger.info({ matchId: match.id, threadId: thread.id, adminId: admin.userId, adminName: admin.username }, "Thread criada com admin");
  } catch (err) {
    logger.error({ err, matchId: match.id }, "Erro ao criar thread de partida");
  }
}

async function createMatchThread(interaction: ButtonInteraction, match: Match): Promise<void> {
  const admin = adminManager.getNext();

  if (!admin) {
    pendingDispatch.add(match, interaction.guildId ?? "");
    logger.info({ matchId: match.id }, "Partida adicionada à fila de espera por admin");

    for (const player of match.players) {
      try {
        const guild = interaction.guild;
        if (!guild) continue;
        const member = await guild.members.fetch(player.userId);
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setTitle("⏳ Aguardando administrador")
              .setDescription(
                `Sua partida **${match.mode}** (${match.format}) — aposta **R$${match.betValue},00** — está pronta, mas não há administradores online no momento.\n\n**Você ficará na fila até um admin entrar de plantão.** Assim que isso acontecer, a sala será criada automaticamente.`
              )
              .setTimestamp(),
          ],
        });
      } catch {
        // DM bloqueada pelo usuário
      }
    }
    return;
  }

  await createMatchThreadWithAdmin(interaction.guild as any, match, admin);
}

export async function handleAdminIniciar(interaction: ButtonInteraction) {
  const userId = interaction.user.id;
  const username = interaction.user.username;

  if (adminManager.isActive(userId)) {
    await interaction.reply({
      content: "⚠️ Você já está ativo como administrador.",
      ephemeral: true,
    });
    return;
  }

  adminManager.join(userId, username);

  const pending = pendingDispatch.getAll();

  if (pending.length > 0) {
    await interaction.reply({
      content: `✅ Você está agora **ativo** como administrador. Há **${pending.length}** partida(s) aguardando — criando as salas agora...`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: "✅ Você está agora **ativo** como administrador. Será chamado para as partidas.",
      ephemeral: true,
    });
  }

  void refreshAdminPanel(interaction);
  logger.info({ userId, username }, "Admin entrou de plantão");

  for (const { match, guildId } of pending) {
    const nextAdmin = adminManager.getNext();
    if (!nextAdmin) break;

    pendingDispatch.remove(match.id);

    try {
      const guild = await (interaction.client as Client).guilds.fetch(guildId);
      await createMatchThreadWithAdmin(guild as any, match, nextAdmin);

      for (const player of match.players) {
        try {
          const member = await guild.members.fetch(player.userId);
          await member.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle("✅ Administrador online — sala criada!")
                .setDescription(`Um administrador entrou de plantão e sua partida **${match.mode}** foi iniciada. Verifique o canal privado.`)
                .setTimestamp(),
            ],
          });
        } catch {
          // DM bloqueada
        }
      }
    } catch (err) {
      logger.error({ err, matchId: match.id }, "Erro ao despachar partida pendente");
    }
  }
}

export async function handleAdminSair(interaction: ButtonInteraction) {
  const userId = interaction.user.id;

  if (!adminManager.isActive(userId)) {
    await interaction.reply({
      content: "⚠️ Você não está ativo como administrador.",
      ephemeral: true,
    });
    return;
  }

  adminManager.leave(userId);
  await interaction.reply({
    content: "⏹️ Você saiu do plantão de administrador.\n\n📂 Suas salas privadas já abertas **continuam ativas** — você ainda pode trabalhar normalmente dentro delas. Apenas novas partidas não serão mais atribuídas a você.",
    ephemeral: true,
  });

  void refreshAdminPanel(interaction);
  logger.info({ userId }, "Admin saiu de plantão");
}

export async function handleMatchConfirm(interaction: ButtonInteraction, matchId: string) {
  const result = queueManager.confirmMatch(matchId, interaction.user.id);
  if (!result) {
    await interaction.reply({ content: "❌ Esta partida não existe mais.", ephemeral: true });
    return;
  }

  const { allConfirmed, match, adminName } = result;
  const confirmations = queueManager.getPendingMatch(matchId)?.confirmations.size ?? 1;

  if (allConfirmed) {
    await interaction.update({
      embeds: [matchStartedEmbed(match, adminName)],
      components: buildMatchCloseRows(matchId),
    });
    logger.info({ matchId }, "Partida confirmada por todos os jogadores");
  } else {
    await interaction.update({
      embeds: [matchConfirmEmbed(match, confirmations)],
      components: buildMatchConfirmRows(matchId),
    });
  }
}

export async function handleMatchClose(interaction: ButtonInteraction, matchId: string) {
  const match = queueManager.cancelMatch(matchId);
  if (!match) {
    await interaction.reply({ content: "❌ Esta sala já foi encerrada.", ephemeral: true });
    return;
  }

  await interaction.update({ embeds: [matchClosedEmbed()], components: [] });
  await new Promise((r) => setTimeout(r, 3000));

  const thread = interaction.channel;
  if (thread && "setArchived" in thread) {
    try {
      await (thread as any).setArchived(true, "Sala encerrada pelos jogadores");
    } catch (err) {
      logger.warn({ err, matchId }, "Não foi possível arquivar a thread ao fechar");
    }
  }
  logger.info({ matchId }, "Sala encerrada — jogadores liberados para nova fila");
}

export async function handleMatchCancel(interaction: ButtonInteraction, matchId: string) {
  const match = queueManager.cancelMatch(matchId);
  if (!match) {
    await interaction.reply({ content: "❌ Esta partida não existe mais.", ephemeral: true });
    return;
  }

  await interaction.update({ embeds: [matchCancelledEmbed(interaction.user.username)], components: [] });
  await new Promise((r) => setTimeout(r, 3000));

  const thread = interaction.channel;
  if (thread && "setArchived" in thread) {
    try {
      await (thread as any).setArchived(true, "Partida cancelada");
    } catch (err) {
      logger.warn({ err, matchId }, "Não foi possível arquivar a thread");
    }
  }
  logger.info({ matchId, cancelledBy: interaction.user.username }, "Partida cancelada");
}

export async function handlePainel(interaction: ChatInputCommandInteraction) {
  await interaction.reply({ content: "✅ Criando painéis de apostas...", ephemeral: true });

  const channel = interaction.channel;
  if (!channel || !("send" in channel)) {
    await interaction.editReply("❌ Não consigo enviar mensagens neste canal.");
    return;
  }

  for (const mode of MODES) {
    for (const val of [...BET_VALUES].reverse()) {
      const status = queueManager.getValueQueueStatus(mode, val, "mobile");
      await channel.send({
        embeds: [valueQueueEmbed(mode, val, "mobile", status)],
        components: buildValueQueueRows(mode, val, "mobile"),
      });
    }
  }

  await interaction.editReply("✅ Painéis criados com sucesso!");
}

export async function handleQueueButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;

  if (customId === buildLeaveCustomId()) {
    const info = queueManager.getPlayerQueueInfo(interaction.user.id);
    const removed = queueManager.leaveAll(interaction.user.id);
    if (removed.length === 0) {
      await interaction.reply({ embeds: [notInQueueEmbed()], ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [leftAllQueuesEmbed()], ephemeral: true });
    if (info) {
      void refreshPanel(interaction, info.mode, info.betValue, info.format);
    }
    return;
  }

  const parsed = parseQueueCustomId(customId);
  if (!parsed) return;

  const { mode, betValue, weaponMode, format } = parsed;
  const userId = interaction.user.id;
  const username = interaction.user.username;

  if (adminManager.getCount() === 0) {
    await interaction.reply({ embeds: [noAdminOnlineEmbed()], ephemeral: true });
    return;
  }

  const { alreadyInQueue, inPendingMatch, position } = queueManager.join(mode, betValue, weaponMode, format, userId, username);

  if (inPendingMatch) {
    await interaction.reply({ embeds: [inPendingMatchEmbed()], ephemeral: true });
    return;
  }

  if (alreadyInQueue) {
    const info = queueManager.getPlayerQueueInfo(userId);
    await interaction.reply({
      embeds: [alreadyInQueueEmbed(
        info?.mode ?? mode,
        info?.betValue ?? betValue,
        info?.weaponMode ?? weaponMode,
        info?.format ?? format,
        info?.position ?? position
      )],
      ephemeral: true,
    });
    return;
  }

  const current = queueManager.getQueueSize(mode, betValue, weaponMode, format);
  const needed = queueManager.getNeededPlayers(mode);

  await interaction.reply({
    embeds: [joinedQueueEmbed(mode, betValue, weaponMode, format, position, current, needed)],
    ephemeral: true,
  });

  void refreshPanel(interaction, mode, betValue, format);

  const match = queueManager.tryMatch(mode, betValue, weaponMode, format);
  if (match) {
    void refreshPanel(interaction, mode, betValue, format);

    const guild = interaction.guild;
    if (!guild) return;

    try {
      const notifChannel = await guild.channels.fetch(NOTIFICATIONS_CHANNEL_ID);
      if (notifChannel && "send" in notifChannel) {
        await notifChannel.send({
          content: match.players.map((p) => `<@${p.userId}>`).join(" "),
          embeds: [matchFoundEmbed(match)],
        });
      }
    } catch (err) {
      logger.warn({ err }, "Não foi possível enviar notificação no canal configurado");
    }

    await createMatchThread(interaction, match);
  }

  logger.info({ mode, betValue, weaponMode: WEAPON_MODE_LABEL[weaponMode], format, userId, position }, "Jogador entrou na fila");
}

export async function handleSair(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;

  if (queueManager.isInPendingMatch(userId)) {
    await interaction.reply({
      content: "⚠️ Você tem uma partida pendente. Cancele dentro da sala antes de sair.",
      ephemeral: true,
    });
    return;
  }

  const info = queueManager.getPlayerQueueInfo(userId);
  if (!info) {
    await interaction.reply({ embeds: [notInQueueEmbed()], ephemeral: true });
    return;
  }

  queueManager.leave(info.mode, info.betValue, info.weaponMode, info.format, userId);
  await interaction.reply({
    embeds: [leftQueueEmbed(info.mode, info.betValue, info.weaponMode, info.format)],
    ephemeral: false,
  });
  void refreshPanel(interaction as unknown as ButtonInteraction, info.mode, info.betValue, info.format);
}

export async function handleFilas(interaction: ChatInputCommandInteraction) {
  const sizes = queueManager.getAllQueueSizes();
  await interaction.reply({ embeds: [queuesStatusEmbed(sizes)], ephemeral: false });
}

export async function handleAdmins(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "❌ Este comando só funciona em servidores.", ephemeral: true });
    return;
  }

  if (guild.ownerId !== interaction.user.id) {
    await interaction.reply({ content: "🚫 Apenas o dono do servidor pode usar este comando.", ephemeral: true });
    return;
  }

  const stats = adminManager.getAllStats();

  if (stats.length === 0) {
    await interaction.reply({
      content: "Nenhum administrador registrado ainda.",
      ephemeral: true,
    });
    return;
  }

  const lines = stats.map((a, i) => {
    const status = a.isActive ? "🟢 Online" : "🔴 Offline";
    const since = a.activeSince
      ? ` — ativo desde <t:${Math.floor(a.activeSince.getTime() / 1000)}:R>`
      : "";
    return `**${i + 1}.** <@${a.userId}> — ${status}${since}\n> 🎮 Partidas administradas: **${a.matchesAdministered}**`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("👮 Relatório de Administradores")
    .setDescription(lines.join("\n\n"))
    .addFields({
      name: "📊 Total",
      value: `${stats.length} admin(s) registrado(s) • ${stats.filter((a) => a.isActive).length} online agora`,
      inline: false,
    })
    .setFooter({ text: "Visível apenas para você (dono do servidor)" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
