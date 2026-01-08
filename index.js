import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import fetch from "node-fetch";

// ================== VARIABLES DE ENTORNO ==================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const PC_ENTITY = process.env.PC_ENTITY;

// ================== VALIDACIONES BÁSICAS ==================
if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID || !HA_URL || !HA_TOKEN || !PC_ENTITY) {
  console.error("❌ Faltan variables de entorno obligatorias");
  process.exit(1);
}

// ================== REGISTRO DE SLASH COMMANDS ==================
const commands = [
  new SlashCommandBuilder()
    .setName("encender_pc")
    .setDescription("Enciende el PC"),
  new SlashCommandBuilder()
    .setName("estado_pc")
    .setDescription("Muestra el estado del PC")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registrados");
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
})();

// ================== CLIENTE DISCORD ==================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

// ================== MANEJO DE COMANDOS ==================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ---------- ENCENDER PC ----------
  if (interaction.commandName === "encender_pc") {
    try {
      const res = await fetch(`${HA_URL}/api/services/switch/turn_on`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entity_id: PC_ENTITY
        })
      });

      if (!res.ok) {
        await interaction.reply("❌ No se pudo enviar la orden de encendido al PC");
        return;
      }

      await interaction.reply("🟢 Orden enviada: **PC ENCENDIÉNDOSE**");
    } catch (err) {
      console.error("Error encendiendo PC:", err);
      await interaction.reply("❌ Error inesperado al encender el PC");
    }
  }

  // ---------- ESTADO PC ----------
  if (interaction.commandName === "estado_pc") {
    try {
      const res = await fetch(`${HA_URL}/api/states/${PC_ENTITY}`, {
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`
        }
      });

      if (!res.ok) {
        await interaction.reply("⚠️ No se pudo obtener el estado del PC");
        return;
      }

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        await interaction.reply("⚠️ Respuesta inesperada de Home Assistant");
        return;
      }

      let estadoHumano = "DESCONOCIDO";
      if (data.state === "on") estadoHumano = "🟢 ENCENDIDO";
      if (data.state === "off") estadoHumano = "🔴 APAGADO";

      await interaction.reply(`💻 Estado del PC: **${estadoHumano}**`);
    } catch (err) {
      console.error("Error consultando estado:", err);
      await interaction.reply("❌ Error inesperado al consultar el estado del PC");
    }
  }
});

// ================== LOGIN ==================
client.login(DISCORD_TOKEN);
