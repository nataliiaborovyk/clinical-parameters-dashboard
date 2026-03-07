// ======================================================================
// ParamChart — Grafico dei parametri clinici
// Blu = valori dentro la norma, Rosso = fuori norma.
// Mostra in modo continuo anche quando i colori cambiano (senza “buchi”).
// ======================================================================

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";

/** 
 * --------------------------------------------------------------
 * toISO(x)
 * --------------------------------------------------------------
 * COSA FA: converte una data (stringa o oggetto) nel formato 'YYYY-MM-DD'.
 * DOVE SI USA: in tutte le funzioni che costruiscono le serie di dati.
 */
const toISO = (x) => String(x ?? "").slice(0, 10);

/** 
 * --------------------------------------------------------------
 * isFiniteNum(v)
 * --------------------------------------------------------------
 * COSA FA: controlla se il valore passato è numerico e finito.
 * UTILE PER: evitare NaN o Infinity nei calcoli del grafico.
 */
const isFiniteNum = (v) => Number.isFinite(Number(v));

/** 
 * --------------------------------------------------------------
 * buildCategoryTicks(pts, count = 4)
 * --------------------------------------------------------------
 * COSA FA: genera un numero limitato di etichette equidistanziate per l’asse X.
 * INPUT: 
 *   - pts: array di punti { date: "YYYY-MM-DD", ... }
 *   - count: numero massimo di etichette (default 4)
 * OUTPUT: array di stringhe ["2025-01-01", "2025-03-01", ...]
 * DOVE SI USA: nel rendering del grafico, per impostare i tick dell’asse X.
 */
const buildCategoryTicks = (pts, count = 4) => {
  if (!pts?.length) return [];
  if (pts.length <= count) return [...new Set(pts.map((p) => toISO(p.date)))];

  // seleziona in modo uniforme count punti distribuiti su tutta la serie
  const idx = Array.from({ length: count }, (_, i) =>
    Math.round((i * (pts.length - 1)) / (count - 1))
  );
  return [...new Set(idx.map((i) => toISO(pts[i].date)))];
};

/** 
 * --------------------------------------------------------------
 * inRangeSafe(value, norma)
 * --------------------------------------------------------------
 * COSA FA: verifica se un valore è dentro l’intervallo definito da norma {min, max}.
 * DOVE SI USA: per decidere se il punto deve essere disegnato in blu o in rosso.
 */
const inRangeSafe = (value, norma) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return false;
  const hasMin = norma && isFiniteNum(norma.min);
  const hasMax = norma && isFiniteNum(norma.max);

  // Nessuna soglia definita → sempre dentro norma
  if (!hasMin && !hasMax) return true;
  if (hasMin && v < Number(norma.min)) return false;
  if (hasMax && v > Number(norma.max)) return false;
  return true;
};

/** 
 * --------------------------------------------------------------
 * buildSeriesWithBoundaries(data, norma)
 * --------------------------------------------------------------
 * COSA FA: costruisce la serie per il grafico con due campi:
 *   - value_in  → valore (blu) se dentro la norma
 *   - value_out → valore (rosso) se fuori norma
 * Aggiunge punti “di frontiera” per evitare interruzioni quando cambia colore.
 * DOVE SI USA: nel componente ParamChart, per generare i dati finali del grafico.
 */
const buildSeriesWithBoundaries = (data, norma) => {
  if (!Array.isArray(data) || data.length === 0) return [];

  // Crea una mappa base con flag interno "__ok" per segnalare dentro/fuori norma
  const base = data.map((d) => {
    const v = Number(d.value);
    const ok = inRangeSafe(v, norma); // controlla se il punto è dentro norma
    return {
      ...d,
      date: toISO(d.date),
      value_in: ok ? v : null,  // blu
      value_out: ok ? null : v, // rosso
      __ok: ok,                 // flag temporaneo
    };
  });

  const out = [base[0]];
  for (let i = 1; i < base.length; i++) {
    const prev = base[i - 1];
    const curr = base[i];
    // Se cambia stato (da dentro→fuori o viceversa), aggiunge un punto "ponte"
    if (prev.__ok !== curr.__ok) {
      const v = Number(curr.value_in ?? curr.value_out);
      out.push({
        date: curr.date,
        value_in: prev.__ok ? v : null,
        value_out: prev.__ok ? null : v,
        __ok: prev.__ok,
      });
      out.push(curr); // aggiunge poi il punto corrente reale
    } else {
      out.push(curr);
    }
  }

  // Rimuove il flag interno e ritorna i dati puliti
  return out.map(({ __ok, ...rest }) => rest);
};

