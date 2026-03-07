
// ======================================================================
// Helper CONDIVISI e API NON usate dal widget Patient.
// - getBackendBase: calcola la base URL
// - fetchJson: fetch semplificata con timeout
// - safeEnv: legge variabili d'ambiente in modo compatibile (Vite/Node)
// ----------------------------------------------------------------------
// Qui potrai anche mettere, in futuro, le API NON usate dal Patient.
// ======================================================================

// --------------------------------------------------------------
// safeEnv(key)
// --------------------------------------------------------------
//  COSA FA: legge una variabile d'ambiente in modo robusto.
//  INPUT:  - key → string (es. "VITE_BACKEND_BASE")
//  OUTPUT: string ("" se non definita)
// --------------------------------------------------------------
export const safeEnv = (key) => {
  if (typeof import.meta !== "undefined" && import.meta?.env?.[key]) {
    return import.meta.env[key]; // Vite
  }
  if (typeof process !== "undefined" && process?.env?.[key]) {
    return process.env[key]; // Node
  }
  return "";
};

// --------------------------------------------------------------
// getBackendBase(baseUrl)
// --------------------------------------------------------------
//  COSA FA: restituisce la base URL del backend (pulita).
//  INPUT:  - baseUrl → string (opzionale); se assente usa ENV o "".
//  OUTPUT: string (es. "http://localhost:5000" oppure "")
//  NOTE: se non hai un backend, può tornare "" e i caller useranno fallback.
// --------------------------------------------------------------
export const getBackendBase = (baseUrl) => {
  if (baseUrl) return String(baseUrl).replace(/\/+$/, ""); // rimuove "/" finali
  const fromEnv = safeEnv("VITE_BACKEND_BASE");
  return String(fromEnv || "").replace(/\/+$/, "");
};

// --------------------------------------------------------------
// fetchJson(url, options)
// --------------------------------------------------------------
//  COSA FA: esegue una fetch semplice e ritorna JSON.
//  INPUT:  - url → string
//          - options → { method, headers, body, timeoutMs }
//  OUTPUT: qualsiasi (JSON)
//  NOTE: timeout semplice (AbortController).
// --------------------------------------------------------------
export const fetchJson = async (url, options = {}) => {
  const { timeoutMs = 8000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal, ...rest });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
};



//  lista pazienti semplificata per pagine admin
export const listPatientsFromJson = async (opts = {}) => {
  const data = await getPatientsDataJson(opts); // puoi importarla se serve
  const arr = Array.isArray(data?.patients) ? data.patients : [];
  return arr.map(p => ({ id: p.id, nickname: p.nickname || p.name || "" }));
};



// --------------------------------------------------------------
// listPatients(opts = {})
// --------------------------------------------------------------
//  COSA FA: elenca i pazienti in modo semplice (per admin/pagine elenco).
//  OUTPUT: array di pazienti (struttura lato backend).
//  API USATE: GET `${base}/patients`
// --------------------------------------------------------------
export const listPatients = async (opts = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("listPatients: baseUrl non configurata");

  const url = `${base}/patients`;
  return await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};

// --------------------------------------------------------------
// getPatientById(opts = {}, patientId)
// --------------------------------------------------------------
//  COSA FA: ottiene i dettagli di un singolo paziente (non le serie).
//  API USATE: GET `${base}/patients/{id}`
// --------------------------------------------------------------
export const getPatientById = async (opts = {}, patientId) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("getPatientById: baseUrl non configurata");

  const url = `${base}/patients/${encodeURIComponent(patientId)}`;
  return await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};

// --------------------------------------------------------------
// createPatient(opts = {}, payload)
// --------------------------------------------------------------
//  COSA FA: crea un nuovo paziente (admin).
//  API USATE: POST `${base}/patients`
// --------------------------------------------------------------
export const createPatient = async (opts = {}, payload = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("createPatient: baseUrl non configurata");

  const url = `${base}/patients`;
  return await fetchJson(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs,
  });
};

