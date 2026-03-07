
# Responsabilità

#     Filtra le misure negli ultimi N giorni rispetto a una data (_filter_misurazioni).
#     Calcola media per parametro (numerico o descrittivo con moda).
#     Confronta con norme (min/max o range standard) e pesi per ottenere:
#         per-parmetro: zona (verde/arancio/rosso), C, ggb, score%, colore_singolo, stats (count/min/avg/max).
#         globale: compliance media pesata e colore_totale con regole chiare.

#     Espone:

#         valuta_summary → payload sintetico (colore_totale, score_periodo, periodo_effettivo…).
#         valuta_detailed → payload con parametri{...} per popolare la tabella.

# Note utili

#     Supporta parametri “directional” (es. flusso_fistola_ml_min: “più alto = meglio”).
#     Gestisce parametri descrittivi (segnali_clinici_locali, bruit) con regole testuali.
#     Se poche misure, emette warning (es. “bassa numerosità”).



import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional

# === PERCORSI DI DEFAULT (puoi cambiarli a tuo piacere) ===
PATH_PAZIENTI = "./backend/data/pazienti_emodialisi.json"
PATH_NORME = "./backend/data/valori_norma_emodialisi.json"
PATH_PESI = "./backend/algoritmo/pesi_importanza.json"


# ---------------------------------------------------------
# Utility: caricamento file JSON
# ---------------------------------------------------------
def _load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------
# Utility: parsing data e filtro per ultimi N giorni
# ---------------------------------------------------------
def _parse_date(iso_date: str) -> datetime:
    # Supporta "YYYY-MM-DD"
    return datetime.strptime(iso_date, "%Y-%m-%d")

def _filter_misurazioni(measurements: List[Dict[str, Any]],
                        data_riferimento: str,
                        giorni: int) -> List[Dict[str, Any]]:
    """Restituisce misurazioni negli ultimi 'giorni' dalla data_riferimento (inclusa)."""
    end = _parse_date(data_riferimento)
    start = end - timedelta(days=giorni-1)  # inclusivo
    out = []
    for m in measurements:
        d = _parse_date(m["date"])
        if start.date() <= d.date() <= end.date():
            out.append(m)
    # Ordina per data crescente (opzionale)
    out.sort(key=lambda x: x["date"])
    return out


# ---------------------------------------------------------
# Tipologia parametri: numerici, descrittivi, direzione, range standard
# ---------------------------------------------------------
# Parametri con regola "più alto è meglio" (soglia minima: es. flusso_fistola >= 600)
DIRECTION_MIN_BETTER = {
    "flusso_fistola_ml_min",
}

# Parametri descrittivi: gestiti con regole semplici
DESCRIPTIVE_PARAMS = {
    "segnali_clinici_locali",  # "assenti" -> verde; "rossore lieve"/"moderato" -> arancio; altro -> rosso
    "bruit"                    # "presente" -> verde; "leggermente ridotto"/"ridotto" -> arancio; "assente" -> rosso
}

# Alcuni "standard" nel file norme sono stringhe tipo "2-3" (delta_kg) o "variabile".
# Creiamo un helper per ottenere (std_min, std_max) quando il "valore standard" è una fascia.
def _parse_standard_range(standard_value) -> Optional[Tuple[float, float]]:
    """
    Se lo standard è una stringa "a-b", restituisce (a, b) come float.
    Altrimenti None.
    """
    if isinstance(standard_value, str) and "-" in standard_value:
        try:
            a, b = standard_value.split("-")
            return float(a.strip()), float(b.strip())
        except Exception:
            return None
    return None


# ---------------------------------------------------------
# Calcolo media per parametro
# ---------------------------------------------------------
def _is_number(x) -> bool:
    return isinstance(x, (int, float))

def _media_parametro(misure: List[Dict[str, Any]], key: str) -> Any:
    """
    - Se tutti i valori sono numerici: restituisce media float.
    - Se è descrittivo: restituisce il valore "più frequente".
    - Se mancano dati: None.
    """
    if not misure:
        return None
    values = [m.get(key) for m in misure if key in m]
    values = [v for v in values if v is not None]

    if not values:
        return None

    # Descrittivi: moda semplice
    if key in DESCRIPTIVE_PARAMS or any(isinstance(v, str) for v in values):
        from collections import Counter
        c = Counter(values)
        return c.most_common(1)[0][0]

    # Numerici
    nums = [float(v) for v in values if _is_number(v)]
    if not nums:
        return None
    return sum(nums) / len(nums)


