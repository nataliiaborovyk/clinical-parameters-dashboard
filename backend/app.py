# =========================
# IMPORT
# =========================
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta, date
import json, statistics, importlib.util, sys

# =========================
# PATH DI BASE (solo pathlib)
# =========================
BASE_DIR: Path = Path(__file__).resolve().parent          # .../backend
DATA_DIR: Path = BASE_DIR / "data"                        # .../backend/data
ALG_DIR:  Path = BASE_DIR / "algoritmo"                   # .../backend/algoritmo

def _maybe(a: Path, b: Path) -> str:
    """Ritorna 'a' se esiste, altrimenti 'b' (ritorna stringa per json.load)."""
    return str(a if a.exists() else b)

# File dati principali
PATH_PAZIENTI = _maybe(DATA_DIR / "pazienti_emodialisi.updated.json",
                       DATA_DIR / "pazienti_emodialisi.json")
PATH_NORME    = str(DATA_DIR / "valori_norma_emodialisi.json")
PATH_PESI     = _maybe(ALG_DIR / "pesi_importanza.updated.json",
                       ALG_DIR / "pesi_importanza.json")
PATH_CDRS     = str(DATA_DIR / "cdrs.json")
PATH_NICK     = str(DATA_DIR / "nicknames.json")
PATH_MEAS_OPTS = str(DATA_DIR / "patient_measurements_options.json")

# File “canonici” del Playground
CANONICAL_ONTOLOGY_PATH = str(DATA_DIR / "playground_ontology.json")
CANONICAL_STATS_DIR     = str(DATA_DIR / "stats")

# =========================
# CARICAMENTO DINAMICO ALGORITMO
# =========================
ALG_PATH = (ALG_DIR / "algoritmo1.py").resolve()
_spec = importlib.util.spec_from_file_location("algoritmo1", str(ALG_PATH))
_alg  = importlib.util.module_from_spec(_spec)
sys.modules["algoritmo1"] = _alg
_spec.loader.exec_module(_alg)

# Alias comodi
valuta_summary  = _alg.valuta_summary
valuta_detailed = _alg.valuta_detailed

# =========================
# APP
# =========================
app = Flask(__name__)
CORS(app)

# =========================
# UTILS GENERALI
# =========================
def _load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _first(*vals):
    for v in vals:
        if v not in (None, ""):
            return v
    return None

def _parse_params(body: dict):
    """Normalizza i parametri per /valuta e /valuta/dettaglio."""
    pid   = _first(body.get("id_paziente"), body.get("patientId"))
    rule  = _first(body.get("regola"), body.get("ruleId"))
    ts    = _first(body.get("data_riferimento"), body.get("timestamp"))
    if isinstance(ts, str) and "T" in ts:
        ts = ts.split("T", 1)[0]
    giorni = body.get("days", body.get("giorni", 30))
    try: giorni = int(giorni)
    except: giorni = 30
    return pid, rule, ts, giorni

def _extract_color(res: dict):
    if not isinstance(res, dict):
        return None
    c = (res.get("color") or res.get("colore") or "").strip().lower()
    if c in ("green", "verde"): return "green"
    if c in ("yellow", "giallo", "orange", "arancione"): return "yellow"
    if c in ("red", "rosso"): return "red"
    return None

def _heuristic_score_from_color(color: str) -> float:
    return {"green": 0.0, "yellow": 40.0, "red": 80.0}.get(color, 0.0)

def _normalize_score_color(res: dict):
    if not isinstance(res, dict):
        return {"score": 0.0, "color": "gray"}
    cand = ["score","score_percent","total_score_percent","overall_score","overall_score_percent","risk_score","score_01"]
    val = None
    for k in cand:
        if k in res:
            try:
                val = float(res[k]); break
            except: pass
    col = _extract_color(res)
    if val is None and col:
        return {"score": _heuristic_score_from_color(col), "color": col}
    try: val = float(val or 0.0)
    except: val = 0.0
    if 0.0 <= val <= 1.0: val *= 100.0
    val = max(0.0, min(100.0, val))
    if not col:
        col = "green" if val <= 20 else "yellow" if val <= 50 else "red"
    return {"score": round(val, 1), "color": col}

def _parse_iso_date(d: str) -> datetime:
    return datetime.strptime((d or "")[:10], "%Y-%m-%d")

