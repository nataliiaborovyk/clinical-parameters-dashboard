// ======================================================================
// ParametersTable — tabella con i parametri del periodo selezionato (slim).
//  - colonna "agg" separata ma vicina al nome
//  - header "min / max" (niente "normal")
//  - min/max compatti con "/" senza etichette
//  - colonna-spacer tra value e min/max per maggiore leggibilità
// ======================================================================

import React from "react";
import ParamChart from "./ParamChart";
import { propertyLabel } from "./utilsPatient";  // etichetta leggibile per una key tecnica

/** 
 * --------------------------------------------------------------
 * isNum(x) — true se x è numero finito (no NaN/Infinity)
 * --------------------------------------------------------------
 */
const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** 
 * --------------------------------------------------------------
 * isOutOfRange(val, norma) — controlla se val è fuori dal range [min,max]
 *  - se min/max non ci sono o non sono numerici → non vincola quel lato
 * --------------------------------------------------------------
 */
const isOutOfRange = (val, norma) => {
  if (!isNum(val)) return false;                                  // se non è numero → non evidenziare
  const minOk = norma?.min == null || !isNum(norma.min) || val >= norma.min; // ok lato min se manca o val≥min
  const maxOk = norma?.max == null || !isNum(norma.max) || val <= norma.max; // ok lato max se manca o val≤max
  return !(minOk && maxOk);                                       // fuori range se uno dei due non è ok
};

/**
 * --------------------------------------------------------------
 * ParametersTable(props)
 * --------------------------------------------------------------
 *  COSA FA: mostra una tabella con (parametro, agg, valore, min/max, score, weight),
 *           e opzionalmente grafici e lista "raw" per ogni riga.
 *  PROPS:
 *    - rows         : array  → righe già normalizzate { key, label, aggregate, value, scorePercent, scoreColorHex, weight, periodRaw, timelineRaw, stats }
 *    - aggOptions   : array  → es. ["avg","min","max"]
 *    - onChangeAgg  : fn(key, newAgg) → notifica cambio aggregazione di una riga
 *    - onToggleChart: fn(key|null)    → apre/chiude grafico per la riga
 *    - onToggleRaw  : fn(key|null)    → apre/chiude lista misure per la riga
 *    - isChartOpen  : string|null     → key della riga con grafico aperto
 *    - isRawOpen    : string|null     → key della riga con tabella raw aperta
 *    - getNormaFor  : fn(key)         → ritorna {min,max} per una property
 * --------------------------------------------------------------
 */
