// ======================================================================
// useSegmentDates — Hook per ricavare l'elenco di date (YYYY-MM-DD)
//                   presenti nella storia del paziente.
// ----------------------------------------------------------------------
//  DOVE VIENE USATO
//   PatientCard.jsx
//
//  COSA FA
//   - Legge:
//       1) measurementsMap: oggetto con intervalli tipo "YYYY-MM-DD/YYYY-MM-DD"
//          per ogni proprietà misurata (es. pressione, urea, ecc.)
//       2) triageHistoryMap: oggetto { "YYYY-MM-DD": { score, ... }, ... }
//   - Raccoglie tutte le date "di inizio" degli intervalli (from) + le date dei triage,
//     le rende uniche, le ordina in modo crescente, e restituisce un array di stringhe.
//
//  API / DATI
//   - Non chiama API direttamente. Lavora su dati già presenti nello stato di PatientCard:
//       • measurements → viene da /patients/get
//       • triageHistoryMap → può venire sia da /patients/get sia da /patients/triage
//
//  NOTE DI DESIGN
//   - Hook "puro", senza side-effect. Usa useMemo per evitare ricalcoli inutili.
//   - Restituisce solo dati “derivati”, comodi per timeline e selettori data.
// ======================================================================

import { useMemo } from "react"; // useMemo: memoizza il risultato finché le dipendenze non cambiano

/**
 * useSegmentDates
 *
 * @param {Object|null} measurementsMap  // mappa delle misure: { prop: { "from/to": value, ... }, ... }
 * @param {Object|null} triageHistoryMap // mappa triage per data: { "YYYY-MM-DD" (o timestamp): { score, ... }, ... }
 * @returns {string[]}                    // array ordinato di date "YYYY-MM-DD" senza duplicati
 *
 * 📍 Dove richiamarlo: dentro PatientCard.jsx, accanto agli altri useMemo/useState.
 * 🧠 Quando si aggiorna: quando cambiano measurementsMap o triageHistoryMap.
 */
const useSegmentDates = (measurementsMap, triageHistoryMap) =>
  useMemo(() => {
    const uniqueDays = new Set(); // <-- raccoglitore di date uniche (niente duplicati); usato solo in questo hook

    // ---------- 1) Estraggo le date "from" dagli intervalli delle misure ----------
    // measurementsMap ha la forma:
    //   {
    //     "urea_pre": { "2025-01-01/2025-01-15": 140, "2025-02-01/2025-02-10": 130, ... },
    //     "peso":     { "2025-01-02/2025-01-04": 70.5, ... },
    //     ...
    //   }
    if (measurementsMap && typeof measurementsMap === "object") {
      Object.values(measurementsMap).forEach((intervalMap) => {              // intervalMap: mappa "from/to" → valore
        Object.keys(intervalMap || {}).forEach((intervalKey) => {            // intervalKey: stringa "YYYY-MM-DD/YYYY-MM-DD"
          const start = String(intervalKey).split("/")[0];                   // prendo la parte "from"               // estrae "YYYY-MM-DD"
          if (start) uniqueDays.add(start.slice(0, 10));                     // aggiungo solo la data (senza orario) // mantiene solo 10 caratteri
        });
      });
    }

    // ---------- 2) Estraggo le date presenti nella mappa dei triage ----------
    // triageHistoryMap ha la forma:
    //   { "2025-01-03": { score: 72, ... }, "2025-01-10": {...}, ... }
    // a volte la chiave può essere un timestamp (con orario): usiamo slice(0,10)
    if (triageHistoryMap && typeof triageHistoryMap === "object") {
      Object.keys(triageHistoryMap).forEach((ts) => {
        uniqueDays.add(String(ts).slice(0, 10));                             // normalizza a "YYYY-MM-DD"
      });
    }

    // ---------- 3) Converto il Set in array e lo ordino ----------
    const daysArray = [...uniqueDays];                                       // array di date uniche
    daysArray.sort();                                                        // ordinamento crescente (ISO stringhe → ok)

    return daysArray;                                                        // risultato finale per la UI (timeline, select, ecc.)
  }, [measurementsMap, triageHistoryMap]);                                    // 🔁 ricalcola solo se cambiano queste due dipendenze

export default useSegmentDates;
