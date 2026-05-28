import { EmbedBuilder, ChannelType, type Message } from "discord.js";
import { adminManager } from "./admin-manager.js";
import { queueManager } from "./queue-manager.js";
import { logger } from "../lib/logger.js";

const WINNER_DISPLAY_MS = 30_000;

export async function handleWinnerCommand(message: Message): Promise<void> {
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
      content: "⚠️ Mencione o jogador vencedor. Exemplo: `!ganhador @Jogador`",
    });
    return;
  }

  const matchId = findMatchIdByThread(message.channelId);
  const betValue = extractBetFromThreadName(message.channel.name ?? "");
  const totalPot = betValue !== null ? betValue * 2 : null;

  const countdownEmbed = buildWinnerEmbed(mentioned.id, mentioned.username, message.author.username, totalPot, 30);

  let announcement: Message;
  try {
    announcement = await message.channel.send({
      content: `🏆 <@${mentioned.id}>`,
      embeds: [countdownEmbed],
    });
  } catch (err) {
    logger.error({ err }, "Erro ao enviar anúncio de vencedor");
    return;
  }

  await message.delete().catch(() => null);

  logger.info(
    { winnerId: mentioned.id, adminId: message.author.id, matchId },
    "Vencedor declarado — sala encerrando em 30s"
  );

  const intervals = [20, 10, 5];
  for (const secondsLeft of intervals) {
    const delay = (WINNER_DISPLAY_MS / 1000 - secondsLeft) * 1000;
    setTimeout(async () => {
      try {
        await announcement.edit({
          embeds: [buildWinnerEmbed(mentioned.id, mentioned.username, message.author.username, totalPot, secondsLeft)],
        });
      } catch {
        // mensagem pode ter sido deletada
      }
    }, delay);
  }

  setTimeout(async () => {
    try {
      await announcement.edit({
        embeds: [buildClosingEmbed(mentioned.id, mentioned.username)],
      });
    } catch { /* ignorar */ }

    await new Promise((r) => setTimeout(r, 2000));

    if (matchId) {
      queueManager.cancelMatch(matchId);
    }

    try {
      const thread = message.channel;
      if ("setArchived" in thread) {
        await (thread as any).setArchived(true, "Sala encerrada após vencedor declarado");
        logger.info({ threadId: message.channelId }, "Thread arquivada após vencedor declarado");
      }
    } catch (err) {
      logger.warn({ err }, "Não foi possível arquivar a thread do vencedor");
    }
  }, WINNER_DISPLAY_MS);
}

function findMatchIdByThread(threadId: string): string | null {
  return null;
}

function extractBetFromThreadName(name: string): number | null {
  const match = name.match(/R\$(\d+)/);
  if (!match) return null;
  return Number(match[1]);
}

function buildWinnerEmbed(
  winnerId: string,
  winnerName: string,
  adminName: string,
  totalPot: number | null,
  secondsLeft: number
): EmbedBuilder {
  const fields = [
    { name: "👮 Declarado por", value: adminName, inline: true },
    { name: "⏱️ Sala fecha em", value: `**${secondsLeft}** segundos`, inline: true },
  ];

  if (totalPot !== null) {
    fields.push({ name: "💰 Pote total", value: `R$${totalPot},00`, inline: true });
  }

  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("🏆 TEMOS UM VENCEDOR!")
    .setDescription(
      `## <@${winnerId}> GANHOU!\n\n` +
      `Parabéns **${winnerName}**! 🎉\n\n` +
      `A sala será encerrada automaticamente em **${secondsLeft} segundos**.\n` +
      `Após isso, ambos os jogadores poderão iniciar uma nova partida.`
    )
    .addFields(fields)
    .setTimestamp();
}

function buildClosingEmbed(winnerId: string, winnerName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x99aab5)
    .setTitle("🔒 Sala encerrada")
    .setDescription(
      `**${winnerName}** foi declarado vencedor.\n\nEsta sala está sendo encerrada. Vocês já podem entrar em uma nova fila!`
    )
    .setTimestamp();
}
