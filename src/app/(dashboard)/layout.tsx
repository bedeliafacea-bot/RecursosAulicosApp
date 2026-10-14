'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AlertasReservasProvider } from '@/context/AlertasReservasContext';
import Navbar from '@/components/common/Navbar';
import { Loader2 } from 'lucide-react';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-uap-fondo text-uap-azul gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-uap-azul-medio" />
        <p className="text-sm font-extrabold uppercase tracking-widest text-uap-azul">
          Cargando Sistema Bedelía UAP...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-uap-fondo">
      <div className="no-print">
        <Navbar />
      </div>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AlertasReservasProvider>
        <DashboardContent>{children}</DashboardContent>
      </AlertasReservasProvider>
    </AuthProvider>
  );
}
