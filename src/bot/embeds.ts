import { EmbedBuilder, type ColorResolvable } from "discord.js";
import type { Match, QueueMode, BetValue, WeaponMode, Format } from "./queue-manager.js";
import { BET_VALUES, WEAPON_MODE_LABEL } from "./queue-manager.js";
import { PANEL_IMAGE_URL, PANEL_THUMBNAIL_URL } from "./channel-config.js";

const MODE_COLORS: Record<QueueMode, ColorResolvable> = {
  "1v1": 0x5865f2,
  "2v2": 0x57f287,
  "3v3": 0xfee75c,
  "4v4": 0xed4245,
};

export const MODE_EMOJI: Record<QueueMode, string> = {
  "1v1": "⚔️",
  "2v2": "🤝",
  "3v3": "🛡️",
  "4v4": "🏆",
};

export function formatBet(value: BetValue): string {
  return `R$ ${value},00`;
}

export interface WeaponQueueStatus {
  players: { userId: string; username: string }[];
  needed: number;
}

const FORMAT_EMOJI: Record<Format, string> = {
  mobile: "📱",
  emulador: "💻",
};

const FORMAT_LABEL: Record<Format, string> = {
  mobile: "Mobile",
  emulador: "Emulador",
};

export function valueQueueEmbed(
  mode: QueueMode,
  betValue: BetValue,
  format: Format,
  weaponStatus: Record<WeaponMode, WeaponQueueStatus>
) {
  const normalPlayers = weaponStatus.normal.players;
  const fulumpPlayers = weaponStatus.fulump.players;
  const needed = weaponStatus.normal.needed;
  const totalPot = betValue * needed;

  const buildSlots = (players: { userId: string; username: string }[]) => {
    const lines: string[] = [];
    for (let i = 0; i < needed; i++) {
      const prefix = i < needed - 1 ? "├" : "└";
      const player = players[i];
      lines.push(`${prefix} Slot ${i + 1} → ${player ? `<@${player.userId}>` : "`vago`"}`);
    }
    return lines.join("\n");
  };

  const description = [
    `🟢 **NORMAL**`,
    buildSlots(normalPlayers),
    ``,
    `⚙️ **FULL UMP & XM8**`,
    buildSlots(fulumpPlayers),
    ``,
    `💰 **Pote total se cheia:** R$${totalPot},00`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(MODE_COLORS[mode])
    .setTitle(`${MODE_EMOJI[mode]} ${mode.toUpperCase()} · ${FORMAT_EMOJI[format]} ${FORMAT_LABEL[format]} — R$${betValue},00`)
    .setDescription(description)
    .setFooter({ text: "🎮 Clique nos botões abaixo para entrar • Mesmo modo para dar match" });

  if (PANEL_IMAGE_URL) {
    embed.setImage(PANEL_IMAGE_URL);
  }

  return embed;
}

export function valueQueueEmbedV2(
  mode: QueueMode,
  betValue: BetValue,
  format: Format,
  weaponStatus: Record<WeaponMode, WeaponQueueStatus>
) {
  const normalPlayers = weaponStatus.normal.players;
  const fulumpPlayers = weaponStatus.fulump.players;
  const needed = weaponStatus.normal.needed;
  const totalPot = betValue * needed;

  const buildSlots = (players: { userId: string; username: string }[]) => {
    const lines: string[] = [];
    for (let i = 0; i < needed; i++) {
      const player = players[i];
      const label = player ? `<@${player.userId}>` : "vago";
      lines.push(`**Slot ${i + 1}** — ${label}`);
    }
    return lines.join("\n");
  };

  const normalFilled = normalPlayers.length;
  const fulumpFilled = fulumpPlayers.length;

  const normalValue = buildSlots(normalPlayers) + `\n${normalFilled}/${needed}`;
  const fulumpValue = buildSlots(fulumpPlayers) + `\n${fulumpFilled}/${needed}`;

  const embed = new EmbedBuilder()
    .setColor(MODE_COLORS[mode])
    .setTitle(`${MODE_EMOJI[mode]} ${mode.toUpperCase()} ${FORMAT_EMOJI[format]} ${FORMAT_LABEL[format]}`)
    .addFields(
      { name: "🎯 Normal", value: normalValue, inline: false },
      { name: "⚙️ Full UMP & XM8", value: fulumpValue, inline: false },
      { name: "💵 Aposta", value: `R$${betValue},00`, inline: true },
    )
    .setFooter({ text: "👇 Escolha seu modo e clique para entrar na fila" });

  if (PANEL_IMAGE_URL) {
    embed.setImage(PANEL_IMAGE_URL);
  }

  if (PANEL_THUMBNAIL_URL) {
    embed.setThumbnail(PANEL_THUMBNAIL_URL);
  }

  return embed;
}

export function joinedQueueEmbed(
  mode: QueueMode,
  betValue: BetValue,
  weaponMode: WeaponMode,
  format: Format,
  position: number,
  current: number,
  needed: number
) {
  return new EmbedBuilder()
    .setColor(MODE_COLORS[mode])
    .setTitle(`${MODE_EMOJI[mode]} Entrou na fila ${mode}!`)
    .setDescription(`Você está aguardando um adversário com o mesmo modo.`)
    .addFields(
      { name: "Modo", value: mode, inline: true },
      { name: "Formato", value: format, inline: true },
      { name: "Valor", value: formatBet(betValue), inline: true },
      { name: "Modo de jogo", value: WEAPON_MODE_LABEL[weaponMode], inline: true },
      { name: "Fila", value: `${current}/${needed}`, inline: true }
    )
    .setFooter({ text: "Use /sair ou o botão Sair da Fila para sair" })
    .setTimestamp();
}

export function alreadyInQueueEmbed(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format, position: number) {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⚠️ Já na fila")
    .setDescription(
      `Você já está na fila **${mode}** (${format}) apostando **${formatBet(betValue)}** no modo **${WEAPON_MODE_LABEL[weaponMode]}** (posição **#${position}**).\n\nUse \`/sair\` para trocar de fila.`
    )
    .setTimestamp();
}

export function inPendingMatchEmbed() {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⚠️ Você tem uma partida pendente")
    .setDescription("Você já tem uma sala de partida aberta. Confirme ou cancele antes de entrar em nova fila.")
    .setTimestamp();
}

export function leftQueueEmbed(mode: QueueMode, betValue: BetValue, weaponMode: WeaponMode, format: Format) {
  return new EmbedBuilder()
    .setColor(0xeb459e)
    .setTitle("🚪 Saiu da fila")
    .setDescription(`Você saiu da fila **${mode}** (${format}) — aposta ${formatBet(betValue)} | ${WEAPON_MODE_LABEL[weaponMode]}.`)
    .setTimestamp();
}

export function leftAllQueuesEmbed() {
  return new EmbedBuilder()
    .setColor(0xeb459e)
    .setTitle("🚪 Saiu de todas as filas")
    .setDescription("Você foi removido de todas as filas.")
    .setTimestamp();
}

export function notInQueueEmbed() {
  return new EmbedBuilder()
    .setColor(0x99aab5)
    .setTitle("❌ Você não está em nenhuma fila")
    .setDescription("Entre em uma fila usando os painéis acima.")
    .setTimestamp();
}

export function noAdminOnlineEmbed() {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🚫 Nenhum administrador online")
    .setDescription(
      "Não há administradores de plantão no momento.\n\n**As filas só ficam abertas quando há um admin ativo.** Aguarde um administrador entrar de plantão e tente novamente."
    )
    .setFooter({ text: "Fique de olho no servidor para saber quando um admin estiver disponível" })
    .setTimestamp();
}

export function matchFoundEmbed(match: Match) {
  const playerList = match.players.map((p, i) => `${i + 1}. <@${p.userId}>`).join("\n");
  const totalPot = match.betValue * match.players.length;

  return new EmbedBuilder()
    .setColor(MODE_COLORS[match.mode])
    .setTitle(`${MODE_EMOJI[match.mode]} Partida encontrada! ${match.mode}`)
    .setDescription("A fila encheu! Um canal privado foi criado para a partida.")
    .addFields(
      { name: "Formato", value: match.format, inline: true },
      { name: "Modo de jogo", value: WEAPON_MODE_LABEL[match.weaponMode], inline: true },
      { name: "Aposta", value: formatBet(match.betValue), inline: true },
      { name: "Pote total", value: `R$ ${totalPot},00`, inline: true },
      { name: "Jogadores", value: playerList, inline: false }
    )
    .setFooter({ text: `ID: ${match.id}` })
    .setTimestamp();
}

export function matchConfirmEmbed(match: Match, confirmations: number, adminName?: string) {
  const totalPot = match.betValue * match.players.length;
  const playerList = match.players.map((p) => `<@${p.userId}>`).join(" vs ");

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "Formato", value: match.format, inline: true },
    { name: "Modo", value: match.mode, inline: true },
    { name: "Modo de jogo", value: WEAPON_MODE_LABEL[match.weaponMode], inline: true },
    { name: "Aposta", value: formatBet(match.betValue), inline: true },
    { name: "Pote total", value: `R$ ${totalPot},00`, inline: true },
    { name: "Confirmações", value: `${confirmations}/${match.players.length}`, inline: true },
  ];

  if (adminName) {
    fields.push({ name: "👮 Administrador", value: adminName, inline: false });
  }

  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("🎮 Iniciar partida?")
    .setDescription(`${playerList}\n\nAmbos precisam confirmar para a partida começar.`)
    .addFields(fields)
    .setTimestamp();
}

