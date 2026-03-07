// ======================================================================
// PatientCard — componente principale della card paziente
// Gestisce triage, timeline, misure, nickname, confronto, ecc.
// L’header “globale” è gestito dal Canvas/AppContext.
// ======================================================================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext"; // for collapse/expand ecc.

// --- Componenti UI interni ---
import Timeline from "./Timeline";                    // timeline orizzontale per le date
import ParametersTable from "./ParametersTable";      // tabella con i parametri e dettagli
import NicknameEditor from "./NicknameEditor";        // editor nickname (campo testo e salva)

// --- Servizi backend (aggregatore) ---
import {
  getOntologyJson,          // carica ontologia proprietà
  getPropertyStats,        // statistiche per singola proprietà (per tabella)
  //getCdrSchema,            // schema CDR → pesi/parametri
  postPatientsGet,         // dati principali del paziente (misure, triage storico, meta)
  postPatientTriage,       // triage puntuale per data selezionata
  getNicknames,            // mappa nicknames
  saveNickname,            // salva nickname
  getTimelinePoints,       // punti colorati timeline (CDR)
  getPatientsDataJson,     // JSON locale con mapping pesi/norme (cache)
  getNormsJson,            // carica norme da file/servizio
  fetchAndParseNormsJson,  // scarica il file JSON con le norme e lo trasforma in mappa { key: {min,max} }
  getCdrsJson,             // scarica l’elenco dei modelli CDR dal backend o da file statico.
  getCdrById,              // ricerca un modello CDR per ID all’interno dell’elenco scaricato.
  getWeightsJson,

} from "@/services/widgetPatientApi";

// --- Le  utilità “pure” 
import {
  unwrapData,
  normalizeTriageResponse,           // normalizza risposta /patients/triage
  toLegacyMeasList,                  // converte measMap → lista giorni legacy
  buildTimelineMap,                  // array punti → mappa {dateISO: point}
  getScoreHexForDate,                // calcola colore score per la data
  lastIntervalValueForKey,           // prende ultimo intervallo per chiave
  calcHistoryBoundsFromMeasurements, // bounds {from,to} da measurements
  makePeriodFromDaysBack,            // costruisce periodo {from,to} da data e N giorni indietro
  mergeRowWeights,                   // fonde pesi nelle righe triage
  getNormaForFromMaps,               // calcola norma {min,max} per un parametro
  collectUniqueProps,                // estrae lista di prop uniche dalle righe
  clampPeriodToDays,                 // limita periodo a N giorni
  toYYYYMMDD,                        // normalizza Date → "YYYY-MM-DD"
  getFromRowsFlexible,               // preferisci funzioni flessibili
  getFromMeasMapFlexible, 
  getFromPatientMetaFlexible,
  parseNormsMap,                     // parser norme 
  parseWeightsMap,                   // parser pesi
  normalizeKey,
  colorHexFromName,
  normalizeTimelinePoints,
  buildTimelineMapRobust,
  getColorHexForDate,
} from "./utilsPatient";

// --- Il nostro hook estratto in hooks/useSegmentDates.js ---
import useSegmentDates from "./hooks/useSegmentDates";


// ======================================================================
// PROPS del componente (come nella tua versione originale)
// ----------------------------------------------------------------------
// - initialPatientId:   id del paziente da mostrare
// - defaultDays:        ampiezza default del periodo triage (es. 30 giorni)
// - frozen:             se true, la card è “congelata” (non aggiorna su click)
// - onRequestExpand:    callback (Canvas) per espandere la card
// - onRequestCollapse:  callback per collassare la card
// - onRequestCreateSiblingCard: callback per creare card “sorella” (confronto)
// - onClose:            chiusura della card
// - _initialSelectedDate: data iniziale (quando la card nasce già con una data)
// - _initialRuleId:       cdrId iniziale, se presente
// ======================================================================