// --------------------------------------------------------------
// updatePatient(opts = {}, patientId, payload)
// --------------------------------------------------------------
//  COSA FA: aggiorna dati anagrafici/meta di un paziente.
//  API USATE: PUT `${base}/patients/{id}`
// --------------------------------------------------------------
export const updatePatient = async (opts = {}, patientId, payload = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("updatePatient: baseUrl non configurata");

  const url = `${base}/patients/${encodeURIComponent(patientId)}`;
  return await fetchJson(url, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs,
  });
};

// --------------------------------------------------------------
// deletePatient(opts = {}, patientId)
// --------------------------------------------------------------
//  COSA FA: elimina un paziente (admin).
//  API USATE: DELETE `${base}/patients/{id}`
// --------------------------------------------------------------
export const deletePatient = async (opts = {}, patientId) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("deletePatient: baseUrl non configurata");

  const url = `${base}/patients/${encodeURIComponent(patientId)}`;
  return await fetchJson(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};


// ======================================================================
// API NON usate dal widget Patient → utili per dashboard o admin future.
// ======================================================================

// --------------------------------------------------------------
// getSystemStats(opts = {})
// --------------------------------------------------------------
//  COSA FA: ottiene statistiche globali sul sistema (utenti, pazienti, triage totali, ecc.)
//  OUTPUT: JSON con conteggi o valori aggregati.
//  API USATE: GET `${base}/stats/system`
// --------------------------------------------------------------
export const getSystemStats = async (opts = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("getSystemStats: baseUrl non configurata");

  const url = `${base}/stats/system`;               // endpoint per statistiche globali
  return await fetchJson(url, {
    method: "GET",                                  // GET → nessun body
    headers: { Accept: "application/json" },        // chiede JSON
    timeoutMs,
  });
};

// --------------------------------------------------------------
// getUsageStats(opts = {}, params)
// --------------------------------------------------------------
//  COSA FA: ottiene statistiche di utilizzo (interazioni, frequenza widget, ecc.)
//  OUTPUT: JSON di statistiche aggregate per periodo.
//  API USATE: GET `${base}/stats/usage?...`
// --------------------------------------------------------------
export const getUsageStats = async (opts = {}, params = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("getUsageStats: baseUrl non configurata");

  const query = new URLSearchParams(params).toString(); // crea query es. "?from=2024-01-01&to=2024-01-31"
  const url = `${base}/stats/usage${query ? "?" + query : ""}`;
  return await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};


// ======================================================================
// API NON usate dal widget Patient → funzioni di amministrazione norme.
// ======================================================================

// --------------------------------------------------------------
// updateNormsJson(opts = {}, payload)
// --------------------------------------------------------------
//  COSA FA: invia al backend un nuovo set di norme da salvare.
//  INPUT:   - opts.baseUrl, opts.timeoutMs
//           - payload → oggetto con chiavi/valori delle norme aggiornate
//  OUTPUT:  risposta del backend (es. "Norme aggiornate correttamente").
//  API USATE: PUT `${base}/norms.json`
// --------------------------------------------------------------
export const updateNormsJson = async (opts = {}, payload = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("updateNormsJson: baseUrl non configurata");

  const url = `${base}/norms.json`;                 // endpoint backend norme
  return await fetchJson(url, {
    method: "PUT",                                  // aggiorna file norme
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),                  // invia nuove norme
    timeoutMs,
  });
};

// --------------------------------------------------------------
// deleteNormsSet(opts = {}, id)
// --------------------------------------------------------------
//  COSA FA: elimina un set di norme dal backend (uso admin).
//  INPUT:   - id → identificativo del set di norme
//  OUTPUT:  conferma eliminazione.
//  API USATE: DELETE `${base}/norms/{id}`
// --------------------------------------------------------------
export const deleteNormsSet = async (opts = {}, id) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("deleteNormsSet: baseUrl non configurata");

  const url = `${base}/norms/${encodeURIComponent(id)}`;
  return await fetchJson(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};

// ======================================================================
// API NON usate dal widget Patient — gestione ontologia (admin/future)
// ======================================================================

// --------------------------------------------------------------
// listOntologyTerms(opts = {})
// --------------------------------------------------------------
//  COSA FA: elenca tutti i “termini” o “proprietà” dell’ontologia.
//  API USATE: GET `${base}/ontology/terms`
// --------------------------------------------------------------
export const listOntologyTerms = async (opts = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("listOntologyTerms: baseUrl non configurata");

  const url = `${base}/ontology/terms`;
  return await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};

