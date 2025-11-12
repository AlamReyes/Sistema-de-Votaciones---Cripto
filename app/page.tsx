// app/page.tsx

// PASO 1: MARCAR COMO CLIENT COMPONENT
// (Necesario porque usaremos useState para cambiar entre vistas)
"use client";

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, IdcardOutlined } from '@ant-design/icons';

const { Title, Text, Link } = Typography;

export default function Home() {
  
  // Estado para controlar qué formulario mostrar: 'login' o 'register'
  const [view, setView] = useState('login');

  // Función que se llama al enviar el formulario de Login
  const onFinishLogin = (values: any) => {
    console.log('Datos de Login Recibidos:', values);


    // Aquí es donde se llamaría  al backend para autenticar
    // Ejemplo: await fetch('/api/login', { ... })


  };

  // Función que se llama al enviar el formulario de Registro
  const onFinishRegister = (values: any) => {
    console.log('Datos de Registro Recibidos:', values);


    // Aquí es donde se llamaría  al backend para crear la cuenta
    // Ejemplo: await fetch('/api/register', { ... })


  };

  return (
    // Contenedor para centrar la tarjeta de login
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '100vh'}}>
      
      <Card style={{ width: 450, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Title level={2} style={{ textAlign: 'center' }}>
          Sistema de Votaciones
        </Title>
        <Text style={{ display: 'block', textAlign: 'center', marginBottom: 24, color: '#8c8c8c' }}>
          Integrantes: Alam Reyes, Erick Juárez, Michelle Benítez, Pilar Hernández, Luis García, Ricardo Romero
        </Text>
        
        <Divider />

        {/* --- VISTA DE LOGIN --- */}
        {view === 'login' ? (
          <>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 20 }}>Iniciar Sesión</Title>
            <Form
              name="login_form"
              onFinish={onFinishLogin}
              layout="vertical"
            >
              <Form.Item
                label="Usuario"
                name="username"
                rules={[{ required: true, message: '¡Por favor ingresa tu usuario!' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Tu usuario" />
              </Form.Item>

              <Form.Item
                label="Contraseña"
                name="password"
                rules={[{ required: true, message: '¡Por favor ingresa tu contraseña!' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Tu contraseña" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Entrar
                </Button>
              </Form.Item>
              
              <Text style={{ textAlign: 'center', display: 'block' }}>
                ¿No tienes cuenta? <Link onClick={() => setView('register')}>Regístrate aquí</Link>
              </Text>
            </Form>
          </>
        
        /* --- VISTA DE REGISTRO --- */
        ) : (
          <>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 20 }}>Crear Cuenta</Title>
            <Form
              name="register_form"
              onFinish={onFinishRegister}
              layout="vertical"
            >
              <Form.Item
                label="Nombre"
                name="name"
                rules={[{ required: true, message: 'Ingresa tu nombre' }]}
              >
                <Input prefix={<IdcardOutlined />} placeholder="Nombre" />
              </Form.Item>

              <Form.Item
                label="Apellido"
                name="lastname"
                rules={[{ required: true, message: 'Ingresa tu apellido' }]}
              >
                <Input prefix={<IdcardOutlined />} placeholder="Apellido" />
              </Form.Item>
              
              <Form.Item
                label="Usuario"
                name="username"
                rules={[{ required: true, message: 'Crea un nombre de usuario' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Tu usuario" />
              </Form.Item>

              <Form.Item
                label="Contraseña"
                name="password"
                rules={[{ required: true, message: 'Crea una contraseña segura' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Registrarme
                </Button>
              </Form.Item>
              
              <Text style={{ textAlign: 'center', display: 'block' }}>
                ¿Ya tienes cuenta? <Link onClick={() => setView('login')}>Inicia Sesión</Link>
              </Text>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
