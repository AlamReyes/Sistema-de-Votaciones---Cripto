// app/layout.tsx
import type { Metadata } from "next";

// Importa el CSS de Ant Design (¡esto se queda!)
import 'antd/dist/reset.css';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


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
        {/*
          Aquí solo renderizamos {children} directamente.
          - Si es la página de Login, {children} es el login.
          - Si es /dashboard, {children} es el layout de (app) + la página de dashboard.
        */}
        {children}
      </body>
    </html>
  );
}