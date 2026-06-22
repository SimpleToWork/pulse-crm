// PulseCRM — serverless Anthropic proxy.
// The browser POSTs {prompt} (or {prompt, system}) here and gets back {text}.
// The API key lives ONLY in this function's environment (ANTHROPIC_API_KEY) and
// never reaches the client. This is the single boundary where CRM data meets the LLM.

// Only these origins may use the proxy. The app calls /api/claude same-origin,
// so this mainly stops other sites from borrowing the API key / quota.
// Add your production domain(s) here once deployed.
const ALLOWED_ORIGINS = [
  "https://pulse-crm.vercel.app"
];

export default async function handler(req, res) {
  // CORS — reflect the origin only if it's on the allowlist.
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "AI is not configured (missing ANTHROPIC_API_KEY)." });
  }

  const { prompt, system } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }]
    };
    // A system prompt carries the privacy rules (single-workspace scoping) from the client.
    if (system) body.system = system;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
