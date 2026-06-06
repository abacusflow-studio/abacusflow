"use client";

import { useState, useCallback } from "react";
import type { MessageInstance } from "antd/es/message/interface";
import type { Order } from "../components/order-list-types";

interface UseOrderDetailOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDetailFn: (id: number) => Promise<any>;
  message: MessageInstance;
}

export function useOrderDetail({ getDetailFn, message }: UseOrderDetailOptions) {
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(
    async (id: number) => {
      setShowDetail(true);
      setDetailLoading(true);
      try {
        const item = await getDetailFn(id);
        setDetailItem(item);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
        setShowDetail(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [getDetailFn, message],
  );

  const closeDetail = useCallback(() => setShowDetail(false), []);

  return {
    showDetail,
    detailItem,
    detailLoading,
    openDetail,
    closeDetail,
  };
}