export function matchStartedEmbed(match: Match, adminName?: string) {
  const half = Math.ceil(match.players.length / 2);
  const team1 = match.players.slice(0, half).map((p) => `<@${p.userId}>`).join("\n");
  const team2 = match.players.slice(half).map((p) => `<@${p.userId}>`).join("\n");
  const totalPot = match.betValue * match.players.length;

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "Formato", value: match.format, inline: true },
    { name: "Modo", value: match.mode, inline: true },
    { name: "Modo de jogo", value: WEAPON_MODE_LABEL[match.weaponMode], inline: true },
    { name: "💰 Aposta por jogador", value: formatBet(match.betValue), inline: true },
    { name: "🏆 Pote total", value: `R$ ${totalPot},00`, inline: true },
    { name: "\u200b", value: "\u200b", inline: true },
    { name: "Jogador 1", value: team1, inline: true },
    { name: "Jogador 2", value: team2, inline: true },
  ];

  if (adminName) {
    fields.push({ name: "👮 Adm", value: adminName, inline: false });
  }

  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Partida confirmada! Boa sorte!")
    .setDescription("Quando a partida acabar, clique em **🔒 Fechar Sala** para liberar a fila.")
    .addFields(fields)
    .setFooter({ text: `ID: ${match.id}` })
    .setTimestamp();
}

