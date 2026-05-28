import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

export const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Cria os 4 painéis de apostas no canal atual (apenas admins)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("sair")
    .setDescription("Sair da fila atual")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("filas")
    .setDescription("Ver o status de todas as filas")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("admins")
    .setDescription("Lista os admins e quantas partidas cada um administrou (apenas dono)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
];
