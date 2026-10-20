export type RolUsuario = 'admin' | 'secretario' | 'alumno';

export interface PerfilUsuario {
  id: string;
  usuario: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface Alumno {
  id: string; // Legajo
  nombre: string;
  plan: '10hs' | '20hs';
  carrera: string | null;
  telefono: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface JornadaBecuap {
  id: string;
  alumno_id: string;
  fecha: string; // YYYY-MM-DD
  entrada_1: string | null; // HH:mm:ss o HH:mm
  salida_1: string | null;
  entrada_2: string | null;
  salida_2: string | null;
  total_decimal: number;
  observacion: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface HorarioPactado {
  id: string;
  alumno_id: string;
  fecha: string; // YYYY-MM-DD
  rango_horario: string; // Ej: "07:30 - 11:30"
  creado_en: string;
}

export interface MesEvaluacionData {
  notas: (number | null)[]; // 7 criterios
  observacion: string;
}

export interface EvaluacionBecuap {
  id: string;
  alumno_id: string;
  cuatrimestre: 1 | 2;
  anio: number;
  departamento: string;
  fecha_inicio_plan: string | null;
  promedio: number | null;
  marzo: MesEvaluacionData | null;
  abril: MesEvaluacionData | null;
  mayo: MesEvaluacionData | null;
  junio: MesEvaluacionData | null;
  julio: MesEvaluacionData | null;
  agosto: MesEvaluacionData | null;
  septiembre: MesEvaluacionData | null;
  octubre: MesEvaluacionData | null;
  noviembre: MesEvaluacionData | null;
  obs_general: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Departamento {
  id: string;
  nombre: string;
  activo: boolean;
  creado_en: string;
}

export interface Fotocopia {
  id: string;
  fecha: string;
  departamento_id: string | null;
  departamento_nombre: string;
  cantidad: number;
  valor_unitario: number;
  total: number;
  creado_en: string;
}

export interface PagoEfectivo {
  id: string;
  fecha: string;
  cantidad_copias: number;
  valor_unitario: number;
  total: number;
  creado_en: string;
}

export interface Profesor {
  id: string;
  nombre: string;
  activo: boolean;
  creado_en: string;
}

export interface Recurso {
  id: string;
  nombre: string;
  activo: boolean;
  creado_en: string;
}

export type EstadoReserva = 'Pendiente' | 'Pausado' | 'Finalizado';
export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

export interface ReservaMatriz {
  id: string;
  dia: DiaSemana;
  profesor_id: string | null;
  profesor_nombre: string;
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  aula: string;
  recurso: string;
  estado: EstadoReserva;
  creado_en: string;
  actualizado_en: string;
}

export interface ReservaEspecial {
  id: string;
  fecha: string;
  departamento: string;
  equipo: string;
  horario: string;
  observaciones: string | null;
  telefono: string | null;
  entregado: boolean;
  devuelto: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface ReciboItem {
  numero: string;
  tipo: 'recibo' | 'efectivo' | 'transferencia' | 'anulado';
  monto: number;
}

export interface MercadoPagoItem {
  id?: string;
  fecha: string;
  monto: number;
}

export interface TransferenciaItem {
  recibo: string;
  fecha: string;
  monto: number;
}

export interface CierreCaja {
  id: string;
  fecha: string;
  total_recibos: number;
  total_mercado_pago: number;
  total_efectivo: number;
  total_transferencias: number;
  diferencia: number;
  recibos_json: ReciboItem[];
  mercado_pago_json: MercadoPagoItem[];
  efectivo_json: any[];
  transferencias_json: TransferenciaItem[];
  creado_en: string;
}

export interface AulaPlanoSecu {
  id: string; // Nombre del aula, e.g. "Aula 15"
  planta: 'PB' | 'PA';
  tv: string | null;
  activo: boolean;
  grid_fila: string | null;
  grid_columna: string | null;
  orden: number;
  actualizado_en: string;
}

export interface EstadoApp {
  id: string;
  plano_activo: 'PB' | 'PA';
  actualizado_en: string;
}
