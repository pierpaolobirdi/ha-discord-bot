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
  console.error("❌ FALTAN VARIABLES DE ENTORNO");
  process.exit(1);
}

/* =========================
   CLIENTE DISCORD
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`🤖 BOT CONECTADO COMO ${client.user.tag}`);
});

/* =========================
   INTERACCIONES
========================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // 🔐 Intentamos deferReply de forma segura
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: 64 });
    }
  } catch (err) {
    // ❗ Si la interacción ya no existe, salimos sin romper nada
    if (err.code === 10062) {
      console.warn("⚠️ INTERACCIÓN EXPIRADA (IGNORADA)");
      return;
    }
    throw err;
  }

  try {
    /* ===== CONTROL DE ACCESO ===== */
    const rolesUsuario = interaction.member.roles.cache;
    if (!rolesUsuario.has(ID_ROLE_PERMITIDO)) {
      await interaction.editReply("⛔ NO TIENES PERMISO PARA USAR ESTE COMANDO");
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
        await interaction.editReply("❌ NO SE PUDO ENVIAR LA ORDEN DE ENCENDIDO");
        return;
      }

      await interaction.editReply("🟢 ENVIADO COMANDO DE ENCENDIDO AL PC");
    }

    /* ===== ESTADO PC ===== */
    if (interaction.commandName === "estado_pc") {
      const res = await fetch(`${HA_URL}/api/states/${PC_ENTITY}`, {
        headers: {
          "Authorization": `Bearer ${HA_TOKEN}`,
        },
      });

      if (!res.ok) {
        await interaction.editReply("⚠️ NO SE PUDO OBTENER EL ESTADO DEL PC");
        return;
      }

      const data = await res.json();
      const estadoHumano =
        data.state === "on"
          ? "🟢 ENCENDIDO"
          : data.state === "off"
          ? "🔴 APAGADO"
          : "❓ DESCONOCIDO";

      await interaction.editReply(`💻 ESTADO DEL PC: **${estadoHumano}**`);
    }
  } catch (err) {
    console.error("❌ ERROR:", err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("⚠️ ERROR AL CONTACTAR CON HOME ASSISTANT");
      }
    } catch {
      // Si ya no se puede responder, no hacemos nada
    }
  }
});

/* =========================
   LOGIN
========================= */
client.login(DISCORD_TOKEN);

/* =========================
   SERVIDOR HTTP DUMMY (RENDER)
========================= */
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("BOT ACTIVO");
}).listen(PORT, () => {
  console.log(`🌐 SERVIDOR DUMMY ESCUCHANDO EN PUERTO ${PORT}`);
});
