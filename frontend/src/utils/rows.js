
// ======================================================================
// Utility GENERICHE di normalizzazione e lookup (riutilizzabili)
// Non contengono semantica “Patient” (niente alias di dominio).
// ======================================================================

/**
 * --------------------------------------------------------------
 * normalizeKeyGeneric(k)
 * --------------------------------------------------------------
 *  COSA FA: normalizza una chiave: trim, lowercase, spazi→underscore.
 *  INPUT:  - k → string
 *  OUTPUT: string
 *  DOVE SI USA: ovunque serva confrontare chiavi in modo robusto.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const normalizeKeyGeneric = (k) =>
  String(k ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

/**
 * --------------------------------------------------------------
 * getByNormalizedAliases(obj, aliasesOrName)
 * --------------------------------------------------------------
 *  COSA FA: dato un oggetto “piatto” (es. meta) prova una lista di chiavi
 *           candidate (o singolo nome) cercando sia la chiave normalizzata
 *           sia la chiave grezza. Restituisce il primo valore definito.
 *  INPUT:  - obj            → oggetto sorgente (es. { "Vascular Access": "FAV", ... })
 *          - aliasesOrName  → string | string[] (candidati da provare in ordine)
 *  OUTPUT: qualsiasi valore definito oppure undefined.
 *  DOVE SI USA: funzioni consumer di alto livello (anche non-Patient).
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const getByNormalizedAliases = (obj, aliasesOrName) => {
  if (!obj || typeof obj !== "object") return undefined;                       // guard clause
  const candidates = Array.isArray(aliasesOrName) ? aliasesOrName : [aliasesOrName]; // normalizza input
  // costruisci una vista con chiavi normalizzate
  const normalized = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [normalizeKeyGeneric(k), v])
  );
  for (const name of candidates) {
    const nk = normalizeKeyGeneric(name);                                      // nome normalizzato
    if (normalized[nk] != null) return normalized[nk];                         // preferisci match normalizzato
    if (obj[name] != null) return obj[name];                                   // fallback su chiave grezza
  }
  return undefined;                                                             // niente match
};
