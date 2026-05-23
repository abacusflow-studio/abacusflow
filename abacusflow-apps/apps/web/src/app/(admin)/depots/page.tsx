"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Form,
  Flex,
  Tag,
  App,
  Space,
  Descriptions,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "../../../components/admin-page-header";
import {
  depotApi,
  type BasicDepot,
  type Depot,
  type CreateDepotInput,
} from "@abacusflow/core";

export default function DepotsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [data, setData] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");

  const [editItem, setEditItem] = useState<BasicDepot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Depot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await depotApi.listBasicDepots();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = (record: BasicDepot) => {
    setEditItem(record);
    form.setFieldsValue({
      name: record.name,
      location: record.location ?? "",
      capacity: record.capacity?.toString() ?? "",
    });
    setShowForm(true);
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await depotApi.getDepot({ id });
      setDetailItem(item);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload: CreateDepotInput = {
        name: values.name,
        location: values.location || undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
      };
      if (editItem) {
        await depotApi.updateDepot({
          id: editItem.id,
          updateDepotInput: {
            name: payload.name,
            location: payload.location,
            capacity: payload.capacity,
          },
        });
        message.success("编辑成功");
      } else {
        await depotApi.addDepot({ createDepotInput: payload });
        message.success("新增成功");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定删除该储存点？",
      onOk: async () => {
        try {
          await depotApi.deleteDepot({ id });
          message.success("删除成功");
          fetchData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const columns: ColumnsType<BasicDepot> = [
    { title: "储存点名称", dataIndex: "name", key: "name" },
    { title: "储存点地址", dataIndex: "location", key: "location" },
    { title: "储存点容量", dataIndex: "capacity", key: "capacity" },
    {
      title: "启用状态",
      key: "enabled",
      render: (_, record) => (
        <Tag color={record.enabled ? "success" : "error"}>
          {record.enabled ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => openDetail(record.id)}
          >
            详情
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const filtered = searchName
    ? data.filter((d) => d.name.includes(searchName))
    : data;

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="仓点网络 / 容量管理"
        title="储存点管理"
        description="统一维护仓点位置、容量与启用状态，让库存去向和承载能力一眼可见。"
        metrics={[
          { label: "仓点总数", value: data.length },
          { label: "当前显示", value: filtered.length },
        ]}
        actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增储存点
        </Button>
        }
      />

      <div className="card af-filter-card">
        <Flex
          wrap="wrap"
          gap={12}
          align="flex-end"
          style={{ marginBottom: 16 }}
        >
          <div className="form-item">
            <label>关键字名称</label>
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入关键字"
              style={{ width: 200 }}
            />
          </div>
          <Button type="primary" onClick={fetchData}>
            搜索
          </Button>
          <Button onClick={() => setSearchName("")}>重置</Button>
        </Flex>
      </div>

      <div className="card af-table-card">
        <Table<BasicDepot>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑储存点" : "新增储存点"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="储存点名称"
            rules={[{ required: true, message: "请输入储存点名称" }]}
          >
            <Input placeholder="请输入储存点名称" />
          </Form.Item>
          <Form.Item name="location" label="地址">
            <Input placeholder="请输入地址" />
          </Form.Item>
          <Form.Item name="capacity" label="容量">
            <Input type="number" placeholder="请输入容量" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={showDetail}
        title="储存点详情"
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        {detailLoading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>
            加载中...
          </p>
        ) : detailItem ? (
          <Descriptions column={1} size="small" labelStyle={{ width: 100 }}>
            <Descriptions.Item label="储存点名称">
              {detailItem.name}
            </Descriptions.Item>
            <Descriptions.Item label="地址">
              {detailItem.location ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="容量">
              {detailItem.capacity ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="启用状态">
              <Tag color={detailItem.enabled ? "success" : "error"}>
                {detailItem.enabled ? "启用" : "禁用"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
}
