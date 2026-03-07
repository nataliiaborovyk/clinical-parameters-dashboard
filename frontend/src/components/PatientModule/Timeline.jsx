// ======================================================================
// Timeline — Barra segmentata colorata (storia del paziente)
// ======================================================================
// Mostra una barra orizzontale dove ogni segmento rappresenta una data.
// Il colore di ciascun segmento indica lo stato del triage (verde, rosso, ecc.).
// Utile per visualizzare rapidamente la cronologia clinica del paziente.
// ======================================================================

import React, { useMemo } from "react";
// NOTE: usiamo la versione locale per restare compatibili con la nuova struttura
import { toYYYYMMDD } from "./utilsPatient"; // converte date in formato YYYY-MM-DD

// --------------------------------------------------------------
// Mappa nomi colore → HEX (fallback se getColorForDate non li fornisce)
// --------------------------------------------------------------
const COLOR_HEX = {
  green:  "#22c55e",
  orange: "#f59e0b",
  yellow: "#f59e0b",
  red:    "#ef4444",
  gray:   "#9CA3AF",
};

/** 
 * --------------------------------------------------------------
 * Timeline(props)
 * --------------------------------------------------------------
 * COSA FA:
 *   Mostra una barra temporale composta da segmenti colorati,
 *   ognuno rappresenta una data con colore derivato dal triage.
 *
 * PROPS:
 *   - datesProp        : array di date già pronte (es. ["2025-01-01", ...])
 *   - measurements     : array (fallback legacy) da cui estrarre le date
 *   - startDate/endDate: opzionali, limiti espliciti del periodo
 *   - getColorForDate  : fn(iso) → ritorna nome colore o HEX (es. "red" o "#ef4444")
 *   - onHoverDate      : fn(date) → chiamata quando si passa il mouse sopra una data
 *   - onSelectDate     : fn(date) → chiamata quando si clicca o preme Enter
 *   - onLeave          : fn()    → chiamata quando il mouse esce dalla barra (opzionale)
 *   - selectedDate     : string  → data attualmente selezionata (opzionale, per stile)
 *   - periodFrom/To    : string  → evidenziazione periodo (opzionale, non invasivo)
 *
 * DOVE SI USA:
 *   - PatientCard.jsx → timeline clinica con triage
 * --------------------------------------------------------------
 */
const Timeline = ({
  dates: datesProp = [],       // lista date già pronte (prop prioritaria)
  measurements = [],           // fallback legacy: array di misurazioni
  startDate = "",              // data inizio periodo
  endDate = "",                // data fine periodo
  onHoverDate,                 // callback su hover
  onSelectDate,                // callback su click
  getColorForDate,             // funzione che fornisce colore per ogni data
  onLeave,                     // (opzionale) mouseleave sull’intera barra
  selectedDate,                // (opzionale) data selezionata per stile
  periodFrom,                  // (opzionale) inizio periodo evidenziato
  periodTo,                    // (opzionale) fine periodo evidenziato
}) => {

  /** 
   * --------------------------------------------------------------
   * Calcola l'elenco delle date da visualizzare nella timeline.
   * --------------------------------------------------------------
   * PRIORITÀ:
   *   1) Se vengono passate dateProp → usa quelle.
   *   2) Altrimenti, estrai le date da measurements.
   * OUTPUT:
   *   Array ordinato e senza duplicati di stringhe "YYYY-MM-DD".
   */
  const dates = useMemo(() => {
    if (Array.isArray(datesProp) && datesProp.length > 0) {
      const norm = datesProp.map((d) => toYYYYMMDD(d)).filter(Boolean);
      const uniq = Array.from(new Set(norm)).sort();   // rimuove duplicati e ordina
      return uniq;
    }
    // fallback: estrai date da misurazioni legacy
    const soloDate = (measurements || []).map(
      (m) => m?.date || m?.timestamp || m?.data_riferimento
    );
    const norm = soloDate.filter(Boolean).map((d) => toYYYYMMDD(d));
    const uniq = Array.from(new Set(norm)).sort();
    return uniq;
  }, [datesProp, measurements]);

  /** 
   * --------------------------------------------------------------
   * start/end: derivano dalle props o dalle date calcolate.
   * --------------------------------------------------------------
   * Se non sono passate esplicitamente → usa la prima e ultima data.
   */
  const start = startDate || (dates.length ? dates[0] : "—");
  const end   = endDate   || (dates.length ? dates[dates.length - 1] : "—");

  /** 
   * --------------------------------------------------------------
   * colorForDate(iso)
   * --------------------------------------------------------------
   * COSA FA:
   *   Determina il colore del segmento per una specifica data.
   *   Se getColorForDate non è definita o ritorna valore nullo → grigio.
   */
  const colorForDate = (iso) => {
    if (typeof getColorForDate === "function") {
      const c = getColorForDate(iso);            // chiede al padre il colore
      if (!c) return COLOR_HEX.gray;             // fallback → grigio
      return COLOR_HEX[c] || c;                  // se nome → HEX, se HEX → lo stesso
    }
    return COLOR_HEX.gray;                       // fallback globale
  };

  // helper per evidenziare il range periodo (non invasivo: leggero bordo)
  const inPeriod = (d) =>
    periodFrom && periodTo ? (d >= periodFrom && d <= periodTo) : false;

  // =====================================================================
  // RENDER — suddiviso in blocchi con commenti didattici
  // =====================================================================
  return (
    <div className="w-full">
      {/* ------------------------------------------------------------
          BLOCCO 1 — Header della timeline
          Mostra la data di inizio e fine e il titolo centrale.
         ------------------------------------------------------------ */}
      <div className="flex justify-between items-center text-sm text-gray-600 mb-1 px-2">
        <span>{start}</span>
        <span className="font-medium text-gray-700">patient history</span>
        <span>{end}</span>
      </div>

      {/* ------------------------------------------------------------
          BLOCCO 2 — Barra dei segmenti colorati
          Ogni segmento rappresenta una data e reagisce a hover/click.
         ------------------------------------------------------------ */}
      <div className="flex items-center space-x-2">
        {/* Contenitore principale della barra */}
        <div
          className="flex-1 h-4 rounded overflow-hidden flex"
          onMouseLeave={() => onLeave?.()}
        >
          {dates.map((d) => {
            const bg = colorForDate(d);
            const isSelected = selectedDate && d === selectedDate;
            const showRing = inPeriod(d) || isSelected;

            return (
              <div
                key={d}
                className="flex-1 cursor-pointer"
                style={{
                  backgroundColor: bg,                 // colore in base al triage
                  outline: showRing ? "1px solid rgba(0,0,0,0.15)" : "none", // bordo leggero per periodo/selected
                }}
                onMouseEnter={() => onHoverDate?.(d)}        // callback hover
                onFocus={() => onHoverDate?.(d)}             // accessibilità tastiera
                onClick={() => onSelectDate?.(d)}            // callback click
                onKeyDown={(e) => (e.key === "Enter" ? onSelectDate?.(d) : null)} // Enter = seleziona
                title={d}                                    // tooltip nativo browser
                aria-label={`Misure del ${d}`}               // accessibilità screen reader
                role="button"
                tabIndex={0}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
