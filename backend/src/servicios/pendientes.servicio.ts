import { pool } from '../db/pool.js';

/**
 * Lo que está esperando que alguien lo atienda, para marcarlo en el menú.
 *
 * Solo cuenta lo que esta persona puede resolver: a quien pide material no
 * le sirve ver que su propia solicitud sigue pendiente, le sirve a quien la
 * atiende. Lo que no le toca vuelve en cero y el menú no marca nada.
 */
export async function contar(usuario: { esAdmin: boolean; permisos: string[] }) {
  const puede = (codigo: string) => usuario.esAdmin || usuario.permisos.includes(codigo);

  const uno = async (sql: string) => {
    const [filas] = await pool.query(sql);
    return Number((filas as any[])[0]?.n ?? 0);
  };

  const [materiales, camisetas, vacaciones] = await Promise.all([
    puede('materiales.atender')
      ? uno(`SELECT COUNT(*) AS n FROM solicitudes_material WHERE estado = 'PENDIENTE'`)
      : 0,
    puede('camisetas.atender')
      ? uno(`SELECT COUNT(*) AS n FROM pedidos_camiseta WHERE estado = 'PENDIENTE'`)
      : 0,
    puede('vacaciones.gestionar')
      ? uno(`SELECT COUNT(*) AS n FROM vacaciones_solicitudes WHERE estado = 'PENDIENTE'`)
      : 0,
  ]);

  return { materiales, camisetas, vacaciones };
}
