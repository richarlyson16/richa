import { EmbedBuilder, ChannelType, type Message } from "discord.js";
import { adminManager } from "./admin-manager.js";
import { queueManager } from "./queue-manager.js";
import { logger } from "../lib/logger.js";

export async function handleBanCommand(message: Message): Promise<void> {
  if (message.channel.type !== ChannelType.PrivateThread) return;

  const isAdmin = adminManager.isActive(message.author.id);
  if (!isAdmin) {
    await message.reply({
      content: "🚫 Apenas administradores de plantão podem usar este comando.",
    });
    return;
  }

  const mentioned = message.mentions.users.first();
  if (!mentioned) {
    await message.reply({
      content: "⚠️ Mencione o jogador a ser banido. Exemplo: `!banir @Jogador`",
    });
    return;
  }

  if (mentioned.id === message.author.id) {
    await message.reply({ content: "⚠️ Você não pode banir a si mesmo." });
    return;
  }

  if (mentioned.bot) {
    await message.reply({ content: "⚠️ Não é possível banir um bot." });
    return;
  }

  const guild = message.guild;
  if (!guild) return;

  try {
    const member = await guild.members.fetch(mentioned.id).catch(() => null);
    if (!member) {
      await message.reply({ content: "❌ Jogador não encontrado no servidor." });
      return;
    }

    if (!member.bannable) {
      await message.reply({
        content: "❌ Não tenho permissão para banir este usuário (cargo superior ao meu).",
      });
      return;
    }

    queueManager.leaveAll(mentioned.id);

    const reason = `Trapaça/Hack detectado em partida — banido pelo admin ${message.author.username}`;

    try {
      await mentioned.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🔨 Você foi banido do servidor")
            .setDescription(
              `Você foi banido por **trapaça/uso de hack** em uma partida.\n\n**Motivo:** ${reason}`
            )
            .setTimestamp(),
        ],
      });
    } catch {
      // DM bloqueada — continua o ban
    }

    await member.ban({ reason });

    await message.delete().catch(() => null);

    const banEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔨 Jogador Banido por Trapaça")
      .setDescription(
        `**${mentioned.username}** foi banido do servidor por uso de **hack/trapaça** confirmado pelo administrador.`
      )
      .addFields(
        { name: "🎯 Banido", value: `<@${mentioned.id}> (${mentioned.username})`, inline: true },
        { name: "👮 Admin", value: message.author.username, inline: true },
        { name: "📋 Motivo", value: "Trapaça/Hack confirmado em partida", inline: false }
      )
      .setFooter({ text: "Esta sala será encerrada em instantes." })
      .setTimestamp();

    await message.channel.send({ embeds: [banEmbed] });

    logger.info(
      { bannedId: mentioned.id, bannedName: mentioned.username, adminId: message.author.id },
      "Jogador banido por trapaça"
    );

    await new Promise((r) => setTimeout(r, 5000));

    try {
      if ("setArchived" in message.channel) {
        await (message.channel as any).setArchived(true, "Sala encerrada após ban por trapaça");
      }
    } catch (err) {
      logger.warn({ err }, "Não foi possível arquivar a thread após ban");
    }
  } catch (err) {
    logger.error({ err, targetId: mentioned.id }, "Erro ao banir jogador");
    await message.reply({
      content: "❌ Ocorreu um erro ao tentar banir o jogador. Verifique as permissões do bot.",
    });
  }
}
