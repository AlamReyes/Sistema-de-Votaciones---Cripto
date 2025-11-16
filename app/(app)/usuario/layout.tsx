import { AppLayout } from '@/components/AppLayout';
import {
  KeyOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const usuarioMenuItems: MenuProps['items'] = [
  {
    key: '/usuario/llave',
    icon: <KeyOutlined />,
    label: 'Mi Llave Privada',
  },
  {
    key: '/usuario/votacion',
    icon: <SafetyOutlined />,
    label: 'Votar',
  },
  {
    key: '/usuario/perfil',
    icon: <UserOutlined />,
    label: 'Mi Perfil',
  },
];

export default function UsuarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout 
      menuItems={usuarioMenuItems}
      title="Sistema de Votaciones - Usuario"
      logoText="USUARIO"
    >
      {children}
    </AppLayout>
  );
}
