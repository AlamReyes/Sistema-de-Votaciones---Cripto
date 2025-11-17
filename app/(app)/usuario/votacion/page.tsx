"use client";

import { useState, useEffect } from "react";
import {
  Card,
  List,
  Button,
  Typography,
  Spin,
  message,
  Tag,
  Modal,
  Radio,
  Space,
  Empty,
  Alert,
  Descriptions,
} from "antd";
import {
  SafetyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import {
  getCurrentUser,
  getActiveElections,
  checkIfVoted,
  Election,
  User,
} from "@/utils/api";

const { Title, Text, Paragraph } = Typography;

interface ElectionWithStatus extends Election {
  hasVoted: boolean;
}

export default function UserVotacionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [elections, setElections] = useState<ElectionWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingModalVisible, setVotingModalVisible] = useState(false);
  const [selectedElection, setSelectedElection] = useState<ElectionWithStatus | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, electionsData] = await Promise.all([
        getCurrentUser(),
        getActiveElections(),
      ]);

      setUser(userData);

      // Check voting status for each election
      const electionsWithStatus = await Promise.all(
        electionsData.map(async (election) => {
          try {
            const voteStatus = await checkIfVoted(election.id);
            return { ...election, hasVoted: voteStatus.has_voted };
          } catch {
            return { ...election, hasVoted: false };
          }
        })
      );

      setElections(electionsWithStatus);
    } catch (error: any) {
      message.error(error.message || "Error al cargar las votaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleVoteClick = (election: ElectionWithStatus) => {
    if (!user?.public_key) {
      message.warning(
        "Debes configurar tu llave pública antes de votar. Ve a la sección 'Mi Llave Privada'."
      );
      return;
    }
    setSelectedElection(election);
    setSelectedOption(null);
    setVotingModalVisible(true);
  };

  const handleVote = async () => {
    if (!selectedElection || !selectedOption || !user) {
      message.error("Selecciona una opción para votar");
      return;
    }

    setVoting(true);

    try {
      // Simulated voting process
      // In a real implementation, this would involve:
      // 1. Creating a blind token
      // 2. Getting it signed by admin
      // 3. Casting the actual vote with cryptographic proof

      message.info(
        "El proceso de votación requiere que tu token ciego sea firmado por un administrador. " +
        "Esta funcionalidad estará disponible próximamente."
      );

      // For now, just close the modal
      setVotingModalVisible(false);
      setSelectedElection(null);
      setSelectedOption(null);
    } catch (error: any) {
      message.error(error.message || "Error al emitir el voto");
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Finalizada";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} día${days !== 1 ? "s" : ""} restante${days !== 1 ? "s" : ""}`;
    }
    return `${hours} hora${hours !== 1 ? "s" : ""} restante${hours !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p>Cargando votaciones disponibles...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>Votaciones Disponibles</span>
          </Space>
        }
        extra={
          <Button onClick={loadData} loading={loading}>
            Actualizar
          </Button>
        }
      >
        {!user?.public_key && (
          <Alert
            message="Llave Pública No Configurada"
            description="Para poder votar, primero debes generar y configurar tu llave pública en la sección 'Mi Llave Privada'."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {elections.length === 0 ? (
          <Empty
            description="No hay votaciones activas en este momento"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
            dataSource={elections}
            renderItem={(election) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    election.hasVoted ? (
                      <Tag icon={<CheckCircleOutlined />} color="success" key="voted">
                        Ya votaste
                      </Tag>
                    ) : (
                      <Button
                        type="primary"
                        onClick={() => handleVoteClick(election)}
                        disabled={!user?.public_key}
                        key="vote"
                      >
                        Votar
                      </Button>
                    ),
                  ]}
                >
                  <Card.Meta
                    title={election.title}
                    description={
                      <Space direction="vertical" size="small" style={{ width: "100%" }}>
                        {election.description && (
                          <Paragraph
                            ellipsis={{ rows: 2, expandable: true, symbol: "más" }}
                            style={{ marginBottom: 8 }}
                          >
                            {election.description}
                          </Paragraph>
                        )}

                        <Space>
                          <CalendarOutlined />
                          <Text type="secondary">
                            Inicia: {formatDate(election.start_date)}
                          </Text>
                        </Space>

                        <Space>
                          <CalendarOutlined />
                          <Text type="secondary">
                            Termina: {formatDate(election.end_date)}
                          </Text>
                        </Space>

                        <Space>
                          <ClockCircleOutlined />
                          <Tag color="blue">{getTimeRemaining(election.end_date)}</Tag>
                        </Space>

                        <Text strong>
                          {election.options.length} opciones disponibles
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Voting Modal */}
      <Modal
        title={`Votar en: ${selectedElection?.title}`}
        open={votingModalVisible}
        onCancel={() => {
          setVotingModalVisible(false);
          setSelectedElection(null);
          setSelectedOption(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setVotingModalVisible(false);
              setSelectedElection(null);
              setSelectedOption(null);
            }}
            disabled={voting}
          >
            Cancelar
          </Button>,
          <Button
            key="vote"
            type="primary"
            onClick={handleVote}
            loading={voting}
            disabled={!selectedOption}
          >
            Confirmar Voto
          </Button>,
        ]}
        width={600}
      >
        {selectedElection && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Alert
              message="Voto Anónimo y Seguro"
              description="Tu voto será encriptado y firmado digitalmente. Nadie podrá conocer tu elección, pero podrás verificar que fue contado correctamente."
              type="info"
              showIcon
            />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="Elección">
                {selectedElection.title}
              </Descriptions.Item>
              <Descriptions.Item label="Cierra">
                {formatDate(selectedElection.end_date)}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong style={{ display: "block", marginBottom: 12 }}>
                Selecciona tu opción:
              </Text>
              <Radio.Group
                onChange={(e) => setSelectedOption(e.target.value)}
                value={selectedOption}
                style={{ width: "100%" }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  {selectedElection.options
                    .sort((a, b) => a.option_order - b.option_order)
                    .map((option) => (
                      <Radio
                        key={option.id}
                        value={option.id}
                        style={{
                          display: "block",
                          padding: "8px 12px",
                          border: "1px solid #d9d9d9",
                          borderRadius: "6px",
                          marginRight: 0,
                        }}
                      >
                        {option.option_text}
                      </Radio>
                    ))}
                </Space>
              </Radio.Group>
            </div>

            {selectedOption && (
              <Alert
                message="Confirma tu selección"
                description={`Has seleccionado: ${
                  selectedElection.options.find((o) => o.id === selectedOption)
                    ?.option_text
                }`}
                type="success"
                showIcon
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
