// ======================================================================
// utilsPatient.js — Raccolta di utility PURE per la PatientCard
// ----------------------------------------------------------------------
//  DOVE VA USATO
//   - PatientCard.jsx
//   - (Opzionale) riutilizzabile in altri widget del PatientModule.
//
//  OBIETTIVO
//   - Tenere fuori da PatientCard.jsx la logica "non-UI":
//     * normalizzazione risposta /patients/triage
//     * trasformazioni sulle mappe delle misure
//     * utilità per timeline e colori
//     * calcolo bounds dello storico
//
//  API / DATI A CUI SI RIFERISCE
//   - /patients/triage (postPatientTriage): la funzione normalizeTriageResponse
//     accetta la risposta grezza e la porta a un formato uniforme.
//   - /patients/get (postPatientsGet): funzioni per ricavare bounds e liste
//     dai campi measurements / triages della risposta.
//
//  DIPENDENZE
//   - Usa solo utils generali del progetto.
// ======================================================================

// Funzioni presenti  → e dove vengono usati
// -----------------------------------------------------------------------------

// normalizeTriageResponse(...) → dentro l’useEffect che chiama /patients/triage.

// mergeRowWeights(...) → subito dopo la normalizzazione, per aggiungere i pesi dalle norme.

// toLegacyMeasList(...) → memorizzata con useMemo per le viste legacy.

// buildTimelineMap(...) e getScoreHexForDate(...) → per calcolare timelineMap e scoreHex.

// lastIntervalValueForKey(...) → come fallback per FAV / vascular_access_type.

// calcHistoryBoundsFromMeasurements(...) → per calcolare historyBounds.

// makePeriodFromDaysBack(...) → per costruire period nel payload del triage.

// getNormaForFromMaps(...) → per implementare il  getNormaFor(...) in modo pulito.

