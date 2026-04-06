export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function relativeTime(ts: number | undefined): string {
  if (!ts) return "never";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function isStale(ts: number | undefined): boolean {
  if (!ts) return true;
  return Date.now() - ts > 24 * 60 * 60 * 1000;
}
