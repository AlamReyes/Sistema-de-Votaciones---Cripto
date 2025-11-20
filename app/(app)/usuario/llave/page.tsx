"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Typography,
  Spin,
  message,
  Space,
  Alert,
  Descriptions,
  Input,
  Divider,
  Modal,
  Steps,
} from "antd";
import {
  KeyOutlined,
  SafetyOutlined,
  DownloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import "@ant-design/v5-patch-for-react-19";
import { getCurrentUser, updatePublicKey, User } from "@/utils/api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function UserLlavePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>("");
  const [publicKey, setPublicKey] = useState<string>("");
  const [showKeys, setShowKeys] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error: any) {
      message.error(error.message || "Error al cargar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const generateKeyPair = async () => {
    setGenerating(true);

    try {
      // Generate RSA key pair using Web Crypto API
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-PSS",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      );

      // Export private key to PEM format
      const privateKeyBuffer = await window.crypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey
      );
      const privateKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(privateKeyBuffer))
      );
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;

      // Export public key to PEM format
      const publicKeyBuffer = await window.crypto.subtle.exportKey(
        "spki",
        keyPair.publicKey
      );
      const publicKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(publicKeyBuffer))
      );
      const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;

      setPrivateKey(privateKeyPEM);
      setPublicKey(publicKeyPEM);
      setShowKeys(true);
      setCurrentStep(1);

      message.success("Par de llaves generado correctamente");
    } catch (error: any) {
      console.error("Error generating keys:", error);
      message.error("Error al generar las llaves. Asegúrate de usar un navegador moderno.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPrivateKey = () => {
    if (!privateKey) {
      message.error("No hay llave privada para descargar");
      return;
    }

    const blob = new Blob([privateKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "private_key.pem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success("Llave privada descargada. ¡Guárdala en un lugar seguro!");
    setCurrentStep(2);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label} copiada al portapapeles`);
    });
  };

  const savePublicKey = async () => {
    if (!user || !publicKey) {
      message.error("No hay llave pública para guardar");
      return;
    }

    Modal.confirm({
      title: "¿Guardar llave pública?",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            Al guardar tu llave pública, esta se registrará en el servidor y se
            usará para verificar tus votos.
          </p>
          <Alert
            message="Importante"
            description="Asegúrate de haber descargado y guardado tu llave privada en un lugar seguro. No la pierdas, ya que la necesitarás para votar."
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
          />
        </div>
      ),
      okText: "Guardar",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          setSaving(true);
          const updatedUser = await updatePublicKey(user.id, publicKey);
          setUser(updatedUser);
          setCurrentStep(3);
          setShowKeys(false)
          message.success("Llave pública guardada correctamente");
        } catch (error: any) {
          message.error(error.message || "Error al guardar la llave pública");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const resetKeys = () => {
    Modal.confirm({
      title: "¿Generar nuevas llaves?",
      icon: <ExclamationCircleOutlined />,
      content:
        "Si generas nuevas llaves, las actuales serán reemplazadas.",
      okText: "Continuar",
      cancelText: "Cancelar",
      onOk: () => {
        setPrivateKey("");
        setPublicKey("");
        setShowKeys(false);
        setCurrentStep(0);
      },
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p>Cargando información...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>Gestión de Llaves</span>
          </Space>
        }
      >
        <Alert
          message="Las llaves son necesarias para garantizar la seguridad y anonimato de tu voto."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Descriptions column={1} bordered style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Estado de Llave Pública">
            {user?.public_key ? (
              <Space>
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                <Text type="success">Configurada</Text>
              </Space>
            ) : (
              <Space>
                <ExclamationCircleOutlined style={{ color: "#faad14" }} />
                <Text type="warning">No configurada</Text>
              </Space>
            )}
          </Descriptions.Item>
        </Descriptions>

        {!showKeys && !user?.public_key && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <SafetyOutlined style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }} />
            <Title level={4}>Genera tus Llaves</Title>
            <Paragraph type="secondary">
              Necesitas generar un par de llaves para poder votar
              de forma segura y anónima.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<KeyOutlined />}
              onClick={generateKeyPair}
              loading={generating}
            >
              Generar Llaves
            </Button>
          </div>
        )}

        {user?.public_key && !showKeys && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <CheckCircleOutlined
              style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }}
            />
            <Title level={4}>Llaves Configuradas</Title>
            <Paragraph type="secondary">
              Ya tienes tu llave pública configurada. Puedes generar nuevas
              llaves si lo necesitas.
            </Paragraph>
            <Space>
              <Button
                type="default"
                icon={<KeyOutlined />}
                onClick={() => {
                  setShowKeys(true);
                  setCurrentStep(0);
                }}
              >
                Generar Nuevas Llaves
              </Button>
            </Space>
          </div>
        )}

        {showKeys && (
          <>
            <Divider />

            <Steps
              current={currentStep}
              style={{ marginBottom: 24 }}
              items={[
                { title: "Generar", description: "Crear par de llaves" },
                { title: "Descargar", description: "Guardar llave privada" },
                { title: "Registrar", description: "Subir llave pública" },
                { title: "Completado", description: "Listo para votar" },
              ]}
            />

            {!privateKey && !publicKey && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<KeyOutlined />}
                  onClick={generateKeyPair}
                  loading={generating}
                >
                  Generar Nuevo Par de Llaves
                </Button>
              </div>
            )}

            {privateKey && (
              <Card
                type="inner"
                title={
                  <Space>
                    <SafetyOutlined style={{ color: "#ff4d4f" }} />
                    <Text strong>Llave Privada</Text>
                  </Space>
                }
                style={{ marginBottom: 16 }}
                extra={
                  <Space>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(privateKey, "Llave privada")}
                    >
                      Copiar
                    </Button>
                    <Button
                      type="primary"
                      danger
                      icon={<DownloadOutlined />}
                      onClick={downloadPrivateKey}
                    >
                      Descargar
                    </Button>
                  </Space>
                }
              >
                <Alert
                  message="¡IMPORTANTE!"
                  description="Se ha generado tu llave privada. Descárgala y guárdala en un lugar seguro. NO la compartas con nadie."
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
              </Card>
            )}

            {publicKey && (
              <Card
                type="inner"
                title={
                  <Space>
                    <KeyOutlined style={{ color: "#52c41a" }} />
                    <Text strong>Llave Pública</Text>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(publicKey, "Llave pública")}
                    >
                      Copiar
                    </Button>
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={savePublicKey}
                      loading={saving}
                      disabled={currentStep < 2}
                    >
                      Guardar en Servidor
                    </Button>
                  </Space>
                }
              >
                <Alert
                  message="¡IMPORTANTE!"
                  description="Esta llave se guardará en el servidor y se usará para verificar tus firmas digitales."
                  type="success"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
                <TextArea
                  value={publicKey}
                  readOnly
                  rows={6}
                  style={{ fontFamily: "monospace", fontSize: "11px" }}
                />
              </Card>
            )}

            {currentStep >= 2 && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <Button onClick={resetKeys} type="default">
                  Generar Nuevas Llaves
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
