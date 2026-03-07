Descrizione generale

Il progetto “Ospedale” è composto da due parti:

Backend → scritto in Python/Flask, calcola punteggi, colori e medie.
Frontend → scritto in React/Vite, mostra i dati e l’interfaccia grafica.

Struttura del progetto

PROGETTO_COMPLETO2/
│
├── backend/               ← Parte Python (server Flask)
│   ├── algoritmo/         ← Calcolo logico dei punteggi e colori
│   │   ├── algoritmo1.py
│   │   ├── pesi_importanza.json
│   │   └── regole_parametri.py
│   │
│   ├── data/              ← Dati grezzi o di riferimento
│   │   ├── pazienti_emodialisi.json
│   │   └── valori_norma_emodialisi.json
│   │
│   ├── app.py             ←  Cuore del backend (tutte le rotte Flask)
│   ├── config.json        ←  File di configurazione (porte, percorsi)
│   ├── README_backend.md  ←  Istruzioni per avvio e setup
│   └── requirements.txt   ←  Librerie Python necessarie (Flask, ecc.)
│
├── docs/                  ← Documentazione tecnica
│   ├── api_contract.md    ← Descrizione delle API (es. POST /valuta)
│   └── architettura.md    ← Descrizione generale di come funziona il sistema
│
└── frontend/              ← Parte React (interfaccia web)
    ├── public/            
    ├── src/               ← Codice dell’app React
    │   ├── api/           ← Funzioni che chiamano il backend
    │   ├── components/    ← Componenti visivi (PatientCriticalCard, ecc.)
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    ├── package.json
    └── vite.config.js

Collegamento tra Frontend e Backend

Frontend (React)
     │
     ▼
 chiamate API (in api.js) ───────────────► Flask (app.py)
                                             │
                                             ├── usa algoritmo1.py
                                             ├── legge pesi_importanza.json
                                             ├── legge valori_norma_emodialisi.json
                                             └── restituisce dati in formato JSON


Avvio del progetto
```bash
# 1 Apri VS Code nella cartella principale del progetto
cd PROGETTO_COMPLETO2

# 2 Avvia il backend Flask
python3 backend/app.py
# oppure:
flask --app backend/app.py run --port 8001

# Il backend è ora attivo su:
#  http://127.0.0.1:8001

# 3 Avvia il frontend React
cd frontend
npm run dev

# alternativa per avviare entrambi da un unico terminale
(cd frontend && npm run dev) & python3 backend/app.py


# Il frontend è ora attivo su:
#  http://localhost:5174

```  

| Endpoint | Descrizione | File di origine | Output |
|-----------|--------------|-----------------|---------|
| GET /playground/ontology | Restituisce ONTOLOGY_OBJ canonico | data/playground_ontology.json | {"properties":..., "CDRs":...} |
| GET /playground/stats?property=ID | Statistiche di test | data/stats/*.json | PROPERTY_STATS_OBJ |
| POST /playground/patients/get | Misure e triage del paziente | pazienti_emodialisi*.json | PLAYGROUND_PATIENT_COMPONENT_OBJ |
| POST /patients/triage | Calcolo triage singolo | algoritmo/algoritmo1.py | TRIAGE_OBJ |