// collectUniqueProps(...) → per ricavare l’elenco di prop da chiedere a getPropertyStats.
//--------------------------------------------------------------------------------






  // --- Helpers data locali (per compat vecchia) ---
      
  /** true se stringa nel formato YYYY-MM-DD */
  export const isISODate = (s) =>
    typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

  /** normalizza in stringa YYYY-MM-DD (accetta Date o stringa ISO) */
  export const toISO = (d) => {
    if (d instanceof Date && !isNaN(d)) {
      // pad a 2 cifre
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${mm}-${dd}`;
    }
    if (isISODate(d)) return d;
    // tenta parse robusto
    const t = new Date(d);
    if (!isNaN(t)) return toISO(t);
    // fallback: oggi
    const today = new Date();
    return toISO(today);
  };

// --------------------------------------------------------------
// unwrapData(resp)
// --------------------------------------------------------------
//  COSA FA: estrae il "payload" reale sia se la risposta è {data: ...}
//            sia se è già l'oggetto diretto.
//  DOVE SI USA: chiamato internamente qui; può essere utile altrove.
// --------------------------------------------------------------
export const unwrapData = (resp) => {
  // resp?.data ?? resp  // ← sintassi compatta; teniamo leggibile:
  return (resp && resp.data) ? resp.data : resp; // restituisce l'oggetto 'vero'
}; // Fine unwrapData

// --------------------------------------------------------------
// normalizeTriageResponse(resp, dateISO)
// --------------------------------------------------------------
//  COSA FA: normalizza la risposta dell'API /patients/triage in un
//             oggetto coerente { score, colorHex, detailsRows: [...] }.
//  INPUT:  - resp     → risposta grezza dell'API
//           - dateISO  → stringa 'YYYY-MM-DD' per log/debug e fallback
//  OUTPUT: oggetto triage normalizzato oppure null.
//  DOVE SI USA: PatientCard.jsx, nell'useEffect che chiama postPatientTriage.
// --------------------------------------------------------------
export const normalizeTriageResponse = (resp, dateISO) => {
  const root = unwrapData(resp);                                        // estrae payload reale
  // La risposta del backend può esporre il triage in forme diverse:
  const t =
    (root && root.triages && root.triages.values && root.triages.values[dateISO]) ??
    root?.triage ??
    root?.result ??
    root?.data?.triage ??
    null;

  if (!t) {
    // Nessun triage disponibile per quella data → ritorna null
    return null;
  }

  // Score può essere [0..1] o già percentuale → portiamolo a % intera
  let score = t.score;
  if (typeof score === "number") {
    score = score <= 1 ? Math.round(score * 100) : Math.round(score);   // 0.72 → 72
  } else {
    score = null;                                                        // se non numerico → n/d
  }

  // Colore principale della card (fallback grigio elegante)
  const colorHex = "#9CA3AF";

  // Normalizziamo la tabella "rows" dei dettagli
  const rawRows = Array.isArray(t?.details?.rows) ? t.details.rows : []; // se manca, vuoto
  const rows = rawRows.map((r) => {
    const key = r.prop || r.key || r.parameter || r.name;                // uniforma nome chiave
    const agg = {
      avg: r.avg ?? (typeof r.value === "number" ? r.value : null),      // valore medio/fallback
      min: r.min ?? null,
      max: r.max ?? null,
    };
    // Target/norma come range [min,max] se presente
    const target = Array.isArray(r.target) && r.target.length === 2
      ? { min: r.target[0], max: r.target[1] }
      : { min: null, max: null };

    return {
      key,                                                               // es. "urea_pre"
      label: r.label || key,                                             // etichetta visiva
      aggregate: "avg",                                                  // default in tabella
      value: (typeof r.value === "number") ? r.value
            : (typeof r.avg   === "number") ? r.avg
            : null,                                                       // valore corrente mostrato
      scorePercent: (typeof r.score === "number") ? r.score : null,      // punteggio riga se c'è
      scoreColorHex: (typeof r.color === "string") ? r.color : "#9CA3AF",// colore riga
      weight: r.weight ?? null,                                          // peso (se definito da CDR)
      stats: r.stats || (r.count != null ? { count: r.count } : undefined), // metadati eventuali
      periodRaw: r.periodRaw || [],                                      // timeline grezza (se inviata)
      timelineRaw: r.timelineRaw || [],
      _normaFromRow: target,                                             // norma ricavata da "target"
      _agg: agg,                                                         // mappa per avg/min/max
    };
  });

  return { colorName: null, colorHex, score, detailsRows: rows };        // oggetto normalizzato


}; // Fine normalizeTriageResponse

// --------------------------------------------------------------
// toLegacyMeasList(measMap)
// --------------------------------------------------------------
//  COSA FA: converte la mappa delle misure {prop: { "from/to": ... }}
//             in una lista di giorni [{date: 'YYYY-MM-DD'}, ...].
//             Utile per componenti legacy che aspettano un array di date.
//  DOVE SI USA: PatientCard.jsx (memo legacyMeasList).
// --------------------------------------------------------------
export const toLegacyMeasList = (measMap) => {
  if (!measMap || typeof measMap !== "object") return [];                // guard clause
  const days = new Set();                                                // evita duplicati
  Object.values(measMap).forEach((intervalMap) => {
    Object.keys(intervalMap || {}).forEach((interval) => {
      const [from, to] = String(interval).split("/");                    // "2025-01-01/2025-01-15"
      if (from) days.add(from.slice(0, 10));                             // prende solo YYYY-MM-DD
      if (to)   days.add(to.slice(0, 10));
    });
  });
  return [...days].sort().map((d) => ({ date: d }));                     // array ordinato
}; // Fine toLegacyMeasList


// Mappa di colori e utilità per colorare score/timeline.

export const SCORE_COLORS = {
  ok:    "#22c55e",       // verde
  yellow: "#eab308",
  warn:    "#f59e0b",     // arancione
  bad:    "#ef4444",      // rosso
  neutral: "#94a3b8",      // grigio
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



// --------------------------------------------------------------
// colorByTriage(triageHistoryMap, dayISO, fallbackColor)
// --------------------------------------------------------------
//  COSA FA: restituisce il colore (hex) in base allo score del triage
//             nella data indicata. Usa colorFromPercent(score).
//  DOVE SI USA: (Opzionale) se vuoi colorare punti timeline/etichette.
// --------------------------------------------------------------
export const colorByTriage = (triageHistoryMap, dayISO, fallbackColor = "#ccc") => {
  const t = triageHistoryMap?.[dayISO];                                  // triage del giorno
  return colorFromPercent(t?.score ?? null) || fallbackColor;            // mappa score→colore
}; // Fine colorByTriage


// --------------------------------------------------------------
// lastIntervalValueForKey(measMap, key)
// --------------------------------------------------------------
//  COSA FA: per una proprietà (es. "vascular_access_type") prende
//             l'ULTIMO intervallo (alfabeticamente → più recente) e
//             restituisce il suo valore grezzo.
//  DOVE SI USA: PatientCard.jsx (fallback per campi come FAV, VA type).
// --------------------------------------------------------------
export const lastIntervalValueForKey = (measMap, key) => {
  if (!measMap || typeof measMap !== "object") return null;              // nessuna misura
  const intervals = measMap[key];                                        // mappa "from/to" → valore
  if (!intervals || typeof intervals !== "object") return null;          // proprietà assente
  const last = Object.keys(intervals).sort().pop();                      // ultimo intervallo
  return last ? intervals[last] : null;                                  // valore dell'ultimo
}; // Fine lastIntervalValueForKey

// --------------------------------------------------------------
// calcHistoryBoundsFromMeasurements(ms)
// --------------------------------------------------------------
//  COSA FA: calcola i bounds temporali {from, to} presenti in una
//             mappa measurements (minimo "from" e massimo "to").
//  DOVE SI USA: PatientCard.jsx (per mostrare il range della timeline).
// --------------------------------------------------------------
export const calcHistoryBoundsFromMeasurements = (ms) => {
  let minDate = null;                                                    // data minima trovata
  let maxDate = null;                                                    // data massima trovata
  if (ms && typeof ms === "object") {
    Object.values(ms).forEach((intervalMap) => {
      Object.keys(intervalMap || {}).forEach((interval) => {
        const [from, to] = String(interval).split("/");                  // "YYYY-MM-DD/YYYY-MM-DD"
        if (from && (!minDate || from < minDate)) minDate = from;        // aggiorna min
        if (to   && (!maxDate || to > maxDate))   maxDate = to;          // aggiorna max
      });
    });
  }
  return (minDate || maxDate) ? { from: minDate, to: maxDate } : null;   // null se vuoto
}; // Fine calcHistoryBoundsFromMeasurements

// --------------------------------------------------------------
// makePeriodFromDaysBack(dateISO, daysBack)
// --------------------------------------------------------------
//  COSA FA: dato un giorno (YYYY-MM-DD) e un numero di giorni indietro,
//             calcola { from, to } ISO (solo data, no orario).
//  DOVE SI USA: PatientCard.jsx quando costruisce il payload /patients/triage.
// --------------------------------------------------------------
export const makePeriodFromDaysBack = (dateISO, daysBack = 30) => {
  const to = dateISO;                                                    // data finale
  const from = new Date(new Date(dateISO).getTime() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);                                                       // taglia a "YYYY-MM-DD"
  return { from, to };                                                   // periodo calcolato
}; // Fine makePeriodFromDaysBack

// --------------------------------------------------------------
// mergeRowWeights(rows, weightsMap)
// --------------------------------------------------------------
//  COSA FA: aggiunge/aggiorna il campo 'weight' di ogni riga dettaglio
//             usando una mappa di pesi (es. ricavata dalle norme).
//  DOVE SI USA: PatientCard.jsx (dopo normalizeTriageResponse).
// --------------------------------------------------------------
export const mergeRowWeights = (rows, weightsMap) => {
  if (!Array.isArray(rows)) return rows || [];                           // se non è array → ritorna com'è
  const wm = weightsMap || {};                                           // mappa pesi o vuota
  return rows.map((r) => {
    const w = r.weight ?? wm[r.key] ?? null;                             // preferisci peso riga, sennò mappa
    return { ...r, weight: w };                                          // nuova riga con weight normalizzato
  });
}; // Fine mergeRowWeights

// --------------------------------------------------------------
// getNormaForFromMaps(paramKey, rows, normsMap)
// --------------------------------------------------------------
//  COSA FA: calcola la norma {min,max} per una proprietà combinando:
//           1) target/norma dalla riga triage (se presente in _normaFromRow)
//           2) mappa globale delle norme (chiave raw)
//           3) mappa globale con chiave normalizzata (fallback robusto)
//  INPUT:  - paramKey → string (es. "urea_pre")
//           - rows     → array di righe triage (selectedTriage.detailsRows)
//           - normsMap → { key: {min,max} } (da parseNormsMap/getNormsJson)
//  OUTPUT: { min, max }  (se non trovata → {min:null, max:null})
//  DOVE SI USA: PatientCard.jsx (passato alla ParametersTable come getNormaFor)
//  API USATE: nessuna.
// --------------------------------------------------------------


export const getNormaForFromMaps = (paramKey, rows, normsMap) => {
  if (!paramKey) return { min: null, max: null };

  const keyRaw = String(paramKey).trim();
  const keyNorm = normalizeKey(keyRaw);

  // 1) prova dalla riga triage (accetta sia key sia prop; match normalizzato)
  const r = (Array.isArray(rows) ? rows : []).find((x) => {
    const rk = x?.key ?? x?.prop ?? x?.parameter ?? x?.name;
    return rk && normalizeKey(String(rk)) === keyNorm;
  });
  if (r && r._normaFromRow && (r._normaFromRow.min != null || r._normaFromRow.max != null)) {
    return { min: r._normaFromRow.min ?? null, max: r._normaFromRow.max ?? null };
  }

  // 2) prova dalla mappa norme "così com'è" (chiave raw)
  const map = normsMap || {};
  const nRaw = map[keyRaw];
  if (nRaw && (nRaw.min != null || nRaw.max != null)) {
    return { min: nRaw.min ?? null, max: nRaw.max ?? null };
  }

  // 3) prova con chiave normalizzata (spazi/underscore/maiuss)
  const nNorm = map[keyNorm];
  if (nNorm && (nNorm.min != null || nNorm.max != null)) {
    return { min: nNorm.min ?? null, max: nNorm.max ?? null };
  }

  // 4) fallback: nessuna norma trovata
  return { min: null, max: null };
};


// --------------------------------------------------------------
// collectUniqueProps(rows)
// --------------------------------------------------------------
//  COSA FA: ritorna la lista delle proprietà (prop/key) uniche presenti
//             nelle righe di dettaglio — utile per pre-caricare statistiche.
//  DOVE SI USA: PatientCard.jsx (useEffect che chiama getPropertyStats).
// --------------------------------------------------------------
export const collectUniqueProps = (rows) => {
  if (!Array.isArray(rows)) return [];                                  // nessuna riga
  const unique = new Set(
    rows.map((r) => r.prop || r.key).filter(Boolean)                     // prendi 'prop' o 'key' se esiste
  );
  return [...unique];                                                   // array di stringhe uniche
}; // Fine collectUniqueProps



// --------------------------------------------------------------
// getPatientSeriesFromPatientsData(patientId, patientsData)
// --------------------------------------------------------------
//  COSA FA: estrae la serie cronologica di misure di UN paziente
//           a partire da un JSON "patientsData" (con struttura
//           { patients: [{ id, measurements: [{date, ...}, ...] }, ...] }).
//           Restituisce la lista ordinata per data ascendente.
//  INPUT:  - patientId     → id del paziente (string/number accettati)
//          - patientsData  → oggetto con chiave .patients (array)
//  OUTPUT: array ordinato di record misura del paziente (può essere [] se non trovati)
//  DOVE SI USA: widget Patient (es. per alimentare grafici o viste cronologiche).
//  API USATE: nessuna (lavora su dati già presenti in memoria).
// --------------------------------------------------------------
export const getPatientSeriesFromPatientsData = (patientId, patientsData) => {
  // patientsData: oggetto sorgente — usato in tutto il Patient Module quando
  // vogliamo estrarre le misure di un singolo paziente.
  if (!patientsData || !Array.isArray(patientsData.patients)) return [];             // se manca struttura attesa → []
  const pid = String(patientId);                                                     // normalizza id a stringa (confronto robusto)
  const p = patientsData.patients.find((x) => String(x.id) === pid);                 // cerca il paziente per id
  if (!p || !Array.isArray(p.measurements)) return [];                               // se non ha misure → []
  // Ordina le misure per data ISO crescente. Usare String(...).localeCompare preserva l’ordine lessicografico ISO.
  return [...p.measurements].sort((a, b) => String(a.date).slice(0,10).localeCompare(String(b.date).slice(0,10)));
};


// --------------------------------------------------------------
// normalizzaNomeChiave(name)
// --------------------------------------------------------------
//  COSA FA: normalizza una chiave (trim, lowercase, spazi→underscore)
//  INPUT:  - name → stringa chiave
//  OUTPUT: stringa normalizzata (es. "Vascular Access" → "vascular_access")
//  DOVE SI USA: funzioni Patient-specific sotto, per confrontare chiavi.
// --------------------------------------------------------------
const normalizzaNomeChiave = (name) =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

// --------------------------------------------------------------
// PATIENT_ALIASES — mappa alias per chiavi frequenti nel dominio paziente
// --------------------------------------------------------------
//  COSA FA: definisce insiemi di alias equivalenti (stessa semantica) per
//           aiutare il lookup in strutture eterogenee (rows, measMap, meta).
//  DOVE SI USA: getFromRowsFlexible / getFromMeasMapFlexible / getFromPatientMetaFlexible
// --------------------------------------------------------------
const PATIENT_ALIASES = {
  vascular_access_type: [
    "vascular_access_type",
    "vascular_access",
    "va_type",
    "access_type",
    "vasc_access_type",
    "tipo_accesso_vascolare",
  ],
  fav: ["fav", "FAV", "fistula", "fistola", "fistola_artero_venosa"],
};

// --------------------------------------------------------------
// risolviAlias(nameOrNames)
// --------------------------------------------------------------
//  COSA FA: a partire da un nome (o array di nomi), costruisce la lista di
//           chiavi candidate includendo gli alias paziente.
//  INPUT:  - nameOrNames → string | string[]
//  OUTPUT: array di stringhe (candidate da provare in ordine)
// --------------------------------------------------------------
const risolviAlias = (nameOrNames) => {
  const base = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];  // normalizza input a array
  const out = [];
  for (const n of base) {
    const nk = normalizzaNomeChiave(n);
    const aliases = PATIENT_ALIASES[nk] || [n];
    for (const a of aliases) out.push(a);
  }
  return out;
};

// --------------------------------------------------------------
// getFromRowsFlexible(rows, nameOrNames)
// --------------------------------------------------------------
//  COSA FA: cerca un valore in un array "rows" del triage (righe dettagli).
//           Cerca sia per .key/.prop normalizzate sia, se serve, prende .value.
//  INPUT:  - rows        → array di righe triage (selectedTriage.detailsRows)
//           - nameOrNames→ chiave o lista di chiavi/alias da cercare
//  OUTPUT: qualsiasi valore trovato (es. string/number/bool) oppure undefined.
//  DOVE SI USA: PatientCard.jsx (blocchi metadati, tabella parametri).
//  API USATE: nessuna (dati già in memoria).
// --------------------------------------------------------------
export const getFromRowsFlexible = (rows, nameOrNames) => {
  if (!Array.isArray(rows)) return undefined;                                // se rows non è array → niente
  const candidates = risolviAlias(nameOrNames);                               // genera lista di alias
  // indicizza per chiave normalizzata per ricerche veloci
  const byKey = new Map();                                                    // mappa "key_norm" → riga
  for (const r of rows) {
    const k = r?.key ?? r?.prop ?? r?.parameter ?? r?.name;                   // diverse possibili proprietà
    if (!k) continue;
    byKey.set(normalizzaNomeChiave(k), r);                                    // indicizza per chiave normalizzata
  }
  // prova i candidati nell'ordine
  for (const c of candidates) {
    const kn = normalizzaNomeChiave(c);
    const row = byKey.get(kn);
    if (row) return row.value ?? row.avg ?? row.min ?? row.max ?? row;        // restituisce prima value, poi fallback
  }
  return undefined;
};

// --------------------------------------------------------------
// getFromMeasMapFlexible(measMap, nameOrNames)
// --------------------------------------------------------------
//  COSA FA: cerca un valore in una "mappa di misure" con intervalli,
//           compatibile con struttura /patients/get:
//           measMap = { propKey: { "YYYY-MM-DD/YYYY-MM-DD": any, ... }, ... }
//           Ritorna il valore dell'ULTIMO intervallo (più recente).
//  INPUT:  - measMap     → oggetto misure per proprietà
//           - nameOrNames→ chiave o lista chiavi/alias (es. "fav")
//  OUTPUT: valore dell'ultimo intervallo o undefined se assente.
//  DOVE SI USA: PatientCard.jsx (metadati FAV/VA come fallback).
//  API USATE: nessuna.
// --------------------------------------------------------------
export const getFromMeasMapFlexible = (measMap, nameOrNames) => {
  if (!measMap || typeof measMap !== "object") return undefined;              // guard clause
  const candidates = risolviAlias(nameOrNames);                               // alias possibili
  // normalizza mappa: key_norm → sotto-mappa intervalli
  const norm = {};
  for (const [k, v] of Object.entries(measMap)) {
    norm[normalizzaNomeChiave(k)] = v;
  }
  for (const c of candidates) {
    const kn = normalizzaNomeChiave(c);
    const intervals = norm[kn];
    if (intervals && typeof intervals === "object") {
      const last = Object.keys(intervals).sort().pop();                       // ultimo intervallo (alfabetico=più recente)
      if (last) return intervals[last];                                       // restituisce valore grezzo
    }
  }
  return undefined;
};

// --------------------------------------------------------------
// getFromPatientMetaFlexible(meta, nameOrNames)    
// --------------------------------------------------------------
//  COSA FA: cerca un valore dentro "patientMeta" con supporto alias.
//           Funziona bene quando patientMeta ha chiavi scritte in modi diversi.
//  INPUT:  - meta        → oggetto meta paziente (es. { FAV: true, vascular_access_type: "..." })
//           - nameOrNames→ chiave o lista chiavi/alias (es. ["FAV","fav"])
//  OUTPUT: valore trovato oppure undefined.
//  DOVE SI USA: PatientCard.jsx (metadati rapidi).
//  API USATE: nessuna.
// --------------------------------------------------------------
export const getFromPatientMetaFlexible = (meta, nameOrNames) => {
  if (!meta || typeof meta !== "object") return undefined;                    // meta mancante
  const candidates = risolviAlias(nameOrNames);                               // alias paziente
  // normalizzazione chiavi dell'oggetto meta (lookup robusto)
  const normalized = Object.fromEntries(
    Object.entries(meta).map(([k, v]) => [normalizzaNomeChiave(k), v])
  );
  for (const c of candidates) {
    const kn = normalizzaNomeChiave(c);
    if (normalized[kn] != null) return normalized[kn];                        // preferisci chiave normalizzata
    if (meta[c] != null) return meta[c];                                      // altrimenti chiave grezza
  }
  return undefined;
};


// --------------------------------------------------------------
// isOutOfNormRange(value, norma)
// --------------------------------------------------------------
//  COSA FA: determina se un valore numerico è fuori dal range di norma.
//  INPUT:  - value → numero da verificare
//           - norma → oggetto {min, max} (può avere un solo limite definito)
//  OUTPUT: boolean (true = fuori range)
//  DOVE SI USA: evidenziare celle tabella parametri nel PatientCard.
//  API USATE: nessuna.
// --------------------------------------------------------------
export const isOutOfNormRange = (value, norma) => {
  if (value == null || typeof value !== "number") return false;
  if (!norma || (norma.min == null && norma.max == null)) return false;
  if (norma.min != null && value < norma.min) return true;
  if (norma.max != null && value > norma.max) return true;
  return false;
};


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


/**
 * --------------------------------------------------------------
 * clampPeriodToDays(centerISO, daysBack)
 * --------------------------------------------------------------
 *  COSA FA: costruisce un periodo centrato su centerISO esteso di
 *           "daysBack" giorni all'indietro fino a centerISO come fine.
 *           Restituisce { start, end } in ISO per highlight UI (timeline).
 *  INPUT:  - selectedDate → "YYYY-MM-DD"
 *          - daysBack  → numero di giorni (es. 30)
 *  OUTPUT: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } | null
 *  DOVE SI USA: PatientCard.jsx per evidenziare il periodo nella Timeline.
 *  NOTE: per payload API che vogliono {from,to} usa makePeriodFromDaysBack
 *        (che abbiamo messo in utilsPatient.js).
 * --------------------------------------------------------------
 */
export const clampPeriodToDays = (selectedDate, days) => {
  const end = selectedDate instanceof Date ? new Date(selectedDate) : new Date(selectedDate);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
};

/**
 * --------------------------------------------------------------
 * toYYYYMMDD(input)
 * --------------------------------------------------------------
 *  COSA FA: converte un input (Date | string | number) in ISO "YYYY-MM-DD".
 *  INPUT:  - input → Date | string parsabile da new Date(...) | timestamp
 *  OUTPUT: "YYYY-MM-DD" | "" (se input non valido)
 *  DOVE SI USA: ovunque serva normalizzare una data per UI/payload.
 * --------------------------------------------------------------
 */
export const toYYYYMMDD = (input) => {
  if (input == null) return "";
  if (isISODate(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10); // tronca a "YYYY-MM-DD"
};



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


// ======================================================================
// TIMELINE UTILS (robusti)
// ======================================================================

/**
 * buildTimelineMapRobust
 * COSA FA:
 *   Costruisce una mappa { "YYYY-MM-DD": point } dai punti normalizzati.
 * INPUT:
 *   - points: Array<{ date: string, ... }>
 * OUTPUT:
 *   - Object: { [dateISO]: point }
 * DOVE SI USA:
 *   - PatientCard → useMemo per timelineMap
 */
export const buildTimelineMapRobust = (points) => {
  const m = {};
  (points || []).forEach((p) => {
    if (p?.date) m[p.date] = p;
  });
  return m;
};



// ======================================================================
// COLORI: mapping unico e funzioni robuste
// ======================================================================

// Alias nome→HEX basati su SCORE_COLORS.
// NOTA: "orange" è alias di giallo (warn).
const NAME_TO_HEX = {
  green:  SCORE_COLORS.ok,
  yellow: SCORE_COLORS.warn,
  orange: SCORE_COLORS.warn, // alias
  red:    SCORE_COLORS.bad,
  gray:   SCORE_COLORS.gray,
  neutral:SCORE_COLORS.neutral,
  blue:   SCORE_COLORS.blue,
};

/**
 * colorHexFromName (ROBUSTA)
 * COSA FA:
 *   Converte un nome colore in HEX.
 *   - Se riceve già un HEX, lo restituisce.
 *   - Se è un nome presente in SCORE_COLORS/NAME_TO_HEX, lo mappa.
 *   - Fallback: grigio.
 * INPUT:  name: string | null
 * OUTPUT: string HEX
 * DOVE SI USA: ovunque serva "nome → HEX"
 */
export const colorHexFromName = (name) => {
  if (!name) return SCORE_COLORS.gray;
  const n = String(name).trim().toLowerCase();

  // se è già HEX → ritorna
  if (n.startsWith("#")) return name;

  // mappa diretta da SCORE_COLORS
  if (SCORE_COLORS[n]) return SCORE_COLORS[n];

  // alias/nomi aggiuntivi (es. "orange")
  if (NAME_TO_HEX[n]) return NAME_TO_HEX[n];

  return SCORE_COLORS.gray;
};

/**
 * resolvePointHex
 * COSA FA:
 *   Dato un punto timeline, prova a restituire un HEX:
 *   1) usa p.hex / p.scoreColorHex / p.color se già HEX
 *   2) se p.color è nome → colorHexFromName (robusta)
 *   3) fallback → grigio
 * INPUT:  point: {hex?, scoreColorHex?, color?}
 * OUTPUT: string HEX
 * DOVE SI USA: getColorHexForDate
 */
export const resolvePointHex = (point) => {
  if (!point) return SCORE_COLORS.gray;

  const cands = [point.hex, point.scoreColorHex, point.color];
  for (const c of cands) {
    if (typeof c === "string" && c.startsWith?.("#")) return c; // già HEX
  }
  return colorHexFromName(point.color);
};

// ======================================================================
// TIMELINE: normalizzazione punti e utility
// ======================================================================

/**
 * normalizeDateISO
 * COSA FA: normalizza una data in "YYYY-MM-DD".
 */
export const normalizeDateISO = (d) => {
  if (!d && d !== 0) return null;
  try {
    const s = typeof d === "string" ? d : new Date(d).toISOString();
    return String(s).slice(0, 10);
  } catch {
    return null;
  }
};

/**
 * scoreToColorName
 * COSA FA: converte score (0..1 o 0..100) in nome colore (soglie base).
 * MODIFICA LE SOGLIE QUI se vuoi regole diverse.
 */
export const scoreToColorName = (score) => {
  if (score == null || isNaN(score)) return null;
  const s = score <= 1 ? score * 100 : score;
  if (s >= 80) return "red";
  if (s >= 50) return "yellow";
  return "green";
};

/**
 * normalizeTimelinePoints
 * COSA FA:
 *   Converte i punti timeline in formato unico {date, color, score, ...}.
 *   Accetta alias: date|d|day|timestamp|ts e color|colorName|scoreColorHex|hex.
 *   Se manca il colore ma c'è lo score → usa scoreToColorName.
 */
export const normalizeTimelinePoints = (pts) => {
  if (!Array.isArray(pts)) return [];
  return pts
    .map((p) => {
      const rawDate = p.date ?? p.d ?? p.day ?? p.timestamp ?? p.ts ?? null;
      const date = normalizeDateISO(rawDate);
      if (!date) return null;

      const rawColor = p.color ?? p.colorName ?? p.scoreColorHex ?? p.hex ?? null;

      const score =
        typeof p.score === "number" ? p.score
      : typeof p.scorePercent === "number" ? p.scorePercent
      : null;

      const color = rawColor || scoreToColorName(score) || null;

      return { ...p, date, color, score };
    })
    .filter(Boolean);
};

/**
 * buildTimelineMap
 * (versione tua, va già bene) — mappa {dateISO: point}
 */
export const buildTimelineMap = (points) => {
  const map = {};
  (points || []).forEach((p) => {
    if (p && p.date) map[p.date] = p;
  });
  return map;
};

/**
 * getColorHexForDate
 * COSA FA: prende il point della data e ritorna l'HEX.
 */
export const getColorHexForDate = (timelineMap, dateISO) => {
  const p = timelineMap?.[dateISO];
  return resolvePointHex(p);
};

/**
 * getScoreHexForDate
 * COSA FA:
 *   Colore per il badge “score”: priorità selezionata → hover → fallback.
 */
export const getScoreHexForDate = (timelineMap, selectedDate, hoverDate, fallbackHex = SCORE_COLORS.gray) => {
  if (selectedDate) {
    const h = getColorHexForDate(timelineMap, selectedDate);
    if (h) return h;
  }
  if (hoverDate) {
    const h = getColorHexForDate(timelineMap, hoverDate);
    if (h) return h;
  }
  return fallbackHex;
};
