
// ======================================================================
// Utility GENERICHE per lavorare con colori (hex RGB).
// Nessuna logica Patient-specific. Nessuna chiamata API.
// Riutilizzabili per card, grafici, triage e componenti UI generici.
// ======================================================================

import { TRIAGE_COLORS } from "./constants"; // per triageColorShade

// --------------------------------------------------------------
// hexToRgb(hex)
// --------------------------------------------------------------
//  COSA FA: converte un colore "#RRGGBB" in oggetto {r,g,b}.
//  INPUT:  - hex → stringa colore (es. "#10B981")
//  OUTPUT: { r: number, g: number, b: number } oppure null se non valido.
//  DOVE SI USA: internamente nelle funzioni lighten/darken/blend.
// --------------------------------------------------------------
const hexToRgb = (hex) => {
  if (!/^#?[0-9A-Fa-f]{6}$/.test(hex)) return null; // controlla formato
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

// --------------------------------------------------------------
// rgbToHex(r,g,b)
// --------------------------------------------------------------
//  COSA FA: converte valori numerici RGB (0..255) in stringa "#RRGGBB".
//  INPUT:  - r,g,b → numeri
//  OUTPUT: string "#RRGGBB"
//  DOVE SI USA: internamente per ricostruire colore da lighten/darken/blend.
// --------------------------------------------------------------
const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");

// --------------------------------------------------------------
// lightenColor(hex, percent)
// --------------------------------------------------------------
//  COSA FA: schiarisce un colore esadecimale di "percent"%.
//  INPUT:  - hex → colore base "#RRGGBB"
//           - percent → numero tra 0 e 100 (quanto schiarire)
//  OUTPUT: string "#RRGGBB" schiarito
//  DOVE SI USA: hover, stati attivi, sfumature.
// --------------------------------------------------------------
export const lightenColor = (hex, percent = 20) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const p = Math.min(100, Math.max(0, percent)) / 100;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * p,
    rgb.g + (255 - rgb.g) * p,
    rgb.b + (255 - rgb.b) * p
  );
};

// --------------------------------------------------------------
// darkenColor(hex, percent)
// --------------------------------------------------------------
//  COSA FA: scurisce un colore esadecimale di "percent"%.
//  INPUT:  - hex → colore base "#RRGGBB"
//           - percent → numero tra 0 e 100
//  OUTPUT: string "#RRGGBB" scurito
//  DOVE SI USA: bordi, testo, contrasti, effetti di profondità.
// --------------------------------------------------------------
export const darkenColor = (hex, percent = 20) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const p = Math.min(100, Math.max(0, percent)) / 100;
  return rgbToHex(
    rgb.r * (1 - p),
    rgb.g * (1 - p),
    rgb.b * (1 - p)
  );
};

// --------------------------------------------------------------
// blendColors(color1, color2, ratio)
// --------------------------------------------------------------
//  COSA FA: fonde due colori in base a un rapporto (0..1).
//  INPUT:  - color1, color2 → "#RRGGBB"
//           - ratio → 0 = solo color1, 1 = solo color2
//  OUTPUT: string "#RRGGBB"
//  DOVE SI USA: gradienti, grafici, transizioni.
// --------------------------------------------------------------
export const blendColors = (color1, color2, ratio = 0.5) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  const r = c1.r + (c2.r - c1.r) * ratio;
  const g = c1.g + (c2.g - c1.g) * ratio;
  const b = c1.b + (c2.b - c1.b) * ratio;
  return rgbToHex(r, g, b);
};

// --------------------------------------------------------------
// getTextColorForBg(bgColor)
// --------------------------------------------------------------
//  COSA FA: restituisce il colore del testo leggibile (nero o bianco)
//           in base alla luminosità dello sfondo.
//  INPUT:  - bgColor → "#RRGGBB"
//  OUTPUT: "#000000" | "#FFFFFF"
//  DOVE SI USA: per testo su card o badge colorati.
// --------------------------------------------------------------
export const getTextColorForBg = (bgColor) => {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return "#000000";
  // calcola luminanza percepita (formula ITU-R BT.601)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? "#000000" : "#FFFFFF";
};

// --------------------------------------------------------------
// triageColorShade(level, variant)
// --------------------------------------------------------------
//  COSA FA: restituisce una variante del colore triage (più chiara o scura).
//  INPUT:  - level → string ("green" | "yellow" | "red" | "gray")
//           - variant → "light" | "dark" (default = "light")
//  OUTPUT: string "#RRGGBB"
//  DOVE SI USA: Timeline.jsx, PatientCard.jsx (sfondi graduati).
// --------------------------------------------------------------
export const triageColorShade = (level, variant = "light") => {
  const base = TRIAGE_COLORS[level] ?? "#9CA3AF";
  return variant === "light" ? lightenColor(base, 25) : darkenColor(base, 25);
};


// Mappa di colori e utilità per colorare score/timeline.

export const SCORE_COLORS = {
  ok: "#22c55e",       // verde
  yellow: "#eab308",
  warn: "#f59e0b",     // arancione
  bad: "#ef4444",      // rosso
  neutral: "#94a3b8",  // grigio
    gray:   "#9ca3af",
  blue:   "#1e40af",
};

// Restituisce un colore da percentuale (0–1).
export const colorFromPercent = (p) => {
  if (p == null) return SCORE_COLORS.neutral;
  if (p < 0.33) return SCORE_COLORS.ok;
  if (p < 0.66) return SCORE_COLORS.warn;
  return SCORE_COLORS.bad;
};

// Restituisce l'HEX a partire dal nome (o ritorna l'HEX se passi già "#...")
export const colorHexFromName = (name) => {
  if (!name) return SCORE_COLORS.gray;
  const n = String(name).trim().toLowerCase();

  // se è già un colore HEX, lo riuso
  if (n.startsWith("#")) return name;

  // se è un nome che conosco, mappo
  if (SCORE_COLORS[n]) return SCORE_COLORS[n];

  // fallback elegante
  return SCORE_COLORS.gray;
};