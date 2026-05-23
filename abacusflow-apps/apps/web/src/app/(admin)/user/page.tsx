"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Select,
  Form,
  Typography,
  Flex,
  Tag,
  App,
  Space,
  Descriptions,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  userApi,
  type User,
  type BasicUser,
  type CreateUserInput,
  type UpdateUserInput,
  type Sex,
} from "@abacusflow/core";

const sexOptions: { label: string; value: Sex }[] = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
];

function translateSex(value?: string): string {
  if (value === "male") return "男";
  if (value === "female") return "女";
  return value ?? "-";
}

export default function UsersPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [editItem, setEditItem] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [allUsers, setAllUsers] = useState<BasicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [filters, setFilters] = useState<{ name?: string }>({
    name: undefined,
  });
  const pageSize = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await userApi.listBasicUsers();
      setAllUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredData = useMemo(() => {
    if (!filters.name) return allUsers;
    return allUsers.filter((u) =>
      u.name?.toLowerCase().includes(filters.name!.toLowerCase()),
    );
  }, [allUsers, filters.name]);

  const data = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageIndex]);

  const total = filteredData.length;

  const updateFilter = useCallback(
    (key: keyof typeof filters, value: string | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSearch = useCallback(() => {
    setPageIndex(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ name: undefined });
    setPageIndex(1);
  }, []);

  const refresh = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = async (record: BasicUser) => {
    setShowForm(true);
    setSubmitting(true);
    try {
      const fullUser = await userApi.getUser({ id: record.id });
      setEditItem(fullUser);
      form.setFieldsValue({
        name: fullUser.name,
        nick: fullUser.nick ?? "",
        age: fullUser.age?.toString() ?? "",
        sex: fullUser.sex ?? undefined,
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await userApi.getUser({ id });
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
      const payload: CreateUserInput = {
        name: values.name,
        nick: values.nick || undefined,
        age: values.age ? Number(values.age) : undefined,
        sex: values.sex as Sex | undefined,
      };
      if (editItem) {
        await userApi.updateUser({
          id: editItem.id,
          updateUserInput: payload as UpdateUserInput,
        });
        message.success("编辑成功");
      } else {
        await userApi.addUser({ createUserInput: payload });
        message.success("新增成功");
      }
      setShowForm(false);
      refresh();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定删除该用户？",
      onOk: async () => {
        try {
          await userApi.deleteUser({ id });
          message.success("删除成功");
          refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const columns: ColumnsType<BasicUser> = [
    { title: "用户名", dataIndex: "name", key: "name" },
    { title: "姓名", dataIndex: "nick", key: "nick" },
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
      title: "锁定状态",
      key: "locked",
      render: (_, record) => (
        <Tag color={record.locked ? "error" : "success"}>
          {record.locked ? "锁定" : "正常"}
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
          {record.name !== "admin" && (
            <>
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
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          用户管理
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增用户
        </Button>
      </Flex>

      <div className="card">
        <Flex
          wrap="wrap"
          gap={12}
          align="flex-end"
          style={{ marginBottom: 16 }}
        >
          <div className="form-item">
            <label>用户名</label>
            <Input
              value={filters.name ?? ""}
              onChange={(e) =>
                updateFilter("name", e.target.value || undefined)
              }
              placeholder="请输入用户名"
              style={{ width: 200 }}
            />
          </div>
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Flex>
      </div>

      <div className="card">
        <Table<BasicUser>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pageIndex,
            pageSize: 10,
            total,
            onChange: setPageIndex,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: false,
          }}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑用户" : "新增用户"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="nick"
            label="姓名"
            rules={[{ required: true, message: "请输入姓名" }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="age" label="年龄">
            <Input type="number" placeholder="请输入年龄" />
          </Form.Item>
          <Form.Item name="sex" label="性别">
            <Select options={sexOptions} placeholder="请选择" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={showDetail}
        title="用户详情"
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
          <Descriptions
            column={1}
            size="small"
            styles={{ label: { width: 100 } }}
          >
            <Descriptions.Item label="用户名">
              {detailItem.name}
            </Descriptions.Item>
            <Descriptions.Item label="姓名">
              {detailItem.nick ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="年龄">
              {detailItem.age ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="性别">
              {translateSex(detailItem.sex)}
            </Descriptions.Item>
            <Descriptions.Item label="启用状态">
              <Tag color={detailItem.enabled ? "success" : "error"}>
                {detailItem.enabled ? "启用" : "禁用"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="锁定状态">
              <Tag color={detailItem.locked ? "error" : "success"}>
                {detailItem.locked ? "锁定" : "正常"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detailItem.createdAt ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {detailItem.updatedAt ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
}
