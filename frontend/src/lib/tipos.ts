export interface Usuario {
  id: number;
  cedula: string;
  nombre: string;
  puestoId: number;
  puesto: string;
  esAdmin: boolean;
  permisos: string[];
  requiereCambioPassword: boolean;
}

export interface FilaDashboard {
  orden_id: number;
  numero_orden: number;
  linea_id: number;
  linea: number;
  cliente_id: number;
  cliente_cedula: string;
  cliente: string;
  nombre_comercial: string | null;
  telefono: string;
  telefono_wa: string | null;
  tipo_trabajo_id: number;
  tipo_codigo: string;
  tipo_trabajo: string;
  nombre_trabajo: string;
  cantidad: number;
  archivo_sin_cambios: number;
  etapa: string | null;
  etapa_codigo: string | null;
  etapa_icono: string | null;
  etapa_color: string | null;
  secuencia_actual: number;
  disenador_id: number | null;
  disenador: string | null;
  costurera_id: number | null;
  costurera: string | null;
  costurera_telefono: string | null;
  sin_confeccion: number | null;
  vendedor_id: number;
  vendedor: string;
  fecha_ingreso: string;
  fecha_entrega: string;
  estado: string;
  finalizada: number;
  ultimo_cambio_etapa: string | null;
  dias_restantes: number;
  por_vencer: number;
  estancada: number;
}

export interface EtapaFlujo {
  secuencia: number;
  id: number;
  codigo: string;
  nombre: string;
  icono: string;
  color: string;
}

export interface PedidoExterno {
  id: number;
  orden_id: number;
  numero_orden: number;
  cliente: string;
  fecha_solicitud: string;
  pedido_solicitado: string;
  cantidad: string;
  descripcion: string | null;
  retirado: number;
  retirado_en: string | null;
}

export interface DatosPedidoExterno {
  numero_orden: number | string;
  fecha_solicitud: string;
  pedido_solicitado: string;
  cantidad: string;
  descripcion: string;
}