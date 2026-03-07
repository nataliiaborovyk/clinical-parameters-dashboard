// ======================================================================
// API usate dal widget Patient (PatientCard.jsx & co) — versione pulita
// Coerenza: niente apiClient, niente withTimeout/fetchJSON; solo fetchJson.
// ======================================================================

/* ******************************************************************
 * 1) Mini-helper locali
 * ******************************************************************/
const baseOrProxy = (baseUrl) => (getBackendBase(baseUrl) || "");


/** Legge in modo sicuro una variabile d'ambiente. */
export const safeEnv = (key) => {
  if (typeof import.meta !== "undefined" && import.meta?.env?.[key]) {
    return import.meta.env[key]; // Vite
  }
  if (typeof process !== "undefined" && process?.env?.[key]) {
    return process.env[key];     // Node
  }
  return "";
};

/** fetch con timeout, ritorna JSON (solleva se HTTP non ok). */
export const fetchJson = async (url, options = {}) => {
  const { timeoutMs = 8000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal, ...rest });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} @ ${url}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
};

/** Normalizza una base URL togliendo gli slash finali. */
const cleanBase = (s) => String(s || "").replace(/\/+$/, "");

/** Base del backend: override → env VITE_BACKEND_BASE → default localhost:8001. */
const getBackendBase = (overrideBaseUrl) => {
  if (overrideBaseUrl) return cleanBase(overrideBaseUrl);

  // Vite (in ambienti dove import.meta non esiste, il try/catch evita errori di parsing)
  try {
    const v = import.meta?.env?.VITE_BACKEND_BASE;
    if (v) return cleanBase(v);
  } catch (_) { /* no Vite */ }

  return "http://127.0.0.1:8001";
};


/** Piccolo parser robusto per norme → { key: {min,max} } */
const parseNormsMap = (raw) => {
  if (!raw || typeof raw !== "object") return {};
  if (!Array.isArray(raw)) return raw; // già mappa { key: {min,max} }
  // Se è array, provo a convertirlo: [{key,min,max}] → mappa
  const out = {};
  for (const r of raw) {
    const k = r?.key || r?.id || r?.name;
    if (k) out[String(k)] = { min: r?.min ?? null, max: r?.max ?? null };
  }
  return out;
};

/** Querystring semplice da oggetto (filtra null/undefined). */
const qs = (obj = {}) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

/* ******************************************************************
 * 2) API — Pazienti / Playground
 * ******************************************************************/

/**
 * --------------------------------------------------------------
 * getPatientsDataJson(opts = {})
 * --------------------------------------------------------------
 * 1) backend → GET {base}/pazienti   (quello che ti funzionava)
 * 2) fallback → /pazienti_emodialisi.updated.json
 * 3) fallback → /pazienti_emodialisi.json
 */
export const getPatientsDataJson = async (opts = {}) => {
  const { baseUrl, timeoutMs = 5000 } = opts;
  const base = getBackendBase(baseUrl);
  const endpoint = `${base}/pazienti`;

  // 1) backend
  try {
    return await fetchJson(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs,
    });
  } catch (err) {
    console.warn("[patientsDataApi] Backend non disponibile:", err?.message || err);
  }

  // 2) statico updated
  try {
    return await fetchJson(`/pazienti_emodialisi.updated.json?t=${Date.now()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs,
    });
  } catch (err) {
    console.warn("[patientsDataApi] updated.json non trovato:", err?.message || err);
  }

  // 3) statico base
  try {
    return await fetchJson(`/pazienti_emodialisi.json?t=${Date.now()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs,
    });
  } catch (err) {
    console.error("[patientsDataApi] nessuna fonte dati pazienti:", err?.message || err);
  }

  return null;
};

/**
 * --------------------------------------------------------------
 * postPatientsGet(payload, options = {})
 * --------------------------------------------------------------
 * Richiede misure + triage (schema playground).
 * - payload: { id, CDR: { schema, params|null }, ... }
 * - options: { baseUrl?, timeoutMs?, compat? }
 */
export const postPatientsGet = async (payload, options = {}) => {
  const { baseUrl, timeoutMs = 8000, compat } = options;
  const base = baseOrProxy(baseUrl);
  const compatQS = compat ? "?compat=true" : "";
  const url = `${base}/playground/patients/get${compatQS}`;

  const data = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload || {}),
    timeoutMs,
  });
  return data?.playground_component || data || null;
};

/**
 * --------------------------------------------------------------
 * postPatientTriage(payload, opts)
 * --------------------------------------------------------------
 * Calcola il triage per un timestamp/periodo.
 * - payload: { id, CDR: { schema, params|null }, timestamp }
 */
export const postPatientTriage = async (payload, opts = {}) => {
  const base = getBackendBase(opts.baseUrl);
  return await fetchJson(`${base}/patients/triage`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    timeoutMs: opts.timeoutMs ?? 8000,
  });
};

/* ******************************************************************
 * 3) API — Nickname / Norme / Ontologia / CDR / Stats / Timeline
 * ******************************************************************/

