export {};

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        cedula: string;
        nombre: string;
        puestoId: number;
        puesto: string;
        esAdmin: boolean;
        permisos: string[];
        requiereCambioPassword: boolean;
      };
    }
  }
}