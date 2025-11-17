// Reutilizable para admin y para usuario normal
"use client";
import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, message, theme, type MenuProps } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import '@ant-design/v5-patch-for-react-19'; // Parche para que funcione message con React 19

const { Header, Content, Sider } = Layout;

type AppLayoutProps = {
  children: React.ReactNode;
  menuItems: MenuProps['items'];
  title?: string;
  logoText?: string;
};

export const AppLayout = ({ 
  children, 
  menuItems,
  title = 'Sistema de Votaciones',
  logoText = 'APP'
}: AppLayoutProps) => {
  //const API_URL = "http://localhost:8000/api/v1";
  const API_URL = "/api/v1";
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onClickMenu: MenuProps['onClick'] = (e) => {
    router.push(e.key);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Enviar las cookies
      });
      
      if (response.ok) {
        message.success('Sesión cerrada exitosamente');
        router.push('/'); // Redirige al login
      } else {
        throw new Error('Error al cerrar sesión');
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      message.error('Error al cerrar sesión');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
      >
        <div 
          className="demo-logo-vertical" 
          style={{ 
            height: 32, 
            margin: 16, 
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {!collapsed && logoText}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          onClick={onClickMenu}
          selectedKeys={[pathname]}
        />
      </Sider>
      <Layout>
        <Header 
          style={{ 
            padding: '0 16px', 
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            loading={isLoggingOut}
            onClick={handleLogout}
          >
            Cerrar Sesión
          </Button>
        </Header>
        <Content style={{ margin: '16px' }}>
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
      </Layout>
    </Layout>
  );
};

/* "use client";
import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, theme, type MenuProps } from 'antd';

const { Header, Content, Sider } = Layout;

type AppLayoutProps = {
  children: React.ReactNode;
  menuItems: MenuProps['items'];
  title?: string;
  logoText?: string;
};

export const AppLayout = ({ 
  children, 
  menuItems,
  title = 'Sistema de Votaciones',
  logoText = 'APP'
}: AppLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const router = useRouter();
  const pathname = usePathname();

  const onClickMenu: MenuProps['onClick'] = (e) => {
    router.push(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
      >
        <div 
          className="demo-logo-vertical" 
          style={{ 
            height: 32, 
            margin: 16, 
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {!collapsed && logoText}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          onClick={onClickMenu}
          selectedKeys={[pathname]}
        />
      </Sider>
      <Layout>
        <Header 
          style={{ 
            padding: '0 16px', 
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>
        </Header>
        <Content style={{ margin: '16px' }}>
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
      </Layout>
    </Layout>
  );
}; */