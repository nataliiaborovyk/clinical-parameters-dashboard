
// ======================================================================
// Utility GENERICHE per ottenere "Property Stats" (riutilizzabili).
// Non dipendono dal widget Patient. Nessuna chiamata diretta a UI.
// ----------------------------------------------------------------------
// Strategie di fetch:
// 1) Prova a usare il servizio reale getPropertyStats (services/statsApi.js).
// 2) Se il servizio non è disponibile o fallisce → fallback su MOCK locale.
// ======================================================================




/**
 * --------------------------------------------------------------
 * fetchPropertyStats(propertyName)
 * --------------------------------------------------------------
 *  COSA FA: recupera le statistiche della proprietà indicata.
 *           - Se disponibile il servizio reale → usa getPropertyStats(prop).
 *           - Altrimenti → ritorna un MOCK coerente per sviluppo/offline.
 *  INPUT:  - propertyName → string (es. "urea_pre")
 *  OUTPUT: oggetto stats { name, count, mean, min, max, stdev, histogram, ... }
 *  DOVE SI USA: PropertyStatsWidget (e widget simili).
 *  API USATE: se presente, '@/services/statsApi.getPropertyStats'.
 * --------------------------------------------------------------
 */
export async function fetchPropertyStats(propertyName) {
  if (!propertyName) {
    throw new Error("fetchPropertyStats: 'propertyName' mancante");
  }

  // 1) Prova il servizio reale
  if (typeof getPropertyStatsService === "function") {
    try {
      const stats = await getPropertyStatsService(propertyName);  // chiama API reale
      if (stats) return stats;                                    // se ok → ritorna
    } catch (e) {
      console.warn("[statsUtil] Servizio reale indisponibile, uso MOCK:", e?.message || e);
      // continua con mock
    }
  }

  // 2) MOCK di fallback — numeri plausibili per UI
  return buildMockStats(propertyName);
}

/**
 * --------------------------------------------------------------
 * fetchAllPropertyNames(ontologyOptional)
 * --------------------------------------------------------------
 *  COSA FA: restituisce la lista dei "nomi proprietà" disponibili.
 *           - Se fornisci l'ontologia (già caricata) → estrae le chiavi.
 *           - Altrimenti → ritorna una piccola lista MOCK.
 *  INPUT:  - ontologyOptional → oggetto ontologia (se già in memoria)
 *  OUTPUT: array di stringhe (nomi proprietà)
 *  DOVE SI USA: combobox/ricerche nelle viste di statistiche.
 *  API USATE: nessuna (usa ontologia in memoria, se disponibile).
 * --------------------------------------------------------------
 */
export async function fetchAllPropertyNames(ontologyOptional) {
  if (ontologyOptional && typeof ontologyOptional === "object") {
    const props = extractPropNamesFromOntology(ontologyOptional); // estrae dal modello
    if (props.length) return props;
  }
  // fallback: lista di esempio
  return ["urea_pre", "urea_post", "peso", "ktv", "emoglobina"];
}

// --------------------------------------------------------------
// buildMockStats(name)
// --------------------------------------------------------------
//  COSA FA: crea un oggetto "stats" fittizio ma coerente per UI.
//  INPUT:  - name → nome proprietà (string)
//  OUTPUT: oggetto stats
//  DOVE SI USA: fallback in fetchPropertyStats quando servizio non c'è.
// --------------------------------------------------------------
function buildMockStats(name) {
  // Numeri fittizi deterministici a partire dal nome (hash semplice):
  const seed = [...String(name)].reduce((s, ch) => s + ch.charCodeAt(0), 0); // somma char codes
  const rand = (min, max) => {
    const x = (Math.sin(seed) + 1) / 2; // pseudo-random deterministico (0..1)
    return Math.round((min + x * (max - min)) * 100) / 100;
  };

  const count = 50 + (seed % 50);                   // 50..99
  const min = rand(10, 60);                         // range mock
  const max = rand(80, 200);
  const mean = Math.round(((min + max) / 2) * 100) / 100;
  const stdev = Math.round(((max - min) / 6) * 100) / 100;

  // Histogram: 10 bin fittizi
  const histogram = Array.from({ length: 10 }).map((_, i) => ({
    binStart: Math.round((min + (i * (max - min)) / 10) * 100) / 100,
    binEnd:   Math.round((min + ((i + 1) * (max - min)) / 10) * 100) / 100,
    count: Math.floor(count / 10) + ((i === 4) ? Math.floor(count * 0.1) : 0), // piccolo picco centrale
  }));

  return {
    name,
    count,
    mean,
    min,
    max,
    stdev,
    histogram,
  };
}

// --------------------------------------------------------------
// extractPropNamesFromOntology(ontology)
// --------------------------------------------------------------
//  COSA FA: helper per estrarre i nomi proprietà da un oggetto ontologia.
//  INPUT:  - ontology → oggetto con struttura { properties: [{ key|name|id }, ...], ... }
//  OUTPUT: array di stringhe (chiavi proprietà) — vuoto se non ricavabile.
//  DOVE SI USA: fetchAllPropertyNames (se passi l'ontologia).
// --------------------------------------------------------------
export function extractPropNamesFromOntology(ontology) {
  try {
    const list = ontology?.properties || ontology?.props || [];
    const names = list
      .map((p) => p?.key ?? p?.name ?? p?.id)
      .filter(Boolean)
      .map((s) =>
        String(s).trim().toLowerCase().replace(/\s+/g, "_")
      );
    return Array.from(new Set(names)).sort();
  } catch {
    return [];
  }
}
