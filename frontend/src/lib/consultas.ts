import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { FilaDashboard, EtapaFlujo } from './tipos';

export interface Catalogos {
  tiposTrabajo: Array<{
    id: number; codigo: string; nombre: string;
    dias_habiles_entrega: number; dias_alerta_previa: number; requiere_imagen: number;
  }>;
  etapas: Array<{ id: number; codigo: string; nombre: string; icono: string; color: string }>;
  flujos: Array<{ tipo_trabajo_id: number; secuencia: number; etapa_id: number; omitir_sin_cambios: number }>;
  papeles: Array<{ id: number; nombre: string }>;
  tamanosTalonario: Array<{ id: number; nombre: string }>;
  tiposCopia: Array<{ id: number; nombre: string; cantidad_hojas: number }>;
  tiposSobre: Array<{ id: number; nombre: string }>;
  materialesLatex: Array<{ id: number; nombre: string }>;
  telas: Array<{ id: number; nombre: string }>;
  tintas: Array<{ id: number; nombre: string; hex: string }>;
  vendedores: Array<{ id: number; nombre: string }>;
  costureras: Array<{ id: number; nombre: string }>;
}

/** Los catálogos cambian poco: se guardan una hora en memoria. */
export function useCatalogos() {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: async () => (await api.get<Catalogos>('/catalogos')).data,
    staleTime: 60 * 60 * 1000,
  });
}

export interface FiltrosOrdenes {
  vendedor?: number;
  tipo?: number;
  porVencer?: boolean;
  sinTomar?: boolean;
  finalizadas?: boolean;
  q?: string;
}

export function useOrdenes(filtros: FiltrosOrdenes) {
  return useQuery({
    queryKey: ['ordenes', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.vendedor) params.set('vendedor', String(filtros.vendedor));
      if (filtros.tipo) params.set('tipo', String(filtros.tipo));
      if (filtros.porVencer) params.set('porVencer', 'true');
      if (filtros.sinTomar) params.set('sinTomar', 'true');
      if (filtros.finalizadas) params.set('finalizadas', 'true');
      if (filtros.q) params.set('q', filtros.q);
      return (await api.get<FilaDashboard[]>(`/ordenes?${params}`)).data;
    },
  });
}

/** Construye el flujo de etapas de una fila usando los catálogos ya cargados,
 *  sin pedirlo al servidor por cada línea. */
export function flujoDesdeCatalogos(
  catalogos: Catalogos | undefined,
  tipoTrabajoId: number,
  archivoSinCambios: boolean
): EtapaFlujo[] {
  if (!catalogos) return [];
  const porId = new Map(catalogos.etapas.map((e) => [e.id, e]));
  return catalogos.flujos
    .filter((f) => f.tipo_trabajo_id === tipoTrabajoId)
    .filter((f) => !(archivoSinCambios && f.omitir_sin_cambios))
    .sort((a, b) => a.secuencia - b.secuencia)
    .map((f) => {
      const e = porId.get(f.etapa_id)!;
      return { secuencia: f.secuencia, id: e.id, codigo: e.codigo, nombre: e.nombre, icono: e.icono, color: e.color };
    });
}