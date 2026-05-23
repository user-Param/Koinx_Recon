const ALIAS_MAP: Record<string, string> = {
  "bitcoin": "BTC",
  "btc": "BTC",
  "ethereum": "ETH",
  "eth": "ETH",
  "tether": "USDT",
  "usdt": "USDT",
  "usd": "USD",
  "united states dollar": "USD",
};

export function normalizeAsset(asset: string): string {
  if (!asset) return "";
  const normalized = asset.toLowerCase().trim();
  return ALIAS_MAP[normalized] || normalized.toUpperCase();
}
