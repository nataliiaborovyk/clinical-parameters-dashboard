# API Contract – Clinical Parameters Dashboard

**Base URL (dev):** `http://127.0.0.1:8001`

Questo documento descrive gli endpoint attualmente presenti nel backend di supporto del progetto **Clinical Parameters Dashboard**.

> Nota importante  
> Questo backend è stato sviluppato come backend minimale di supporto per il widget paziente, in assenza del backend originale del sistema completo SIATE.

---

## Convenzioni generali

- Il backend usa **JSON** sia in input che in output.
- Alcuni endpoint legacy accettano sia **snake_case** che **camelCase**.
- I colori restituiti dal backend possono essere:
  - `"green"`
  - `"yellow"`
  - `"orange"`
  - `"red"`
  - `"gray"`
- Gli endpoint principali usati dal frontend attuale si trovano soprattutto nell’area:
  - `/playground/...`
  - `/patients/triage`
  - `/nicknames...`

---

# 1. Utility endpoints

## GET /status

Sanity check del backend.

### Response 200

```json
{
  "status": "ok"
}
```

## GET /norme
Restituisce il contenuto del file valori_norma_emodialisi.json.
Response 200
```json
{
  "parametri": {
    "PAS_sistolica_mmHg": {
      "accettabile_min": 100,
      "accettabile_max": 160,
      "standard": 120,
      "unita": "mmHg"
    }
  }
}
```

## GET /pazienti
Lista degli ID pazienti presenti nel dataset.
Response 200
["P001", "P002", "P003"]

# 2. Legacy endpoints

Sono presenti nel backend e restano utili per compatibilità o test, ma il frontend attuale usa soprattutto le rotte /playground/... e /patients/triage.

## GET /timeline/{patient_id}
Restituisce i punti della timeline del paziente.

Per ogni measurement del paziente, il backend calcola un risultato sintetico usando valuta_summary(...) e restituisce:

- timestamp
- color
- score

Response 200
```json
[
  {
    "timestamp": "2024-04-15T00:00:00Z",
    "color": "yellow",
    "score": 40.0
  },
  {
    "timestamp": "2024-05-15T00:00:00Z",
    "color": "red",
    "score": 80.0
  }
]
```
Response 404
```json
{
  "error": "patient not found"
}
```

## POST /valuta

Calcolo riassuntivo dello stato del paziente in una finestra temporale che termina al timestamp indicato.

Accetta sia body in snake_case che in camelCase.

Body esempio
```json
{
  "id_paziente": "P001",
  "data_riferimento": "2024-06-30",
  "days": 30,
  "regola": "CDR_1"
}
```

oppure
```json
{
  "patientId": "P001",
  "timestamp": "2024-06-30",
  "days": 30,
  "ruleId": "CDR_1"
}
```
Response 200
```json
{
  "score": 40.0,
  "color": "yellow"
}
```
Response 400
```json
{
  "error": "id_paziente/patientId e data_riferimento/timestamp richiesti"
}
```
Response 500
```json
{
  "error": "Errore algoritmo: ..."
}
```
Note

il campo ruleId / regola viene letto ma nel backend attuale non modifica il calcolo

la risposta viene normalizzata nel formato { score, color }

## POST /valuta/dettaglio

Calcolo dettagliato dello stato del paziente.

Oltre a score e color, restituisce una lista di features.

Body esempio
```json
{
  "patientId": "P001",
  "timestamp": "2024-06-30",
  "days": 30,
  "ruleId": "CDR_1"
}
```
Response 200
```json
{
  "score": 57.0,
  "color": "yellow",
  "features": [
    {
      "name": "PAS_sistolica_mmHg",
      "value": 134.0,
      "target": [100, 160],
      "score": 0.0,
      "color": "green"
    },
    {
      "name": "UF_ml_h_kg",
      "value": 7.95,
      "target": [8, 13],
      "score": 100.0,
      "color": "red"
    }
  ]
}
```

Note

Se l’algoritmo non restituisce features, il backend usa un fallback interno che:
- calcola le medie nel periodo [timestamp - days, timestamp]
- applica i range delle norme
- ordina le feature per score decrescente

# 3. Playground endpoints

Questi endpoint sono il cuore dell’integrazione frontend–backend attuale.

## GET /cdrs

Restituisce il contenuto del file cdrs.json.

Response 200
```json
{
  "CDRs": {
    "cdr_alg1": {
      "name": "Algoritmo 1",
      "timeline_days": 30
    }
  }
}
```

Nota
La struttura precisa dipende dal contenuto del file cdrs.json.

## GET /nicknames

Restituisce il contenuto del file nicknames.json.

Response 200
```json
{
  "nicknames": {
    "P001": "Mario Rossi",
    "P002": "Lucia Bianchi"
  }
}
```

## POST /nicknames/save

Salva o aggiorna il nickname di un paziente.

Body esempio
```json
{
  "patientId": "P001",
  "nickname": "Mario Rossi"
}
```
Response 200
```json
{
  "ok": true,
  "saved": {
    "P001": "Mario Rossi"
  },
  "nicknames": {
    "P001": "Mario Rossi"
  }
}
```
Response 400
```json
{
  "ok": false,
  "error": "patientId o nickname mancante"
}
```
Response 500
```json
{
  "ok": false,
  "error": "server error: ..."
}
```

## GET /playground/ontology

Restituisce il file playground_ontology.json.

Response 200
```json
{
  "...": "..."
}
```
Response 500
```json
{
  "error": "Ontology not found at ..."
}
```

## GET /playground/CDRs/{cdr_id}

Restituisce schema e parametri di un CDR specifico.

