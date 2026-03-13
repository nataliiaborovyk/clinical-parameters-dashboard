# Backend — Clinical Parameters Dashboard

## Overview

Il backend del progetto **Clinical Parameters Dashboard** fornisce i servizi necessari per supportare la dashboard clinica sviluppata nel frontend.

Il sistema è stato sviluppato utilizzando **Python e Flask** e ha lo scopo di fornire dati clinici simulati al widget paziente e supportare la logica di analisi dei parametri.

Questo backend è stato progettato come **backend di supporto** per il frontend, poiché nel sistema originale **SIATE – Sistema di Analisi dei Parametri Clinici per Pazienti in Emodialisi** non era disponibile un backend funzionante.

Per questo motivo il backend implementa una versione semplificata dei servizi necessari per dimostrare il comportamento della dashboard e permettere la visualizzazione dinamica dei dati clinici.

---

# Architecture

# Architecture

Il backend segue una struttura semplice ma funzionale, progettata per supportare il widget paziente della dashboard.

text
Frontend (React Dashboard)
↓
HTTP Requests
↓
Flask API (`app.py`)
↓
Clinical Scoring Logic (`algoritmo1.py`)
↓
JSON Clinical Datasets


Il backend gestisce:

- la fornitura dei dati clinici al frontend
- la simulazione dei dataset sanitari
- la logica di valutazione dei parametri clinici
- l’elaborazione dei dati per il widget paziente

---

# Project Structure
```text
backend/
│
├── app.py
│
├── algoritmo/
│ ├── algoritmo1.py
│ └── logiche di valutazione dei parametri
│
├── data/
│ ├── pazienti_emodialisi.json
│ ├── valori_norma_emodialisi.json
│ └── altri dataset simulati
│
└── pesi_importanza.json
```


### app.py

File principale del backend Flask.

Responsabilità principali:

- definizione delle API
- gestione delle richieste HTTP
- invio dei dati al frontend

---

### algoritmo/

Questa directory contiene la logica utilizzata per analizzare i parametri clinici del paziente.

Include:

- funzioni di valutazione dei parametri
- logiche di scoring basate su intervalli di riferimento
- calcolo dello stato complessivo del paziente

---

### data/

Contiene i dataset clinici simulati utilizzati dal sistema.

I dati rappresentano:

- pazienti
- parametri clinici
- intervalli di normalità

I file JSON permettono di simulare il comportamento di un sistema clinico reale.

---

# API

Il backend espone API utilizzate dal frontend per recuperare i dati clinici del paziente.

Flusso tipico:


text
Frontend React
↓
Richiesta API HTTP
↓
Flask app (`app.py`)
↓
Logica di valutazione (`algoritmo/algoritmo1.py`)
↓
Lettura dati clinici da file JSON
↓
Elaborazione dei parametri
↓
Risposta JSON al frontend


Le risposte API contengono:

- informazioni del paziente
- parametri clinici
- dati temporali per grafici
- valori utilizzati nel calcolo dello score


---

#  API Example

Di seguito un esempio semplificato del flusso utilizzato dal frontend per ottenere una valutazione del paziente.

### Example Request

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

Example Response
```json
{
  "triage": {
    "date": "2025-10-10",
    "score": 78,
    "details": {
      "rows": [
        {
          "prop": "pressione_sistolica",
          "value": 135,
          "avg": 132.5,
          "min": 128,
          "max": 138,
          "count": 4,
          "score": 12.4,
          "color": "green",
          "target": [110, 140],
          "weight": 8
        },
        {
          "prop": "frequenza_cardiaca",
          "value": 96,
          "avg": 94.0,
          "min": 90,
          "max": 99,
          "count": 4,
          "score": 9.1,
          "color": "yellow",
          "target": [60, 90],
          "weight": 6
        }
      ]
    }
  }
}
```


## Supported Data

Il backend lavora su dataset clinici simulati organizzati in file JSON.

Le principali categorie di dati gestite sono:

- identificativi paziente
- misurazioni cliniche raccolte nel tempo
- intervalli di riferimento dei parametri
- pesi per il calcolo dello score
- dati di supporto per timeline e visualizzazioni

Questo approccio rende il progetto leggero, facilmente eseguibile in locale e adatto alla prototipazione.
---

# Data Processing

Il backend implementa una logica di valutazione dei parametri clinici basata su:

- intervalli di normalità dei parametri
- pesi assegnati ai parametri
- aggregazione dei valori disponibili

Il risultato dell’elaborazione è uno **score sintetico** che rappresenta la stabilità dei parametri clinici del paziente.

---

# Technologies

Il backend utilizza le seguenti tecnologie:

- **Python**
- **Flask**
- **JSON datasets**
- **Algoritmi di analisi dei parametri**

---

# Running the Backend

Per avviare il backend:

bash
cd backend
pip install -r requirements.txt
python app.py

Il server Flask avvierà le API necessarie per fornire i dati al frontend.

---

# Limitations

Questo backend è stato sviluppato come backend di supporto per dimostrare il funzionamento del widget paziente.

In particolare:

- non è collegato a un database reale
- i dataset clinici sono **simulati**
- implementa solo le API necessarie per il funzionamento della dashboard

Nel sistema completo SIATE il backend includerebbe servizi più complessi e l’integrazione con sistemi di gestione dei dati clinici.

---

# Author Contribution

Nel contesto del progetto accademico SIATE:

Sviluppato personalmente in questo repository:

- progettazione e sviluppo del **backend Flask**
- implementazione della logica di valutazione dei parametri clinici
- gestione dei dataset sanitari simulati
- integrazione con il frontend React per la visualizzazione dei dati

Il backend è stato progettato per supportare il Patient Widget della dashboard clinica.

---

# Future Improvements

Possibili evoluzioni del progetto:

- integrazione con un database reale
- utilizzo di dataset clinici reali
- estensione della dashboard con nuovi widget
- integrazione con modelli di **Machine Learning per la previsione dello stato del paziente**