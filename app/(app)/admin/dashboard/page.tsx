"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Popconfirm,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  UserOutlined,
  CrownOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import { getAllUsers, deleteUser, setUserAdmin, User } from "@/utils/api";

const { Title } = Typography;

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers(0, 100);
      setUsers(data);
    } catch (error: any) {
      message.error(error.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      setActionLoading(userId);
      await deleteUser(userId);
      message.success("Usuario eliminado correctamente");
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error: any) {
      message.error(error.message || "Error al eliminar usuario");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (userId: number, currentIsAdmin: boolean) => {
    try {
      setActionLoading(userId);
      const updatedUser = await setUserAdmin(userId, !currentIsAdmin);
      setUsers(users.map((u) => 
        // ...u copia lo del usuario anterior y ...updateUser toca solo los campos actualizados, se hace un merge de info
        u.id === userId ? { ...u, ...updatedUser } : u // Evitar el borrado de la demás info
      ));
      message.success(
        `Usuario ${!currentIsAdmin ? "promovido a" : "removido de"} administrador`
      );
    } catch (error: any) {
      message.error(error.message || "Error al cambiar rol");
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
    },
    {
      title: "Usuario",
      dataIndex: "username",
      key: "username",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Nombre",
      key: "fullName",
      render: (_: any, record: User) => `${record.name} ${record.last_name}`,
    },
    {
      title: "Rol",
      key: "role",
      render: (_: any, record: User) => (
        <Tag
          color={record.is_admin ? "gold" : "blue"}
          icon={record.is_admin ? <CrownOutlined /> : <UserOutlined />}
        >
          {record.is_admin ? "Administrador" : "Usuario"}
        </Tag>
      ),
    },
    {
      title: "Llave Pública",
      key: "publicKey",
      render: (_: any, record: User) => (
        <Tag color={record.public_key ? "green" : "default"}>
          {record.public_key ? "Configurada" : "Sin configurar"}
        </Tag>
      ),
    },
    {
      title: "Registro",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) =>
        new Date(date).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: User) => (
        <Space>
          <Button
            size="small"
            type={record.is_admin ? "default" : "primary"}
            icon={<CrownOutlined />}
            loading={actionLoading === record.id}
            onClick={() => handleToggleAdmin(record.id, record.is_admin)}
          >
            {record.is_admin ? "Quitar Admin" : "Hacer Admin"}
          </Button>
          <Popconfirm
            title="Eliminar usuario"
            description="¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoading === record.id}
            >
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const adminCount = users.filter((u) => u.is_admin).length;
  const userCount = users.filter((u) => !u.is_admin).length;
  const withKeyCount = users.filter((u) => u.public_key).length;

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          <TeamOutlined /> Dashboard - Usuarios Registrados
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>
          Actualizar
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: "24px" }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total de Usuarios"
              value={users.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Administradores"
              value={adminCount}
              prefix={<CrownOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Con Llave Pública"
              value={withKeyCount}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
            <p>Cargando usuarios...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} usuarios`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