def _norm_day_str(x):
    if x is None: return None
    if isinstance(x, (datetime, date)): return str(x)[:10]
    s = str(x);  return s[:10] if len(s) >= 10 else s

def _load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# =========================
# HELPERS LEGACY
# =========================
def _load_patient(data, patient_id):
    return next((x for x in data.get("patients", []) if x.get("id") == patient_id), None)

def _load_norme_map():
    raw = _load_json(PATH_NORME)
    out = {}
    params = raw.get("parametri") or {}
    for name, obj in params.items():
        lo = obj.get("accettabile_min"); hi = obj.get("accettabile_max")
        try: lo = float(str(lo).replace(",", ".")) if lo is not None else None
        except: lo = None
        try: hi = float(str(hi).replace(",", ".")) if hi is not None else None
        except: hi = None
        out[str(name)] = {"min": lo, "max": hi, "weight": obj.get("peso") or obj.get("peso_normalizzato")}
    return out

def _avg_features_for_window(patient_id: str, end_date_str: str, giorni: int) -> list[dict]:
    data = _load_json(PATH_PAZIENTI)
    p = _load_patient(data, patient_id)
    if not p: return []
    end_dt = _parse_iso_date(end_date_str)
    start_dt = end_dt - timedelta(days=int(giorni or 30))
    sums, cnts = {}, {}
    for m in p.get("measurements", []):
        ds = m.get("date");  
        if not ds: 
            continue
        dt = _parse_iso_date(ds)
        if not (start_dt <= dt <= end_dt): continue
        for k, v in m.items():
            if k == "date": continue
            try: val = float(v)
            except: continue
            sums[k] = sums.get(k, 0.0) + val
            cnts[k] = cnts.get(k, 0) + 1
    norme_map = _load_norme_map()
    feats = []
    for name, s in sums.items():
        n = cnts[name]; avg = s / max(1, n)
        nm = norme_map.get(name, {})
        lo, hi = nm.get("min"), nm.get("max")
        # score “distanza dal range”
        def _score(avg, lo, hi):
            if lo is None or hi is None: return 0.0
            if lo <= avg <= hi: return 0.0
            width = max(1e-9, (hi - lo))
            dist = (lo - avg) if avg < lo else (avg - hi)
            return max(0.0, min(100.0, (dist/width)*100.0))
        s_ = _score(avg, lo, hi)
        col = "green" if s_ <= 20 else "yellow" if s_ <= 50 else "red"
        feats.append({"name": name, "value": round(avg,2), "target": [lo,hi], "score": s_, "color": col})
    feats.sort(key=lambda f: f.get("score", 0), reverse=True)
    return feats

# =========================
# HELPERS PLAYGROUND
# =========================
def _step3_load_json(path: str): return _load_json(path)

def _step3_parse_date(x: str) -> datetime: return datetime.strptime(x[:10], "%Y-%m-%d")

def _to_playground_measurements_map(measurements_list):
    out = {}
    if not isinstance(measurements_list, list): return out
    for item in measurements_list:
        if not isinstance(item, dict): continue
        day = _norm_day_str(item.get("date") or item.get("timestamp"))
        if not day: continue
        interval = f"{day}/{day}"
        values = item.get("values")
        if isinstance(values, dict) and values:
            for prop_id, val in values.items():
                if prop_id in ("date","timestamp","patient","id"): continue
                out.setdefault(prop_id, {})[interval] = val
            continue
        for prop_id, val in item.items():
            if prop_id in ("date","timestamp","patient","id","values"): continue
            out.setdefault(prop_id, {})[interval] = val
    return out

