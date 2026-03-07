
// ======================================================================
// Piccole funzioni “di dominio” riutilizzabili (nessun fetch qui).
// Queste utility NON dipendono dal widget PatientCard e possono essere
// usate da vari widget (grafici, tabelle, riepiloghi).
// ======================================================================

import { toYYYYMMDD } from "./date";     // normalizza Date/timestamp → "YYYY-MM-DD"
import { inRange } from "./math";        // test in [min,max] con numeri

// --------------------------------------------------------------
// inferAccessType(rows = [])
// --------------------------------------------------------------
//  COSA FA: deduce il tipo di accesso vascolare più probabile dai dati
//           della riga (o righe) passate, cercando indicazioni "cvc"/"fav".
//  INPUT:  - rows → array di oggetti (es. [{ access: "CVC femorale" }, ...])
//  OUTPUT: string ("CVC" | "FAV" | "Altro" | "N/A")
//  DOVE SI USA: widget vari che mostrano un riassunto dell’accesso.
//  API USATE: nessuna.
// --------------------------------------------------------------
export const inferAccessType = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return "N/A";                 // nessun dato
  const has = (needle) =>
    rows.some((r) => r?.access?.toLowerCase?.().includes(needle));             // match case-insensitive
  if (has("cvc")) return "CVC";                                                // trova "cvc"
  if (has("fav")) return "FAV";                                                // trova "fav"
  return "Altro";                                                              // nessun match esplicito
};

// --------------------------------------------------------------
// inferFAV(rows = [])
// --------------------------------------------------------------
//  COSA FA: deduce la presenza di FAV a partire da righe con campo booleano "fav".
//  INPUT:  - rows → array di oggetti (es. [{ fav: true }, ...])
//  OUTPUT: string ("FAV presente" | "FAV non rilevata" | "N/A")
//  DOVE SI USA: widget vari di riepilogo/metadati.
//  API USATE: nessuna.
// --------------------------------------------------------------
export const inferFAV = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return "N/A";                 // nessun dato
  return rows.some((r) => r?.fav === true) ? "FAV presente" : "FAV non rilevata";
};

// --------------------------------------------------------------
// toTimeseriesWithNorma(measurementsArray, key, norma, { from, to } = {})
// --------------------------------------------------------------
//  COSA FA: genera una serie temporale [{ date, value, outOfRange }, ...]
//           per una certa proprietà "key", a partire da una lista di misure.
//           Imposta outOfRange = true se il valore non rientra in [min,max].
//  INPUT:  - measurementsArray → array di record misura, es.:
//              [{ date: "2025-01-01", urea_pre: 140, ktv: 1.2 }, ...]
//           - key              → string (nome della proprietà da estrarre)
//           - norma            → { min?: number, max?: number } | null
//           - { from, to }     → (opzionale) filtro intervallo "YYYY-MM-DD"
//  OUTPUT: array di oggetti: { date: "YYYY-MM-DD", value: number, outOfRange: boolean }
//  DOVE SI USA: grafici, timeline di proprietà, pannelli di trend.
//  API USATE: nessuna (elabora dati già in memoria).
//  NOTE:
//    • La funzione è tollerante su date e valori (coercizza a numero).
//    • Il filtro by-period è applicato DOPO la mappatura.
// --------------------------------------------------------------
export const toTimeseriesWithNorma = (measurementsArray = [], key, norma, { from, to } = {}) => {
  if (!Array.isArray(measurementsArray) || !key) return [];                    // input non valido → []

  return measurementsArray
    .map((m) => {
      const day = toYYYYMMDD(m?.date);                                         // normalizza data
      const v = Number(m?.[key]);                                              // forza a numero
      // Determina fuori norma solo se esiste almeno un estremo numerico
      const outOfRange =
        norma && (typeof norma.min === "number" || typeof norma.max === "number")
          ? !inRange(v, norma.min ?? -Infinity, norma.max ?? +Infinity)        // usa inRange per [min,max]
          : false;

      return { date: day, value: v, outOfRange };                              // record della serie
    })
    .filter((r) => {
      // Applica filtro intervallo se richiesto
      if (!from && !to) return true;                                           // nessun filtro
      if (from && r.date < from) return false;                                 // prima di 'from' → escludi
      if (to && r.date > to) return false;                                     // dopo 'to' → escludi
      return true;                                                             // altrimenti includi
    });
};
