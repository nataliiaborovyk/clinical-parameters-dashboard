
// ======================================================================
// Utility GENERICHE per la manipolazione di array e liste di oggetti.
// Nessuna logica Patient-specific. Nessuna chiamata API.
// Riutilizzabili da qualsiasi widget o servizio.
// ======================================================================

/**
 * --------------------------------------------------------------
 * uniqueBy(arr, keyFn)
 * --------------------------------------------------------------
 *  COSA FA: rimuove duplicati da un array in base a una chiave calcolata.
 *  INPUT:  - arr → array di elementi
 *           - keyFn → funzione che restituisce la chiave di confronto
 *  OUTPUT: array senza duplicati (mantiene il primo di ogni gruppo)
 *  DOVE SI USA: preparazione di liste (es. nomi unici, date uniche).
 * --------------------------------------------------------------
 */
export const uniqueBy = (arr = [], keyFn = (x) => x) => {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;   // già visto → scarta
    seen.add(key);
    return true;                       // primo elemento di quel gruppo
  });
};

/**
 * --------------------------------------------------------------
 * groupBy(arr, keyFn)
 * --------------------------------------------------------------
 *  COSA FA: raggruppa un array in base al risultato di keyFn(item).
 *  INPUT:  - arr → array di oggetti
 *           - keyFn → funzione che restituisce la chiave (es. (x)=>x.category)
 *  OUTPUT: oggetto { chiave: [elementi] }
 *  DOVE SI USA: aggregazioni e visualizzazioni per gruppo.
 * --------------------------------------------------------------
 */
export const groupBy = (arr = [], keyFn) => {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

/**
 * --------------------------------------------------------------
 * sortByKey(arr, key, asc = true)
 * --------------------------------------------------------------
 *  COSA FA: ordina un array di oggetti in base a una chiave.
 *  INPUT:  - arr → array di oggetti
 *           - key → chiave da ordinare
 *           - asc → boolean (true=ascendente)
 *  OUTPUT: nuovo array ordinato
 *  DOVE SI USA: ordinamento liste UI, export, statistiche.
 * --------------------------------------------------------------
 */
export const sortByKey = (arr = [], key, asc = true) => {
  return [...arr].sort((a, b) => {
    const va = a?.[key];
    const vb = b?.[key];
    if (va == null && vb == null) return 0;
    if (va == null) return asc ? 1 : -1;
    if (vb == null) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    if (va < vb) return asc ? -1 : 1;
    return 0;
  });
};

/**
 * --------------------------------------------------------------
 * flatten(arr)
 * --------------------------------------------------------------
 *  COSA FA: appiattisce un array di array di un livello.
 *  INPUT:  - arr → es. [[1,2], [3], [4,5]]
 *  OUTPUT: [1,2,3,4,5]
 *  DOVE SI USA: combinare risultati di map/filter multipli.
 * --------------------------------------------------------------
 */
export const flatten = (arr = []) => arr.reduce((acc, v) => acc.concat(v), []);

/**
 * --------------------------------------------------------------
 * arrayEquals(a, b)
 * --------------------------------------------------------------
 *  COSA FA: confronta due array (shallow) elemento per elemento.
 *  INPUT:  - a, b → array
 *  OUTPUT: boolean
 *  DOVE SI USA: controlli di memoizzazione o equality in useEffect.
 * --------------------------------------------------------------
 */
export const arrayEquals = (a, b) => {
  if (a === b) return true;             // stessa istanza
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
};

/**
 * --------------------------------------------------------------
 * compact(arr)
 * --------------------------------------------------------------
 *  COSA FA: rimuove valori null, undefined o NaN da un array.
 *  INPUT:  - arr → array generico
 *  OUTPUT: array filtrato
 *  DOVE SI USA: pulizia dati grezzi prima di calcoli o render.
 * --------------------------------------------------------------
 */
export const compact = (arr = []) =>
  arr.filter((v) => v != null && !(typeof v === "number" && isNaN(v)));

/**
 * --------------------------------------------------------------
 * difference(a, b)
 * --------------------------------------------------------------
 *  COSA FA: restituisce gli elementi presenti in "a" ma non in "b".
 *  INPUT:  - a, b → array
 *  OUTPUT: array
 *  DOVE SI USA: sincronizzazione liste (es. differenze tra periodi).
 * --------------------------------------------------------------
 */
export const difference = (a = [], b = []) => {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
};