const ParametersTable = ({
  rows = [],
  aggOptions = ["avg", "min", "max"],
  onChangeAgg,
  onToggleChart,
  onToggleRaw,
  isChartOpen,
  isRawOpen,
  getNormaFor,
}) => {
  return (
    <div className="w-full">
      {/* ============================================================
          HEADER TABELLA — titoli colonna
         ============================================================ */}
      <div
        className="
          grid items-center
          grid-cols-[minmax(0,1fr)_64px_84px_12px_150px_80px_60px]
          gap-x-2
          text-[11px] font-semibold text-gray-600
          border-y border-gray-200 py-1
        "
      >
        <div className="pl-2">parameter</div>
        <div>agg</div>
        <div className="text-right">value</div>
        <div /> {/* spacer visivo per aria tra value e min/max */}
        <div className="text-center">min / max</div>
        <div className="text-center">score%</div>
        <div className="pr-2 text-right">weight</div>
      </div>

      {/* ============================================================
          BODY TABELLA — una "card riga" per ciascun parametro
         ============================================================ */}
      {rows.map((r) => {
        // norma del parametro (se assente → min/max null)
        const norma = getNormaFor?.(r.key) || { min: null, max: null };
        // etichetta da mostrare (preferisci label, altrimenti prova mapping → label tecnica fallback)
        const label = r.label || propertyLabel?.(r.key) || r.key;

        return (
          <div key={r.key} className="border-b-2 border-gray-200">
            {/* ------------------------------------------------------
                BLOCCO 1 — Riga dati principale
               ------------------------------------------------------ */}
            <div
              className="
                grid items-center py-1.5
                grid-cols-[minmax(0,1fr)_64px_84px_12px_150px_80px_60px]
                gap-x-2
              "
            >
              {/* parametro (label leggibile, tronca se lunga) */}
              <div className="pl-2 text-[12px] break-words leading-snug truncate">
                {label}
              </div>

              {/* selettore aggregazione (avg/min/max ecc.) */}
              <div>
                <select
                  className="w-[58px] border border-gray-300 rounded px-1 py-0.5 text-[11px]"
                  value={r.aggregate}
                  onChange={(e) => onChangeAgg?.(r.key, e.target.value)}   // notifica al padre: nuova agg per key
                  aria-label="aggregate-function"
                >
                  {aggOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* value (allineato a destra, trattino se non numerico) */}
              <div className="text-right text-[12px]">
                {isNum(r.value) ? r.value : "—"}
              </div>

              {/* spacer (aria visiva) */}
              <div />

              {/* min / max compatti con separatore "/" */}
              <div className="text-center text-[12px] text-gray-800 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <span className="min-w-[44px] text-right truncate">
                    {norma?.min ?? "—"}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="min-w-[44px] text-left truncate">
                    {norma?.max ?? "—"}
                  </span>
                </span>
              </div>

              {/* score (pallino colorato + percentuale) */}
              <div className="flex items-center justify-center space-x-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-full align-middle"
                  style={{ backgroundColor: r.scoreColorHex || "#9CA3AF" }} // fallback grigio elegante
                  aria-label="parameter-score-color"
                />
                <span className="text-[12px]">
                  {isNum(r.scorePercent) ? `${r.scorePercent}%` : "—"}
                </span>
              </div>

              {/* weight (se non definito → trattino) */}
              <div className="pr-2 text-right text-[12px]">
                {r.weight ?? "—"}
              </div>
            </div>

            {/* ------------------------------------------------------
                BLOCCO 2 — Sottoriga: descrizione + bottoni azione
               ------------------------------------------------------ */}
            <div className="pl-2 pr-2 py-0.5 text-[11px] italic text-gray-500 border-t border-gray-100 flex items-center justify-between">
              <div>{r?.stats?.count ?? 0} measurements used by the CDR</div>
              <div className="space-x-1.5">
                {/* pulsante mostra/nascondi grafico: se già aperto → chiudi (null), altrimenti apri (key) */}
                <button
                  className="text-blue-600 text-[11px] underline"
                  onClick={() => onToggleChart?.(isChartOpen === r.key ? null : r.key)}
                  title="Mostra/Nascondi grafico"
                >
                  grafico
                </button>
                {/* pulsante mostra/nascondi tabellina raw */}
                <button
                  className="text-blue-600 text-[11px] underline"
                  onClick={() => onToggleRaw?.(isRawOpen === r.key ? null : r.key)}
                  title="Mostra/Nascondi lista misurazioni"
                >
                  show rows
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------
                BLOCCO 3 — GRAFICI (timeline + periodo selezionato)
               ------------------------------------------------------ */}
            {isChartOpen === r.key && (
              <div className="px-2 py-2 bg-gray-50 border-t">
                <div className="flex justify-end">
                  <button
                    className="text-red-600 font-bold text-[12px] px-2 py-0.5 border border-red-300 rounded"
                    onClick={() => onToggleChart?.(null)}                   // chiude il pannello grafici
                    title="Chiudi grafici"
                  >
                    X
                  </button>
                </div>

                {/* griglia 2 grafici affiancati */}
                <div className="grid grid-cols-2 gap-2">
                  {/* grafico timeline generale */}
                  <div className="border rounded-lg p-2">
                    <div className="text-[12px] font-semibold mb-1">
                      Andamento generale (timeline)
                    </div>
                    {Array.isArray(r.timelineRaw) && r.timelineRaw.length > 0 ? (
                      <ParamChart
                        paramKey={r.key}
                        data={r.timelineRaw}          // serie completa
                        norma={norma}                 // range min/max (linee guida)
                        width={320}
                        height={220}
                      />
                    ) : (
                      <div className="text-[11px] italic text-gray-500">
                        Nessun dato storico dal server
                      </div>
                    )}
                  </div>

                  {/* grafico periodo selezionato */}
                  <div className="border rounded-lg p-2">
                    <div className="text-[12px] font-semibold mb-1">Periodo selezionato</div>
                    {Array.isArray(r.periodRaw) && r.periodRaw.length > 0 ? (
                      <ParamChart
                        paramKey={r.key}
                        data={r.periodRaw}            // serie del periodo filtrato
                        norma={norma}
                        width={320}
                        height={220}
                      />
                    ) : (
                      <div className="text-[11px] italic text-gray-500">
                        Nessun dato per il periodo dal server
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------
                BLOCCO 4 — TABELLA RAW (date / value del periodo)
               ------------------------------------------------------ */}
            {isRawOpen === r.key && (
              <div className="px-2 py-2 bg-gray-50 border-t max-h-48 overflow-auto">
                <div className="flex justify-end">
                  <button
                    className="text-red-600 font-bold text-[12px] px-2 py-0.5 border border-red-300 rounded"
                    onClick={() => onToggleRaw?.(null)}                      // chiude la tabella raw
                    title="Chiudi elenco misure"
                  >
                    X
                  </button>
                </div>

                {/* header piccola tabella 2 colonne */}
                <div className="grid grid-cols-2 text-[11px] text-gray-700 border-y border-gray-200">
                  <div className="py-1 font-semibold">date</div>
                  <div className="py-1 font-semibold">value</div>

                  {/* righe periodo (evidenzia in rosso se fuori norma) */}
                  {Array.isArray(r.periodRaw) && r.periodRaw.length > 0 ? (
                    r.periodRaw.map((pt, idx) => {
                      const out = isOutOfRange(pt?.value, norma);            // true se fuori range
                      return (
                        <React.Fragment key={idx}>
                          <div className="py-1 border-b border-gray-100">{pt?.date ?? "—"}</div>
                          <div
                            className={`py-1 border-b border-gray-100 ${out ? "text-red-600" : ""}`}
                          >
                            {pt?.value ?? "—"}
                          </div>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <div className="py-1 border-b border-gray-100 col-span-2 text-gray-500 italic">
                      Nessuna misurazione periodo dal server
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ParametersTable;
