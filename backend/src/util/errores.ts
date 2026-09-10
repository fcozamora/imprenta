/** Error con código HTTP, para responder con el estado correcto. */
export class ErrorHttp extends Error {
  constructor(
    public estado: number,
    mensaje: string,
    public codigo?: string
  ) {
    super(mensaje);
  }
}