# ---------------------------------------------------------
# Valutazione zona (verde/arancione/rosso) per parametro numerico
# ---------------------------------------------------------

def _stats_parametro(misure: List[Dict[str, Any]], key: str):
    """
    Restituisce statistiche di base sul periodo per un parametro numerico:
    - count: numero di misurazioni presenti
    - min: valore minimo (o None se non numerico/assente)
    - avg: media aritmetica (o None)
    - max: valore massimo (o None)
    Se i valori sono descrittivi/stringhe → restituisce count e None per min/avg/max.
    """
    if not misure:
        return {"count": 0, "min": None, "avg": None, "max": None}
    values = [m.get(key) for m in misure if key in m and m.get(key) is not None]
    if not values:
        return {"count": 0, "min": None, "avg": None, "max": None}
    # solo numerici
    nums = [float(v) for v in values if isinstance(v, (int,float))]
    if not nums:
        return {"count": len(values), "min": None, "avg": None, "max": None}
    return {
        "count": len(nums),
        "min": min(nums),
        "avg": sum(nums)/len(nums),
        "max": max(nums),
    }

def _valuta_zona_numerica(media: float,
                          standard: Any,
                          acc_min: Any,
                          acc_max: Any,
                          key: str) -> Tuple[str, float]:
    """
    Ritorna:
    - zona: "standard" (verde), "accettabile" (arancione), "critica" (rosso)
    - C: compliance (0..100) con mappatura semplice ma coerente con la tua logica

    Regole:
    - Se il parametro è 'directional' (>= standard): verde se media >= standard;
      arancione se acc_min <= media < standard; rosso se media < acc_min.
    - Se il parametro è 'range' (ha acc_min e acc_max):
      * se esiste uno standard range "a-b" → verde se a <= media <= b
        arancione se dentro [acc_min, acc_max] ma fuori dallo standard range,
        rosso se fuori [acc_min, acc_max].
      * altrimenti, costruiamo una "fascia standard stretta" attorno allo standard (±10% del range accettabile):
        verde se dentro quella fascia, arancione se dentro [acc_min, acc_max] ma fuori fascia standard, rosso fuori [acc_min, acc_max].
    """

    # sicurezza sui numeri
    try:
        acc_min_f = float(acc_min) if acc_min is not None and _is_number(acc_min) else None
        acc_max_f = float(acc_max) if acc_max is not None and _is_number(acc_max) else None
    except:
        acc_min_f, acc_max_f = None, None

    # Caso direzionale (>= standard)
    if key in DIRECTION_MIN_BETTER and _is_number(standard) and acc_min_f is not None:
        std = float(standard)
        if media >= std:
            # Verde
            return "standard", 100.0
        elif acc_min_f <= media < std:
            # Arancio: mappa lineare tra acc_min -> std in [60..99]
            span = max(std - acc_min_f, 1e-6)
            frac = (media - acc_min_f) / span  # 0..1
            C = 60.0 + frac * (99.0 - 60.0)
            return "accettabile", C
        else:
            # Rosso: sotto acc_min → mappa a [0..59] rispetto a quanto sotto siamo (clip semplice)
            # Distanza relativa: usiamo lo span "10% di std" per scalare
            span_r = max(std * 0.1, 1.0)
            frac = max(0.0, min(1.0, (acc_min_f - media) / span_r))
            C = (1.0 - frac) * 59.0  # 59..0
            return "critica", C

    # Caso "range"
    # 1) se standard è stringa "a-b", usiamolo come fascia verde stretta
    std_range = _parse_standard_range(standard)
    if std_range and acc_min_f is not None and acc_max_f is not None:
        std_lo, std_hi = std_range
        if std_lo <= media <= std_hi:
            return "standard", 100.0
        elif acc_min_f <= media <= acc_max_f:
            # arancione: distanza dalla fascia standard → mapping [60..99]
            # distanza minima a bordo standard
            if media < std_lo:
                span = max(std_lo - acc_min_f, 1e-6)
                frac = (media - acc_min_f) / span  # 0..1
            else:
                span = max(acc_max_f - std_hi, 1e-6)
                frac = (acc_max_f - media) / span  # 0..1
            frac = max(0.0, min(1.0, frac))
            C = 60.0 + frac * (99.0 - 60.0)
            return "accettabile", C
        else:
            # rosso: fuori accettabile
            # mappa [0..59] rispetto alla distanza dall'accettabile (clip)
            if media < acc_min_f:
                span_r = max((std_lo - acc_min_f) * 0.5, 1.0)
                frac = max(0.0, min(1.0, (acc_min_f - media) / span_r))
            else:
                span_r = max((acc_max_f - std_hi) * 0.5, 1.0)
                frac = max(0.0, min(1.0, (media - acc_max_f) / span_r))
            C = (1.0 - frac) * 59.0
            return "critica", C

    # 2) altrimenti, costruiamo una fascia standard attorno al valore "standard"
    if _is_number(standard) and acc_min_f is not None and acc_max_f is not None:
        std = float(standard)
        # fascia standard = ±10% del range accettabile, centrata sullo standard
        band = 0.10 * (acc_max_f - acc_min_f)
        std_lo = max(acc_min_f, std - band)
        std_hi = min(acc_max_f, std + band)

        if std_lo <= media <= std_hi:
            return "standard", 100.0
        elif acc_min_f <= media <= acc_max_f:
            # arancione
            # distanza relativa dal bordo della fascia standard → [60..99]
            if media < std_lo:
                span = max(std_lo - acc_min_f, 1e-6)
                frac = (media - acc_min_f) / span
            else:
                span = max(acc_max_f - std_hi, 1e-6)
                frac = (acc_max_f - media) / span
            frac = max(0.0, min(1.0, frac))
            C = 60.0 + frac * (99.0 - 60.0)
            return "accettabile", C
        else:
            # rosso
            if media < acc_min_f:
                span_r = max(std_lo - acc_min_f, 1.0)
                frac = max(0.0, min(1.0, (acc_min_f - media) / span_r))
            else:
                span_r = max(acc_max_f - std_hi, 1.0)
                frac = max(0.0, min(1.0, (media - acc_max_f) / span_r))
            C = (1.0 - frac) * 59.0
            return "critica", C

    # Se mancano info → neutro (arancione medio)
    return "accettabile", 80.0


