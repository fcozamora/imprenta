import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { FilaDashboard, EtapaFlujo } from './tipos';

export interface Catalogos {
  tiposTrabajo: Array<{
    id: number; codigo: string; nombre: string;
    dias_habiles_entrega: number; dias_alerta_previa: number; requiere_imagen: number;
  }>;
  etapas: Array<{ id: number; codigo: string; nombre: string; icono: string; color: string }>;
  flujos: Array<{ tipo_trabajo_id: number; secuencia: number; etapa_id: number; omitir_sin_cambios: number }>;
  papeles: Array<{
    id: number; nombre: string;
    categoria: 'BOND' | 'BRISTOL' | 'QUIMICO' | 'ESPECIAL';
    es_original: number;
  }>;
  tamanosTalonario: Array<{ id: number; nombre: string }>;
  tiposCopia: Array<{ id: number; nombre: string; cantidad_hojas: number }>;
  tiposSobre: Array<{ id: number; nombre: string }>;
  materialesLatex: Array<{ id: number; nombre: string }>;
  materialesDigital: Array<{ id: number; nombre: string }>;
  telas: Array<{ id: number; nombre: string }>;
  tintas: Array<{ id: number; nombre: string; hex: string }>;
  vendedores: Array<{ id: number; nombre: string }>;
  disenadores: Array<{ id: number; nombre: string }>;
  costureras: Array<{ id: number; nombre: string }>;
  tallas: Array<{ id: number; genero: 'MUJER' | 'HOMBRE'; nombre: string }>;
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
  mios?: boolean;
  finalizadas?: boolean;
  q?: string;
  campo?: 'CLIENTE' | 'ORDEN' | 'TELEFONO';
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
      if (filtros.mios) params.set('mios', 'true');
      if (filtros.finalizadas) params.set('finalizadas', 'true');
      if (filtros.q) params.set('q', filtros.q);
      if (filtros.campo) params.set('campo', filtros.campo);
      return (await api.get<FilaDashboard[]>(`/ordenes?${params}`)).data;
    },
  });
}

/** Trabajos textiles que están en manos de una costurera. */
export function useConfeccion(costureraId?: number) {
  return useQuery({
    queryKey: ['confeccion', costureraId],
    queryFn: async () => {
      const p = costureraId ? `?costurera=${costureraId}` : '';
      return (await api.get<FilaDashboard[]>(`/confeccion${p}`)).data;
    },
  });
}

/**
 * Construye el flujo de etapas de una fila usando los catálogos ya cargados,
 * sin pedirlo al servidor por cada línea.
 */
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
      return {
        secuencia: f.secuencia,
        id: e.id,
        codigo: e.codigo,
        nombre: e.nombre,
        icono: e.icono,
        color: e.color,
      };
    });
}

import type { PedidoExterno, DatosPedidoExterno } from './tipos.js';

export function usePedidosExternos(retirados: boolean, busqueda: string) {
  return useQuery({
    queryKey: ['pedidos-externos', retirados, busqueda],
    queryFn: async () => {
      const { data } = await api.get<PedidoExterno[]>('/pedidos-externos', {
        params: { retirados: retirados ? 'true' : 'false', q: busqueda || undefined },
      });
      return data;
    },
  });
}

export function useGuardarPedidoExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id?: number; datos: DatosPedidoExterno }) => {
      const cuerpo = { ...args.datos, numero_orden: Number(args.datos.numero_orden) };
      const { data } = args.id
        ? await api.put<PedidoExterno>(`/pedidos-externos/${args.id}`, cuerpo)
        : await api.post<PedidoExterno>('/pedidos-externos', cuerpo);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos-externos'] }),
  });
}

export function useRetirarPedidoExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; retirado: boolean }) => {
      const { data } = await api.patch<PedidoExterno>(
        `/pedidos-externos/${args.id}/retirado`,
        { retirado: args.retirado },
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos-externos'] }),
  });
}

export function useEliminarPedidoExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/pedidos-externos/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos-externos'] }),
  });
}