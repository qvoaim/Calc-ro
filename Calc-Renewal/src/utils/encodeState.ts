// Utilidad mínima para serializar/comprimir el estado de un build
// Requiere instalar: npm i lz-string
import LZString from "lz-string";

export function encodeBuildState(state: Record<string, number>): string {
  // state ejemplo: { s1: 2, s2: 1, s3: 0 }
  const json = JSON.stringify(state);
  // comprime y hace URI-safe
  return encodeURIComponent(LZString.compressToBase64(json));
}

export function decodeBuildState(token: string): Record<string, number> | null {
  try {
    const decoded = decodeURIComponent(token);
    const json = LZString.decompressFromBase64(decoded);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    console.error("Error decoding build state", e);
    return null;
  }
}