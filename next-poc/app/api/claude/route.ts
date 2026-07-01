// Serverless Anthropic proxy — ported from api/claude.js. The API key lives only
// here (ANTHROPIC_API_KEY) and never reaches the client. Same-origin in Next, so
// no CORS allowlist needed. Model/params preserved verbatim from the original.
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "AI is not configured (missing ANTHROPIC_API_KEY)." }, { status: 503 });

  const { prompt, system } = await req.json().catch(() => ({}));
  if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });

  try {
    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    };
    if (system) body.system = system;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return Response.json({ error: data }, { status: r.status });
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