# ---------------------------------------------------------
# Valutazione parametri descrittivi
# ---------------------------------------------------------
def _valuta_zona_descrittiva(val: str, key: str) -> Tuple[str, float]:
    """Semplice regola pratica per 'segnali_clinici_locali' e 'bruit'."""
    if key == "segnali_clinici_locali":
        txt = (val or "").lower()
        if "assent" in txt:   # "assenti"
            return "standard", 100.0
        if "lieve" in txt or "moderato" in txt:
            return "accettabile", 80.0
        return "critica", 40.0

    if key == "bruit":
        txt = (val or "").lower()
        if "presente" in txt:
            return "standard", 100.0
        if "leggermente ridotto" in txt or "ridotto" in txt:
            return "accettabile", 80.0
        return "critica", 40.0

    # default
    return "accettabile", 80.0


# ---------------------------------------------------------
# Colore per singolo parametro a partire dalla "zona"
# ---------------------------------------------------------
def _colore_da_zona(zona: str) -> str:
    if zona == "standard":
        return "green"
    if zona == "accettabile":
        return "orange"
    if zona == "critica":
        return "red"
    return "gray"


# ---------------------------------------------------------
# Calcolo totale: C, ggb, score, colore_totale
# ---------------------------------------------------------
def _calcola_parametri(measures: List[Dict[str, Any]],
                       norme: Dict[str, Any],
                       pesi: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, float], float, float]:
    """
    Restituisce:
      - risultati_per_parametro: dict con media_30gg, zona, C, ggb, score, colore_singolo
      - weights: dict chiave -> peso (frazione)
      - x: somma di tutti i ggb
      - compliance_media_pesata: Σ (C*w) / Σ w
    """
    norme_map = norme.get("parametri", {})
    pesi_map = pesi.get("parametri", {})

    results = {}
    weights = {}
    sum_ggb = 0.0
    sum_w = 0.0
    sum_Cw = 0.0

    # Prendiamo le CHIAVI che compaiono nelle norme (così siamo coerenti)
    for key, info in norme_map.items():
        media = _media_parametro(measures, key)
        if media is None:
            # nessun dato nel periodo -> zona "critica" con C=0 (oppure potresti mettere gray)
            zona = "critica"
            C = 0.0
            colore = _colore_da_zona(zona)
        else:
            if key in DESCRIPTIVE_PARAMS or isinstance(media, str):
                zona, C = _valuta_zona_descrittiva(str(media), key)
            else:
                standard = info.get("standard")
                acc_min = info.get("accettabile_min")
                acc_max = info.get("accettabile_max")
                zona, C = _valuta_zona_numerica(float(media), standard, acc_min, acc_max, key)
            colore = _colore_da_zona(zona)

        # peso/importanza
        peso_percent = float(pesi_map.get(key, 0))
        w = peso_percent / 100.0
        weights[key] = w

        ggb = C * w  # come da definizione
        sum_ggb += ggb
        sum_w += w
        sum_Cw += C * w

        stats = _stats_parametro(measures, key)
        results[key] = {
            "media_30gg": media,
            "zona": zona,
            "C": round(C, 2),
            "ggb": round(ggb, 3),
            # score lo mettiamo dopo quando conosciamo x
            # colore_singolo:
            "colore_singolo": colore,
            "stats": {
                "count": int(stats["count"]),
                "min": (None if stats["min"] is None else float(stats["min"])),
                "avg": (None if stats["avg"] is None else float(round(stats["avg"], 4))),
                "max": (None if stats["max"] is None else float(stats["max"]))
            }
        }

    # Calcolo score (%) e compliance media pesata
    x = sum_ggb
    compliance_media_pesata = (sum_Cw / sum_w) if sum_w > 0 else 0.0

    if x <= 0:
        # evita divisione per zero
        for k in results:
            results[k]["score"] = 0.0
    else:
        for k in results:
            results[k]["score"] = round((results[k]["ggb"] / x) * 100.0, 2)

    return results, weights, x, compliance_media_pesata


