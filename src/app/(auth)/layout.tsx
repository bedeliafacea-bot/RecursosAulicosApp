import React from 'react';
import { AuthProvider } from '@/context/AuthContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-r from-uap-azul via-uap-azul-oscuro to-uap-azul-profundo relative overflow-hidden">
        {/* Background image overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/WbBnrn8q/universidad-adventista-del-plata.jpg')`,
          }}
        />
        <div className="relative z-10 w-full flex items-center justify-center">
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
