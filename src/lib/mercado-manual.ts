export interface FilaPegada {
  fecha: string;
  hora: string;
  operacion: string;
  estado: string;
  monto: number;
}

export interface ResultadoPegado {
  filas: FilaPegada[];
  operacionesDetectadas: number;
  omitidas: number;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function normalizarTexto(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function esEncabezadoFecha(linea: string) {
  return /^\d{1,2}\s+de\s+[a-z]+(?:\s+de\s+\d{4})?$/.test(normalizarTexto(linea));
}

function fechaDesdeEncabezado(linea: string, fechaBase: string) {
  const coincidencia = normalizarTexto(linea).match(
    /^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/
  );
  if (!coincidencia) return null;

  const mes = MESES.indexOf(coincidencia[2]);
  const dia = Number(coincidencia[1]);
  const anio = Number(coincidencia[3] || fechaBase.slice(0, 4));
  if (mes < 0 || !Number.isInteger(dia) || !Number.isInteger(anio)) return null;

  const fecha = new Date(anio, mes, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes || fecha.getDate() !== dia) {
    return null;
  }
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function convertirMonto(texto: string) {
  const limpio = texto.replace(/\s/g, '');
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(?:\.\d{3})+$/.test(limpio)
      ? limpio.replace(/\./g, '')
      : limpio;
  return Number(normalizado);
}

export function analizarTextoPegado(texto: string, fechaBase: string): ResultadoPegado {
  const lineas = texto.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean);
  const filas: FilaPegada[] = [];
  let fechaActual = fechaBase;
  let horaActual = '';
  let operacionesDetectadas = 0;
  let omitidas = 0;

  for (let indice = 0; indice < lineas.length; indice += 1) {
    const linea = lineas[indice];
    const lineaNormalizada = normalizarTexto(linea);

    if (lineaNormalizada === 'hoy') {
      fechaActual = fechaBase;
      horaActual = '';
      continue;
    }
    if (lineaNormalizada === 'ayer') {
      const ayer = new Date(`${fechaBase}T00:00:00`);
      ayer.setDate(ayer.getDate() - 1);
      fechaActual = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
      horaActual = '';
      continue;
    }
    if (esEncabezadoFecha(linea)) {
      const fechaEncabezado = fechaDesdeEncabezado(linea, fechaBase);
      if (fechaEncabezado) fechaActual = fechaEncabezado;
      horaActual = '';
      continue;
    }

    const coincidenciaHora = linea.match(/^(\d{1,2}):(\d{2})$/);
    if (coincidenciaHora) {
      horaActual = `${coincidenciaHora[1].padStart(2, '0')}:${coincidenciaHora[2]}`;
      continue;
    }

    const coincidenciaOperacion = linea.match(/Operaci[oó]n\s+([A-Za-z0-9-]+)/i);
    if (!coincidenciaOperacion) continue;

    operacionesDetectadas += 1;
    let finOperacion = indice + 1;
    while (finOperacion < lineas.length) {
      const siguiente = lineas[finOperacion];
      if (
        /^(\d{1,2}):(\d{2})$/.test(siguiente) ||
        /Operaci[oó]n\s+[A-Za-z0-9-]+/i.test(siguiente) ||
        esEncabezadoFecha(siguiente) ||
        ['hoy', 'ayer'].includes(normalizarTexto(siguiente))
      ) {
        break;
      }
      finOperacion += 1;
    }

    const estado = lineas[indice + 1] || '';
    const textoMonto = lineas.slice(indice + 1, finOperacion).join(' ');
    const coincidenciaMonto = textoMonto.match(/([+-]?)\s*\$\s*([\d.,]+)/);
    const valorMonto = coincidenciaMonto ? convertirMonto(coincidenciaMonto[2]) : NaN;
    if (
      !horaActual ||
      !estado ||
      !/[a-záéíóúñ]/i.test(estado) ||
      !coincidenciaMonto ||
      !Number.isFinite(valorMonto)
    ) {
      omitidas += 1;
    } else {
      filas.push({
        fecha: fechaActual,
        hora: horaActual,
        operacion: coincidenciaOperacion[1],
        estado,
        monto: coincidenciaMonto[1] === '-' ? -valorMonto : valorMonto,
      });
    }
    horaActual = '';
  }

  return { filas, operacionesDetectadas, omitidas };
}
