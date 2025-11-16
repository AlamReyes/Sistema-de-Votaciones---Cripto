"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Typography, Divider, message } from "antd";
import { UserOutlined, LockOutlined, IdcardOutlined } from "@ant-design/icons";
// npm install @ant-design/v5-patch-for-react-19 --save
import '@ant-design/v5-patch-for-react-19'; // Parche para que funcione message con React 19

const { Title, Text, Link } = Typography;

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState("login");
  const API_URL = "http://localhost:8000/api/v1";

  // -------------------------
  // LOGIN
  // -------------------------
  const onFinishLogin = async (values: any) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, // Para el JWT
        body: new URLSearchParams({
          username: values.username,
          password: values.password,
        }),
      });

      if (!res.ok) {
        message.error("Usuario o contraseña incorrectos");
        return;
      }

      const data = await res.json();
      message.success("Inicio de sesión exitoso");
      // Guardar tokens
      /* localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
 */
      // Redirigiar con base a su valor en is_admin
      if (data.is_admin) {
        router.push("/admin");
      } else {
        router.push("/usuario");
      }

    } catch (err) {
      console.error(err);
      message.error("Error de conexión con el servidor");
    }
  };

  // -------------------------
  // REGISTER
  // -------------------------
  const onFinishRegister = async (values: any) => {
    try {
      const check = await fetch(`${API_URL}/users/${values.username}`);
      const result = await check.json();
      if (result.exists) {
        message.error("Ese nombre de usuario ya está en uso. Por favor elige otro");
        return; 
      }
    } catch (err) {
      console.error(err);
      message.error("No se pudo verificar el usuario");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          last_name: values.last_name,
          username: values.username,
          password: values.password,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err.detail || "No se pudo crear la cuenta");
        return;
      }
      message.success("Cuenta creada correctamente. Ahora inicia sesión");
      setView("login");

    } catch (err) {
      console.error(err);
      message.error("Error de conexión con el servidor");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", minHeight: "100vh" }}>
      <Card style={{ width: 500, boxShadow: "0 15px 15px rgba(0,0,0,0.1)", borderRadius: "15px" }}>
        <Title level={2} style={{ textAlign: "center" }}>Sistema de Votaciones</Title>
        <Text style={{ display: "block", textAlign: "center", marginBottom: 24, color: "#8c8c8c" }}>
          Alam Reyes, Erick Juárez, Michelle Benítez, Pilar Hernández, Luis García, Ricardo Romero
        </Text>

        <Divider />

        {view === "login" ? (
          <>
            {/* -- LOGIN -- */}
            <Title level={3} style={{ textAlign: "center", marginBottom: 20 }}>Iniciar Sesión</Title>
            <Form name="login_form" onFinish={onFinishLogin} layout="vertical">
              <Form.Item label="Usuario" name="username" rules={[{ required: true, message: "El usuario es requerido" }]}>
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="Tu usuario" 
                />
              </Form.Item>
              <Form.Item label="Contraseña" name="password" rules={[{ required: true, message: "La contraseña es requerida" }]}>
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Tu contraseña" 
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  style={{ marginTop: "1rem", marginBottom: "1rem" }}
                >
                  Entrar
                </Button>
              </Form.Item>
              <Text style={{ textAlign: "center", display: "block" }}>
                ¿No tienes cuenta? <Link onClick={() => setView("register")}>Regístrate aquí</Link>
              </Text>
            </Form>
          </>
        ) : (
          <>
            {/* -- REGISTER -- */}
            <Title level={3} style={{ textAlign: "center", marginBottom: 20 }}>Crear Cuenta</Title>
            <Form name="register_form" onFinish={onFinishRegister} layout="vertical">
              <Form.Item label="Nombre" name="name" rules={[{ required: true, message: "Ingresa tu nombre" }]}>
                <Input prefix={<IdcardOutlined />} placeholder="Nombre" />
              </Form.Item>
              <Form.Item label="Apellido" name="last_name" rules={[{ required: true, message: "Ingresa tu apellido" }]}>
                <Input prefix={<IdcardOutlined />} placeholder="Apellido" />
              </Form.Item>
              <Form.Item label="Usuario" name="username" rules={[{ required: true, message: "Crea un nombre de usuario" }]}>
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="Tu usuario"
                />
              </Form.Item>
              <Form.Item 
                label="Contraseña" 
                name="password" 
                rules={[
                  { required: true, message: "Crea una contraseña segura" },
                  ({ getFieldValue }) => ({
                    // Validar características de la contraseña
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      if (value.length < 8)
                        return Promise.reject("Debe tener al menos 8 caracteres");
                      if (!/[A-Z]/.test(value))
                        return Promise.reject("Debe contener una letra mayúscula");
                      if (!/[a-z]/.test(value))
                        return Promise.reject("Debe contener una letra minúscula");
                      if (!/[0-9]/.test(value))
                        return Promise.reject("Debe contener un número");
                      if (!/[/@$!%*?&_-]/.test(value))
                        return Promise.reject("Debe contener un símbolo especial entre /@$!%*?&_-");
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  style={{ marginTop: "1rem", marginBottom: "1rem" }}
                >
                  Registrarme
                </Button>
              </Form.Item>
              <Text style={{ textAlign: "center", display: "block" }}>
                ¿Ya tienes cuenta? <Link onClick={() => setView("login")}>Inicia Sesión</Link>
              </Text>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}