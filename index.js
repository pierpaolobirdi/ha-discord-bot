import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import http from "http";

/* =========================
   VARIABLES DE ENTORNO
========================= */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const PC_ENTITY = process.env.PC_ENTITY;
const ID_ROLE_PERMITIDO = process.env.ID_ROLE_PERMITIDO;

/* =========================
   VALIDACIÓN
========================= */
if (!DISCORD_TOKEN || !HA_URL || !HA_TOKEN || !PC_ENTITY || !ID_ROLE_PERMITIDO) {
  console.error("❌ Faltan variables de entorno obligatorias");
  process.exit(1);
}

/* =========================
   CLIENTE DISCORD
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

/* =========================
   INTERACCIONES
========================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // ⏳ Avisamos a Discord de que vamos a tardar
    await interaction.deferReply({ ephemeral: true });

    /* ===== CONTROL DE ACCESO ===== */
    const rolesUsuario = interaction.member.roles.cache;
    if (!rolesUsuario.has(ID_ROLE_PERMITIDO)) {
      await interaction.editReply("⛔ No tienes permiso para usar este comando");
      return;
    }

    /* ===== ENCENDER PC ===== */
    if (interaction.commandName === "encender_pc") {
      const res = await fetch(`${HA_URL}/api/services/switch/turn_on`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entity_id: PC_ENTITY }),
      });

      if (!res.ok) {
        await interaction.editReply("❌ No se pudo enviar la orden de encendido");
        return;
      }

      await interaction.editReply("🟢 PC ENCENDIDO");
    }

    /* ===== ESTADO PC ===== */
    if (interaction.commandName === "estado_pc") {
      const res = await fetch(`${HA_URL}/api/states/${PC_ENTITY}`, {
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`,
        },
      });

      if (!res.ok) {
        await interaction.editReply("⚠️ No se pudo obtener el estado del PC");
        return;
      }

      const data = await res.json();
      const estadoHumano =
        data.state === "on"
          ? "🟢 ENCENDIDO"
          : data.state === "off"
          ? "🔴 APAGADO"
          : "❓ DESCONOCIDO";

      await interaction.editReply(`💻 Estado del PC: **${estadoHumano}**`);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("⚠️ Error al contactar con Home Assistant");
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
