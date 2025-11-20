"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
  Tag,
  Popconfirm,
  Divider,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import dayjs from "dayjs";
import {
  getAllElections,
  createElection,
  deleteElection,
  toggleElectionActive,
  regenerateElectionKey,
  Election,
  ElectionCreate,
} from "@/utils/api";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function AdminVotacionesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      setLoading(true);
      const data = await getAllElections(0, 100);
      setElections(data);
    } catch (error: any) {
      message.error(error.message || "Error al cargar elecciones");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      setCreating(true);

      const electionData: ElectionCreate = {
        title: values.title,
        description: values.description || null,
        start_date: values.dates[0].toISOString(),
        end_date: values.dates[1].toISOString(),
        is_active: values.is_active,
        blind_signature_key: values.blind_signature_key || "", // Empty string will trigger auto-generation
        options: values.options.map((opt: string, index: number) => ({
          option_text: opt,
          option_order: index + 1,
        })),
      };

      const newElection = await createElection(electionData);
      setElections([newElection, ...elections]);
      message.success("Elección creada con llave RSA generada automáticamente");
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || "Error al crear elección");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (electionId: number) => {
    try {
      setActionLoading(electionId);
      await deleteElection(electionId);
      setElections(elections.filter((e) => e.id !== electionId));
      message.success("Elección eliminada correctamente");
    } catch (error: any) {
      message.error(error.message || "Error al eliminar elección");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (electionId: number, currentActive: boolean) => {
    try {
      setActionLoading(electionId);
      const updated = await toggleElectionActive(electionId, !currentActive);
      setElections(
        elections.map((e) =>
          e.id === electionId ? { ...e, is_active: updated.is_active } : e
        )
      );
      message.success(
        `Elección ${!currentActive ? "activada" : "desactivada"} correctamente`
      );
    } catch (error: any) {
      message.error(error.message || "Error al cambiar estado");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateKey = async (electionId: number) => {
    try {
      setActionLoading(electionId);
      const result = await regenerateElectionKey(electionId);
      message.success(
        `Llave RSA regenerada para "${result.election_title}". ${result.warning}`
      );
      // Reload elections to get updated data
      await loadElections();
    } catch (error: any) {
      message.error(error.message || "Error al regenerar llave RSA");
    } finally {
      setActionLoading(null);
    }
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const start = new Date(election.start_date);
    const end = new Date(election.end_date);

    if (!election.is_active) {
      return <Tag color="default">Inactiva</Tag>;
    }
    if (now < start) {
      return <Tag color="blue">Programada</Tag>;
    }
    if (now >= start && now <= end) {
      return <Tag color="green">En curso</Tag>;
    }
    return <Tag color="orange">Finalizada</Tag>;
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
    },
    {
      title: "Título",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Opciones",
      key: "options",
      render: (_: any, record: Election) => (
        <Space direction="vertical" size="small">
          {record.options
            .sort((a, b) => a.option_order - b.option_order)
            .map((opt) => (
              <Tag key={opt.id}>{opt.option_text}</Tag>
            ))}
        </Space>
      ),
    },
    {
      title: "Periodo",
      key: "period",
      render: (_: any, record: Election) => (
        <Space direction="vertical" size="small">
          <Text type="secondary">
            Inicio: {new Date(record.start_date).toLocaleString("es-MX")}
          </Text>
          <Text type="secondary">
            Fin: {new Date(record.end_date).toLocaleString("es-MX")}
          </Text>
        </Space>
      ),
    },
    {
      title: "Estado",
      key: "status",
      render: (_: any, record: Election) => getElectionStatus(record),
    },
    {
      title: "Activa",
      key: "is_active",
      render: (_: any, record: Election) => (
        <Switch
          checked={record.is_active}
          loading={actionLoading === record.id}
          onChange={() => handleToggleActive(record.id, record.is_active)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: Election) => (
        <Space>
          <Popconfirm
            title="Regenerar Llave RSA"
            description="¿Regenerar la llave RSA de esta elección? Los tokens sin firmar necesitarán ser recreados."
            onConfirm={() => handleRegenerateKey(record.id)}
            okText="Sí, regenerar"
            cancelText="Cancelar"
            overlayStyle={{ width: 240 }}
          >
            <Button
              size="small"
              icon={<KeyOutlined />}
              loading={actionLoading === record.id}
            >
              Regenerar Llave
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Eliminar elección"
            description="¿Estás seguro? Se eliminarán todos los votos y tokens asociados."
            onConfirm={() => handleDelete(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            overlayStyle={{ width: 240 }}
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
          Gestión de Votaciones
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadElections} loading={loading}>
            Actualizar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Crear Votación
          </Button>
        </Space>
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
            <p>Cargando elecciones...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={elections}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} elecciones`,
            }}
          />
        )}
      </Card>

      <Modal
        title="Crear Nueva Votación"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            is_active: true,
            options: ["", ""],
          }}
        >
          <Form.Item
            label="Título de la Votación"
            name="title"
            rules={[
              { required: true, message: "El título es requerido" },
              { min: 3, message: "Mínimo 3 caracteres" },
              { max: 200, message: "Máximo 200 caracteres" },
            ]}
          >
            <Input placeholder="Ej: Elección de Presidente 2024" />
          </Form.Item>

          <Form.Item label="Descripción" name="description">
            <TextArea
              rows={3}
              placeholder="Descripción opcional de la votación"
            />
          </Form.Item>

          <Form.Item
            label="Periodo de Votación"
            name="dates"
            rules={[{ required: true, message: "Las fechas son requeridas" }]}
          >
            <DatePicker.RangePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              placeholder={["Fecha inicio", "Fecha fin"]}
            />
          </Form.Item>

          <Form.Item
            label="Activar al crear"
            name="is_active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider>Opciones de Voto</Divider>

          <Form.List
            name="options"
            rules={[
              {
                validator: async (_, options) => {
                  if (!options || options.length < 2) {
                    return Promise.reject(new Error("Mínimo 2 opciones"));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map(({ key, ...restField }, index) => (
                  <Form.Item
                    required={false}
                    key={key}
                    label={index === 0 ? "Opciones" : ""}
                  >
                    <Form.Item
                      {...restField}
                      validateTrigger={["onChange", "onBlur"]}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Ingresa el texto de la opción o elimínala",
                        },
                      ]}
                      noStyle
                    >
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <Input
                          placeholder={`Opción ${index + 1}`}
                          style={{ width: "100%" }}
                        />
                        {fields.length > 2 && (
                          <MinusCircleOutlined
                            style={{ marginLeft: 8, color: "#ff4d4f" }}
                            onClick={() => remove(restField.name)}
                          />
                        )}
                      </div>
                    </Form.Item>
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    block
                  >
                    Agregar Opción
                  </Button>
                  <Form.ErrorList errors={errors} />
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider>Clave de Firma Ciega (RSA) - Opcional</Divider>

          <Form.Item
            label="Clave Privada RSA (formato PEM)"
            name="blind_signature_key"
            extra="Deja vacío para generar automáticamente una llave RSA-2048 segura para la institución"
            rules={[
              {
                validator: (_, value) => {
                  if (value && value.trim() && !value.includes("-----BEGIN")) {
                    return Promise.reject("Debe ser formato PEM válido");
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Opcional: Se generará automáticamente si se deja vacío"
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={creating}>
                Crear Votación
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