// --------------------------------------------------------------
// updateOntologyTerm(opts = {}, termId, payload = {})
// --------------------------------------------------------------
//  COSA FA: aggiorna un termine (metadati, label, unità, etc.).
//  API USATE: PUT `${base}/ontology/terms/{termId}`
// --------------------------------------------------------------
export const updateOntologyTerm = async (opts = {}, termId, payload = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("updateOntologyTerm: baseUrl non configurata");

  const url = `${base}/ontology/terms/${encodeURIComponent(termId)}`;
  return await fetchJson(url, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs,
  });
};

// --------------------------------------------------------------
// deleteOntologyTerm(opts = {}, termId)
// --------------------------------------------------------------
//  COSA FA: elimina un termine dall'ontologia.
//  API USATE: DELETE `${base}/ontology/terms/{termId}`
// --------------------------------------------------------------
export const deleteOntologyTerm = async (opts = {}, termId) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("deleteOntologyTerm: baseUrl non configurata");

  const url = `${base}/ontology/terms/${encodeURIComponent(termId)}`;
  return await fetchJson(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};

// --------------------------------------------------------------
// fetchAndExtractPropNames(opts = {})
// --------------------------------------------------------------
//  COSA FA: scarica l'ontologia dal backend o file statico,
//           e ne estrae i nomi delle proprietà cliniche (chiavi).
//  INPUT:   - opts.baseUrl   → base del backend (opzionale)
//           - opts.timeoutMs → tempo massimo per fetch
//  OUTPUT:  array di stringhe con i nomi proprietà (es. ["urea_pre", "ktv", "peso"])
//  DOVE SI USA: PropertyStatsWidget.jsx (per popolare combobox delle proprietà).
//  API USATE: GET `${base}/ontology.json` (tramite getOntologyJson).
// --------------------------------------------------------------
import { extractPropNamesFromOntology } from "@/utils/statsUtil"; // <--- IMPORTA la funzione esposta

export const fetchAndExtractPropNames = async (opts = {}) => {
  // 1 scarica l'ontologia
  const ontology = await getOntologyJson(opts);

  // 2 se non c'è ontologia → ritorna un piccolo fallback
  if (!ontology || typeof ontology !== "object") {
    console.warn("[fetchAndExtractPropNames] Ontologia non disponibile");
    return ["urea_pre", "urea_post", "peso", "ktv", "emoglobina"]; // fallback base
  }

  // 3 estrai i nomi delle proprietà usando la funzione centralizzata
  const names = extractPropNamesFromOntology(ontology);

  // 4 ritorna il risultato (array di stringhe)
  return names;
};


// --------------------------------------------------------------
// getCdrsJson(opts = {})
// --------------------------------------------------------------
//  COSA FA: scarica l’elenco dei modelli CDR dal backend o da file statico.
//  INPUT:   - opts.baseUrl     → base del backend (opzionale)
//           - opts.timeoutMs  → timeout (ms) (default 8000)
//  OUTPUT:  array o oggetto CDR (es. [{ id: "cd1", label: "...", rules: [...] }, ...])
//  DOVE SI USA: PatientCard.jsx (per popolare il menu CDR e applicare le regole di score).
//  API USATE: GET `${base}/cdrs.json` oppure file statico `/cdrs_emodialisi.json`
// --------------------------------------------------------------
export const getCdrsJson = async (opts = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;           // opzioni rete
  const base = getBackendBase(baseUrl);                 // normalizza base URL

  // 1 tenta dal backend
  if (base) {
    const url = `${base}/cdrs.json`;                   // endpoint backend (es. /api/cdrs.json)
    try {
      const data = await fetchJson(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        timeoutMs,
      });
      return data;                                     // ok → ritorna JSON CDR
    } catch (err) {
      console.warn("[cdrsApi] Backend non disponibile:", err?.message || err);
    }
  }

  // 2 fallback: file statico “updated”
  try {
    const url = `/cdrs_emodialisi.updated.json?t=${Date.now()}`;
    const data = await fetchJson(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs,
    });
    return data;                                       // ritorna versione aggiornata
  } catch (err) {
    console.warn("[cdrsApi] updated.json non trovato:", err?.message || err);
  }

  // 3 fallback finale: file base
  try {
    const url = `/cdrs_emodialisi.json?t=${Date.now()}`;
    const data = await fetchJson(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs,
    });
    return data;                                       // ritorna base
  } catch (err) {
    console.error("[cdrsApi] nessuna fonte CDR disponibile:", err?.message || err);
  }

  return null;                                         // tutte le fonti fallite
};

