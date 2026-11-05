import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recursos Áulicos | Bedelía - Universidad Adventista del Plata',
  description: 'Sistema Integral de Gestión de Alumnos Becarios, Recursos Áulicos, Reservas, Oficina y Cierre de Caja - UAP',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/img/icon-uap-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/img/icon-uap-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/img/icon-uap-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