/**
 * --------------------------------------------------------------
 * ParamChart(props)
 * --------------------------------------------------------------
 * COSA FA: disegna il grafico lineare dei valori clinici di un parametro.
 *  - Blu: valori dentro la norma.
 *  - Rosso: valori fuori norma.
 *  Mostra soglie min/max con linee grigie tratteggiate.
 * PROPS:
 *   - paramKey : string   → nome del parametro (es. "urea_pre")
 *   - data     : array    → [{ date:'YYYY-MM-DD', value:number }]
 *   - norma    : {min,max}→ range di riferimento (opzionale)
 *   - width, height       → dimensioni del grafico
 * DOVE SI USA: PropertyStatsWidget.jsx, PatientCard.jsx
 */
const ParamChart = ({
  paramKey,
  data = [],
  norma = { min: null, max: null },
  width = 380,
  height = 240,
}) => {
  // Se non ci sono dati → mostra messaggio “vuoto”
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        Nessuna misurazione disponibile dal server.
      </div>
    );
  }

  // Calcola i punti grafico con blu/rosso e frontiere
  const pts = useMemo(() => buildSeriesWithBoundaries(data, norma), [data, norma]);

  // Calcola la Y minima dinamica (min - 30%) per dare un po’ di spazio sotto
  const minVal = useMemo(() => {
    const vals = pts
      .map((p) => Number(p.value_in ?? p.value_out))
      .filter((v) => Number.isFinite(v));
    return vals.length ? Math.min(...vals) : null;
  }, [pts]);

  // Padding sotto il minimo per evitare che la linea tocchi il bordo
  const yMin = useMemo(() => {
    if (!Number.isFinite(minVal)) return "auto";
    const pad = 0.3 * Math.abs(minVal || 1);
    return Number((minVal - pad).toFixed(4));
  }, [minVal]);

  // Tick (etichette) sull’asse X
  const xTicks = useMemo(() => buildCategoryTicks(pts, 4), [pts]);

  // =====================================================================
  // RENDER — blocchi separati con commenti didattici
  // =====================================================================
  return (
    <LineChart
      width={width}
      height={height}
      data={pts} // entrambe le linee lavorano sulla stessa serie di punti
      margin={{ top: 12, right: 16, left: 10, bottom: 6 }}
    >
      {/* ------------------------------------------------------------
          BLOCCO 1 — Griglia + Assi + Tooltip + Legenda
         ------------------------------------------------------------ */}
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" allowDuplicatedCategory={false} ticks={xTicks} />
      <YAxis domain={[yMin, "auto"]} />
      <Tooltip />
      <Legend />

      {/* ------------------------------------------------------------
          BLOCCO 2 — Linee di riferimento min/max (grigie)
         ------------------------------------------------------------ */}
      {isFiniteNum(norma?.min) && (
        <ReferenceLine y={Number(norma.min)} stroke="gray" strokeDasharray="3 3" label="min" />
      )}
      {isFiniteNum(norma?.max) && (
        <ReferenceLine y={Number(norma.max)} stroke="gray" strokeDasharray="3 3" label="max" />
      )}

      {/* ------------------------------------------------------------
          BLOCCO 3 — Serie blu (dentro norma)
         ------------------------------------------------------------ */}
      <Line
        type="monotone"
        dataKey="value_in"
        stroke="#1e40af" // blu profondo
        strokeWidth={3}
        dot={false}
        name="nella norma"
        isAnimationActive={false}
        connectNulls={false}
      />

      {/* ------------------------------------------------------------
          BLOCCO 4 — Serie rossa (fuori norma)
         ------------------------------------------------------------ */}
      <Line
        type="monotone"
        dataKey="value_out"
        stroke="#dc2626" // rosso acceso
        strokeWidth={3}
        dot={false}
        name="fuori norma"
        isAnimationActive={false}
        connectNulls={false}
      />
    </LineChart>
  );
};

export default ParamChart;
