
// ======================================================================
// Utility GENERICHE di supporto.
// In questo file manteniamo alias e piccole funzioni riusabili da più widget.
// Nessuna dipendenza dal dominio "Patient".
// ======================================================================

import { normalizeScorePercent } from "./math"; // riuso la versione centralizzata

// --------------------------------------------------------------
// normalizeScore(s)  [ALIAS di normalizeScorePercent]
// --------------------------------------------------------------
//  COSA FA: normalizza uno score in percentuale intera.
//           Esempi:
//             "72%"  -> 72
//             0.72   -> 72
//             72.4   -> 72
//  INPUT:  - s → string | number
//  OUTPUT: number | null
//  DOVE SI USA: ovunque serva visualizzare uno score in % come intero.
//  API USATE: nessuna.
//  NOTE: questa funzione è un alias per evitare duplicazioni: delega a
//        normalizeScorePercent centralizzato in utils/math.js.
// --------------------------------------------------------------
export const normalizeScore = (s) => normalizeScorePercent(s);
