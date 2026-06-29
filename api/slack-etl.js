// PulseCRM — Slack ETL Connector
// POST { action: "pull", botToken: string, channels?: string[] }
//   Returns { ok: true, activities: [...], messageCount: N, channelsFetched: N }
// POST { action: "push", webhookUrl: string, payload: { text, ... } }
//   Returns { ok: true }
//
// Setup — inbound (Slack → CRM):
//   Create a Slack App, add Bot Token Scopes: channels:history, channels:read, groups:history, groups:read
//   Install to workspace and copy the Bot User OAuth Token (xoxb-...)
//
// Setup — outbound (CRM → Slack):
//   In your Slack App: Features → Incoming Webhooks → Activate → Add to workspace
//   Copy the webhook URL (https://hooks.slack.com/services/...)

const ALLOWED_ORIGINS = ["https://pulse-crm-blush.vercel.app"];

// ── Inbound: Slack → CRM ─────────────────────────────────────────────────────

function extractEmails(text) {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return matches ? [...new Set(matches.map(e => e.toLowerCase()))] : [];
}

async function fetchSlackMessages(botToken, channelIds) {
  const h = { "Authorization": `Bearer ${botToken}`, "Content-Type": "application/json" };
  // Pull messages from the last 30 days
  const since = String(Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000));
  const activities = [];
  let messageCount = 0;

  // Resolve channels: if none specified, list all joined public + private channels
  let resolvedChannels = [];
  if (!channelIds || channelIds.length === 0) {
    const lr = await fetch(
      "https://slack.com/api/conversations.list?limit=200&exclude_archived=true&types=public_channel,private_channel",
      { headers: h }
    );
    const ld = await lr.json();
    if (!ld.ok) throw new Error(`Slack error: ${ld.error || "conversations.list failed"}`);
    resolvedChannels = (ld.channels || [])
      .filter(ch => ch.is_member)
      .slice(0, 15)
      .map(ch => ({ id: ch.id, name: ch.name }));
  } else {
    resolvedChannels = channelIds.map(raw => {
      const id = raw.replace(/^#/, "").trim();
      return { id, name: id };
    });
  }

  for (const ch of resolvedChannels) {
    // Resolve channel name if we only have an ID
    let chName = ch.name;
    if (/^[CG]/.test(ch.id) && ch.name === ch.id) {
      try {
        const ir = await fetch(`https://slack.com/api/conversations.info?channel=${ch.id}`, { headers: h });
        const id = await ir.json();
        if (id.ok) chName = id.channel?.name || ch.id;
      } catch (_) {}
    }

    let cursor = null;
    let pages = 0;
    do {
      const params = new URLSearchParams({ channel: ch.id, limit: "100", oldest: since });
      if (cursor) params.set("cursor", cursor);
      const mr = await fetch(`https://slack.com/api/conversations.history?${params}`, { headers: h });
      const md = await mr.json();
      if (!md.ok) break; // not a member of this channel — skip

      for (const msg of (md.messages || [])) {
        if (msg.subtype) continue; // skip join/leave/bot messages
        const text = (msg.text || "").trim();
        if (text.length < 3) continue;

        messageCount++;
        activities.push({
          type: "note",
          text: `[Slack #${chName}] ${text.slice(0, 500)}`,
          externalId: `slack:msg:${ch.id}:${msg.ts}`,
          actor: "Slack",
          ts: Math.round(parseFloat(msg.ts) * 1000),
          channelId: ch.id,
          channelName: chName,
          userId: msg.user || null,
          mentions: extractEmails(text),
        });
      }

      cursor = md.response_metadata?.next_cursor || null;
      pages++;
    } while (cursor && pages < 5);
  }

  return { activities, messageCount, channelsFetched: resolvedChannels.length };
}

// ── Outbound: CRM → Slack ────────────────────────────────────────────────────

async function pushToSlack(webhookUrl, payload) {
  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    throw new Error("Invalid Slack webhook URL — must start with https://hooks.slack.com/");
  }
  const r = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Slack webhook ${r.status}: ${t.slice(0, 200) || r.statusText}`);
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

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

  const { action, botToken, webhookUrl, channels, payload } = req.body || {};
  if (!action) return res.status(400).json({ error: "action required: 'pull' or 'push'" });

  try {
    if (action === "pull") {
      if (!botToken) return res.status(400).json({ error: "botToken required for pull" });
      const result = await fetchSlackMessages(botToken, channels || []);
      return res.status(200).json({ ok: true, ...result });
    }

    if (action === "push") {
      if (!webhookUrl) return res.status(400).json({ error: "webhookUrl required for push" });
      if (!payload) return res.status(400).json({ error: "payload required for push" });
      await pushToSlack(webhookUrl, payload);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "action must be 'pull' or 'push'" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
