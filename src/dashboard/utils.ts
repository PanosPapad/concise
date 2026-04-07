import { SavedTab } from "../shared/types";
import { getDomain as _getDomain } from "../shared/utils";

export { getDomain } from "../shared/utils";

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
  if (ts === undefined) return false;
  return Date.now() - ts > 24 * 60 * 60 * 1000;
}

export function workspaceHealthRatio(tabs: SavedTab[]): number {
  if (tabs.length === 0) return 1;
  const now = Date.now();
  const staleThreshold = 24 * 60 * 60 * 1000;
  const nonStale = tabs.filter(
    (t) => t.lastActivatedAt === undefined || now - t.lastActivatedAt < staleThreshold,
  ).length;
  return nonStale / tabs.length;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
}

export interface DomainGroup {
  domain: string;
  tabs: SavedTab[];
}

export function groupTabsByDomain(tabs: SavedTab[]): DomainGroup[] {
  const pinnedTabs: SavedTab[] = [];
  const domainMap = new Map<string, SavedTab[]>();

  for (const tab of tabs) {
    if (tab.pinned) {
      pinnedTabs.push(tab);
      continue;
    }
    const domain = _getDomain(tab.url);
    const existing = domainMap.get(domain);
    if (existing) {
      existing.push(tab);
    } else {
      domainMap.set(domain, [tab]);
    }
  }

  const groups: DomainGroup[] = [];

  if (pinnedTabs.length > 0) {
    groups.push({ domain: "Pinned", tabs: pinnedTabs });
  }

  const domainGroups = Array.from(domainMap.entries())
    .map(([domain, tabs]) => ({ domain, tabs }))
    .sort((a, b) => b.tabs.length - a.tabs.length);

  groups.push(...domainGroups);

  return groups;
}