// --------------------------------------------------------------
// getCdrById(cdrList, cdrId)
// --------------------------------------------------------------
//  COSA FA: ricerca un modello CDR per ID all’interno dell’elenco scaricato.
//  INPUT:   - cdrList → array ritornato da getCdrsJson()
//           - cdrId    → stringa ID (es. "cd1")
//  OUTPUT:  oggetto CDR o null se non trovato.
//  DOVE SI USA: PatientCard.jsx (quando l’utente seleziona un CDR nel menu).
//  API USATE: nessuna (usa solo i dati già in memoria).
// --------------------------------------------------------------
export const getCdrById = (cdrList, cdrId) => {
  if (!Array.isArray(cdrList)) return null;            // se non è array → null
  const idNorm = String(cdrId ?? "").trim().toLowerCase(); // normalizza ID
  const found = cdrList.find(
    (c) => String(c.id ?? "").trim().toLowerCase() === idNorm
  );
  return found || null;                                // ritorna oggetto o null
};


// ======================================================================
// API NON usate dal widget Patient → gestione avanzata CDR (admin)
// ======================================================================

// --------------------------------------------------------------
// createCdr(opts, payload)
// --------------------------------------------------------------
//  COSA FA: crea un nuovo modello CDR sul backend.
//  API USATE: POST `${base}/cdrs`
// --------------------------------------------------------------
export const createCdr = async (opts = {}, payload = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("createCdr: baseUrl non configurata");

  const url = `${base}/cdrs`;
  return await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    timeoutMs,
  });
};

// --------------------------------------------------------------
// updateCdr(opts, cdrId, payload)
// --------------------------------------------------------------
//  COSA FA: aggiorna un CDR esistente.
//  API USATE: PUT `${base}/cdrs/{cdrId}`
// --------------------------------------------------------------
export const updateCdr = async (opts = {}, cdrId, payload = {}) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("updateCdr: baseUrl non configurata");

  const url = `${base}/cdrs/${encodeURIComponent(cdrId)}`;
  return await fetchJson(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    timeoutMs,
  });
};

// --------------------------------------------------------------
// deleteCdr(opts, cdrId)
// --------------------------------------------------------------
//  COSA FA: elimina un CDR esistente dal backend.
//  API USATE: DELETE `${base}/cdrs/{cdrId}`
// --------------------------------------------------------------
export const deleteCdr = async (opts = {}, cdrId) => {
  const { baseUrl, timeoutMs = 8000 } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) throw new Error("deleteCdr: baseUrl non configurata");

  const url = `${base}/cdrs/${encodeURIComponent(cdrId)}`;
  return await fetchJson(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};



// ============================================================================================



// ======================================================================
// CANVAS APIs (NON usate dal widget Patient)
// Gestiscono il salvataggio/caricamento dello stato del canvas (layout,
// lista componenti, posizioni, dimensioni, flag frozen/collapsed, ecc.).
// Usate tipicamente da: pages/PlaygroundCanvas.jsx, context/AppContext.jsx
// ======================================================================


