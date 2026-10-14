import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recursos Áulicos | Bedelía - Universidad Adventista del Plata',
  description: 'Sistema Integral de Gestión de Alumnos Becarios, Recursos Áulicos, Reservas, Oficina y Cierre de Caja - UAP',
  icons: {
    icon: 'https://i.postimg.cc/fyMcjMcn/logo-uap.png',
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
