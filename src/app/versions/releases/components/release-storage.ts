export type ReleaseVersion = {
  id: string;
  name: string;
  createdAt: string; // ISO
};

const KEY = "jrm.release-versions";

export function getReleaseVersions(): ReleaseVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as ReleaseVersion[];
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function addReleaseVersion(name: string): ReleaseVersion {
  const item: ReleaseVersion = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const existing = getReleaseVersions();
    const next = [item, ...existing];
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return item;
}