export function matchClosedEmbed() {
  return new EmbedBuilder()
    .setColor(0x99aab5)
    .setTitle("🔒 Sala encerrada")
    .setDescription("A sala foi fechada. Vocês já podem entrar em uma nova fila.")
    .setTimestamp();
}

export function matchCancelledEmbed(cancellerName: string) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("❌ Partida cancelada")
    .setDescription(`**${cancellerName}** cancelou a partida. A sala será fechada em instantes.`)
    .setTimestamp();
}

export function matchChannelEmbed(match: Match) {
  const half = Math.ceil(match.players.length / 2);
  const team1 = match.players.slice(0, half).map((p) => `<@${p.userId}>`).join("\n");
  const team2 = match.players.slice(half).map((p) => `<@${p.userId}>`).join("\n");
  const totalPot = match.betValue * match.players.length;

  return new EmbedBuilder()
    .setColor(MODE_COLORS[match.mode])
    .setTitle(`${MODE_EMOJI[match.mode]} Sala da Partida — ${match.mode}`)
    .setDescription("Boa sorte! Combinem aqui os detalhes da partida.")
    .addFields(
      { name: "Formato", value: match.format, inline: true },
      { name: "Modo de jogo", value: WEAPON_MODE_LABEL[match.weaponMode], inline: true },
      { name: "💰 Aposta por jogador", value: formatBet(match.betValue), inline: true },
      { name: "🏆 Pote total", value: `R$ ${totalPot},00`, inline: true },
      { name: "Jogador 1", value: team1, inline: true },
      { name: "Jogador 2", value: team2, inline: true }
    )
    .setFooter({ text: `ID: ${match.id}` })
    .setTimestamp();
}

export function queuesStatusEmbed(sizes: Record<QueueMode, Record<BetValue, { current: number; needed: number }>>) {
  const modes: QueueMode[] = ["1v1", "2v2", "3v3", "4v4"];

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 Status de todas as filas")
    .addFields(
      modes.map((mode) => ({
        name: `${MODE_EMOJI[mode]} ${mode}`,
        value: BET_VALUES.map((val) => {
          const { current, needed } = sizes[mode][val];
          return `R$ ${val},00: ${current}/${needed}`;
        }).join(" | "),
        inline: false,
      }))
    )
    .setFooter({ text: "Use os painéis para entrar em uma fila" })
    .setTimestamp();
}
