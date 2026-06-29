// PulseCRM — ETL connector for Instantly & Smartlead.io
// POST { service: "instantly"|"smartlead", apiKey: string }
// Returns { ok: true, contacts: [...], activities: [...], campaigns: number }
//
// The user's outreach API key is forwarded per-request and never stored here.
// All mapping happens server-side so CORS restrictions on the upstream APIs don't matter.

const ALLOWED_ORIGINS = ["https://pulse-crm-blush.vercel.app"];

// ── Instantly ───────────────────────────────────────────────────────────────

function mapInstantlyStatus(s) {
  if (!s) return "Lead";
  const u = s.toLowerCase();
  if (u.includes("replied") || u.includes("interested") || u.includes("meeting_booked")) return "Qualified";
  if (u.includes("converted") || u.includes("customer") || u.includes("won")) return "Customer";
  if (u.includes("unsubscribed") || u.includes("bounced") || u.includes("out_of_office")) return "Inactive";
  return "Lead";
}

async function fetchInstantly(apiKey) {
  const base = "https://api.instantly.ai/api/v2";
  const h = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };

  const cr = await fetch(`${base}/campaigns?limit=100`, { headers: h });
  if (!cr.ok) {
    const t = await cr.text().catch(() => "");
    throw new Error(`Instantly API ${cr.status}: ${t.slice(0, 200) || cr.statusText}`);
  }
  const cd = await cr.json();
  const campaigns = cd.items || cd.campaigns || cd.data || [];

  const contacts = [], activities = [];

  for (const camp of campaigns.slice(0, 25)) {
    let cursor = null;
    let pages = 0;
    do {
      const url = `${base}/leads?campaign_id=${encodeURIComponent(camp.id)}&limit=100${cursor ? `&starting_after=${cursor}` : ""}`;
      const lr = await fetch(url, { headers: h });
      if (!lr.ok) break;
      const ld = await lr.json();
      const leads = ld.items || ld.leads || ld.data || [];

      for (const lead of leads) {
        const email = (lead.email || "").toLowerCase().trim();
        if (!email) continue;

        const extId = `instantly:${camp.id}:${lead.id || email}`;
        contacts.push({
          email,
          firstName: (lead.first_name || lead.firstName || "").trim(),
          lastName: (lead.last_name || lead.lastName || "").trim(),
          company: lead.company_name || lead.company || "",
          title: lead.title || lead.job_title || "",
          phone: lead.phone || lead.phone_number || "",
          source: "Cold Outreach",
          tags: ["instantly"],
          status: mapInstantlyStatus(lead.lead_status || lead.status),
          notes: `Instantly campaign: ${camp.name}`,
          externalId: extId,
          lastContacted: lead.timestamp ? new Date(lead.timestamp).getTime() : null,
        });

        if (lead.timestamp) {
          activities.push({
            type: "email",
            text: `[Instantly] Sequence email sent via "${camp.name}"`,
            externalId: `instantly:sent:${camp.id}:${lead.id || email}`,
            contactEmail: email,
          });
        }
        const status = (lead.lead_status || lead.status || "").toLowerCase();
        if (status.includes("replied") || status.includes("interested") || status.includes("meeting_booked")) {
          activities.push({
            type: "email",
            text: `[Instantly] Reply received in "${camp.name}"`,
            externalId: `instantly:reply:${camp.id}:${lead.id || email}`,
            contactEmail: email,
          });
        }
      }

      cursor = ld.next_cursor || ld.nextCursor || null;
      pages++;
    } while (cursor && pages < 10);
  }

  return { contacts, activities, campaigns: campaigns.length };
}

// ── Smartlead ────────────────────────────────────────────────────────────────

function mapSmartleadStatus(s) {
  if (!s) return "Lead";
  const u = s.toUpperCase();
  if (u === "REPLIED" || u === "INTERESTED" || u === "MEETING_BOOKED") return "Qualified";
  if (u === "CONVERTED" || u === "WON") return "Customer";
  if (u === "UNSUBSCRIBED" || u === "BOUNCED" || u === "DO_NOT_CONTACT") return "Inactive";
  return "Lead";
}

async function fetchSmartlead(apiKey) {
  const base = "https://server.smartlead.ai/api/v1";
  const qs = `api_key=${encodeURIComponent(apiKey)}`;

  const cr = await fetch(`${base}/campaigns?${qs}&offset=0&limit=100`);
  if (!cr.ok) {
    const t = await cr.text().catch(() => "");
    throw new Error(`Smartlead API ${cr.status}: ${t.slice(0, 200) || cr.statusText}`);
  }
  const cd = await cr.json();
  const campaigns = Array.isArray(cd) ? cd : (cd.data || []);

  const contacts = [], activities = [];

  for (const camp of campaigns.slice(0, 25)) {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const lr = await fetch(`${base}/campaigns/${camp.id}/leads?${qs}&offset=${offset}&limit=100`);
      if (!lr.ok) break;
      const ld = await lr.json();
      const leads = Array.isArray(ld) ? ld : (ld.data || []);

      for (const lead of leads) {
        const email = (lead.email || "").toLowerCase().trim();
        if (!email) continue;

        const extId = `smartlead:${camp.id}:${lead.id || email}`;
        contacts.push({
          email,
          firstName: lead.first_name || "",
          lastName: lead.last_name || "",
          company: lead.company_name || "",
          title: lead.designation || lead.title || "",
          phone: lead.phone_number || lead.phone || "",
          source: "Cold Outreach",
          tags: ["smartlead"],
          status: mapSmartleadStatus(lead.lead_status || lead.status),
          notes: `Smartlead campaign: ${camp.name}`,
          externalId: extId,
          lastContacted: lead.last_email_sent_time ? new Date(lead.last_email_sent_time).getTime() : null,
        });

        if (lead.last_email_sent_time) {
          activities.push({
            type: "email",
            text: `[Smartlead] Sequence email sent via "${camp.name}"`,
            externalId: `smartlead:sent:${camp.id}:${lead.id || email}`,
            contactEmail: email,
          });
        }
        const leadStatus = (lead.lead_status || "").toUpperCase();
        if (leadStatus === "REPLIED" || leadStatus === "INTERESTED" || leadStatus === "MEETING_BOOKED") {
          activities.push({
            type: "email",
            text: `[Smartlead] Reply received in "${camp.name}"`,
            externalId: `smartlead:reply:${camp.id}:${lead.id || email}`,
            contactEmail: email,
          });
        }
      }

      hasMore = leads.length === 100;
      offset += 100;
      if (offset > 2000) break; // safety cap per campaign
    }
  }

  return { contacts, activities, campaigns: campaigns.length };
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

  const { service, apiKey } = req.body || {};
  if (!service || !apiKey) return res.status(400).json({ error: "service and apiKey required" });
  if (!["instantly", "smartlead"].includes(service)) return res.status(400).json({ error: "service must be 'instantly' or 'smartlead'" });

  try {
    const result = service === "instantly"
      ? await fetchInstantly(apiKey)
      : await fetchSmartlead(apiKey);
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
