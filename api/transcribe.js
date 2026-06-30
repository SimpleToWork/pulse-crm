// PulseCRM — serverless Grok voice-to-text proxy.
// The browser POSTs {audio: base64string, mimeType} here and gets back {text}.
// GROK_API_KEY lives only in this function's environment and never reaches the client.

const ALLOWED_ORIGINS = [
  "https://pulse-crm-blush.vercel.app"
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  if (!process.env.GROK_API_KEY) {
    return res.status(503).json({ error: "Voice transcription is not configured (missing GROK_API_KEY)." });
  }

  const { audio, mimeType } = req.body || {};
  if (!audio) return res.status(400).json({ error: "audio required" });

  try {
    const buf = Buffer.from(audio, "base64");
    const ext = mimeType?.includes("ogg") ? "ogg" : mimeType?.includes("mp4") ? "mp4" : "webm";
    const file = new File([buf], `recording.${ext}`, { type: mimeType || "audio/webm" });

    const form = new FormData();
    form.append("file", file);
    form.append("model", "whisper-large-v3");

    const r = await fetch("https://api.x.ai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROK_API_KEY}` },
      body: form
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "Transcription failed" });
    res.status(200).json({ text: data.text || "" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
