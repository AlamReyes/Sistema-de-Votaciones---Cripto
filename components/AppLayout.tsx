"use client";

import React, { useState } from 'react';
import {
  HomeOutlined,
  SafetyOutlined,
  BarChartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Breadcrumb, theme, type MenuProps } from 'antd';

const { Header, Content, Footer, Sider } = Layout;

// --- Array para el Menú ---
const menuItems: MenuProps['items'] = [
  { key: '1', icon: <HomeOutlined />, label: 'Dashboard' },
  { key: '2', icon: <SafetyOutlined />, label: 'Votaciones' },
  { key: '3', icon: <BarChartOutlined />, label: 'Resultados' },
  { key: '4', icon: <UserOutlined />, label: 'Perfil' },
];

// --- Array para el Breadcrumb ---
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu
          theme="dark"
          defaultSelectedKeys={['1']}
          mode="inline"
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header style={{ padding: '0 16px', background: colorBgContainer }} />

        {/* --- CONTENIDO --- */}
        <Content style={{ margin: '0 16px' }}>
          
          <Breadcrumb
            style={{ margin: '16px 0' }}
            items={breadcrumbItems}
          />
          
          {/* Aquí es donde se renderizará el contenido de app/page.tsx */}
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {/* Esta línea es la que dibuja el contenido de la página */}
            {children} 
            
          </div>
        </Content>
        {/* --- FIN DEL CONTENIDO --- */}

        <Footer style={{ textAlign: 'center' }}>
          Sistema de Votaciones ©{new Date().getFullYear()} Creado con Ant Design
        </Footer>
      </Layout>
    </Layout>
  );
};