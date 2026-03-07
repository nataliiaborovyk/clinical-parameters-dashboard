# Architettura
React (frontend) -> HTTP JSON -> Flask (backend) -> file locali (JSON).
Flusso: UI invia id+data -> algoritmo calcola -> JSON di risposta -> UI colora e mostra dettagli.


# Architettura – Progetto “Ospedale”

## Panoramica
Il sistema è composto da:
- **Frontend (React + Vite)**: interfaccia per il medico (selezione paziente, timeline, card valori).
- **Backend (Flask)**: espone API REST; calcola score/colori, legge dati e norme; può calcolare le medie sul periodo.

## Flusso principale (sequenza)
Utente clicca su un punto della timeline
│
▼
Frontend (React) → api.js/getValutaDettaglio(patientId, timestamp, days, ruleId)
│ POST /valuta/dettaglio
▼
Backend (Flask app.py)
├─ chiama valuta_detailed(...) dell'algoritmo
├─ se mancano le feature, calcola medie nel periodo [timestamp-days, timestamp]
└─ normalizza {score, color, features[]} e risponde JSON
│
▼
Frontend aggiorna:
- periodo selezionato
- triage totale (colore/score)
- apre la "Values Card" con lista parametri (media, norme, colore, score)


## Dati e calcolo
- **pazienti**: `backend/data/pazienti_emodialisi.json`  
  contiene per ogni paziente una lista di misurazioni `{date, ...parametri...}`.
- **norme**: `backend/data/valori_norma_emodialisi.json`  
  contiene i range accettabili/standard dei parametri (min/max).
- **pesi**: `backend/algoritmo/pesi_importanza.json`  
  usati dall’algoritmo per ponderare i contributi dei parametri.

## Endpoints usati dal frontend
- `GET /timeline/<patient_id>`: restituisce la barra colori (punti con `timestamp` e `color`).
- `POST /valuta/dettaglio`: restituisce score totale e `features` (parametri con media/range/score).
- `GET /norme`: fornisce il file delle norme (per riempire i range nella card valori).

## Scelte progettuali
- **Score**: 0 = tutto ok (verde), valori più alti = peggiora (giallo/rosso).
- **Fallback**: se l’algoritmo non fornisce `features`, il backend calcola medie e range, ordinando i parametri per score decrescente.
- **Normalizzazione**: `app.py` adatta le risposte dell’algoritmo a un formato standard usato dal frontend.

## Possibili estensioni
- Autenticazione/Autorizzazione.
- Persistenza DB al posto del JSON.
- Selezione multipla pazienti e confronto.
- Esportazione PDF dei report.
