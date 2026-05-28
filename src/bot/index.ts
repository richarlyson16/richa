import { Client, GatewayIntentBits, Events, ChannelType, AttachmentBuilder, EmbedBuilder, type ChatInputCommandInteraction, type ButtonInteraction, type Message } from "discord.js";
import { registerCommands } from "./register-commands.js";
import { handlePainel, handleSair, handleFilas, handleAdmins, handleQueueButton, handleMatchConfirm, handleMatchCancel, handleMatchClose, handleAdminIniciar, handleAdminSair } from "./interaction-handler.js";
import { ADMIN_JOIN_ID, ADMIN_LEAVE_ID } from "./admin-panel.js";
import { startExpiryChecker } from "./expiry.js";
import { postStartupPanels } from "./startup-panels.js";
import { detectPixKey, TYPE_LABEL } from "./pix-detector.js";
import { generatePixQrBuffer } from "./pix-qr.js";
import { handleWinnerCommand } from "./winner-handler.js";
import { handleBanCommand } from "./ban-handler.js";
import { logger } from "../lib/logger.js";

export async function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.error("DISCORD_TOKEN não definido. Bot não será iniciado.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Bot conectado ao Discord");
    await registerCommands(token, readyClient.user.id);
    startExpiryChecker(client);
    await postStartupPanels(client);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const cmd = interaction as ChatInputCommandInteraction;
        switch (cmd.commandName) {
          case "painel":  await handlePainel(cmd);  break;
          case "sair":    await handleSair(cmd);    break;
          case "filas":   await handleFilas(cmd);   break;
          case "admins":  await handleAdmins(cmd);  break;
          default:
            logger.warn({ command: cmd.commandName }, "Comando desconhecido");
        }
        return;
      }

      if (interaction.isButton()) {
        const btn = interaction as ButtonInteraction;
        const id = btn.customId;

        if (id === ADMIN_JOIN_ID) {
          await handleAdminIniciar(btn);
        } else if (id === ADMIN_LEAVE_ID) {
          await handleAdminSair(btn);
        } else if (id.startsWith("queue:")) {
          await handleQueueButton(btn);
        } else if (id.startsWith("match:confirm:")) {
          const matchId = id.slice("match:confirm:".length);
          await handleMatchConfirm(btn, matchId);
        } else if (id.startsWith("match:cancel:")) {
          const matchId = id.slice("match:cancel:".length);
          await handleMatchCancel(btn, matchId);
        } else if (id.startsWith("match:close:")) {
          const matchId = id.slice("match:close:".length);
          await handleMatchClose(btn, matchId);
        }
        return;
      }
    } catch (err) {
      logger.error({ err }, "Erro ao processar interação");
      try {
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ Ocorreu um erro ao processar. Tente novamente.",
            ephemeral: true,
          });
        }
      } catch {
        // Interação já expirada ou respondida — ignorar
      }
    }
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.PrivateThread) return;

    if (message.content.toLowerCase().startsWith("!ganhador")) {
      await handleWinnerCommand(message);
      return;
    }

    if (message.content.toLowerCase().startsWith("!banir")) {
      await handleBanCommand(message);
      return;
    }

    const result = detectPixKey(message.content);
    if (!result) return;

    try {
      const qrBuffer = await generatePixQrBuffer(
        result.key,
        message.author.username
      );

      const attachment = new AttachmentBuilder(qrBuffer, { name: "pix-qr.png" });

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("📱 QR Code Pix gerado!")
        .setDescription(
          `Chave detectada de <@${message.author.id}>:\n\`\`\`${result.key}\`\`\``
        )
        .addFields(
          { name: "Tipo", value: TYPE_LABEL[result.type], inline: true },
          { name: "Titular", value: message.author.username, inline: true }
        )
        .setImage("attachment://pix-qr.png")
        .setFooter({ text: "Escaneie o QR Code para realizar o pagamento" })
        .setTimestamp();

      await message.reply({ embeds: [embed], files: [attachment] });

      logger.info(
        { userId: message.author.id, keyType: result.type },
        "QR Code Pix gerado a partir de mensagem na thread"
      );
    } catch (err) {
      logger.error({ err }, "Erro ao gerar QR Code Pix");
    }
  });

  await client.login(token);
}
