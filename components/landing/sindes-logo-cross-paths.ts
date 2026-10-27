/**
 * Cantoneiras brancas — quatro L abertos com braço longo para fora e braço curto perpendicular.
 * Vazio quadrado central (sem barras contínuas entre cantos).
 * Calibrado ao viewBox 512×448 e referência public/brand/sindes-logo-original-reference.png.
 *
 * Por canto (longo → curto):
 * - SE: longo ↑, curto ←
 * - SD: longo →, curto ↑
 * - IE: longo ↓, curto ←
 * - ID: longo ←, curto ↓
 */
export const SINDES_CROSS_STROKE = 5;

/** Cantos do vazio ~234–254 × 195–215 (centro ~244,205) */
export const SINDES_CROSS_BRACKET_PATHS = [
  "M 234 171 V 195 H 218",
  "M 254 195 H 278 V 179",
  "M 234 239 V 215 H 218",
  "M 254 215 H 230 V 239",
] as const;
