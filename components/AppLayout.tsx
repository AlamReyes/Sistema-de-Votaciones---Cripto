// components/AppLayout.tsx
"use client";

import React, { useState } from 'react';
// 1. Importa los hooks de navegación de Next.js
import { useRouter, usePathname } from 'next/navigation';

import {
  HomeOutlined,
  SafetyOutlined,
  BarChartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Breadcrumb, theme, type MenuProps } from 'antd';

const { Header, Content, Footer, Sider } = Layout;

// 2. Cambia los 'key' para que sean las RUTAS (paths)
const menuItems: MenuProps['items'] = [
  {
    key: '/', // Ruta para el Dashboard
    icon: <HomeOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/votaciones', // Ruta para Votaciones
    icon: <SafetyOutlined />,
    label: 'Votaciones',
  },
  {
    key: '/resultados', // Ruta para Resultados
    icon: <BarChartOutlined />,
    label: 'Resultados',
  },
  {
    key: '/perfil', // Ruta para Perfil
    icon: <UserOutlined />,
    label: 'Perfil',
  },
];

// (El array de breadcrumb sigue igual por ahora)
const breadcrumbItems = [
  { title: 'App' },
  { title: 'Dashboard' },
];

type AppLayoutProps = {
  children: React.ReactNode;
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 3. Inicializa los hooks
  const router = useRouter(); // Hook para cambiar de página
  const pathname = usePathname(); // Hook para leer la ruta actual

  // 4. Crea la función que maneja el clic en el menú
  const onClickMenu: MenuProps['onClick'] = (e) => {
    // 'e.key' contendrá la ruta (ej. '/votaciones')
    router.push(e.key); 
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
        
        {/* 5. Conecta el Menú */}
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          onClick={onClickMenu} // <-- Llama a nuestra función al hacer clic
          selectedKeys={[pathname]} // <-- Resalta el ítem basado en la ruta actual
        />

      </Sider>

      <Layout>
        <Header style={{ padding: '0 16px', background: colorBgContainer }} />

        <Content style={{ margin: '0 16px' }}>
          
          <Breadcrumb
            style={{ margin: '16px 0' }}
            items={breadcrumbItems}
          />
          
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          Sistema de Votaciones ©{new Date().getFullYear()} Creado con Ant Design
        </Footer>
      </Layout>
    </Layout>
  );
};