# ---------------------------------------------------------
# Decisione colore totale
# ---------------------------------------------------------
def _colore_totale(results: Dict[str, Any], weights: Dict[str, float],
                   compliance_media_pesata: float) -> str:
    """
    Regole:
      ROSSO se:
        - almeno un parametro con w >= 0.10 è rosso, oppure
        - somma degli score dei parametri rossi >= 20%.
      ARANCIONE se (e non siamo in rosso):
        - presenza di arancioni con importanza cumulata >= 0.15, oppure
        - compliance media pesata < 85.
      VERDE altrimenti.
    """
    # Somme
    score_rossi = 0.0
    somma_importanza_arancioni = 0.0

    for k, v in results.items():
        color = v["colore_singolo"]
        w = weights.get(k, 0.0)
        if color == "red":
            if w >= 0.10:
                return "red"
            score_rossi += v.get("score", 0.0)
        elif color == "orange":
            somma_importanza_arancioni += w

    if score_rossi >= 20.0:
        return "red"

    if somma_importanza_arancioni >= 0.15 or compliance_media_pesata < 85.0:
        return "orange"

    return "green"


# ---------------------------------------------------------
# API pubbliche dell'algoritmo
# ---------------------------------------------------------
def valuta_summary(id_paziente: str,
                   data_riferimento: str,
                   giorni: int = 30,
                   path_pazienti: str = PATH_PAZIENTI,
                   path_norme: str = PATH_NORME,
                   path_pesi: str = PATH_PESI) -> Dict[str, Any]:
    """
    Restituisce SOLO:
      - colore_totale
      - finestra_giorni
      - periodo_effettivo (dal/al/misurazioni)
      - (opz.) note/warning
    """
    # Carica dati
    dataset = _load_json(path_pazienti)
    norme = _load_json(path_norme)
    pesi = _load_json(path_pesi)

    # Cerca paziente
    patients = dataset.get("patients", [])
    paz = next((p for p in patients if p.get("id") == id_paziente), None)
    if not paz:
        return {
            "error": f"ID paziente '{id_paziente}' non trovato",
            "status": 404
        }

    # Filtra periodo
    measurements = paz.get("measurements", [])
    periodo = _filter_misurazioni(measurements, data_riferimento, giorni)
    if not periodo:
        return {
            "colore_totale": "gray",
            "finestra_giorni": giorni,
            "periodo_effettivo": {
                "dal": ( _parse_date(data_riferimento) - timedelta(days=giorni-1) ).date().isoformat(),
                "al": data_riferimento,
                "misurazioni": 0
            },
            "note": "dati insufficienti nel periodo selezionato"
        }

    # Calcola risultati per parametro
    results, weights, x, comp_media = _calcola_parametri(periodo, norme, pesi)
    colore = _colore_totale(results, weights, comp_media)

    # warning bassa numerosità
    warning = None
    if len(periodo) < 3:
        warning = "bassa numerosità (meno di 3 misurazioni)"

    return {
        "colore_totale": colore,
        "score_periodo": round(comp_media, 2),
        "finestra_giorni": giorni,
        "periodo_effettivo": {
            "dal": periodo[0]["date"],
            "al": periodo[-1]["date"],
            "misurazioni": len(periodo)
        },
        **({"warning": warning} if warning else {})
    }

