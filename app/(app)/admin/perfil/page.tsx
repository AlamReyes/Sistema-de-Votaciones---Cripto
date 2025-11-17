"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Spin,
  message,
  Descriptions,
  Space,
  Divider,
  Tag,
} from "antd";
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import { getCurrentUser, updateUser, User } from "@/utils/api";

const { Title, Text } = Typography;

export default function AdminPerfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      setUser(userData);
      form.setFieldsValue({
        name: userData.name,
        last_name: userData.last_name,
        username: userData.username,
      });
    } catch (error: any) {
      message.error(error.message || "Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    if (!user) return;

    try {
      setSaving(true);
      const updatedUser = await updateUser(user.id, {
        name: values.name,
        last_name: values.last_name,
        username: values.username,
      });
      setUser(updatedUser);
      setEditing(false);
      message.success("Perfil actualizado correctamente");
    } catch (error: any) {
      message.error(error.message || "Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        last_name: user.last_name,
        username: user.username,
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <Text type="danger">No se pudo cargar la información del usuario</Text>
      </Card>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <Card
        title={
          <Space>
            <CrownOutlined style={{ color: "#faad14" }} />
            <span>Mi Perfil de Administrador</span>
          </Space>
        }
        extra={
          !editing && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
          )
        }
      >
        {!editing ? (
          <>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Nombre">{user.name}</Descriptions.Item>
              <Descriptions.Item label="Apellido">
                {user.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Usuario">
                {user.username}
              </Descriptions.Item>
              <Descriptions.Item label="Rol">
                <Tag color="gold" icon={<CrownOutlined />}>
                  Administrador
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Llave Pública">
                {user.public_key ? (
                  <Text type="success">Configurada</Text>
                ) : (
                  <Text type="warning">No configurada</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de Registro">
                {new Date(user.created_at).toLocaleDateString("es-MX", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              name: user.name,
              last_name: user.last_name,
              username: user.username,
            }}
          >
            <Form.Item
              label="Nombre"
              name="name"
              rules={[
                { required: true, message: "El nombre es requerido" },
                { min: 2, message: "El nombre debe tener al menos 2 caracteres" },
                { max: 50, message: "El nombre no puede exceder 50 caracteres" },
              ]}
            >
              <Input placeholder="Tu nombre" />
            </Form.Item>

            <Form.Item
              label="Apellido"
              name="last_name"
              rules={[
                { required: true, message: "El apellido es requerido" },
                { min: 2, message: "El apellido debe tener al menos 2 caracteres" },
                { max: 50, message: "El apellido no puede exceder 50 caracteres" },
              ]}
            >
              <Input placeholder="Tu apellido" />
            </Form.Item>

            <Form.Item
              label="Usuario"
              name="username"
              rules={[
                { required: true, message: "El usuario es requerido" },
                { min: 3, message: "El usuario debe tener al menos 3 caracteres" },
                { max: 50, message: "El usuario no puede exceder 50 caracteres" },
              ]}
            >
              <Input placeholder="Tu nombre de usuario" />
            </Form.Item>

            <Divider />

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                >
                  Guardar Cambios
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}
