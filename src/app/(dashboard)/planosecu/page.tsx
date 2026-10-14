'use client';

import React from 'react';
import PlanoSecundario from '@/components/plano/PlanoSecundario';
import { Tv } from 'lucide-react';

export default function PlanoSecuPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-uap border border-uap-borde flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <Tv className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-uap-azul">
            Plano Secundario en Tiempo Real
          </h1>
          <p className="text-sm text-uap-gris mt-0.5">
            Monitoreo en vivo de controles de televisores entregados en Planta Baja y Planta Alta
          </p>
        </div>
      </div>

      <PlanoSecundario />
    </div>
  );
}
