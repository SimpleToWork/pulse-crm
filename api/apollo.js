// PulseCRM — Apollo.io ETL connector
// POST { apiKey: string, maxPages?: number }
// Returns { ok: true, contacts: [...], total: number }
//
// Fetches people from the signed-in Apollo account via the People Search API.
// The API key is forwarded per-request and never stored server-side.

const ALLOWED_ORIGINS = ["https://pulse-crm-blush.vercel.app"];

function mapApolloStatus(person) {
  const stage = (person.contact_stage?.name || "").toLowerCase();
  if (stage.includes("customer") || stage.includes("closed won") || stage.includes("won")) return "Customer";
  if (stage.includes("qualified") || stage.includes("meeting") || stage.includes("opportunity")) return "Qualified";
  if (stage.includes("churned") || stage.includes("lost") || stage.includes("churn")) return "Churned";
  if (stage.includes("inactive") || stage.includes("cold") || stage.includes("unsubscribed")) return "Inactive";
  return "Lead";
}

function firstPhone(phoneNumbers) {
  if (!Array.isArray(phoneNumbers) || !phoneNumbers.length) return "";
  const p = phoneNumbers[0];
  return p.sanitized_number || p.raw_local || p.number || "";
}

async function fetchApollo(apiKey, maxPages) {
  const base = "https://api.apollo.io/api/v1";
  const contacts = [];
  let page = 1;
  let totalPages = maxPages; // we'll refine on first response

  do {
    const r = await fetch(`${base}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ api_key: apiKey, page, per_page: 100 }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Apollo API ${r.status}: ${t.slice(0, 200) || r.statusText}`);
    }

    const data = await r.json();

    // Apollo may return an error payload with status 200
    if (data.error) throw new Error(data.error);

    const people = data.people || data.contacts || [];
    const pagination = data.pagination || {};

    // Cap at the user-requested maxPages, but also respect what Apollo reports
    if (page === 1) {
      const serverPages = pagination.total_pages || 1;
      totalPages = Math.min(serverPages, maxPages);
    }

    for (const person of people) {
      const email = (person.email || "").toLowerCase().trim();
      const companyName =
        person.organization_name ||
        person.organization?.name ||
        (Array.isArray(person.employment_history) && person.employment_history[0]?.organization_name) ||
        "";

      const depts = Array.isArray(person.departments) && person.departments.length
        ? `Departments: ${person.departments.join(", ")}`
        : "";

      contacts.push({
        email: email || null,
        firstName: (person.first_name || "").trim(),
        lastName: (person.last_name || "").trim(),
        company: companyName,
        title: person.title || person.headline || "",
        phone: firstPhone(person.phone_numbers),
        linkedinUrl: person.linkedin_url || "",
        source: "Apollo",
        tags: ["apollo"],
        status: mapApolloStatus(person),
        notes: depts,
        externalId: `apollo:${person.id}`,
        lastContacted: person.last_activity_date
          ? new Date(person.last_activity_date).getTime()
          : null,
      });
    }

    page++;
    if (!people.length) break; // no more results
  } while (page <= totalPages);

  return { contacts, total: contacts.length };
}

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

  const { apiKey, maxPages } = req.body || {};
  if (!apiKey) return res.status(400).json({ error: "apiKey required" });

  const pages = Math.min(Math.max(Number(maxPages) || 5, 1), 20);

  try {
    const result = await fetchApollo(apiKey, pages);
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
