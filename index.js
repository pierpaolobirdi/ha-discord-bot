import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import http from "http";

/* =========================
   VARIABLES DE ENTORNO
========================= */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const HA_URL = process.env.HA_URL; // ej: https://ha.tudominio.com
const HA_TOKEN = process.env.HA_TOKEN;
const ENTITY_ID = "switch.pc_win_ppa";

/* =========================
   VALIDACIONES BÁSICAS
========================= */
if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID || !HA_URL || !HA_TOKEN) {
  console.error("❌ Faltan variables de entorno");
  process.exit(1);
}

/* =========================
   CLIENTE DISCORD
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

/* =========================
   INTERACCIONES
========================= */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    /* ===== ENCENDER PC ===== */
    if (interaction.commandName === "encender_pc") {
      await fetch(`${HA_URL}/api/services/switch/turn_on`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ entity_id: ENTITY_ID })
      });

      await interaction.reply("🟢 PC ENCENDIDO");
    }

    /* ===== ESTADO PC ===== */
    if (interaction.commandName === "estado_pc") {
      const res = await fetch(`${HA_URL}/api/states/${ENTITY_ID}`, {
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`
        }
      });

      const data = await res.json();
      const estado = data.state === "on" ? "🟢 ENCENDIDO" : "🔴 APAGADO";

      await interaction.reply(`Estado del PC: ${estado}`);
    }

  } catch (err) {
    console.error("❌ Error:", err);
    if (!interaction.replied) {
      await interaction.reply("⚠️ Error al contactar con Home Assistant");
    }
  }
});

/* =========================
   LOGIN BOT
========================= */
client.login(DISCORD_TOKEN);

/* =========================
   SERVIDOR HTTP DUMMY (Render)
========================= */
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot activo");
}).listen(PORT, () => {
  console.log(`🌐 Servidor dummy escuchando en puerto ${PORT}`);
});
