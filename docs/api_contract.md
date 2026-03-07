# API Contract – Progetto “Ospedale”
Base URL (dev): `http://127.0.0.1:8001`

---

## GET /status
Sanity check del backend.

**200**
json
{ "ok": true }


## GET /norme
Restituisce il contenuto del file valori_norma_emodialisi.json.
Response 200
{
  "parametri": {
    "PAS_sistolica_mmHg": {
      "accettabile_min": 100,
      "accettabile_max": 160,
      "standard": 120,
      "unita": "mmHg"
    },
    "PAD_diastolica_mmHg": { "...": "..." }
  }
}


## GET /pazienti
Lista degli ID pazienti presenti nel dataset.
Response 200
["P001", "P002", "P003"]


## GET /timeline/{patient_id}
Restituisce i “punti” da visualizzare sulla timeline del paziente.
Response 200
[
  { "timestamp": "2024-04-15T00:00:00Z", "color": "yellow", "score": 40 },
  { "timestamp": "2024-05-15T00:00:00Z", "color": "red",    "score": 80 }
]

404
{ "error": "patient not found" }


## POST /valuta
Calcolo riassuntivo (solo score/colore totali) in una finestra che termina a timestamp.
Body (snake_case o camelCase)
{
  "id_paziente": "P001",
  "data_riferimento": "2024-06-30",
  "days": 30,
  "regola": "CDR_1"
}

Response 200
{ "score": 40.0, "color": "yellow" }

Errori
400 parametri mancanti


500 eccezione nell’algoritmo



## POST /valuta/dettaglio
Calcolo dettagliato: oltre a score/colore totali, ritorna la lista features
 (ogni feature rappresenta un parametro con media e range).
Body
{
  "patientId": "P001",
  "timestamp": "2024-06-30",
  "days": 30,
  "ruleId": "CDR_1"
}

Response 200
{
  "score": 57.0,
  "color": "yellow",
  "features": [
    {
      "name": "PAS_sistolica_mmHg",
      "value": 134.0,
      "target": [100, 160],
      "score": 0.0,
      "weight": 1.0,
      "color": "green"
    },
    {
      "name": "UF_ml_h_kg",
      "value": 7.95,
      "target": [8, 13],
      "score": 100.0,
      "weight": 1.0,
      "color": "red"
    }
  ]
}

Nota: se l’algoritmo non produce features, il backend calcola le medie nel periodo
 [timestamp - days, timestamp], applica i range delle norme e ordina per score decrescente.

## GET /stats/feature/{feature_name}
Endpoint di esempio per future statistiche (mock).
Response 200
{
  "min": 52.1, "avg": 67.8, "stddev": 4.3, "cv": 6.34, "max": 83.2,
  "from": "2024-01-01", "to": "2025-01-01",
  "histogram": [3,6,9,14,21,18,12,8,5,2]
}


Convenzioni & Note
    Score: 0 = tutto nella norma (verde). Valori maggiori indicano peggioramento (giallo/rosso).

    Colori: "green", "yellow" (include "orange"), "red", "gray" (fallback).

    I body accettano sia snake_case che camelCase (normalizzati in app.py).

    Il frontend chiama queste API tramite frontend/src/api/api.js.



---

## Mini-guida: dove guardare nel codice

- **`backend/app.py`**
  - `/status`, `/norme`, `/pazienti` → utility.
  - `/timeline/<id>` → costruisce i punti colorati chiamando `valuta_summary` per ogni data (e normalizzando colore/score).
  - `/valuta` → usa `valuta_summary`, normalizza `{score,color}`.
  - `/valuta/dettaglio` → usa `valuta_detailed`; se mancano le `features`, calcola **medie** via `_avg_features_for_window`, poi normalizza.

- **`frontend/src/api/api.js`**
  - funzioni fetch/POST che incapsulano questi endpoint e restituiscono JSON.

- **`frontend/src/components/PatientCriticalCard.jsx`**
  - carica timeline (`getTimeline`), stampa barra.  
  - al click su un punto → chiama `getValutaDettaglio(...)`, aggiorna periodo/triage e apre la **ValuesCard**.

- **`frontend/src/components/ValuesCard.jsx`**
  - mostra l’elenco delle feature: nome, media, range norma (da `/norme`), colore e score; trascinabile/lock/close; ordinata per score.

Se ti va, nel prossimo messaggio entriamo in **`api.js` riga per riga** (promessa: chiaro e senza magia) e poi apriamo `app.py` in parallelo con `api_contract.md` così vedi 1-a-1 come tutto si incastra.


---

##  Mini-mappa delle chiamate in `api.js`

Aggiungi in fondo ad `api_contract.md` questa tabellina di corrispondenza:

```markdown
| Funzione (api.js)        | Metodo & Path                 | Usa nel frontend            |
|--------------------------|-------------------------------|-----------------------------|
| `getNorme()`             | `GET /norme`                  | `ValuesCard`                |
| `getTimeline(id)`        | `GET /timeline/{id}`          | `PatientCriticalCard`       |
| `getValuta(body)`        | `POST /valuta`                | (se serve solo totale)      |
| `getValutaDettaglio(...)`| `POST /valuta/dettaglio`      | `PatientCriticalCard` → card|
