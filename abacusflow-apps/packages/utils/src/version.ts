import { getCurrentVersion } from "@abacusflow/config";

const STORAGE_KEY = "lastReadVersion";

export function shouldShowAnnouncement(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== getCurrentVersion();
}

export function markAnnouncementAsRead(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, getCurrentVersion());
}
