import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import http from "http";

/* =========================
   VARIABLES DE ENTORNO
========================= */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const PC_ENTITY = process.env.PC_ENTITY;
const ID_ROLE_PERMITIDO = process.env.ID_ROLE_PERMITIDO;

/* =========================
   VALIDACIÓN DE VARIABLES
========================= */
if (
  !DISCORD_TOKEN ||
  !CLIENT_ID ||
  !GUILD_ID ||
  !HA_URL ||
  !HA_TOKEN ||
  !PC_ENTITY ||
  !ID_ROLE_PERMITIDO
) {
  console.error("❌ Faltan variables de entorno obligatorias");
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
   MANEJO DE COMANDOS
========================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  /* ===== CONTROL DE ACCESO POR ROL ===== */
  const rolesUsuario = interaction.member.roles.cache;

  if (!rolesUsuario.has(ID_ROLE_PERMITIDO)) {
    await interaction.reply({
      content: "⛔ No tienes permiso para usar este comando",
      ephemeral: true
    });
    return;
  }

  try {
    /* ===== ENCENDER PC ===== */
    if (interaction.commandName === "encender_pc") {
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
        await interaction.reply("❌ No se pudo enviar la orden de encendido");
        return;
      }

      await interaction.reply("🟢 PC ENCENDIDO");
    }

    /* ===== ESTADO PC ===== */
    if (interaction.commandName === "estado_pc") {
      const res = await fetch(`${HA_URL}/api/states/${PC_ENTITY}`, {
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`
        }
      });

      if (!res.ok) {
        await interaction.reply("⚠️ No se pudo obtener el estado del PC");
        return;
      }

      const data = await res.json();
      const estadoHumano =
        data.state === "on"
          ? "🟢 ENCENDIDO"
          : data.state === "off"
          ? "🔴 APAGADO"
          : "❓ DESCONOCIDO";

      await interaction.reply(`💻 Estado del PC: **${estadoHumano}**`);
    }

  } catch (err) {
    console.error("❌ Error:", err);
    if (!interaction.replied) {
      await interaction.reply("⚠️ Error al contactar con Home Assistant");
    }
  }
});

/* =========================
   LOGIN
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
