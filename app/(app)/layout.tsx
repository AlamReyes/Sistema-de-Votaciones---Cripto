// app/(app)/layout.tsx
"use client"; // Necesario porque AppLayout es un 'client component'

import { AppLayout } from '@/components/AppLayout';

// Este layout recibe {children} (que serán tus páginas: dashboard, votaciones, etc.)
// y los envuelve con el AppLayout (el menú lateral)
export default function PrivateAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}