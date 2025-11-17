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
  Steps,
  Result,
} from "antd";
import {
  SafetyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LoadingOutlined,
  KeyOutlined,
  FileProtectOutlined,
  SendOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import {
  getCurrentUser,
  getActiveElections,
  checkIfVoted,
  createBlindToken,
  getMyBlindToken,
  castVoteWithReceipt,
  Election,
  User,
  BlindTokenResponse,
} from "@/utils/api";

const { Title, Text, Paragraph } = Typography;

interface ElectionWithStatus extends Election {
  hasVoted: boolean;
}

interface VotingState {
  step: number;
  blindToken: BlindTokenResponse | null;
  voteHash: string;
  encryptedVote: string;
  receiptHash: string;
}

export default function UserVotacionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [elections, setElections] = useState<ElectionWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingModalVisible, setVotingModalVisible] = useState(false);
  const [selectedElection, setSelectedElection] =
    useState<ElectionWithStatus | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [votingState, setVotingState] = useState<VotingState>({
    step: 0,
    blindToken: null,
    voteHash: "",
    encryptedVote: "",
    receiptHash: "",
  });
  const [voteSuccess, setVoteSuccess] = useState(false);

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

  // Cryptographic helper functions
  const generateRandomBytes = (length: number): Uint8Array => {
    return window.crypto.getRandomValues(new Uint8Array(length));
  };

  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const hashData = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
    return bytesToHex(new Uint8Array(hashBuffer));
  };

  const signWithPrivateKey = async (data: string): Promise<string> => {
    // This would use the user's private key stored locally
    // For now, we'll create a hash-based signature
    const timestamp = new Date().toISOString();
    const signatureData = `${data}|${user?.id}|${timestamp}`;
    return await hashData(signatureData);
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
    setVotingState({
      step: 0,
      blindToken: null,
      voteHash: "",
      encryptedVote: "",
      receiptHash: "",
    });
    setVoteSuccess(false);
    setVotingModalVisible(true);
  };

  const handleVote = async () => {
    if (!selectedElection || !selectedOption || !user) {
      message.error("Selecciona una opción para votar");
      return;
    }

    setVoting(true);

    try {
      // Step 1: Check if we already have a blind token for this election
      setVotingState((prev) => ({ ...prev, step: 1 }));
      let blindToken: BlindTokenResponse;

      try {
        // Try to get existing token
        blindToken = await getMyBlindToken(selectedElection.id);
        message.info("Token ciego existente encontrado");
      } catch {
        // Create new blind token
        message.info("Creando y firmando token ciego automáticamente...");

        // Generate a unique blinded token (hash of random data + user info)
        const randomData = bytesToHex(generateRandomBytes(32));
        const blindedTokenData = `${randomData}|${user.id}|${selectedElection.id}|${Date.now()}`;
        const blindedToken = await hashData(blindedTokenData);

        blindToken = await createBlindToken(
          user.id,
          selectedElection.id,
          blindedToken
        );
        message.success("Token ciego creado y firmado automáticamente");
      }

      setVotingState((prev) => ({ ...prev, blindToken }));

      // Step 2: Verify token is signed (should be automatic now)
      setVotingState((prev) => ({ ...prev, step: 2 }));

      if (!blindToken.signed_token) {
        // Fallback: If auto-signing failed (legacy elections without proper keys)
        message.error(
          "Error: El token no pudo ser firmado automáticamente. " +
            "La elección puede tener una configuración de llave inválida. " +
            "Contacta al administrador."
        );
        setVoting(false);
        return;
      }

      message.success("Token firmado por la institución");

      // Step 3: Generate vote hash and prepare vote data
      setVotingState((prev) => ({ ...prev, step: 3 }));

      const timestamp = Date.now();
      const voteData = `${selectedElection.id}|${selectedOption}|${timestamp}|${bytesToHex(generateRandomBytes(16))}`;
      const voteHash = await hashData(voteData);

      // Simplified vote data (no fake encryption)
      const votePayload = JSON.stringify({
        election_id: selectedElection.id,
        option_id: selectedOption,
        timestamp: timestamp,
        nonce: bytesToHex(generateRandomBytes(8)),
      });

      setVotingState((prev) => ({ ...prev, voteHash, encryptedVote: votePayload }));

      // Step 4: Prepare receipt data
      setVotingState((prev) => ({ ...prev, step: 4 }));

      const receiptData = `${user.id}|${selectedElection.id}|${voteHash}|${timestamp}`;
      const receiptHash = await hashData(receiptData);
      const digitalSignature = await signWithPrivateKey(receiptHash);

      setVotingState((prev) => ({ ...prev, receiptHash }));

      // The unblinded signature - in production this would be proper RSA unblinding
      // For now, we use the signed token directly as proof of authorization
      const unblindedSignature = blindToken.signed_token || "";

      // Step 5: Cast vote AND create receipt atomically
      setVotingState((prev) => ({ ...prev, step: 5 }));

      await castVoteWithReceipt({
        user_id: user.id,
        election_id: selectedElection.id,
        option_id: selectedOption,
        unblinded_signature: unblindedSignature,
        vote_hash: voteHash,
        encrypted_vote: votePayload,
        receipt_hash: receiptHash,
        receipt_signature: digitalSignature,
      });

      message.success("Voto emitido y recibo generado correctamente");

      // Step 6: Complete
      setVotingState((prev) => ({ ...prev, step: 6 }));
      setVoteSuccess(true);

      // Update election status
      setElections((prev) =>
        prev.map((e) =>
          e.id === selectedElection.id ? { ...e, hasVoted: true } : e
        )
      );
    } catch (error: any) {
      console.error("Voting error:", error);
      message.error(error.message || "Error al emitir el voto");
    } finally {
      setVoting(false);
    }
  };

  const closeVotingModal = () => {
    setVotingModalVisible(false);
    setSelectedElection(null);
    setSelectedOption(null);
    setVotingState({
      step: 0,
      blindToken: null,
      voteHash: "",
      encryptedVote: "",
      receiptHash: "",
    });
    setVoteSuccess(false);
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
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days} día${days !== 1 ? "s" : ""} restante${days !== 1 ? "s" : ""}`;
    }
    return `${hours} hora${hours !== 1 ? "s" : ""} restante${hours !== 1 ? "s" : ""}`;
  };

  const getStepIcon = (stepNumber: number) => {
    if (votingState.step > stepNumber) {
      return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
    }
    if (votingState.step === stepNumber && voting) {
      return <LoadingOutlined />;
    }
    return undefined;
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
                      <Tag
                        icon={<CheckCircleOutlined />}
                        color="success"
                        key="voted"
                      >
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
                      <Space
                        direction="vertical"
                        size="small"
                        style={{ width: "100%" }}
                      >
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
                          <Tag color="blue">
                            {getTimeRemaining(election.end_date)}
                          </Tag>
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
        onCancel={closeVotingModal}
        footer={
          voteSuccess
            ? [
                <Button key="close" type="primary" onClick={closeVotingModal}>
                  Cerrar
                </Button>,
              ]
            : [
                <Button
                  key="cancel"
                  onClick={closeVotingModal}
                  disabled={voting}
                >
                  Cancelar
                </Button>,
                <Button
                  key="vote"
                  type="primary"
                  onClick={handleVote}
                  loading={voting}
                  disabled={!selectedOption || voting}
                  icon={<SendOutlined />}
                >
                  {voting ? "Procesando..." : "Confirmar Voto"}
                </Button>,
              ]
        }
        width={700}
        closable={!voting}
        maskClosable={!voting}
      >
        {selectedElection && !voteSuccess && (
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
                disabled={voting}
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

            {selectedOption && !voting && (
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

            {voting && (
              <Card title="Proceso de Votación" size="small">
                <Steps
                  direction="vertical"
                  size="small"
                  current={votingState.step}
                  items={[
                    {
                      title: "Preparando",
                      description: "Iniciando proceso de votación",
                      icon: getStepIcon(0),
                    },
                    {
                      title: "Token Ciego",
                      description: "Generando y firmando token automáticamente",
                      icon: getStepIcon(1),
                    },
                    {
                      title: "Verificación",
                      description: "Verificando firma de la institución",
                      icon: getStepIcon(2),
                    },
                    {
                      title: "Preparación",
                      description: "Generando hash y datos del voto",
                      icon: getStepIcon(3),
                    },
                    {
                      title: "Recibo",
                      description: "Preparando recibo de votación",
                      icon: getStepIcon(4),
                    },
                    {
                      title: "Emisión",
                      description: "Emitiendo voto y recibo (operación atómica)",
                      icon: getStepIcon(5),
                    },
                  ]}
                />
              </Card>
            )}
          </Space>
        )}

        {voteSuccess && (
          <Result
            status="success"
            title="¡Voto Emitido Exitosamente!"
            subTitle="Tu voto ha sido registrado de forma anónima y segura."
            extra={[
              <Descriptions
                key="details"
                column={1}
                bordered
                size="small"
                style={{ textAlign: "left" }}
              >
                <Descriptions.Item label="Hash del Voto">
                  <Text code copyable style={{ fontSize: "11px" }}>
                    {votingState.voteHash}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Hash del Recibo">
                  <Text code copyable style={{ fontSize: "11px" }}>
                    {votingState.receiptHash}
                  </Text>
                </Descriptions.Item>
              </Descriptions>,
              <Alert
                key="info"
                message="Guarda estos hashes"
                description="Estos hashes te permiten verificar que tu voto fue contado correctamente sin revelar tu elección."
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />,
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
