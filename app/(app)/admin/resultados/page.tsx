"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Select,
  Typography,
  Spin,
  message,
  Progress,
  Statistic,
  Row,
  Col,
  Empty,
  Tag,
  Divider,
  Space,
  Button,
} from "antd";
import {
  BarChartOutlined,
  TrophyOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import {
  getAllElections,
  getElectionResults,
  Election,
  ElectionResults,
} from "@/utils/api";

const { Title, Text } = Typography;

export default function AdminResultadosPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<number | null>(null);
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      setLoadingElections(true);
      const data = await getAllElections(0, 100);
      setElections(data);
      if (data.length > 0) {
        setSelectedElection(data[0].id);
        loadResults(data[0].id);
      }
    } catch (error: any) {
      message.error(error.message || "Error al cargar elecciones");
    } finally {
      setLoadingElections(false);
    }
  };

  const loadResults = async (electionId: number) => {
    try {
      setLoadingResults(true);
      const data = await getElectionResults(electionId);
      setResults(data);
    } catch (error: any) {
      message.error(error.message || "Error al cargar resultados");
      setResults(null);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleElectionChange = (electionId: number) => {
    setSelectedElection(electionId);
    loadResults(electionId);
  };

  const getWinner = () => {
    if (!results || results.total_votes === 0) return null;
    const maxVotes = Math.max(...results.options.map((o) => o.vote_count));
    const winners = results.options.filter((o) => o.vote_count === maxVotes);
    return winners;
  };

  const getPercentage = (votes: number) => {
    if (!results || results.total_votes === 0) return 0;
    return Number(((votes / results.total_votes) * 100).toFixed(1));
  };

  const getStatusTag = () => {
    if (!results) return null;
    const now = new Date();
    const start = new Date(results.start_date);
    const end = new Date(results.end_date);

    if (!results.is_active) {
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

  const winners = getWinner();

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
          <BarChartOutlined /> Resultados de Votaciones
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadElections}
          loading={loadingElections}
        >
          Actualizar
        </Button>
      </div>

      <Card style={{ marginBottom: "24px" }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Selecciona una votación:</Text>
          {loadingElections ? (
            <Spin />
          ) : (
            <Select
              style={{ width: "100%" }}
              placeholder="Selecciona una votación"
              value={selectedElection}
              onChange={handleElectionChange}
              options={elections.map((e) => ({
                value: e.id,
                label: e.title,
              }))}
            />
          )}
        </Space>
      </Card>

      {loadingResults ? (
        <Card>
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
            <p>Cargando resultados...</p>
          </div>
        </Card>
      ) : results ? (
        <>
          <Card style={{ marginBottom: "24px" }}>
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Title level={3} style={{ margin: 0 }}>
                  {results.title}
                </Title>
                {results.description && (
                  <Text type="secondary">{results.description}</Text>
                )}
              </Col>
              <Col span={8} style={{ textAlign: "right" }}>
                {getStatusTag()}
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Total de Votos"
                  value={results.total_votes}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">
                    <CalendarOutlined /> Inicio
                  </Text>
                  <Text>
                    {new Date(results.start_date).toLocaleString("es-MX")}
                  </Text>
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">
                    <CalendarOutlined /> Fin
                  </Text>
                  <Text>
                    {new Date(results.end_date).toLocaleString("es-MX")}
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {winners && winners.length > 0 && results.total_votes > 0 && (
            <Card
              style={{
                marginBottom: "24px",
                background: "linear-gradient(135deg, #ffd700 0%, #ffed4a 100%)",
              }}
            >
              <Row align="middle" justify="center">
                <Col>
                  <Space direction="vertical" align="center">
                    <TrophyOutlined style={{ fontSize: "48px", color: "#b8860b" }} />
                    <Title level={3} style={{ margin: 0, color: "#5c4d0b" }}>
                      {winners.length > 1 ? "Empate" : "Ganador"}
                    </Title>
                    <Space>
                      {winners.map((w) => (
                        <Tag key={w.id} color="gold" style={{ fontSize: "16px", padding: "8px 16px" }}>
                          {w.option_text}
                        </Tag>
                      ))}
                    </Space>
                    <Text style={{ color: "#5c4d0b" }}>
                      {winners[0].vote_count} votos ({getPercentage(winners[0].vote_count)}%)
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          )}

          <Card title="Desglose de Votos">
            {results.total_votes === 0 ? (
              <Empty description="No hay votos registrados aún" />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                {results.options
                  .sort((a, b) => b.vote_count - a.vote_count)
                  .map((option, index) => {
                    const percentage = getPercentage(option.vote_count);
                    const isWinner = winners?.some((w) => w.id === option.id);

                    return (
                      <div key={option.id}>
                        <Row justify="space-between" style={{ marginBottom: "8px" }}>
                          <Col>
                            <Space>
                              <Text strong style={{ fontSize: "16px" }}>
                                {index + 1}. {option.option_text}
                              </Text>
                              {isWinner && (
                                <TrophyOutlined style={{ color: "#faad14" }} />
                              )}
                            </Space>
                          </Col>
                          <Col>
                            <Text>
                              {option.vote_count} votos ({percentage}%)
                            </Text>
                          </Col>
                        </Row>
                        <Progress
                          percent={percentage}
                          strokeColor={
                            isWinner
                              ? {
                                  from: "#ffd700",
                                  to: "#faad14",
                                }
                              : undefined
                          }
                          status={isWinner ? "active" : "normal"}
                          showInfo={false}
                        />
                      </div>
                    );
                  })}
              </Space>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="Selecciona una votación para ver los resultados" />
        </Card>
      )}
    </div>
  );
}