/** GET mappa nicknames { id → nickname }. Accetta formati A/B/C. */
export const getNicknames = async (opts = {}) => {
  const base = getBackendBase(opts.baseUrl);
  try {
    const raw = await fetchJson(`${base}/nicknames`, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: opts.timeoutMs ?? 5000,
    });

    if (raw?.nicknames && typeof raw.nicknames === "object") return raw.nicknames; // A
    if (Array.isArray(raw)) { // C
      const out = {};
      for (const r of raw) {
        const id = r?.patientId || r?.id || r?.pid;
        const nick = r?.nickname || r?.name || r?.nick;
        if (id && nick) out[String(id)] = String(nick);
      }
      return out;
    }
    return (raw && typeof raw === "object") ? raw : {}; // B o fallback
  } catch (err) {
    console.warn("[widgetPatientApi] getNicknames errore:", err?.message || err);
    return {};
  }
};

/** Salva/aggiorna nickname per un paziente. */
export const saveNickname = async (patientId, nickname, opts = {}) => {
  const base = getBackendBase(opts.baseUrl);
  return await fetchJson(`${base}/nicknames/save`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ patientId, nickname }),
    timeoutMs: opts.timeoutMs ?? 5000,
  });
};

/** Valori di norma — prova backend /norme poi fallback statico. */
export const getNormsJson = async (opts = {}) => {
  const base = getBackendBase(opts.baseUrl);
  // 1) backend
  try {
    return await fetchJson(`${base}/norme`, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: opts.timeoutMs ?? 5000,
    });
  } catch {}

  // 2) statico
  try {
    return await fetchJson(`/valori_norma_emodialisi.json?t=${Date.now()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: opts.timeoutMs ?? 5000,
    });
  } catch {}

  return null;
};

/** Scarica norme e le rende mappa { key: {min,max} }. */
export const fetchAndParseNormsJson = async (opts = {}) => {
  const raw = await getNormsJson(opts);
  return parseNormsMap(raw);
};

/** Ontologia playground (properties, CDRs...). */
export const getOntologyJson = async (opts = {}) => {
  const base = baseOrProxy(opts.baseUrl);
  return await fetchJson(`${base}/playground/ontology`, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs: opts.timeoutMs ?? 5000,
  });
};

import { extractPropNamesFromOntology } from "@/utils/statsUtil";

/** Estrae i nomi proprietà dall’ontologia; fallback lista base. */
export const fetchAndExtractPropNames = async (opts = {}) => {
  const ontology = await getOntologyJson(opts);
  if (!ontology || typeof ontology !== "object") {
    console.warn("[fetchAndExtractPropNames] Ontologia non disponibile");
    return ["urea_pre", "urea_post", "peso", "ktv", "emoglobina"];
  }
  return extractPropNamesFromOntology(ontology);
};

/** Elenco CDR dal backend; fallback []. */
export const getCdrsJson = async (opts = {}) => {
  const base = getBackendBase(opts.baseUrl);
  try {
    return await fetchJson(`${base}/cdrs`, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: opts.timeoutMs ?? 5000,
    });
  } catch {
    return [];
  }
};

/** Cerca un CDR per id dentro alla lista (o list.list). */
export const getCdrById = async (cdrId, opts = {}) => {
  const list = await getCdrsJson(opts);
  if (Array.isArray(list)) return list.find(x => x?.id === cdrId || x?.name === cdrId) || null;
  if (Array.isArray(list?.list)) return list.list.find(x => x?.id === cdrId || x?.name === cdrId) || null;
  return null;
};

/** Stats proprietà (GET /playground/stats?property=...&from=...&to=...). */
export const getPropertyStats = async (propertyId, params = {}, opts = {}) => {
  const base = baseOrProxy(opts.baseUrl);
  const qsStr = qs({ property: propertyId, ...params });
  const url = `${base}/playground/stats${qsStr ? `?${qsStr}` : ""}`;
  return await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs: opts.timeoutMs ?? 8000,
  });
};

/** Timeline grezza → normalizzata in {date,color,score}. (Firma compat oggetto o posizionale) */
export const getTimelinePoints = async (...args) => {
  let id, cdr, baseUrl, timeoutMs;
  if (args.length === 1 && typeof args[0] === "object") {
    ({ id, cdr, baseUrl, timeoutMs } = args[0] || {});
  } else {
    [id, cdr, { baseUrl, timeoutMs } = {}] = args;
  }

  const base = getBackendBase(baseUrl);
  const url = `${base}/playground/timeline?${qs({
    id: id != null ? String(id) : undefined,
    cdr: cdr != null ? String(cdr) : undefined,
  })}`;

  const data = await fetchJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs: timeoutMs ?? 5000,
  });

  const arr = Array.isArray(data) ? data : [];
  return arr.map((p) => {
    const date = String(p.date || p.timestamp || p.data || "").slice(0, 10);
    const color = String(p.color || p.colour || p.hex || "#9CA3AF");
    const score =
      typeof p.score === "number"
        ? (p.score <= 1 ? Math.round(p.score * 100) : Math.round(p.score))
        : null;
    return { date, color, score };
  });
};


/** Pesi proprietà. */
export const getWeightsJson = async (opts = {}) => {
  const base = getBackendBase(opts.baseUrl);
  return await fetchJson(`${base}/weights`, {
    method: "GET",
    headers: { Accept: "application/json" },
    timeoutMs: opts.timeoutMs ?? 5000,
  });
};
