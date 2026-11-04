export function matchesGeography(location: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (["uk", "united kingdom"].includes(q))
    return /\b(uk|united kingdom|england|scotland|wales|northern ireland|london|manchester|birmingham|edinburgh)\b/i.test(
      location,
    );
  if (["usa", "united states", "us"].includes(q))
    return /\b(usa|united states|us)\b/i.test(location);
  return location.toLowerCase().includes(q);
}
