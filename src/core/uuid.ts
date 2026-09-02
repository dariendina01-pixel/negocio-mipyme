// uuid.ts — Generador de UUID sin dependencias nativas (compatible Node/Hermes)

let contador = 0;

export function v4(): string {
  const t = Date.now();
  const rnd = Math.floor(Math.random() * 0xffffffff);
  const rnd2 = Math.floor(Math.random() * 0xffffffff);
  const body =
    t.toString(16).padStart(12, "0") +
    (rnd >>> 0).toString(16).padStart(8, "0") +
    (rnd2 >>> 0).toString(16).padStart(8, "0") +
    (contador++ % 65536).toString(16).padStart(4, "0");
  return (
    body.slice(0, 8) +
    "-" +
    body.slice(8, 12) +
    "-4" +
    body.slice(13, 16) +
    "-" +
    "8" +
    body.slice(17, 20) +
    "-" +
    body.slice(20, 32)
  );
}