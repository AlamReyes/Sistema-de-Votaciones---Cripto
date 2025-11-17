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
  Tag,
  Select,
  Statistic,
  Row,
  Col,
  Descriptions,
} from "antd";
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  KeyOutlined,
  SafetyOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import {
  getAllBlindTokens,
  getAllElections,
  BlindTokenResponse,
  Election,
} from "@/utils/api";

const { Title, Text } = Typography;

export default function AdminTokensAuditPage() {
  const [tokens, setTokens] = useState<BlindTokenResponse[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      const data = await getAllElections(0, 100);
      setElections(data);
      if (data.length > 0) {
        setSelectedElection(data[0].id);
        loadTokens(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar elecciones";
      message.error(errorMessage);
      setLoading(false);
    }
  };

  const loadTokens = async (electionId?: number) => {
    try {
      setLoading(true);
      const tokensData = await getAllBlindTokens(electionId);
      setTokens(tokensData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar tokens";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleElectionChange = (electionId: number | null) => {
    setSelectedElection(electionId);
    loadTokens(electionId || undefined);
  };

  // Statistics
  const totalTokens = tokens.length;
  const signedTokens = tokens.filter((t) => t.signed_token).length;
  const usedTokens = tokens.filter((t) => t.is_used).length;
  const pendingTokens = tokens.filter((t) => !t.signed_token && !t.is_used).length;

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
    },
    {
      title: "Usuario ID",
      dataIndex: "user_id",
      key: "user_id",
      width: 100,
    },
    {
      title: "Elección ID",
      dataIndex: "election_id",
      key: "election_id",
      width: 100,
    },
    {
      title: "Estado Firma",
      key: "signed",
      render: (_: unknown, record: BlindTokenResponse) => (
        <Tag
          icon={record.signed_token ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={record.signed_token ? "success" : "warning"}
        >
          {record.signed_token ? "Firmado Auto" : "Sin Firma"}
        </Tag>
      ),
    },
    {
      title: "Estado Uso",
      key: "used",
      render: (_: unknown, record: BlindTokenResponse) => (
        <Tag
          icon={record.is_used ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={record.is_used ? "blue" : "default"}
        >
          {record.is_used ? "Voto Emitido" : "Disponible"}
        </Tag>
      ),
    },
    {
      title: "Creado",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleString("es-MX"),
    },
    {
      title: "Usado En",
      dataIndex: "used_at",
      key: "used_at",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString("es-MX") : "-",
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
          <EyeOutlined /> Auditoría de Tokens
        </Title>
        <Space>
          <Select
            style={{ width: 300 }}
            placeholder="Filtrar por elección"
            allowClear
            value={selectedElection}
            onChange={handleElectionChange}
            options={elections.map((e) => ({
              value: e.id,
              label: e.title,
            }))}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadTokens(selectedElection || undefined)}
            loading={loading}
          >
            Actualizar
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: "24px" }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tokens"
              value={totalTokens}
              prefix={<KeyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Firmados Automáticamente"
              value={signedTokens}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Votos Emitidos"
              value={usedTokens}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sin Firma (Error)"
              value={pendingTokens}
              valueStyle={{ color: pendingTokens > 0 ? "#ff4d4f" : "#52c41a" }}
            />
            {pendingTokens > 0 && (
              <Text type="danger" style={{ fontSize: "12px" }}>
                Posible error en generación de llaves
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="Registro de Tokens"
        extra={
          <Text type="secondary">
            Los tokens se firman automáticamente al ser creados
          </Text>
        }
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
            <p>Cargando tokens...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={tokens}
            rowKey="id"
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showTotal: (total) => `Total: ${total} tokens`,
            }}
          />
        )}
      </Card>

      <Card title="Información del Sistema" style={{ marginTop: "24px" }}>
        <Descriptions column={1}>
          <Descriptions.Item label="Firma Automática">
            <Tag color="green">Habilitada</Tag> - Los tokens se firman
            automáticamente con la llave RSA de la institución al ser creados
          </Descriptions.Item>
          <Descriptions.Item label="Verificación">
            El sistema verifica que cada token esté firmado antes de permitir el
            voto
          </Descriptions.Item>
          <Descriptions.Item label="Atomicidad">
            <Tag color="blue">Operación Atómica</Tag> - Voto y recibo se crean
            en una sola transacción para evitar inconsistencias
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