def _to_triage_obj(res: dict):
    if not isinstance(res, dict):
        return {"score": None, "value": None, "confidence": None, "details": None}
    # score → 0..1
    score = None
    for k in ["score","score_01","score01","risk_score","overall_score","overall_score_percent","score_percent","total_score_percent"]:
        if k in res:
            try:
                v = float(res[k]); score = v/100.0 if v > 1.0 else v; break
            except: pass
    if score is None:
        c = (res.get("color") or res.get("colore") or "").strip().lower()
        score = 0.0 if c in ("green","verde") else 0.4 if c in ("yellow","giallo","orange","arancione") else 0.8 if c in ("red","rosso") else None
    score = None if score is None else max(0.0, min(1.0, score))
    # confidence
    conf = res.get("confidence") or res.get("confidenza") or res.get("affidabilita")
    try:
        conf = float(conf) if conf is not None else None
        if conf and conf > 1.0: conf = conf/100.0
    except: conf = None
    # details
    rows = []
    for r in (res.get("features") or res.get("dettaglio") or []):
        if not isinstance(r, dict): continue
        rows.append({
            "prop":   r.get("name") or r.get("feature") or r.get("nome") or "feature",
            "value":  r.get("value") or r.get("valore"),
            "target": r.get("target") or r.get("range") or r.get("intervallo"),
            "score":  r.get("score") or r.get("score01") or r.get("score_rel") or r.get("score_norm"),
            "weight": r.get("weight") or r.get("peso"),
            "color":  r.get("color")  or r.get("colore"),
        })
    return { "score": score, "value": None, "confidence": conf, "details": ({"rows": rows} if rows else None) }

def _get_cdr_timeline_days(cdr_id: str, default_days: int = 30) -> int:
    try:
        cdrs = _load_json(PATH_CDRS)
        entry = cdrs.get("CDRs", {}).get(cdr_id, {}) if isinstance(cdrs, dict) else {}
        days = int(entry.get("timeline_days", default_days))
        return days if days > 0 else default_days
    except: return default_days

# =========================
# ROTTE DI UTILITÀ
# =========================
@app.get("/status")
def status(): return jsonify(status="ok")

@app.get("/norme")
def norme(): return jsonify(_load_json(PATH_NORME))

@app.get("/pazienti")
def pazienti():
    data = _load_json(PATH_PAZIENTI)
    return jsonify([p.get("id") for p in data.get("patients", [])])

# =========================
# ROTTE LEGACY
# =========================
@app.post("/valuta")
def valuta():
    body = request.get_json(force=True, silent=True) or {}
    pid, rule, ts, giorni = _parse_params(body)
    if not pid or not ts:
        return jsonify({"error":"id_paziente/patientId e data_riferimento/timestamp richiesti"}), 400
    try:
        res = valuta_summary(pid, ts, giorni=giorni,
                             path_pazienti=PATH_PAZIENTI, path_norme=PATH_NORME, path_pesi=PATH_PESI)
    except Exception as e:
        return jsonify({"error": f"Errore algoritmo: {e}"}), 500
    return jsonify(_normalize_score_color(res if isinstance(res, dict) else {})), 200

@app.post("/valuta/dettaglio")
def valuta_dettaglio_route():
    body = request.get_json(force=True, silent=True) or {}
    pid, rule, ts, giorni = _parse_params(body)
    if not pid or not ts:
        return jsonify({"error":"id_paziente/patientId e data_riferimento/timestamp richiesti"}), 400
    try:
        res = valuta_detailed(pid, ts, giorni=giorni,
                              path_pazienti=PATH_PAZIENTI, path_norme=PATH_NORME, path_pesi=PATH_PESI)
    except Exception as e:
        res = {"error": f"Errore algoritmo: {e}"}
    feats = res.get("features")
    if not (isinstance(feats, list) and feats):
        res["features"] = _avg_features_for_window(pid, ts, giorni)
    base = _normalize_score_color(res if isinstance(res, dict) else {})
    return jsonify({**base, "features": res.get("features", [])}), 200

@app.get("/timeline/<patient_id>")
def timeline(patient_id):
    data = _load_json(PATH_PAZIENTI)
    p = _load_patient(data, patient_id)
    if not p: return jsonify({"error":"patient not found"}), 404
    points = []
    for m in p.get("measurements", []):
        d = m.get("date");  
        if not d: 
            continue
        try:
            res = valuta_summary(patient_id, d, giorni=30,
                                 path_pazienti=PATH_PAZIENTI, path_norme=PATH_NORME, path_pesi=PATH_PESI)
            col = _extract_color(res) or _normalize_score_color(res).get("color","green")
            scr = _normalize_score_color(res).get("score",0)
        except Exception:
            col, scr = "gray", 0
        points.append({"timestamp": f"{d}T00:00:00Z", "color": col, "score": scr})
    return jsonify(points)

