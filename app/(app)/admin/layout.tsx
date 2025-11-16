import { AppLayout } from '@/components/AppLayout';
import {
  TeamOutlined,
  SafetyOutlined,
  BarChartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const adminMenuItems: MenuProps['items'] = [
  {
    key: '/admin/dashboard',
    icon: <TeamOutlined />,
    label: 'Usuarios',
  },
  {
    key: '/admin/votaciones',
    icon: <SafetyOutlined />,
    label: 'Votaciones',
  },
  {
    key: '/admin/resultados',
    icon: <BarChartOutlined />,
    label: 'Resultados',
  },
  {
    key: '/admin/perfil',
    icon: <UserOutlined />,
    label: 'Mi Perfil',
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout 
      menuItems={adminMenuItems}
      title="Sistema de Votaciones - Administrador"
      logoText="ADMIN"
    >
      {children}
    </AppLayout>
  );
}