def valuta_detailed(id_paziente: str,
                    data_riferimento: str,
                    giorni: int = 30,
                    path_pazienti: str = PATH_PAZIENTI,
                    path_norme: str = PATH_NORME,
                    path_pesi: str = PATH_PESI) -> Dict[str, Any]:
    dataset = _load_json(path_pazienti)
    norme   = _load_json(path_norme)
    pesi    = _load_json(path_pesi)

    patients = dataset.get("patients", [])
    paz = next((p for p in patients if p.get("id") == id_paziente), None)
    if not paz:
        return {"error": f"ID paziente '{id_paziente}' non trovato", "status": 404}

    # 👉 tutte le misurazioni del paziente (per timeline completa)
    measurements_all = paz.get("measurements", [])

    # 👉 misurazioni del periodo (per il calcolo dello score e periodRaw)
    periodo = _filter_misurazioni(measurements_all, data_riferimento, giorni)
    if not periodo:
        return {
            "colore_totale": "gray",
            "finestra_giorni": giorni,
            "periodo_effettivo": {
                "dal": (_parse_date(data_riferimento) - timedelta(days=giorni-1)).date().isoformat(),
                "al": data_riferimento,
                "misurazioni": 0
            },
            "note": "dati insufficienti nel periodo selezionato",
            "parametri": {}
        }

    results, weights, x, comp_media = _calcola_parametri(periodo, norme, pesi)
    colore = _colore_totale(results, weights, comp_media)

    # 👉 helper per estrarre le coppie {date, value} per un certo parametro
    def _rows_for(measures: List[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
        righe = []
        for m in measures:
            if key in m and m[key] is not None:
                righe.append({
                    "date": m.get("date"),
                    "value": m.get(key)
                })
        righe.sort(key=lambda x: x["date"])
        return righe

    norme_map = norme.get("parametri", {})
    pesi_map  = pesi.get("parametri", {})

    # 👉 per OGNI parametro:
    for key in list(results.keys()):
        # periodRaw = solo il periodo filtrato
        results[key]["rows"] = _rows_for(periodo, key)
        # timelineRaw = TUTTA la storia del paziente
        results[key]["timelineRaw"] = _rows_for(measurements_all, key)

        # norma/peso (queste 3 righe prima erano fuori dal loop: bug)
        info_norma = norme_map.get(key, {})
        results[key]["norma_min"] = info_norma.get("accettabile_min")
        results[key]["norma_max"] = info_norma.get("accettabile_max")
        results[key]["peso"]      = pesi_map.get(key)

        # assicurati di avere sempre stats (sul PERIODO)
        if "stats" not in results[key] or not isinstance(results[key]["stats"], dict):
            results[key]["stats"] = _stats_parametro(periodo, key)
        else:
            st = results[key]["stats"]
            base = _stats_parametro(periodo, key)
            st.setdefault("count", base["count"])
            st.setdefault("min",   base["min"])
            st.setdefault("avg",   base["avg"])
            st.setdefault("max",   base["max"])
            results[key]["stats"] = st

    warning = None
    if len(periodo) < 3:
        warning = "bassa numerosità (meno di 3 misurazioni)"

    return {
        "colore_totale": colore,
        "score_periodo": round(comp_media, 2),
        "finestra_giorni": giorni,
        "periodo_effettivo": {
            "dal": periodo[0]["date"],
            "al": periodo[-1]["date"],
            "misurazioni": len(periodo)
        },
        "parametri": results,
        **({"warning": warning} if warning else {})
    }






# ---------------------------------------------------------
# Esempio d'uso da CLI (opzionale)
# ---------------------------------------------------------
if __name__ == "__main__":
    # Piccolo test manuale
    # Cambia ID e data secondo i tuoi file
    print("Esempio SUMMARY:")
    print(valuta_summary("P001", "2024-06-30"))

    print("\nEsempio DETAILED:")
    det = valuta_detailed("P001", "2024-06-30")
    print(json.dumps(det, indent=2, ensure_ascii=False))
