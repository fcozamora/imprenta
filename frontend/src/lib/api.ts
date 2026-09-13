import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

// Adjunta el token a cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token venció, vuelve al login.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const codigo = error.response?.data?.codigo;
    if (error.response?.status === 401 && codigo !== 'CREDENCIALES') {
      localStorage.removeItem('token');
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Saca el mensaje legible de un error de la API. */
export function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const datos = error.response?.data;
    if (datos?.detalles?.length) return datos.detalles[0].mensaje;
    if (datos?.mensaje) return datos.mensaje;
    if (!error.response) return 'No hay conexión con el servidor';
  }
  return 'Ocurrió un error inesperado';
}