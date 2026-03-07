
// ======================================================================
// Utility GENERICHE su dati "raw" (riutilizzabili in più widget)
// ======================================================================

/**
 * --------------------------------------------------------------
 * toNum(x)
 * --------------------------------------------------------------
 *  COSA FA: converte un valore in numero (se possibile), altrimenti null.
 *  INPUT:  - x → qualsiasi valore (stringa, number, null/undefined)
 *  OUTPUT: number | null
 *  DOVE SI USA: ovunque serva sanificare input numerici (widget vari).
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const toNum = (x) => (x == null ? null : (Number.isFinite(+x) ? +x : null)); // +x → coercizione numerica sicura

/**
 * --------------------------------------------------------------
 * filterByPeriod(list, fromISO, toISO)
 * --------------------------------------------------------------
 *  COSA FA: filtra una lista di oggetti che hanno la proprietà .date
 *           mantenendo solo quelli con data compresa nell'intervallo chiuso
 *           [fromISO, toISO]. Confronto su stringhe ISO "YYYY-MM-DD".
 *  INPUT:  - list    → array di item con campo .date (string/Date/timestamp)
 *          - fromISO → stringa "YYYY-MM-DD" (estremo inferiore, incluso)
 *          - toISO   → stringa "YYYY-MM-DD" (estremo superiore, incluso)
 *  OUTPUT: array filtrato (se fromISO/toISO assenti, torna list invariata)
 *  DOVE SI USA: in qualsiasi widget che applica un filtro temporale semplice.
 *  API USATE: nessuna.
 * --------------------------------------------------------------
 */
export const filterByPeriod = (list, fromISO, toISO) => {
  if (!Array.isArray(list)) return [];                                       // se non è un array → []
  if (!fromISO || !toISO) return list;                                       // senza bounds → nessun filtro
  return list.filter((it) => {
    const d = String(it?.date ?? "").slice(0, 10);                           // normalizza a "YYYY-MM-DD"
    return d >= fromISO && d <= toISO;                                       // confronto lessicografico su ISO
  });
};

/* ======================================================================
   NOTA COMPATIBILITÀ (opzionale):
   In passato qui c'era anche getPatientSeries(patientId, patientsData).
   Ora quella logica è considerata "Patient-specific" ed è stata spostata in:
   → src/components/PatientModule/utilsPatient.js (getPatientSeriesFromPatientsData)

   Se vuoi evitare refactoring immediato in altri punti del codice,
   puoi lasciare un alias di compatibilità qui (deprecato). Decommenta:

// import { getPatientSeriesFromPatientsData } from "@/components/PatientModule/utilsPatient";
// export const getPatientSeries = (patientId, patientsData) => {
//   // DEPRECATO: usa getPatientSeriesFromPatientsData dal Patient Module.
//   return getPatientSeriesFromPatientsData(patientId, patientsData);
// };

   In alternativa, rimuovi ogni uso di getPatientSeries nel codice e
   importa direttamente getPatientSeriesFromPatientsData dove serve.
   ====================================================================== */
