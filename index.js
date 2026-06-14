import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import OpenAI from "openai";
import qrcode from "qrcode-terminal";

const openai = new OpenAI({
  apiKey: "YOUR_OPENAI_API_KEY"
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === "open") console.log("Bot Connected");
  });

  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];

    if (!m.message || m.key.fromMe) return;

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text;

    if (!text) return;

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: text }]
      });

      await sock.sendMessage(m.key.remoteJid, {
        text: res.choices[0].message.content
      });

    } catch (err) {
      console.log(err);
    }
  });
}

startBot();