Response 200
```json
{
  "schema": "cdr_alg1",
  "params": {
    "...": "..."
  }
}
```
Response 404
```json
{
  "error": "CDR not found"
}
```

## GET /playground/stats?property={property_id}

Restituisce statistiche per una proprietà.

Esempio request

## GET /playground/stats?property=PAS_sistolica_mmHg
Response 200
```json
{
  "property": "PAS_sistolica_mmHg",
  "stats": {
    "count": 1000,
    "min": 50.0,
    "avg": 100.0,
    "stddev": 20.0,
    "cv": 0.2,
    "max": 150.0,
    "interval": "2023-01-01/2025-01-01",
    "distribution": {
      "[50,75)": 0.2,
      "[75,100)": 0.4,
      "[100,125)": 0.25,
      "[125,150)": 0.15
    }
  }
}
```
Note

Se il file statistico specifico non esiste, il backend restituisce un fallback demo.

## POST /playground/patients/get

Restituisce i dati del paziente nel formato usato dal frontend playground.

Body esempio
```json
{
  "id": "P001"
}
```
oppure
```json
{
  "patientId": "P001"
}
```
Response 200
```json
{
  "patient": "P001",
  "measurements": {
    "PAS_sistolica_mmHg": {
      "2024-06-01/2024-06-01": 130
    }
  },
  "triages": null,
  "patientMeta": {
    "vascular_access_type": "FAV",
    "FAV": "radiocefalica"
  }
}
```
Response 400
```json
{
  "error": "missing patient id"
}
```
Response 404
```json
{
  "error": "patient not found"
}
```

## GET /playground/timeline?id={patient_id}&cdr={cdr_id}

Restituisce la timeline del paziente nel formato usato dal frontend attuale.

Il numero di giorni della finestra può dipendere da:

days nella querystring, se presente

timeline_days del CDR, se disponibile

fallback a 30

Esempio request
GET /playground/timeline?id=P001&cdr=cdr_alg1
Response 200
```json
[
  {
    "date": "2024-06-01",
    "color": "green",
    "score": 12.0
  },
  {
    "date": "2024-07-01",
    "color": "yellow",
    "score": 44.0
  }
]
```
Response 400
```json
{
  "error": "missing id"
}
```
Response 404
```json
{
  "error": "patient not found"
}
```

# 4. Main triage endpoint

## POST /patients/triage

Questo è l’endpoint più importante per la tabella parametri del frontend attuale.

Restituisce un oggetto triage con:

date

score

details.rows

Ogni riga contiene il dettaglio di un parametro clinico.

Body esempio base
```json
{
  "id": "P001",
  "timestamp": "2025-10-10"
}
```
Body esempio con periodo esplicito
```json
{
  "id": "P001",
  "timestamp": "2025-10-10",
  "period": {
    "from": "2025-09-10",
    "to": "2025-10-10"
  }
}
```
Body legacy supportato
```json
{
  "id": "P001",
  "timestamp": "2025-10-10",
  "window_days": 30
}
```
Response 200
```json
{
  "triage": {
    "date": "2025-10-10",
    "score": 78,
    "details": {
      "rows": [
        {
          "prop": "pressione_sistolica",
          "label": "pressione_sistolica",
          "aggregate": "avg",
          "value": 135,
          "avg": 132.5,
          "min": 128,
          "max": 138,
          "count": 4,
          "score": 12.4,
          "color": "green",
          "target": [110, 140],
          "weight": 8,
          "periodRaw": [],
          "timelineRaw": []
        }
      ]
    }
  }
}
```
Response 400
```json
{
  "error": "id e timestamp sono obbligatori"
}
```
oppure
```json
{
  "error": "timestamp mancante"
}
```
oppure
```json
{
  "error": "period.to < period.from"
}
```
Response 404

Se valuta_detailed(...) restituisce un oggetto con status: 404, il backend lo inoltra come 404.

Note

se period.from e period.to sono presenti, il backend calcola days a partire dal periodo

timestamp finale viene sostituito con period.to

periodRaw contiene solo i dati del periodo selezionato

timelineRaw contiene l’intera storia del parametro

# 5. Canvas state endpoints

## GET /canvas/state

Restituisce lo stato della canvas salvato su file.

Response 200
```json
{
  "cards": [],
  "zTop": 10
}
```

oppure il contenuto reale di canvas_state.json.

Response 500
```json
{
  "error": "..."
}
```

## POST /canvas/state

Salva lo stato corrente della canvas.

Body esempio
```json
{
  "cards": [],
  "zTop": 10
}
```
Response 200
```json
{
  "ok": true
}
```
Response 500
```json
{
  "error": "..."
}
```

# 6. Mappa attuale delle chiamate frontend

Nel frontend attuale il file principale di integrazione è:

frontend/src/services/widgetPatientApi.js

Mappa principale
Funzione frontend	Metodo & path backend	Uso
```text
getPatientsDataJson()	GET /pazienti	lista pazienti / fallback dati
postPatientsGet()	    POST /playground/patients/get	dati paziente per widget
postPatientTriage()	  POST /patients/triage	tabella dettagli parametri
getNicknames()	      GET /nicknames	nickname pazienti
saveNickname()	      POST /nicknames/save	salvataggio nickname
getNormsJson()	      GET /norme	norme cliniche
getOntologyJson()	    GET /playground/ontology	ontologia widget
getCdrsJson()	        GET /cdrs	configurazioni CDR
getPropertyStats()	  GET /playground/stats	statistiche proprietà
getTimelinePoints()	  GET /playground/timeline	timeline widget
```

# 7. Disallineamenti attuali da conoscere

## GET /weights

Nel frontend esiste una funzione:

getWeightsJson() → GET /weights

Tuttavia nel backend attuale l’endpoint /weights non è definito.


