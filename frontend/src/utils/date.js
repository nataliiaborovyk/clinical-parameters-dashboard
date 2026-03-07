
// ======================================================================
// Utility GENERICHE per lavorare con date in formato ISO "YYYY-MM-DD".
// Riutilizzabili in qualunque widget (nessuna logica Patient-specific).
// Nessuna chiamata API.
// ======================================================================

/**
 * --------------------------------------------------------------
 * isISODate(s)
 * --------------------------------------------------------------
 *  COSA FA: verifica se una stringa è nel formato "YYYY-MM-DD".
 *  INPUT:  - s → any
 *  OUTPUT: boolean
 *  DOVE SI USA: validazioni veloci prima di parsare/confrontare date.
 * --------------------------------------------------------------
 */
export const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

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
 * parseISODate(iso)
 * --------------------------------------------------------------
 *  COSA FA: crea un oggetto Date a partire da "YYYY-MM-DD" (alle 00:00 UTC).
 *  INPUT:  - iso → string "YYYY-MM-DD"
 *  OUTPUT: Date | null
 *  DOVE SI USA: calcoli/aritmetica sulle date.
 * --------------------------------------------------------------
 */
export const parseISODate = (iso) => {
  if (!isISODate(iso)) return null;
  // Costruisce una data in UTC per coerenza tra ambienti/timezone
  return new Date(`${iso}T00:00:00.000Z`);
};

/**
 * --------------------------------------------------------------
 * compareISO(a, b)
 * --------------------------------------------------------------
 *  COSA FA: confronta due stringhe ISO "YYYY-MM-DD".
 *  INPUT:  - a, b → stringhe ISO
 *  OUTPUT: -1 | 0 | 1
 *  DOVE SI USA: ordinamenti.
 * --------------------------------------------------------------
 */
export const compareISO = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * --------------------------------------------------------------
 * addDays(iso, n)
 * --------------------------------------------------------------
 *  COSA FA: restituisce la data ISO spostata di n giorni rispetto a iso.
 *  INPUT:  - iso → "YYYY-MM-DD"
 *          - n   → intero (positivo/negativo)
 *  OUTPUT: "YYYY-MM-DD"
 *  DOVE SI USA: navigazione timeline, range dinamici.
 * --------------------------------------------------------------
 */
export const addDays = (iso, n) => {
  const d = parseISODate(iso);
  if (!d) return "";
  d.setUTCDate(d.getUTCDate() + Number(n || 0)); // usa UTC per evitare drift DST
  return d.toISOString().slice(0, 10);
};

/**
 * --------------------------------------------------------------
 * diffDays(a, b)
 * --------------------------------------------------------------
 *  COSA FA: numero di giorni interi tra due date ISO (b - a).
 *  INPUT:  - a, b → "YYYY-MM-DD"
 *  OUTPUT: intero (può essere negativo)
 *  DOVE SI USA: statistiche e validazioni di range.
 * --------------------------------------------------------------
 */
export const diffDays = (a, b) => {
  const d1 = parseISODate(a);
  const d2 = parseISODate(b);
  if (!d1 || !d2) return NaN;
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};

/**
 * --------------------------------------------------------------
 * isWithinISO(dateISO, fromISO, toISO)
 * --------------------------------------------------------------
 *  COSA FA: verifica se dateISO ∈ [fromISO, toISO].
 *  INPUT:  - dateISO, fromISO, toISO → "YYYY-MM-DD"
 *  OUTPUT: boolean
 *  DOVE SI USA: filtri temporali (liste, grafici).
 * --------------------------------------------------------------
 */
export const isWithinISO = (dateISO, fromISO, toISO) => {
  if (!isISODate(dateISO) || !isISODate(fromISO) || !isISODate(toISO)) return false;
  return dateISO >= fromISO && dateISO <= toISO;
};

/**
 * --------------------------------------------------------------
 * clampPeriodToDays(centerISO, daysBack)
 * --------------------------------------------------------------
 *  COSA FA: costruisce un periodo centrato su centerISO esteso di
 *           "daysBack" giorni all'indietro fino a centerISO come fine.
 *           Restituisce { start, end } in ISO per highlight UI (timeline).
 *  INPUT:  - centerISO → "YYYY-MM-DD"
 *          - daysBack  → numero di giorni (es. 30)
 *  OUTPUT: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } | null
 *  DOVE SI USA: PatientCard.jsx per evidenziare il periodo nella Timeline.
 *  NOTE: per payload API che vogliono {from,to} usa makePeriodFromDaysBack
 *        (che abbiamo messo in utilsPatient.js).
 * --------------------------------------------------------------
 */
export const clampPeriodToDays = (centerISO, daysBack = 30) => {
  if (!isISODate(centerISO)) return null;
  const end = centerISO;                           // end coincide con la data selezionata
  const start = addDays(centerISO, -Math.abs(daysBack)); // sposta all'indietro
  return { start, end };
};

/**
 * --------------------------------------------------------------
 * rangeISO(fromISO, toISO)
 * --------------------------------------------------------------
 *  COSA FA: genera un array di date ISO giorno-per-giorno nell'intervallo chiuso.
 *  INPUT:  - fromISO, toISO → "YYYY-MM-DD"
 *  OUTPUT: string[] (può essere vuoto)
 *  DOVE SI USA: costruzione timeline dettagliate, test.
 * --------------------------------------------------------------
 */
export const rangeISO = (fromISO, toISO) => {
  if (!isISODate(fromISO) || !isISODate(toISO) || fromISO > toISO) return [];
  const out = [];
  let cur = fromISO;
  while (cur <= toISO) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
};

/**
 * --------------------------------------------------------------
 * formatHuman(iso)
 * --------------------------------------------------------------
 *  COSA FA: formato breve "DD/MM/YYYY" per UI.
 *  INPUT:  - iso → "YYYY-MM-DD"
 *  OUTPUT: string ("" se non valido)
 *  DOVE SI USA: badge/testi dove serve un formato umano.
 * --------------------------------------------------------------
 */
export const formatHuman = (iso) => {
  if (!isISODate(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
