import * as SecureStore from "@lib/storage";

export type DraftType = "purchase" | "sale" | "product";

export type DraftStatus = "in_progress" | "pending" | "failed";

export interface Draft {
  id: string;
  type: DraftType;
  status: DraftStatus;
  updatedAt: number;
  summary: string;
  lastError?: string;
  payload: Record<string, unknown>;
}

const PREFIX = "abacusflow.mobile.draft.";

function keyFor(type: DraftType): string {
  return `${PREFIX}${type}`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveDraft(
  type: DraftType,
  payload: Record<string, unknown>,
  summary: string,
  status: DraftStatus = "in_progress",
  lastError?: string,
): Promise<Draft> {
  const draft: Draft = {
    id: generateId(),
    type,
    status,
    updatedAt: Date.now(),
    summary,
    lastError,
    payload,
  };
  const existing = await listDrafts(type);
  const updated = [draft, ...existing.filter((d) => d.id !== draft.id)];
  await SecureStore.setItemAsync(keyFor(type), JSON.stringify(updated));
  return draft;
}

export async function updateDraft(
  type: DraftType,
  id: string,
  updates: Partial<Pick<Draft, "payload" | "summary" | "status" | "lastError">>,
): Promise<void> {
  const existing = await listDrafts(type);
  const idx = existing.findIndex((d) => d.id === id);
  if (idx === -1) return;
  existing[idx] = {
    ...existing[idx],
    ...updates,
    updatedAt: Date.now(),
  };
  await SecureStore.setItemAsync(keyFor(type), JSON.stringify(existing));
}

export async function deleteDraft(type: DraftType, id: string): Promise<void> {
  const existing = await listDrafts(type);
  const filtered = existing.filter((d) => d.id !== id);
  await SecureStore.setItemAsync(keyFor(type), JSON.stringify(filtered));
}

export async function listDrafts(type: DraftType): Promise<Draft[]> {
  const raw = await SecureStore.getItemAsync(keyFor(type));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Draft[];
  } catch {
    return [];
  }
}

export async function listAllDrafts(): Promise<Draft[]> {
  const [purchase, sale, product] = await Promise.all([
    listDrafts("purchase"),
    listDrafts("sale"),
    listDrafts("product"),
  ]);
  return [...purchase, ...sale, ...product].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export async function clearDrafts(type: DraftType): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(type));
}
