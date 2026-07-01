// Quote pricing engine — ported verbatim from public/index.html (pure functions).

export const DEFAULT_AI = {
  inputPrice: 2.5, outputPrice: 10.0, modelCalls: 3, avgInputTokens: 10000, avgOutputTokens: 900,
  normalQuestions: 125, provisioningBuffer: 3, gatewayLoad: 0.1, paymentProcessing: 0.029,
  volatilityMargin: 0.1, committedBudget: 1500, totalSeats: 100, hardCap: 2,
};

export interface Integration { id: string; name: string; implCost: number; timeline: number; monthlyCost: number; level: number; }

// Representative catalog across the three pricing tiers.
export const INTEGRATIONS: Integration[] = [
  { id: "int6", name: "API", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int0", name: "CSV / Flat Files (S3)", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int14", name: "Google Ads", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int15", name: "Google Analytics (GA4)", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int3", name: "Google Sheets", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int13", name: "Meta Ads", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int9", name: "QuickBooks", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int16", name: "Shopify", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int8", name: "Stripe", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int11", name: "Zendesk", implCost: 2000, timeline: 5, monthlyCost: 1000, level: 1 },
  { id: "int30", name: "Amazon Seller / Ads", implCost: 3000, timeline: 10, monthlyCost: 1500, level: 2 },
  { id: "int27", name: "Lightspeed", implCost: 3000, timeline: 10, monthlyCost: 1500, level: 2 },
  { id: "int24", name: "Magento", implCost: 3000, timeline: 10, monthlyCost: 1500, level: 2 },
  { id: "int10", name: "HubSpot", implCost: 6000, timeline: 15, monthlyCost: 2000, level: 3 },
  { id: "int12", name: "Salesforce", implCost: 6000, timeline: 15, monthlyCost: 2000, level: 3 },
  { id: "int25", name: "NetSuite", implCost: 6000, timeline: 15, monthlyCost: 2000, level: 3 },
];

export function aiDerived(ai = DEFAULT_AI) {
  const a = { ...DEFAULT_AI, ...ai };
  const costPerQuestion = (a.avgInputTokens / 1e6) * a.inputPrice * a.modelCalls + (a.avgOutputTokens / 1e6) * a.outputPrice;
  const provisionedQuestions = a.normalQuestions * a.provisioningBuffer;
  const rawApiCost = provisionedQuestions * costPerQuestion;
  const fullyLoaded = rawApiCost * (1 + a.gatewayLoad + a.volatilityMargin);
  return { costPerQuestion, provisionedQuestions, rawApiCost, fullyLoaded };
}

export interface QuoteConfig {
  integrations: { id: string; qty: number }[];
  users: { count: number; pricePerUser: number; aiLicenseCount: number };
  aiCostOverride: number;
}

export function computeQuoteTotals(q: QuoteConfig) {
  const d = aiDerived();
  const byId = new Map(INTEGRATIONS.map((i) => [i.id, i]));
  const ints = q.integrations.map((x) => ({ ...byId.get(x.id)!, qty: x.qty })).filter((x) => x.name);
  const implementation = ints.reduce((s, it) => s + (it.implCost || 0) * (it.qty || 1), 0);
  const perIntegrationMonthly = ints.reduce((s, it) => s + (it.monthlyCost || 0) * (it.qty || 1), 0);
  const timelineDays = ints.reduce((m, it) => Math.max(m, it.timeline || 0), 0);
  const users = Math.max(0, q.users.count || 0);
  const pricePerUser = Math.max(0, q.users.pricePerUser || 0);
  const aiLicenseCount = Math.max(0, q.users.aiLicenseCount || 0);
  const aiPricePerUser = q.aiCostOverride > 0 ? q.aiCostOverride : d.fullyLoaded;
  const aiMonthly = aiLicenseCount * aiPricePerUser;
  const seatMonthly = users * pricePerUser;
  const monthly = aiMonthly + seatMonthly + perIntegrationMonthly;
  const annual = monthly * 12;
  return { implementation, perIntegrationMonthly, timelineDays, aiPricePerUser, aiMonthly, seatMonthly, monthly, annual, users, pricePerUser, aiLicenseCount };
}