// --------------------------------------------------------------
// loadCanvasState(opts = {})
// --------------------------------------------------------------
//  COSA FA: carica lo stato del canvas (componenti + layout) dal backend
//           oppure, se vuoi, da localStorage (vedi note sotto).
//  INPUT:   - opts.baseUrl   → base backend (opzionale)
//           - opts.timeoutMs → timeout ms (default 8000)
//           - opts.canvasId  → ID del canvas (multi-canvas) opzionale
//  OUTPUT:  oggetto { components: [...], meta: {...} } oppure {components:[]}.
//  DOVE SI USA: all'avvio della pagina Canvas (PlaygroundCanvas.jsx).
//  API USATE: GET `${base}/canvas/state` (o `${base}/canvas/{id}/state`).
// --------------------------------------------------------------
export const loadCanvasState = async (opts = {}) => {
  const { baseUrl, timeoutMs = 8000, canvasId } = opts;   // opzioni rete + id canvas
  const base = getBackendBase(baseUrl);                    // normalizza base
  if (!base) {
    // 🔸 Se NON hai backend, piccolo fallback: tenta da localStorage
    try {
      const raw = localStorage.getItem("PLAYGROUND_CANVAS_STATE");
      return raw ? JSON.parse(raw) : { components: [] };
    } catch {
      return { components: [] };
    }
  }

  // 🔹 Con backend → GET
  const path = canvasId ? `/canvas/${encodeURIComponent(canvasId)}/state` : `/canvas/state`;
  const url = `${base}${path}`;
  return await fetchJson(url, {
    method: "GET",                                        // GET = solo lettura
    headers: { Accept: "application/json" },              // chiede JSON
    timeoutMs,                                            // timeout ms
  });
};

// --------------------------------------------------------------
// saveCanvasState(opts = {}, payload = {})
// --------------------------------------------------------------
//  COSA FA: salva l'intero stato del canvas sul backend (o localStorage).
//  INPUT:   - opts.baseUrl, opts.timeoutMs, opts.canvasId
//           - payload → { components: [...], meta: {...} }
//  OUTPUT:  risposta del backend o echo del salvataggio.
//  DOVE SI USA: quando aggiungi/rimuovi/sposti/ridimensioni componenti.
//  API USATE: POST `${base}/canvas/state` (o `${base}/canvas/{id}/state`).
// --------------------------------------------------------------
export const saveCanvasState = async (opts = {}, payload = {}) => {
  const { baseUrl, timeoutMs = 8000, canvasId } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) {
    // 🔸 Fallback locale: salva su localStorage se non c'è backend
    try {
      localStorage.setItem("PLAYGROUND_CANVAS_STATE", JSON.stringify(payload));
      return { ok: true, local: true };
    } catch (err) {
      console.error("[canvasApi] saveCanvasState localStorage error:", err?.message || err);
      return { ok: false, local: true, error: err?.message || String(err) };
    }
  }

  // 🔹 Con backend → POST
  const path = canvasId ? `/canvas/${encodeURIComponent(canvasId)}/state` : `/canvas/state`;
  const url = `${base}${path}`;
  return await fetchJson(url, {
    method: "POST",                                       // POST = salva stato
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),                        // payload completo dello stato
    timeoutMs,
  });
};

// --------------------------------------------------------------
// listComponents(opts = {})
// --------------------------------------------------------------
//  COSA FA: ritorna la lista componenti del canvas (solo l’elenco).
//  INPUT:   - opts.baseUrl, opts.timeoutMs, opts.canvasId
//  OUTPUT:  array di componenti [{ id, type, x, y, w, h, data, ... }]
//  DOVE SI USA: debug/tools o viste che elencano i widget presenti.
//  API USATE: GET `${base}/canvas/components` (o `/canvas/{id}/components`).
// --------------------------------------------------------------
export const listComponents = async (opts = {}) => {
  const { baseUrl, timeoutMs = 8000, canvasId } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) {
    // 🔸 Fallback: preleva da localStorage e ritorna solo components
    try {
      const raw = localStorage.getItem("PLAYGROUND_CANVAS_STATE");
      const js = raw ? JSON.parse(raw) : { components: [] };
      return Array.isArray(js?.components) ? js.components : [];
    } catch {
      return [];
    }
  }

  // 🔹 Con backend → GET
  const path = canvasId ? `/canvas/${encodeURIComponent(canvasId)}/components` : `/canvas/components`;
  const url = `${base}${path}`;
  return await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};

