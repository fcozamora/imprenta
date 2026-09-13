import {
  PenTool, Send, CircleCheck, Layers, Printer, Flame, Hash,
  Copy, Scissors, Wrench, PackageCheck, Truck, Circle,
  type LucideIcon,
} from 'lucide-react';

/** Los nombres vienen de la columna `icono` de la tabla etapas. */
const mapa: Record<string, LucideIcon> = {
  PenTool, Send, CircleCheck, Layers, Printer, Flame, Hash,
  Copy, Scissors, Wrench, PackageCheck, Truck,
};

export function iconoEtapa(nombre: string | null | undefined): LucideIcon {
  return (nombre && mapa[nombre]) || Circle;
}