
// ======================================================================
// Costanti globali di dominio e UI.
// Raccoglie colori, livelli di triage, e valori di default condivisi.
// Nessuna logica → solo oggetti e valori riutilizzabili.
// ======================================================================

// --------------------------------------------------------------
// TRIAGE_COLORS
// --------------------------------------------------------------
//  COSA FA: mappa i livelli di triage (clinico o UI) su colori standardizzati.
//  DOVE SI USA: PatientCard.jsx, PropertyStatsWidget.jsx, Timeline.jsx, ecc.
// --------------------------------------------------------------
export const TRIAGE_COLORS = {
  green: "#10B981",   // Verde  → stato buono
  yellow: "#FBBF24",  // Giallo → attenzione / intermedio
  red: "#EF4444",     // Rosso  → grave / alto rischio
  gray: "#9CA3AF",    // Grigio → neutro / n.d.
};

// --------------------------------------------------------------
// TRIAGE_LEVELS
// --------------------------------------------------------------
//  COSA FA: enum/logical order dei livelli di triage per UI e logica.
//  DOVE SI USA: mapping e comparazioni di severità.
// --------------------------------------------------------------
export const TRIAGE_LEVELS = ["green", "yellow", "red"];

// --------------------------------------------------------------
// COLOR_NEUTRAL / COLOR_BG / COLOR_TEXT
// --------------------------------------------------------------
//  COSA FANNO: palette base condivisa per tutti i componenti UI.
//  DOVE SI USANO: CSS inline o grafici (es. Chart.js, Recharts).
// --------------------------------------------------------------
export const COLOR_NEUTRAL = "#9CA3AF";  // colore neutro base
export const COLOR_BG = "#F9FAFB";       // sfondo chiaro
export const COLOR_TEXT = "#111827";     // testo principale

// --------------------------------------------------------------
// DEFAULT_PERIOD_DAYS
// --------------------------------------------------------------
//  COSA FA: numero di giorni da mostrare di default in timeline o grafici.
//  DOVE SI USA: PatientCard.jsx, Timeline.jsx, parametri di API getHistory.
// --------------------------------------------------------------
export const DEFAULT_PERIOD_DAYS = 30;

// --------------------------------------------------------------
// SCORE_THRESHOLDS
// --------------------------------------------------------------
//  COSA FA: valori di soglia per interpretare score clinici o KPI.
//  DOVE SI USA: logiche di colorazione / triage / valutazione punteggio.
// --------------------------------------------------------------
export const SCORE_THRESHOLDS = {
  low: 0.33,       // fino a 33% → livello basso
  medium: 0.66,    // 34–66% → medio
  high: 1.0,       // >66% → alto
};

// --------------------------------------------------------------
// NORM_DEFAULT
// --------------------------------------------------------------
//  COSA FA: norma vuota/placeholder da usare come fallback.
//  DOVE SI USA: funzioni getNormaForFromMaps (utilsPatient.js) e altrove.
// --------------------------------------------------------------
export const NORM_DEFAULT = { min: null, max: null };

// --------------------------------------------------------------
// DEBUG_FLAGS
// --------------------------------------------------------------
//  COSA FA: flag centralizzati per attivare log/debug UI.
//  DOVE SI USA: durante sviluppo, utile nei useEffect complessi.
// --------------------------------------------------------------
export const DEBUG_FLAGS = {
  timeline: false,
  triage: false,
  norms: false,
};
