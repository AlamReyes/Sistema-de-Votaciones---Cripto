// app/layout.tsx
import type { Metadata } from "next";

// Importa el CSS de Ant Design
import 'antd/dist/reset.css';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Importa tu Layout personalizado
import { AppLayout } from '@/components/AppLayout';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Votaciones",
  description: "Proyecto de votaciones seguras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"> 
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ¡AQUÍ ESTÁ LA CORRECCIÓN!
          Envolvemos los {children} (tus páginas) con el AppLayout 
          para que el menú lateral y el header aparezcan en todos lados.
        */}
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}