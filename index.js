import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import fetch from "node-fetch";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const PC_ENTITY = process.env.PC_ENTITY;

// ---------- REGISTRAR COMANDOS ----------
const commands = [
  new SlashCommandBuilder()
    .setName("encender_pc")
    .setDescription("Enciende el PC"),
  new SlashCommandBuilder()
    .setName("estado_pc")
    .setDescription("Muestra el estado del PC")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: commands }
);

// ---------- CLIENTE DISCORD ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "encender_pc") {
  await fetch(`${HA_URL}/api/services/switch/turn_on`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      entity_id: PC_ENTITY
    })
  });

  await interaction.reply("🟢 Enviada orden de encendido al PC");
}

if (interaction.commandName === "estado_pc") {
  const res = await fetch(`${HA_URL}/api/states/${PC_ENTITY}`, {
    headers: {
      "Authorization": `Bearer ${HA_TOKEN}`
    }
  });
  const data = await res.json();

  await interaction.reply(`💻 Estado del PC: **${data.state}**`);
}

});

client.login(DISCORD_TOKEN);