# =========================
# ROTTE PLAYGROUND
# =========================
@app.get("/cdrs")
def step3_get_cdrs(): return jsonify(_load_json(PATH_CDRS)), 200

@app.get("/nicknames")
def step3_get_nicknames(): return jsonify(_load_json(PATH_NICK)), 200

# ---- NUOVA rotta per salvare:
@app.post("/nicknames/save")
def step3_save_nickname():
    try:
        payload = request.get_json(force=True) or {}
        patient_id = str(payload.get("patientId", "")).strip()
        nickname   = str(payload.get("nickname", "")).strip()

        if not patient_id or not nickname:
            return jsonify({"ok": False, "error": "patientId o nickname mancante"}), 400

        data = _load_json(PATH_NICK) or {}
        # struttura attesa: { "nicknames": { "P001": "Patient 001", ... } }
        if "nicknames" not in data or not isinstance(data["nicknames"], dict):
            data["nicknames"] = {}

        data["nicknames"][patient_id] = nickname
        _save_json(PATH_NICK, data)

        return jsonify({
            "ok": True,
            "saved": {patient_id: nickname},
            "nicknames": data["nicknames"]
        }), 200

    except Exception as e:
        return jsonify({"ok": False, "error": f"server error: {e}"}), 500


@app.get("/playground/ontology")
def get_playground_ontology():
    try:
        return jsonify(_load_json(CANONICAL_ONTOLOGY_PATH)), 200
    except FileNotFoundError:
        return jsonify({"error": f"Ontology not found at {CANONICAL_ONTOLOGY_PATH}"}), 500

@app.get("/playground/CDRs/<cdr_id>")
def get_cdr_schema(cdr_id):
    cdrs = _load_json(PATH_CDRS)
    c = cdrs.get(cdr_id) if isinstance(cdrs, dict) else None
    if not c and isinstance(cdrs, dict):
        c = cdrs.get("CDRs", {}).get(cdr_id)
    if not c: return jsonify({"error":"CDR not found"}), 404
    return jsonify({"schema": cdr_id, "params": c.get("params", {})}), 200

@app.get("/playground/stats")
def get_playground_stats():
    prop_id = request.args.get("property")
    if not prop_id: return jsonify({"error":"missing query parameter 'property'"}), 400
    import os
    safe = "".join([c if c.isalnum() or c in "-_ ." else "_" for c in prop_id])
    path = os.path.join(CANONICAL_STATS_DIR, f"{safe}.json")
    try:
        return jsonify(_load_json(path)), 200
    except FileNotFoundError:
        # fallback demo
        demo = {
            "property": prop_id,
            "stats": {
                "count": 1000, "min": 50.0, "avg": 100.0, "stddev": 20.0, "cv": 0.2, "max": 150.0,
                "interval": "2023-01-01/2025-01-01",
                "distribution": {"[50,75)":0.2,"[75,100)":0.4,"[100,125)":0.25,"[125,150)":0.15}
            }
        }
        return jsonify(demo), 200

@app.post("/playground/patients/get")
def step3_playground_patients_get():
    body = request.get_json(force=True) or {}
    pid = body.get("id") or body.get("patientId")
    if not pid:
        return jsonify({"error": "missing patient id"}), 400

    ds = _load_json(PATH_PAZIENTI)
    paz = next((p for p in ds.get("patients", []) if p.get("id") == pid), None)
    if not paz:
        return jsonify({"error": "patient not found"}), 404

    # ⬅️ qui, dopo che esiste 'paz'
    meta = {
        "vascular_access_type": paz.get("vascular_access_type"),
        "FAV": paz.get("FAV"),
    }

    meas_map = _to_playground_measurements_map(paz.get("measurements", []))
    return jsonify({
        "patient": str(pid),
        "measurements": meas_map,
        "triages": None,
        "patientMeta": meta
    }), 200


