
// ======================================================================
/* Utility GENERICHE per calcoli numerici e normalizzazioni.
   - Riutilizzabili in qualunque widget/modulo.
   - Nessun riferimento al dominio "Patient".
   - Nessuna chiamata API. */
// ======================================================================

/**
 * --------------------------------------------------------------
 * avg(arr)
 * --------------------------------------------------------------
 *  COSA FA: calcola la media aritmetica degli elementi dell'array.
 *  INPUT:  - arr → array di valori (string/number ammessi)
 *  OUTPUT: number (0 se array vuoto o senza numeri validi)
 *  DOVE SI USA: ovunque serva una media semplice (grafici, tabelle, ecc.).
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const avg = (arr = []) => {
  const valid = arr.map(Number).filter((v) => !isNaN(v));                // array solo numeri
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length  // somma / count
                      : 0;                                               // default 0 se nessun numero
};

/**
 * --------------------------------------------------------------
 * min(arr)
 * --------------------------------------------------------------
 *  COSA FA: restituisce il minimo dell'array.
 *  INPUT:  - arr → array di valori (string/number ammessi)
 *  OUTPUT: number (0 se array vuoto)
 *  DOVE SI USA: ovunque serva un minimo.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const min = (arr = []) => (arr.length ? Math.min(...arr.map(Number)) : 0);

/**
 * --------------------------------------------------------------
 * max(arr)
 * --------------------------------------------------------------
 *  COSA FA: restituisce il massimo dell'array.
 *  INPUT:  - arr → array di valori (string/number ammessi)
 *  OUTPUT: number (0 se array vuoto)
 *  DOVE SI USA: ovunque serva un massimo.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const max = (arr = []) => (arr.length ? Math.max(...arr.map(Number)) : 0);

/**
 * --------------------------------------------------------------
 * roundN(value, n=2)
 * --------------------------------------------------------------
 *  COSA FA: arrotonda un numero a N cifre decimali usando toFixed.
 *  INPUT:  - value → numero/convertibile a numero
 *          - n     → cifre decimali (default 2)
 *  OUTPUT: number (0 se value non è numerico)
 *  DOVE SI USA: formattazioni numeriche per UI.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const roundN = (value, n = 2) => {
  const num = Number(value);                                             // numero normalizzato
  if (Number.isNaN(num)) return 0;                                       // non numerico → 0
  return parseFloat(num.toFixed(n));                                     // arrotonda e torna come number
};

/**
 * --------------------------------------------------------------
 * inRange(v, a, b)
 * --------------------------------------------------------------
 *  COSA FA: controlla se v è nell'intervallo chiuso [a, b].
 *  INPUT:  - v → valore da testare
 *          - a → estremo inferiore
 *          - b → estremo superiore
 *  OUTPUT: boolean
 *  DOVE SI USA: evidenziazioni UI, filtri, validazioni semplici.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const inRange = (v, a, b) => v >= a && v <= b;

/**
 * --------------------------------------------------------------
 * roundMaybe(x, n=2)
 * --------------------------------------------------------------
 *  COSA FA: arrotonda x a N decimali se x è numerico; altrimenti ritorna null.
 *  INPUT:  - x → valore generico
 *          - n → cifre decimali (default 2)
 *  OUTPUT: number | null
 *  DOVE SI USA: quando il valore potrebbe essere assente/non numerico e
 *               vogliamo un risultato pulito per la UI.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const roundMaybe = (x, n = 2) => {
  if (x == null || Number.isNaN(Number(x))) return null;                 // non numerico → null
  const p = Math.pow(10, n);                                             // 10^n
  return Math.round(Number(x) * p) / p;                                  // arrotondamento classico
};

/**
 * --------------------------------------------------------------
 * normalizeScorePercent(s)
 * --------------------------------------------------------------
 *  COSA FA: normalizza uno score in percentuale intera.
 *           - Se s è "72%" → 72
 *           - Se s è 0.72  → 72
 *           - Se s è 72    → 72
 *           - Altrimenti   → null
 *  INPUT:  - s → string | number
 *  OUTPUT: number | null (intero 0..100 tipicamente)
 *  DOVE SI USA: generico per visualizzazione score/indicatori.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const normalizeScorePercent = (s) => {
  if (s == null) return null;                                            // assente → null
  if (typeof s === "string") {
    const n = parseFloat(s.replace("%", ""));                            // toglie eventuale %
    return Number.isFinite(n) ? Math.round(n) : null;                    // "72.4%" → 72
  }
  if (!Number.isFinite(s)) return null;                                  // non numerico → null
  return s <= 1 ? Math.round(s * 100) : Math.round(s);                   // 0.72 → 72 ; 72.4 → 72
};