const PatientCard = ({
  initialPatientId,
  defaultDays = 30,
  frozen = false,
  onRequestExpand,
  onRequestCollapse,
  onRequestCreateSiblingCard,
  onClose,
  _initialSelectedDate,
  _initialRuleId,
  _autoExpand,
}) => {
  // ========= Context (UI globale) =========
  const { toggleCollapsedFor } = useAppContext(); // usato per “minimizzare”/“espandere” card dall’esterno

  // ========= Stato principale =========
  const [patientId] = useState(initialPatientId); // id del paziente mostrato (immutabile per questa card)

  const [ontology, setOntology] = useState(null); // ontologia proprietà (etichette, categorie) — usata in tabella
  const [cdrList, setCdrList] = useState([]);     // elenco CDR disponibili (dalla ontologia/schemi)
  const [nicknames, setNicknames] = useState({}); // mappa { patientId: nickname } per header

  const [hoverDate, setHoverDate] = useState(null);                 // data su cui sto passando il mouse (Timeline)
  const [selectedDate, setSelectedDate] = useState(_initialSelectedDate || ""); // data selezionata corrente
  const [comparisonMode, setComparisonMode] = useState(false);      // se true, click crea card “sorella” (confronto)

  const [measurements, setMeasurements] = useState(null);           // misure grezze da /patients/get
  const [triageHistoryMap, setTriageHistoryMap] = useState(null);   // storia triage (mappa date → triage)
  const [historyBounds, setHistoryBounds] = useState(null);         // bounds temporali dello storico (da misure)

  const [selectedTriage, setSelectedTriage] = useState(null);       // triage normalizzato per la selectedDate

  const [chartOpenFor, setChartOpenFor] = useState(null);           // parametro aperto nel grafico “ParamChart”
  const [rawOpenFor, setRawOpenFor] = useState(null);               // parametro aperto nel pannello “raw”

  const [featureStatsCache, setFeatureStatsCache] = useState({});   // cache: propId → stats (getPropertyStats)
  const [cdrId, setCdrId] = useState(_initialRuleId || "");         // schema CDR selezionato
  const [loading, setLoading] = useState(false);                    // flag di caricamento triage puntuale
  const [error, setError] = useState("");                           // messaggio di errore (se serve)

  const [measMap, setMeasMap] = useState(null);                     // alias “breve” per measurements
  const [triages, setTriages] = useState(null);                     // alias per struttura triages completa da /patients/get

  const [cdrFallbacks, setCdrFallbacks] = useState({ fav: null, vaType: null });


  // ========= Refs per norme/pesi =========
  const normaMapRef = React.useRef({});     // mappa { propKey: {min,max} } — popolata da getNormsJson / patientsDataJson
  const weightsMapRef = React.useRef({});   // mappa { propKey: weight }   — popolata da CDR schema / patientsDataJson

  // ========= Derivati utili =========
  const periodBounds = useMemo(() => {
    // Intervallo mostrato nel “riassunto” (badge score) e usato per payload triage
    if (!selectedDate) return null;
    return clampPeriodToDays(selectedDate, defaultDays); // {start,end} calcolati attorno a selectedDate
  }, [selectedDate, defaultDays]);

  const legacyMeasList = useMemo(() => toLegacyMeasList(measMap), [measMap]); // lista giorni per componenti legacy

  const [timelinePoints, setTimelinePoints] = useState([]); // punti timeline colorati (dal backend, CDR-specifici)
  const patientsDataRef = React.useRef(null);               // cache JSON locale con info aggiuntive

 const timelineMap = useMemo(() => buildTimelineMapRobust(timelinePoints), [timelinePoints]);


  // Hook: estrae tutte le date presenti nei segmenti e nella storia triage
  const segmentDates = useSegmentDates(measurements, triageHistoryMap);

  const [patientMeta, setPatientMeta] = useState(null);     // meta (es. FAV, tipo VA, ecc.)

// DEBUG: quanti punti timeline e che chiavi ha la mappa
useEffect(() => {
  console.log("[PatientCard] points:", timelinePoints?.length, timelinePoints?.slice?.(0, 3));
  console.log("[PatientCard] timelineMap keys:", Object.keys(timelineMap || {}).slice(0, 5));
}, [timelinePoints, timelineMap]);

// DEBUG: prime 5 segmentDates con colore/score da timelineMap
    useEffect(() => {
      if (!segmentDates?.length) return;
      const sample = segmentDates.slice(0, 5).map(d => ({
        d,
        color: timelineMap?.[d]?.color ?? "(none)",
        score: timelineMap?.[d]?.score ?? null,
      }));
      console.table(sample);
    }, [segmentDates, timelineMap]);

    // Unisci date: segmentDates + date dei points (per uso eventuale)
    const datesForTimeline = useMemo(() => {
      const fromPoints  = (timelinePoints || []).map(p => String(p.date).slice(0, 10));
      const fromSegment = Array.isArray(segmentDates) ? segmentDates : [];
      return Array.from(new Set([...fromSegment, ...fromPoints])).sort();
    }, [segmentDates, timelinePoints]);

    // Periodi calcolati per hover/click (usa defaultDays)
    const hoverPeriod = useMemo(() => {
      return hoverDate ? makePeriodFromDaysBack(hoverDate, defaultDays) : null;
    }, [hoverDate, defaultDays]);

    const selectedPeriod = useMemo(() => {
      return selectedDate ? makePeriodFromDaysBack(selectedDate, defaultDays) : null;
    }, [selectedDate, defaultDays]);

  useEffect(() => {
  (async () => {
    try {
      const resp = await getNicknames();                // compat: {data} o diretto
      const map = resp?.data ?? resp ?? {};
      setNicknames(map);
    } catch {
      setNicknames({});
    }
  })();
}, []);

const handleSaveNickname = async (newNickname) => {
  await saveNickname({}, { patientId, nickname: newNickname }); // puoi passare apiOpts qui
  setNicknames((prev) => ({ ...prev, [patientId]: newNickname })); // aggiorna UI locale
};


  useEffect(() => {
    console.log("[PatientCard] points:", timelinePoints?.length, timelinePoints?.slice?.(0, 3));
    console.log("[PatientCard] timelineMap keys:", Object.keys(timelineMap || {}).slice(0, 5));
  }, [timelinePoints, timelineMap]);

  useEffect(() => {
    if (!segmentDates?.length) return;
    const sample = segmentDates.slice(0, 5).map(d => ({
      d,
      color: timelineMap?.[d]?.color ?? "(none)",
      score: timelineMap?.[d]?.score ?? null,
    }));
    console.table(sample);
  }, [segmentDates, timelineMap]);

 
  // ======================================================================
  // EFFECT 1 — Inizializzazione ontologia + nicknames + dati statici
  // Carica una volta all'avvio della card:
  //   - Ontologia (per elenchi/etichette)
  //   - Nicknames (per editor nickname)
  //   - PatientsDataJson (eventuali mappe locali)
  // ======================================================================
  useEffect(() => {
    (async () => {
      try {
        const [onto, names, pjson] = await Promise.all([
          getOntologyJson(),     // → struttura proprietà
          getNicknames(),        // → { patientId: nickname }
          getPatientsDataJson(), // → JSON locale con eventuali mapping utili
        ]);
        setOntology(onto || null);
        setNicknames(names || {});
        patientsDataRef.current = pjson || null;
      } catch (e) {
        console.error("Errore init ontology/nicknames:", e);
        setOntology(null);
        setNicknames({});
      }
    })();
  }, []);

  // ======================================================================
  // EFFECT 2 — Carica “meta + misure + triages” dal backend /patients/get
  // Si attiva quando cambia il paziente.
  // Aggiorna:
  //   - patientMeta, measMap, triages, triageHistoryMap, historyBounds
  // ======================================================================
  useEffect(() => {
    if (!patientId) return;
    (async () => {
      try {
        const resp = await postPatientsGet({ id: String(patientId) });
        const data = unwrapData(resp);                         // compat: {data:...} o oggetto diretto
        const ms = data?.measurements || null;
        const triagesValues = data?.triages?.values || null;

        setPatientMeta(data?.patientMeta ?? null);             // meta paziente
        setMeasMap(ms);                                       // mappa misure per prop
        setTriages(data?.triages ?? null);                    // struttura triages completa
        setTriageHistoryMap(triagesValues);                   // mappa storia triage → { "YYYY-MM-DD": {...} }
        setMeasurements(ms);                                  // mantieni anche “measurements” completo
        setHistoryBounds(calcHistoryBoundsFromMeasurements(ms)); // {from,to} calcolati sulle misure
      } catch (e) {
        console.error("patients/get error", e);
        setPatientMeta(null);
        setMeasMap(null);
        setTriages(null);
        setTriageHistoryMap(null);
        setMeasurements(null);
        setHistoryBounds(null);
      }
    })();
  }, [patientId]);

// ======================================================================
// EFFECT 3 — Timeline (colori) + Schema CDR (pesi) + Fallback testuali
// Si attiva quando cambiano patientId o cdrId.
// - getTimelinePoints → punti [{date,color,...}]  → normalizeTimelinePoints(...)
// - getCdrById       → schema.params.weights     → parseWeightsMap(...)
// - setCdrFallbacks  → "n/d" per campi gestiti dal CDR (FAV/VA)
// ======================================================================
  useEffect(() => {
    if (!patientId || !cdrId) return;
    (async () => {
      try {
        const [rawPoints, schema] = await Promise.all([
          getTimelinePoints({ id: patientId, cdr: cdrId }),
          getCdrById(cdrId),
        ]);

        // --- timeline ---
        setTimelinePoints(normalizeTimelinePoints(rawPoints)); // utilsPatient: normalizza nomi/HEX

        // --- pesi & fallback ---
        const weights = schema?.params?.weights || {};
        weightsMapRef.current = parseWeightsMap(weights);       // utilsPatient

        setCdrFallbacks({
          fav:    (weights?.FAV != null) ? "n/d" : null,
          vaType: (weights?.vascular_access_type != null) ? "n/d" : null,
        });
      } catch (e) {
        console.error("timeline/schema CDR error", e);
        setTimelinePoints([]);
        weightsMapRef.current = {};
        setCdrFallbacks({ fav: null, vaType: null });
      }
    })();
  }, [patientId, cdrId]);




  // effetto che popola la lista CDR (se vuoi tenerlo, non dà fastidio)
  useEffect(() => {
    (async () => {
      try {
        const list = await getCdrsJson();
        setCdrList(Array.isArray(list) ? list : []);
      } catch {
        setCdrList([]);
      }
    })();
  }, []);

  // ======================================================================
  // EFFECT 4 — (versione precedente) CDR da Ontologia + default cdrId
  // Torna alla logica “vecchia”: prendi gli ID CDR da onto.CDRs e setta cdrId di default.
  // ======================================================================
  useEffect(() => {
    (async () => {
      try {
        // === come nella versione vecchia ===
        const ontoResp  = await getOntologyJson();     // o getOntology()
        const nicksResp = await getNicknames();

        const onto  = ontoResp?.data  ?? ontoResp;
        const nicks = nicksResp?.data ?? nicksResp;

        setOntology(onto || null);
        setNicknames(nicks || {});

        // ⬅️ vecchia logica: ID CDR presi dall'ontologia
        const ids = Object.keys(onto?.CDRs || {});   // ["CDR1", "CDR2", ...]
        setCdrList(ids);

        // default CDR (come prima)
        if (!cdrId && ids.length > 0) {
          setCdrId(ids[0]);
        }
      } catch (e) {
        console.error("Errore init ontology/nicknames:", e);
        setCdrList([]);
      }
    })();
  }, []);

  // ======================================================================
  // EFFECT 5 — Carica norme (range {min,max}) da file/servizio
  // Popola normaMapRef. Le norme servono per evidenziare i target in tabella.
  // ======================================================================
  useEffect(() => {
    (async () => {
      try {
        const norms = await getNormsJson();                   // [{ key, min, max }, ...] o struttura analoga
        normaMapRef.current = parseNormsMap(norms);           // normalizza in { key: {min,max} }
      } catch (e) {
        console.error("norms load error", e);
        normaMapRef.current = {};
      }
    })();
  }, []);

  // ======================================================================
  // EFFECT 6 — Carica triage PUNTUALE quando cambia selectedDate (o cdrId)
  // Se “frozen” e non c’è una data iniziale, non chiama (rispetta la card congelata).
  // Integra i pesi nelle righe (mergeRowWeights) e normalizza la risposta.
  // ======================================================================
  useEffect(() => {
    (async () => {
      if (!patientId || !cdrId) return;
      if (frozen && !_initialSelectedDate) return;
      if (!selectedDate) {
        setSelectedTriage(null);
        return;
      }

      setLoading(true);
      try {
        const { from, to } = makePeriodFromDaysBack(selectedDate, defaultDays); // costruisce periodo
        const payload = {
          id: String(patientId),
          date: toYYYYMMDD(selectedDate), // data selezionata
          period: { from, to },           // finestra [from,to]
          ruleId: String(cdrId),          // schema CDR scelto
        };
        const resp = await postPatientTriage(payload);
        let tri = normalizeTriageResponse(resp, selectedDate); // oggetto {score, colorHex, detailsRows}

        // Integra pesi (se presenti da schema CDR o da mapping locale)
        if (tri && Array.isArray(tri.detailsRows)) {
          tri = {
            ...tri,
            detailsRows: mergeRowWeights(tri.detailsRows, weightsMapRef.current),
          };
        }

        setSelectedTriage(tri); // aggiorna triage normalizzato per la data
        setError("");
      } catch (e) {
        console.error("Errore triage puntuale:", e);
        setSelectedTriage(null);
        setError("Impossibile calcolare il triage per la data selezionata.");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, cdrId, selectedDate, frozen, _initialSelectedDate, defaultDays]);

  // ======================================================================
  // EFFECT 7 — Prefetch statistiche proprietà per le righe visibili
  // Evita richieste ripetute grazie a featureStatsCache.
  // ======================================================================
  useEffect(() => {
    const rows = selectedTriage?.detailsRows;
    if (!Array.isArray(rows)) return;

    const uniqueProps = collectUniqueProps(rows); // estrae propId unici dalle righe
    uniqueProps.forEach(async (propId) => {
      if (featureStatsCache[propId]) return;      // cache hit → skip
      try {
        const stats = await getPropertyStats(propId); // chiama servizio
        setFeatureStatsCache((prev) => ({ ...prev, [propId]: stats }));
      } catch (e) {
        console.error("Errore fetch stats prop:", e);
      }
    });
  }, [selectedTriage, featureStatsCache]);

  // ===============================================================
  // HANDLE — Selezione data dalla timeline
  // ===============================================================
  // COSA FA:
  //  - se “Confronto periodi” è attivo → chiede al Canvas di creare card gemella
  //  - altrimenti imposta la data selezionata e apre i dettagli
  // ===============================================================
  // Quando clicco una data nella Timeline:

    const handleSelectDate = (dateStr) => {
      console.log("[PatientCard] click date:", dateStr, "comparison:", comparisonMode);

      if (comparisonMode) {
        // crea la card gemella con data iniziale e auto-espansione
        onRequestCreateSiblingCard?.({
          patientId,
          date: dateStr,
          ruleId: cdrId,
          autoExpand: true,   // 👈 passerà al Canvas (vedi punto C)
        });
        return; // NON tocco la card corrente
      }

      // Modalità normale (senza confronto): aggiorno questa card
      setSelectedDate(dateStr);   // EFFECT 6 farà /patients/triage
      onRequestExpand?.();        // apro i dettagli di questa card
    };


  // ===============================================================
  // HANDLE — Cambio aggregazione (avg/min/max) per una riga
  // ===============================================================
  // COSA FA:
  //  - aggiorna in-place la riga con key === paramKey
  //  - imposta aggregate e ricalcola value usando _agg.{avg|min|max}
  // DOVE SI USA:
  //  - passato a <ParametersTable onChangeAgg={handleChangeAgg} />

  const handleChangeAgg = (paramKey, agg) => {
    setSelectedTriage((prev) => {
      if (!prev || !Array.isArray(prev.detailsRows)) return prev;

      const rows = prev.detailsRows.map((r) => {
        if (r.key !== paramKey) return r;

        const nextVal =
          agg === "min" ? (r._agg?.min ?? null)
        : agg === "max" ? (r._agg?.max ?? null)
        :                 (r._agg?.avg ?? null);
        return {
          ...r,
          aggregate: agg,
          value: nextVal != null
            ? Number((nextVal.toFixed?.(2) ?? nextVal))
            : null,
        };
      });

      return { ...prev, detailsRows: rows };
    });
  };

  // ======================================================================
  // EFFECT — Se la card nasce con _initialSelectedDate o con _autoExpand,
  // chiedi SUBITO l’espansione. La richiesta del triage riempirà i dettagli.
  // ======================================================================
  useEffect(() => {
    if (_initialSelectedDate || _autoExpand) {
      // piccola deferenza: evitiamo che la misura iniziale del wrapper
      // (220px) sovrascriva l'altezza; chiediamo l'espansione al tick successivo
      const t = setTimeout(() => onRequestExpand?.(), 0);
      return () => clearTimeout(t);
    }
  }, []);



  // Wrapper: calcola la norma per un parametro usando triageRows + normaMapRef
  const getNormaFor = (paramKey) =>
    getNormaForFromMaps(paramKey, selectedTriage?.detailsRows, normaMapRef.current);

  // Colore badge “score” in header (selected > hover > default)
 const scoreHex = getScoreHexForDate(timelineMap, selectedDate, hoverDate);



  // colori per Timeline
  const getColorForDate = useCallback(
    (d) => getColorHexForDate(timelineMap, d), // ritorna HEX
    [timelineMap]
  );


  useEffect(() => {
    console.log("[PatientCard] patientId:", patientId, "cdrId:", cdrId);
  }, [patientId, cdrId]);

  useEffect(() => {
    console.log("[PatientCard] points:", timelinePoints?.length, timelinePoints?.slice?.(0,3));
    console.log("[PatientCard] timelineMap keys:", Object.keys(timelineMap || {}).slice(0,5));
  }, [timelinePoints, timelineMap]);


return (
  /* ===============================================================
     WRAPPER CARD — bordo colorato (scoreHex calcolato da timeline)
     =============================================================== */
  <div
    className="relative bg-white border border-gray-200 rounded-2xl shadow-sm p-3 pb-4 w-full h-full min-h-[150px] overflow-y-auto select-none"
    style={{ borderColor: scoreHex }}
  >

    {/* ===============================================================
        BLOCCO 1 — RIGA INTESTAZIONE (patient, nickname+salva, CDR, confronto)
        L’header blu esterno resta gestito dal Canvas/AppContext.
       =============================================================== */}
    <div className="grid grid-cols-12 gap-3 items-end mb-2">

      {/* 1.1 patient (solo lettura, mostra ID paziente) */}
      <div className="col-span-3">
        <label className="block text-xs text-gray-500">patient</label>
        <input
          className="w-full border rounded px-2 py-1 bg-gray-50 text-center"
          value={patientId}
          readOnly
        />
      </div>

      {/* 1.2 nickname + bottone salva (usa il tuo NicknameEditor) */}
      <div className="col-span-4">
        <label className="block text-xs text-gray-500">nickname</label>
        <NicknameEditor
          patientId={patientId}
          nickname={nicknames?.[patientId] ?? ""}
          
          onSave={(newNick) => {
            setNicknames((prev) => ({ ...prev, [patientId]: newNick }));
          }}
          autosaveOnBlur={true}
          hideButton={false}
        />
      </div>


      {/* 1.3 selettore CDR */}
      <div className="col-span-3">
        <label className="block text-xs text-gray-500">CDR</label>
        <select
          className="w-full border rounded px-2 py-1 bg-white"
          value={cdrId}
          onChange={(e) => setCdrId(e.target.value)} 
          /* cambia CDR → gli useEffect ricaricano schema, pesi e timeline */
        >
          <option value="">-- Seleziona --</option>
          {cdrList.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>


    </div>

    {/* ===============================================================
        BLOCCO 2 — TIMELINE (barra segmentata colorata)
        - dates: unione segmentDates + punti timeline (normalizzati)
        - getColorForDate: prende da timelineMap[d]?.color (nome o HEX)
       =============================================================== */}
    <div className="shrink-0">
      <Timeline
       dates={datesForTimeline}
        startDate={historyBounds?.from || ""}    /* bounds calcolati da /patients/get */
        endDate={historyBounds?.to || ""}
        onHoverDate={setHoverDate}               /* setter locale: aggiorna hoverDate */
        onSelectDate={handleSelectDate}          /* definita sotto: seleziona data e apre dettagli */
        getColorForDate={(d) => timelineMap?.[d]?.color || "gray"} 
        /* timelineMap: creato con buildTimelineMap(...) in utilsPatient.js */
      />
    </div>

    {/* ===============================================================
        BLOCCO 3 — META DELLA TIMELINE (periodo hover + select vista)
       =============================================================== */}
      <div className="mt-2 mb-3 px-1">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 min-h-[1.25rem]">
            {hoverPeriod
              ? `Period: ${hoverPeriod.from} / ${hoverPeriod.to}`
              : selectedPeriod
                ? `Period: ${selectedPeriod.from} / ${selectedPeriod.to}`
                : " "}

          </div>
          <div>
            <select className="border rounded px-2 py-1 text-sm bg-white" defaultValue="meas">
              <option value="meas">Patient measurements</option>
            </select>
          </div>
        </div>
      </div>


    {/* ===============================================================
        BLOCCO 5 — DETTAGLIO TRIAGE (solo se c’è selectedDate + selectedTriage)
        Badge centrale colorato con scoreHex; tabella parametri sotto.
       =============================================================== */}
    {selectedDate && selectedTriage && (
      <div className="mt-2 border-t pt-3 flex-1 overflow-auto">
{/* 5.1 intestazione: accessi + bottone chiudi */}
    <div className="grid grid-cols-12 gap-3 items-end mb-3">
      {/* Type of vascular access */}
      <div className="col-span-5">
        <label className="block text-xs text-gray-500">Type of vascular access</label>
        <div className="border rounded px-2 py-1 bg-gray-50 text-sm">
          {
            getFromRowsFlexible(selectedTriage?.detailsRows, "vascular_access_type")
            ?? getFromMeasMapFlexible(measMap, "vascular_access_type")
            ?? patientMeta?.vascular_access_type
            ?? cdrFallbacks.vaType
            ?? "n/d"
          }
        </div>
      </div>

          {/* ===============================================================
        BLOCCO 4 — ACCESSO VASCOLARE + FAV
        Usa gli helper flessibili (utils/rows.js) + fallback “n/d” da CDR.
       =============================================================== */}

      {/* FAV */}
      <div className="col-span-5">
        <label className="block text-xs text-gray-500">FAV</label>
        <div className="border rounded px-2 py-1 bg-gray-50 text-sm">
          {(() => {
            const v =
              getFromRowsFlexible(selectedTriage?.detailsRows, "fav")
              ?? getFromMeasMapFlexible(measMap, "fav")
              ?? (patientMeta?.FAV ?? patientMeta?.fav);
            if (v === undefined || v === null) return cdrFallbacks.fav ?? "n/d";
            if (typeof v === "boolean") return v ? "true" : "false";
            return String(v);
          })()}
        </div>
      </div>

      {/* Pulsante Chiudi (sulla stessa riga) */}
      <div className="col-span-2 flex justify-end items-end">
        <button
          data-no-drag
          className="px-3 py-1 text-sm  rounded-lg border-2 mb-1 border-red-400 text-red-700 bg-white hover:bg-red-50 shadow-sm transition-colors"
          title="Chiudi dettagli"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDate(null);
            setSelectedTriage(null);
            onRequestCollapse?.(); // richiude la card nel Canvas
          }}
          aria-label="Chiudi dettagli"
        >
          X
        </button>
      </div>

    </div>

    {/* 5.2 seconda riga: periodo e score */}
    <div className="flex items-center justify-between mb-3">
      {/* Sinistra: Periodo + Checkbox */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            {selectedPeriod
              ? `Period: ${selectedPeriod.from} / ${selectedPeriod.to}`
              : hoverPeriod
                ? `Period: ${hoverPeriod.from} / ${hoverPeriod.to}`
                : ""}
          </div>

          <label className="inline-flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.checked)}
            />
            <span>Confronto periodi</span>
          </label>
        </div>

        {/* Destra: badge score (invariato) */}
        <div
          className="flex items-center justify-center rounded-md py-1 ml-8"
          title="Score generale sul periodo"
        >
          <span className="mr-1 text-xs text-gray-900">score:</span>
          <span
            className="min-w-[64px] px-3 py-2 rounded-lg text-white text-sm font-semibold text-center inline-block"
            style={{ backgroundColor: scoreHex }}
          >
            {selectedTriage?.score != null ? `${selectedTriage.score}%` : "n/d"}
          </span>
        </div>
    </div>

    {/* 5.3 tabella parametri */}
    {Array.isArray(selectedTriage.detailsRows) && selectedTriage.detailsRows.length > 0 ? (
      <ParametersTable
        rows={selectedTriage.detailsRows}
        aggOptions={["avg", "min", "max"]}
        onChangeAgg={handleChangeAgg}
        onToggleChart={setChartOpenFor}
        onToggleRaw={setRawOpenFor}
        isChartOpen={chartOpenFor}
        isRawOpen={rawOpenFor}
        getNormaFor={getNormaFor}
        periodFrom={periodBounds?.start}
        periodTo={periodBounds?.end}
      />
    ) : (
      <div className="text-xs text-gray-500 italic">
        Dettagli parametro non disponibili.
      </div>
    )}
        
      </div>
    )}
  </div>
);
};

export default PatientCard;
