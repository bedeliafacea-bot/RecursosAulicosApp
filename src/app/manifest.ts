import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Recursos Áulicos | Bedelía UAP',
    short_name: 'Recursos Áulicos',
    description: 'Sistema de gestión de Recursos Áulicos de la Universidad Adventista del Plata.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#003c71',
    theme_color: '#003c71',
    icons: [
      {
        src: '/img/icon-uap-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/img/icon-uap-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
