// crypto.randomUUID solo existe en https:// o en localhost.
// El servidor de la imprenta va por http:// en la red local, asi que desde
// cualquier otra computadora esa funcion no esta y la pantalla revienta.
export function nuevoId(): string {
  const c = globalThis.crypto as Crypto | undefined;

  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }

  if (c && typeof c.getRandomValues === 'function') {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
