import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";
import { logger } from "../lib/logger.js";

export async function registerCommands(token: string, clientId: string) {
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    logger.info("Registrando slash commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info(`${commands.length} comandos registrados com sucesso.`);
  } catch (err) {
    logger.error({ err }, "Erro ao registrar comandos");
    throw err;
  }
}