@app.get("/playground/timeline")
def playground_timeline():
    pid = (request.args.get("id") or "").strip()
    cdr = (request.args.get("cdr") or "").strip()
    if not pid: return jsonify({"error": "missing id"}), 400
    days = int(request.args.get("days")) if (request.args.get("days") or "").isdigit() else _get_cdr_timeline_days(cdr, 30)
    data = _load_json(PATH_PAZIENTI)
    paz = next((x for x in data.get("patients", []) if x.get("id") == pid), None)
    if not paz: return jsonify({"error":"patient not found"}), 404
    points = []
    for m in paz.get("measurements", []):
        d = m.get("date");  
        if not d: 
            continue
        try:
            res = valuta_summary(pid, d, giorni=days, path_pazienti=PATH_PAZIENTI, path_norme=PATH_NORME, path_pesi=PATH_PESI)
            col = (res.get("colore_totale") or "gray").lower()
            if col == "arancione": col = "orange"
            if col == "giallo":     col = "yellow"
            scr = float(res.get("score_periodo") or 0.0)
        except Exception:
            col, scr = "gray", 0.0
        points.append({"date": d, "color": col, "score": scr})
    points.sort(key=lambda x: x["date"])
    return jsonify(points), 200

# =========================
# /patients/triage — (per tabella parametri)
# =========================
COLOR_HEX = {"green":"#22C55E","yellow":"#F59E0B","orange":"#F59E0B","red":"#EF4444","gray":"#9CA3AF"}
@app.post("/patients/triage")
def patients_triage():
    body = request.get_json(force=True) or {}
    pid  = (body.get("id") or "").strip()
    ts   = (body.get("timestamp") or "").strip()[:10]

    # 👉 NUOVO: periodo esplicito opzionale
    period = body.get("period") or {}
    p_from = (period.get("from") or "").strip()[:10]
    p_to   = (period.get("to") or "").strip()[:10]

    # fallback legacy: window_days resta supportato
    days = int(body.get("window_days") or 30)

    if not pid:
        return jsonify({"error": "id e timestamp sono obbligatori"}), 400

    # Se viene passato period.from/period.to, li usiamo per definire giorni e ts (to)
    if p_from and p_to:
        try:
            from datetime import datetime
            dt_from = datetime.strptime(p_from, "%Y-%m-%d")
            dt_to   = datetime.strptime(p_to, "%Y-%m-%d")
            if dt_to < dt_from:
                return jsonify({"error": "period.to < period.from"}), 400
            days = (dt_to - dt_from).days + 1
            ts = p_to  # usiamo il 'to' come timestamp di riferimento
        except Exception as e:
            return jsonify({"error": f"period non valido: {e}"}), 400

    if not ts:
        return jsonify({"error": "timestamp mancante"}), 400

    det = valuta_detailed(
        pid, ts, giorni=days,
        path_pazienti=PATH_PAZIENTI,
        path_norme=PATH_NORME,
        path_pesi=PATH_PESI
    )
    if isinstance(det, dict) and det.get("status") == 404:
        return jsonify(det), 404

    params = (det or {}).get("parametri") or {}

    details_rows = []
    for key, v in params.items():
        stats = v.get("stats", {})
        tgt = [v.get("norma_min"), v.get("norma_max")]
        w   = v.get("peso")

        details_rows.append({
            "prop": key,
            "label": key,
            "aggregate": "avg",

            "value": v.get("media_30gg"),

            "avg": stats.get("avg"),
            "min": stats.get("min"),
            "max": stats.get("max"),
            "count": stats.get("count", 0),

            "score": v.get("score"),
            "color": v.get("colore_singolo"),

            "target": tgt,
            "weight": w,

            # ⚠️ ORA sono davvero diversi:
            "periodRaw":   v.get("rows", []),         # solo periodo
            "timelineRaw": v.get("timelineRaw", []),  # tutta la storia
        })

    triage_obj = {
        "date": ts,
        "score": round((det or {}).get("score_periodo") or 0),
        "details": { "rows": details_rows }
    }
    return jsonify({ "triage": triage_obj }), 200





# =========================
# CANVAS STATE (mock)
# =========================
CANVAS_STATE_PATH = DATA_DIR / "canvas_state.json"

@app.get("/canvas/state")
def canvas_state_get():
    try:
        if CANVAS_STATE_PATH.exists():
            return jsonify(_load_json(str(CANVAS_STATE_PATH))), 200
        return jsonify({"cards": [], "zTop": 10}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/canvas/state")
def canvas_state_post():
    try:
        obj = request.get_json(force=True, silent=True) or {}
        CANVAS_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CANVAS_STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        return jsonify({"ok": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# MAIN
# =========================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001, debug=True)
