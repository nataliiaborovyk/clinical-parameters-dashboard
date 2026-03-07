
// ======================================================================
// Utility GENERICA per ottenere l'etichetta leggibile di una proprietà.
// Riutilizzabile in qualsiasi widget (Patient, PropertyStats, grafici, ecc.).
// Nessuna chiamata API: lavora su chiavi locali.
// ======================================================================

/**
 * --------------------------------------------------------------
 * normalizeKeyLocal(k)
 * --------------------------------------------------------------
 *  COSA FA: normalizza una chiave localmente (minuscole, trim, spazi→underscore).
 *  INPUT:  - k → string
 *  OUTPUT: string normalizzata (es. "Vascular Access" → "vascular_access")
 *  DOVE SI USA: all'interno di propertyLabel per rendere robusto il lookup.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
const normalizeKeyLocal = (k) =>
  String(k ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

/**
 * --------------------------------------------------------------
 * humanizeKey(k)
 * --------------------------------------------------------------
 *  COSA FA: crea un fallback leggibile da una chiave tecnica:
 *           - sostituisce "_" con spazio
 *           - mette iniziale maiuscola
 *           - mantiene eventuali suffissi tipo unità (se già presenti)
 *  INPUT:  - k → string
 *  OUTPUT: string (es. "urea_pre" → "Urea pre")
 *  DOVE SI USA: come fallback quando la chiave non è mappata.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
const humanizeKey = (k) => {
  const s = String(k ?? "").replace(/_/g, " ").trim(); // "urea_pre" → "urea pre"
  if (!s) return "";                                   // se vuoto → stringa vuota
  return s.charAt(0).toUpperCase() + s.slice(1);       // "urea pre" → "Urea pre"
};

/**
 * Mappa di base chiave → etichetta.
 * - Mantieni qui le mappature "ufficiali" del progetto.
 * - Puoi estenderla in futuro aggiungendo voci senza rompere compatibilità.
 *
 * Nota: le chiavi sono lasciate nella forma originale per preservare
 * eventuali MAIUSCOLE/underscore che già usi nel resto del codice.
 */
const BASE_MAP = {
  PAS_sistolica_mmHg: "PAS sistolica (mmHg)",
  PAD_diastolica_mmHg: "PAD diastolica (mmHg)",
  FC_bpm: "Frequenza cardiaca (bpm)",
  // aggiungi qui altre mappature ufficiali...
};

/**
 * Versione normalizzata della mappa (per lookup più tollerante).
 * Esempio:
 *   "PAS_sistolica_mmHg" → "pas_sistolica_mmhg"
 *   così possiamo trovare la label anche se qualcuno passa la chiave
 *   in minuscolo o con spazi.
 */
const NORMALIZED_MAP = Object.fromEntries(
  Object.entries(BASE_MAP).map(([k, v]) => [normalizeKeyLocal(k), v])
);

/**
 * --------------------------------------------------------------
 * propertyLabel(key, customMap)
 * --------------------------------------------------------------
 *  COSA FA: restituisce l'etichetta leggibile per una proprietà.
 *           Ordine di ricerca:
 *            1) customMap (se fornita) con chiave originale
 *            2) customMap con chiave normalizzata
 *            3) BASE_MAP con chiave originale
 *            4) NORMALIZED_MAP con chiave normalizzata
 *            5) fallback "humanize" della chiave
 *  INPUT:  - key       → string (nome proprietà es. "urea_pre")
 *          - customMap → (opzionale) oggetto { chiave: "Etichetta" } per override locale
 *  OUTPUT: string (etichetta leggibile)
 *  DOVE SI USA: ovunque si debba mostrare una label utente (tabelle, widget).
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const propertyLabel = (key, customMap) => {
  const k = String(key ?? "");
  const kn = normalizeKeyLocal(k); // chiave normalizzata per ricerche più robuste

  // 1) customMap (se fornita)
  if (customMap && typeof customMap === "object") {
    if (customMap[k]) return customMap[k];     // match esatto chiave originale
    if (customMap[kn]) return customMap[kn];   // match sulla normalizzata
  }

  // 2) base map ufficiale
  if (BASE_MAP[k]) return BASE_MAP[k];         // match esatto
  if (NORMALIZED_MAP[kn]) return NORMALIZED_MAP[kn]; // match normalizzato

  // 3) fallback generico
  return humanizeKey(k) || k; // es. "urea_pre" → "Urea pre"; se vuoto, torna la chiave così com'è
};
