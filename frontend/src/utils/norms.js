
// ======================================================================
// Utility GENERICHE per parsing di norme e pesi.
// Riutilizzabili in più widget o moduli (non solo Patient).
// ======================================================================

/**
 * --------------------------------------------------------------
 * normalizeKey(key)
 * --------------------------------------------------------------
 *  COSA FA: normalizza una chiave (lowercase, trim, spazi→underscore).
 *  INPUT:  - key → stringa chiave
 *  OUTPUT: stringa normalizzata (es. "Urea Pre" → "urea_pre")
 *  DOVE SI USA: funzioni di parsing in questo file, e in altri moduli.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const normalizeKey = (key) =>
  String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

/**
 * --------------------------------------------------------------
 * parseNormsMap(norms)
 * --------------------------------------------------------------
 *  COSA FA: trasforma un array o oggetto di norme in una mappa
 *           standardizzata { key: {min, max} }.
 *  INPUT:  - norms → array di norme o oggetto (dipende da fonte)
 *  OUTPUT: oggetto { [key]: {min,max} }
 *  DOVE SI USA: PatientCard.jsx (Effect 5), ma anche potenzialmente
 *               in altri moduli che devono applicare range numerici.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const parseNormsMap = (norms) => {
  if (!norms) return {};
  const out = {};

  if (Array.isArray(norms)) {
    // Caso array di oggetti: [{ key, min, max }, ...]
    for (const n of norms) {
      const key = normalizeKey(n.key ?? n.prop ?? n.name);
      if (!key) continue;
      out[key] = {
        min: n.min ?? null,
        max: n.max ?? null,
      };
    }
  } else if (typeof norms === "object") {
    // Caso oggetto già strutturato
    for (const [key, v] of Object.entries(norms)) {
      out[normalizeKey(key)] = {
        min: v.min ?? null,
        max: v.max ?? null,
      };
    }
  }

  return out;
};

/**
 * --------------------------------------------------------------
 * parseWeightsMap(weights)
 * --------------------------------------------------------------
 *  COSA FA: converte un oggetto o array di pesi in una mappa { key: weight }.
 *  INPUT:  - weights → array/oggetto di pesi
 *  OUTPUT: oggetto { [key]: weight }
 *  DOVE SI USA: PatientCard.jsx (Effect 4), ma anche in altri moduli.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const parseWeightsMap = (weights) => {
  if (!weights) return {};
  const out = {};

  if (Array.isArray(weights)) {
    for (const w of weights) {
      const key = normalizeKey(w.key ?? w.prop ?? w.name);
      if (!key) continue;
      out[key] = w.weight ?? null;
    }
  } else if (typeof weights === "object") {
    for (const [k, v] of Object.entries(weights)) {
      out[normalizeKey(k)] = Number(v);
    }
  }

  return out;
};
