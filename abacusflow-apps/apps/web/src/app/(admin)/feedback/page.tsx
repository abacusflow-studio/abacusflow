"use client";

import React, { useState } from "react";
import {
  Button,
  Table,
  Modal,
  Form,
  Select,
  Input,
  Tag,
  App,
  Descriptions,
  Space,
  Image,
  Spin,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "../../../components/admin-page-header";
import { getConfig } from "@abacusflow/config";
import {
  feedbackApi,
  type BasicFeedback,
  type Feedback,
  type FeedbackCategory,
  type FeedbackStatus,
  type FeedbackSource,
} from "@abacusflow/core";
import { usePaginatedList } from "../../../hooks/use-paginated-list";

const STATUS_COLORS: Record<string, string> = {
  NEW: "gold",
  CONFIRMED: "gold",
  IN_PROGRESS: "gold",
  RESOLVED: "green",
  CLOSED: "red",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "待处理",
  CONFIRMED: "待处理",
  IN_PROGRESS: "待处理",
  RESOLVED: "已解决",
  CLOSED: "已拒绝",
};

const STATUS_FILTER_OPTIONS = [
  { label: STATUS_LABELS.RESOLVED, value: "RESOLVED" },
  { label: STATUS_LABELS.CLOSED, value: "CLOSED" },
];

const CATEGORY_LABELS: Record<string, string> = {
  BUG: "Bug",
  DATA_WRONG: "数据不对",
  USABILITY: "操作不会用",
  FEATURE_REQUEST: "功能建议",
  OTHER: "其他",
};

const SOURCE_LABELS: Record<string, string> = {
  WEB: "Web",
  MOBILE: "Mobile",
};

type FeedbackAction = "resolve" | "close";

const getFeedbackImageUrls = (item: Feedback | null): string[] => {
  if (!Array.isArray(item?.imageUrls)) return [];
  return item.imageUrls.filter((url): url is string => !!url?.trim());
};

const resolveFeedbackImageUrl = (url: string) => {
  const trimmed = url.trim();
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  const baseUrl = getConfig().apiBaseUrl.replace(/\/+$/, "");
  return `${baseUrl}/${trimmed.replace(/^\/+/, "")}`;
};

export default function FeedbackPage() {
  const { message } = App.useApp();
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Feedback | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [actionType, setActionType] = useState<FeedbackAction>("resolve");
  const [actionForm] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);
  const detailImageUrls = getFeedbackImageUrls(detailItem);

  const {
    data,
    loading,
    pageIndex,
    total,
    filters,
    updateFilter,
    setPageIndex,
    refresh,
    handleSearch,
    handleReset,
  } = usePaginatedList<
    BasicFeedback,
    {
      status?: FeedbackStatus;
      source?: FeedbackSource;
      category?: FeedbackCategory;
    }
  >({
    fetchFn: (params) =>
      feedbackApi.listFeedbackPage(
        params as Parameters<typeof feedbackApi.listFeedbackPage>[0],
      ),
    defaultFilters: {
      status: undefined,
      source: undefined,
      category: undefined,
    },
  });

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await feedbackApi.getFeedback({ id });
      setDetailItem(item);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const openAction = (type: FeedbackAction) => {
    setActionType(type);
    actionForm.resetFields();
    setShowAction(true);
  };

  const handleAction = async () => {
    if (!detailItem) return;
    try {
      const values = await actionForm.validateFields();
      setActionLoading(true);

      const updated = await feedbackApi.updateFeedback({
        id: detailItem.id,
        updateFeedbackInput: {
          action: actionType,
          resolutionNote: values.resolutionNote,
        },
      });

      setDetailItem(updated);
      setShowAction(false);
      message.success("操作成功");
      refresh();
    } catch (err) {
      if (err instanceof Error && !err.message.includes("validate")) {
        message.error(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnsType<BasicFeedback> = [
    {
      title: "提交时间",
      dataIndex: "createdAt",
      width: 180,
      render: (val: number) => new Date(val).toLocaleString("zh-CN"),
    },
    {
      title: "来源",
      dataIndex: "source",
      width: 80,
      render: (val: string) => SOURCE_LABELS[val] || val,
    },
    {
      title: "类型",
      dataIndex: "category",
      width: 100,
      render: (val: string) => CATEGORY_LABELS[val] || val,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (val: string) => (
        <Tag color={STATUS_COLORS[val]}>{STATUS_LABELS[val] || val}</Tag>
      ),
    },
    {
      title: "问题摘要",
      dataIndex: "title",
      ellipsis: true,
      render: (_: string, record: BasicFeedback) =>
        record.title || record.description.slice(0, 60),
    },
    {
      title: "页面",
      dataIndex: "pagePath",
      width: 160,
      ellipsis: true,
    },
    {
      title: "操作",
      width: 80,
      render: (_: unknown, record: BasicFeedback) => (
        <Button type="link" size="small" onClick={() => openDetail(record.id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="运营管理"
        title="问题反馈"
        description="查看和处理用户提交的问题反馈"
        metrics={[{ label: "总数", value: total }]}
        actions={
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            刷新
          </Button>
        }
      />

      <div className="card af-filter-card">
        <Space wrap>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={filters.status}
            onChange={(val) => updateFilter("status", val)}
            options={STATUS_FILTER_OPTIONS}
          />
          <Select
            placeholder="来源"
            allowClear
            style={{ width: 100 }}
            value={filters.source}
            onChange={(val) => updateFilter("source", val)}
            options={Object.entries(SOURCE_LABELS).map(([k, v]) => ({
              label: v,
              value: k,
            }))}
          />
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 120 }}
            value={filters.category}
            onChange={(val) => updateFilter("category", val)}
            options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({
              label: v,
              value: k,
            }))}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </div>

      <div className="card af-table-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: pageIndex,
            total,
            pageSize: 10,
            showTotal: (t) => `共 ${t} 条`,
            onChange: setPageIndex,
          }}
        />
      </div>

      <Modal
        open={showDetail}
        title="反馈详情"
        onCancel={() => setShowDetail(false)}
        footer={
          detailItem && (
            <Space>
              {detailItem.status !== "RESOLVED" &&
                detailItem.status !== "CLOSED" && (
                  <Button type="primary" onClick={() => openAction("resolve")}>
                    已解决
                  </Button>
                )}
              {detailItem.status !== "RESOLVED" &&
                detailItem.status !== "CLOSED" && (
                <Button danger onClick={() => openAction("close")}>
                  已拒绝
                </Button>
              )}
            </Space>
          )
        }
        width={640}
        destroyOnHidden
      >
        {detailLoading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Spin />
          </div>
        ) : detailItem ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLORS[detailItem.status]}>
                {STATUS_LABELS[detailItem.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              {CATEGORY_LABELS[detailItem.category]}
            </Descriptions.Item>
            <Descriptions.Item label="来源">
              {SOURCE_LABELS[detailItem.source]}
            </Descriptions.Item>
            <Descriptions.Item label="标题">
              {detailItem.title || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {detailItem.description}
            </Descriptions.Item>
            <Descriptions.Item label="页面路径">
              {detailItem.pagePath || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="联系方式">
              {detailItem.contact || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="客户端版本">
              {detailItem.appVersion || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="平台">
              {detailItem.platform || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="设备信息">
              {detailItem.deviceInfo || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="错误上下文">
              {detailItem.errorContext || "-"}
            </Descriptions.Item>
            {detailItem.resolutionNote && (
              <Descriptions.Item label="解决说明">
                {detailItem.resolutionNote}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="附件图片">
              {detailImageUrls.length > 0 ? (
                <Image.PreviewGroup>
                  <Space wrap>
                    {detailImageUrls.map((url: string, idx: number) => (
                      <Image
                        key={`${url}-${idx}`}
                        src={resolveFeedbackImageUrl(url)}
                        width={80}
                        height={80}
                        alt={`附件图片 ${idx + 1}`}
                        style={{ objectFit: "cover", borderRadius: 4 }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {new Date(detailItem.createdAt).toLocaleString("zh-CN")}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        open={showAction}
        title={actionType === "resolve" ? "标记为已解决" : "标记为已拒绝"}
        onCancel={() => setShowAction(false)}
        onOk={handleAction}
        confirmLoading={actionLoading}
        destroyOnHidden
      >
        <Form form={actionForm} layout="vertical">
          {actionType === "resolve" && (
            <Form.Item name="resolutionNote" label="解决说明">
              <Input.TextArea rows={3} placeholder="描述如何解决的（可选）" />
            </Form.Item>
          )}
          {actionType === "close" && (
            <p style={{ margin: 0, color: "rgba(0, 0, 0, 0.65)" }}>
              该反馈会标记为已拒绝，不再进入处理队列。
            </p>
          )}
        </Form>
      </Modal>
    </div>
  );
}
