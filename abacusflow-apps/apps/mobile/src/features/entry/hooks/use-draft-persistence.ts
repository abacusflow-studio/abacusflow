import { useState, useCallback, useEffect } from "react";
import {
  saveDraft,
  updateDraft,
  deleteDraft,
  listDrafts,
} from "@lib/draft-store";
import type { DraftType } from "@lib/draft-store";

/**
 * 草稿持久化 hook
 * 封装草稿的保存/恢复/自动保存/删除生命周期
 */
export function useDraftPersistence(type: DraftType, initialDraftId?: string) {
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);

  /** 恢复草稿 */
  const restoreDraft = useCallback(
    async (id: string): Promise<Record<string, unknown> | null> => {
      const drafts = await listDrafts(type);
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return null;
      setDraftId(id);
      return draft.payload;
    },
    [type],
  );

  /** 自动保存草稿（有 draftId 则更新，否则新建） */
  const autoSave = useCallback(
    async (payload: Record<string, unknown>, summary: string) => {
      if (!payload.items || (payload.items as unknown[]).length === 0) return;
      if (draftId) {
        await updateDraft(type, draftId, { payload, summary });
      } else {
        const draft = await saveDraft(type, payload, summary);
        setDraftId(draft.id);
      }
    },
    [draftId, type],
  );

  /** 提交成功后删除草稿 */
  const clearOnSuccess = useCallback(async () => {
    if (draftId) {
      await deleteDraft(type, draftId);
      setDraftId(undefined);
    }
  }, [draftId, type]);

  /** 提交失败后标记草稿状态 */
  const markFailed = useCallback(
    async (errorMsg: string) => {
      if (draftId) {
        await updateDraft(type, draftId, {
          status: "failed",
          lastError: errorMsg,
        });
      }
    },
    [draftId, type],
  );

  /** 重置 draftId（用于表单重置） */
  const resetDraftId = useCallback(() => {
    setDraftId(undefined);
  }, []);

  return {
    draftId,
    restoreDraft,
    autoSave,
    clearOnSuccess,
    markFailed,
    resetDraftId,
  };
}