// --------------------------------------------------------------
// upsertComponent(opts = {}, component = {})
// --------------------------------------------------------------
//  COSA FA: crea o aggiorna UN componente nel canvas (upsert).
//  INPUT:   - component → { id?, type, x, y, w, h, data, frozen?, collapsed? }
//  OUTPUT:  oggetto componente aggiornato/creato.
//  DOVE SI USA: quando l’utente aggiunge una card o modifica posizione/size.
//  API USATE: POST `${base}/canvas/components/upsert` (o PUT su id).
// --------------------------------------------------------------
export const upsertComponent = async (opts = {}, component = {}) => {
  const { baseUrl, timeoutMs = 8000, canvasId } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) {
    // 🔸 Fallback locale: aggiorna l’array in localStorage
    try {
      const raw = localStorage.getItem("PLAYGROUND_CANVAS_STATE");
      const js = raw ? JSON.parse(raw) : { components: [] };
      const arr = Array.isArray(js?.components) ? js.components : [];

      const idx = arr.findIndex((c) => c?.id === component?.id);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...component };
      else arr.push({ id: component.id || crypto.randomUUID(), ...component });

      const next = { ...js, components: arr };
      localStorage.setItem("PLAYGROUND_CANVAS_STATE", JSON.stringify(next));
      return { ok: true, local: true, component: component };
    } catch (err) {
      console.error("[canvasApi] upsert local error:", err?.message || err);
      return { ok: false, local: true, error: err?.message || String(err) };
    }
  }

  // 🔹 Con backend → POST/PUT
  const path = canvasId ? `/canvas/${encodeURIComponent(canvasId)}/components/upsert` : `/canvas/components/upsert`;
  const url = `${base}${path}`;
  return await fetchJson(url, {
    method: "POST",                                       // upsert tramite POST
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(component),
    timeoutMs,
  });
};

// --------------------------------------------------------------
// removeComponent(opts = {}, componentId)
// --------------------------------------------------------------
//  COSA FA: elimina un componente dal canvas.
//  INPUT:   - componentId → string
//  OUTPUT:  conferma eliminazione
//  DOVE SI USA: quando l’utente rimuove una card dal canvas.
//  API USATE: DELETE `${base}/canvas/components/{id}` (o body con id).
// --------------------------------------------------------------
export const removeComponent = async (opts = {}, componentId) => {
  const { baseUrl, timeoutMs = 8000, canvasId } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) {
    // 🔸 Fallback locale: rimuovi dall’array in localStorage
    try {
      const raw = localStorage.getItem("PLAYGROUND_CANVAS_STATE");
      const js = raw ? JSON.parse(raw) : { components: [] };
      const arr = Array.isArray(js?.components) ? js.components : [];
      const nextArr = arr.filter((c) => c?.id !== componentId);
      const next = { ...js, components: nextArr };
      localStorage.setItem("PLAYGROUND_CANVAS_STATE", JSON.stringify(next));
      return { ok: true, local: true, removed: componentId };
    } catch (err) {
      console.error("[canvasApi] remove local error:", err?.message || err);
      return { ok: false, local: true, error: err?.message || String(err) };
    }
  }

  // 🔹 Con backend → DELETE
  const path = canvasId ? `/canvas/${encodeURIComponent(canvasId)}/components/${encodeURIComponent(componentId)}` : `/canvas/components/${encodeURIComponent(componentId)}`;
  const url = `${base}${path}`;
  return await fetchJson(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};

// --------------------------------------------------------------
// resetCanvas(opts = {})
// --------------------------------------------------------------
//  COSA FA: svuota completamente il canvas (tutti i componenti).
//  OUTPUT:  conferma reset.
//  DOVE SI USA: pulsante "Reset" nella pagina Canvas.
//  API USATE: POST `${base}/canvas/reset` (o DELETE `/canvas/components`).
// --------------------------------------------------------------
export const resetCanvas = async (opts = {}) => {
  const { baseUrl, timeoutMs = 8000, canvasId } = opts;
  const base = getBackendBase(baseUrl);
  if (!base) {
    // 🔸 Fallback locale
    localStorage.removeItem("PLAYGROUND_CANVAS_STATE");
    return { ok: true, local: true };
  }

  // 🔹 Con backend → POST reset
  const path = canvasId ? `/canvas/${encodeURIComponent(canvasId)}/reset` : `/canvas/reset`;
  const url = `${base}${path}`;
  return await fetchJson(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    timeoutMs,
  });
};
