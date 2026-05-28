import { type Client, EmbedBuilder } from "discord.js";
import { queueManager } from "./queue-manager.js";
import { logger } from "../lib/logger.js";

const QUEUE_TIMEOUT_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

export function startExpiryChecker(client: Client) {
  setInterval(async () => {
    const expired = queueManager.removeExpired(QUEUE_TIMEOUT_MS);
    if (expired.length === 0) return;

    logger.info({ count: expired.length }, "Jogadores removidos da fila por timeout");

    for (const entry of expired) {
      try {
        const user = await client.users.fetch(entry.userId);
        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("⏰ Tempo na fila esgotado")
          .setDescription(
            `Você ficou **5 minutos** na fila **${entry.betValue > 0 ? `R$${entry.betValue}` : ""}** sem encontrar partida e foi removido automaticamente.\n\nEntre novamente pelo painel quando quiser jogar!`
          )
          .setTimestamp();

        await user.send({ embeds: [embed] });
      } catch (err) {
        logger.warn({ userId: entry.userId, err }, "Não foi possível enviar DM de timeout");
      }
    }
  }, CHECK_INTERVAL_MS);

  logger.info("Verificador de expiração de fila iniciado (5min timeout, check a cada 30s)");
}
