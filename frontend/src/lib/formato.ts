/** Fechas de la API vienen como 'YYYY-MM-DD'. Se formatean sin pasar por Date
 *  para que no se corran un día por zona horaria. */
export function fecha(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [anio, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

export function fechaCorta(valor: string | null | undefined): string {
  if (!valor) return '—';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  const [, mes, dia] = valor.slice(0, 10).split('-');
  return `${Number(dia)} ${meses[Number(mes) - 1]}`;
}

export function fechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const d = new Date(valor);
  return d.toLocaleString('es-CR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function numero(valor: number | null | undefined): string {
  return valor == null ? '—' : valor.toLocaleString('es-CR');
}

/** Texto y color del aviso de vencimiento. */
export function avisoEntrega(dias: number): { texto: string; clase: string } {
  if (dias < 0) return { texto: `${Math.abs(dias)} d. vencida`, clase: 'bg-red-100 text-red-700' };
  if (dias === 0) return { texto: 'Entrega hoy', clase: 'bg-red-100 text-red-700' };
  if (dias === 1) return { texto: 'Entrega mañana', clase: 'bg-amber-100 text-amber-700' };
  return { texto: `${dias} días`, clase: 'bg-slate-100 text-slate-600' };
}

export function enlaceWhatsapp(telefono: string | null, mensaje?: string): string {
  const limpio = (telefono ?? '').replace(/\D/g, '');
  const base = `https://wa.me/${limpio}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}