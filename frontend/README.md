# Frontend — Clinical Parameters Dashboard

## Overview

Il frontend del progetto **Clinical Parameters Dashboard** implementa una dashboard interattiva per l’analisi dei parametri clinici dei pazienti nel tempo.

L’interfaccia è sviluppata in **React** ed è progettata per visualizzare e analizzare l’andamento dei parametri clinici attraverso widget modulari, tabelle e grafici temporali.

Questo frontend è stato sviluppato per supportare il **Patient Widget**, un componente che consente di analizzare i dati clinici del paziente e ottenere una valutazione sintetica dello stato clinico.

Il progetto nasce nel contesto del sistema **SIATE – Sistema di Analisi dei Parametri Clinici per Pazienti in Emodialisi**.

---

# Frontend Architecture

L’architettura frontend è basata su **componenti React modulari**, organizzati per responsabilità.

User
↓
React Components
↓
Widget Logic
↓
API Requests
↓
Backend Flask


Il frontend gestisce:

- la visualizzazione dei dati clinici
- l’interazione dell’utente con i parametri
- la comunicazione con il backend
- la gestione dello stato dei componenti

---

# Main Components

## Canvas

La **canvas** rappresenta il contenitore principale della dashboard.

Permette di:

- ospitare diversi widget
- gestire il layout della dashboard
- supportare componenti trascinabili

Directory:
src/components/canvas/


Componenti principali:

- `Canvas.jsx`
- `DraggableComponent.jsx`
- `GridOverlay.jsx`

---

## Patient Module

Il **Patient Module** rappresenta il cuore della dashboard e contiene il widget dedicato all’analisi del paziente.

Funzionalità principali:

- visualizzazione dei parametri clinici
- confronto dei valori con intervalli di riferimento
- calcolo dello **score clinico aggregato**
- analisi temporale dei parametri

Directory:
src/components/PatientModule/


Componenti principali:

- `PatientCard.jsx`
- `ParametersTable.jsx`
- `ParamChart.jsx`
- `Timeline.jsx`
- `NicknameEditor.jsx`

---

## Hooks

Il frontend utilizza hook personalizzati per gestire logiche specifiche dell’applicazione.

Esempio:
src/components/PatientModule/hooks/useSegmentDates.js


Questo hook gestisce:

- il calcolo dei segmenti temporali
- la selezione dei periodi di analisi
- la gestione delle date utilizzate nei grafici

---

# Data Flow

Il flusso dei dati nel frontend segue questo schema:

Backend API
↓
Service Layer
↓
React Components
↓
Visualizzazione Dashboard


1. Il frontend effettua richieste API tramite i servizi presenti in `services/`.
2. I dati ricevuti vengono elaborati e passati ai componenti React.
3. I componenti aggiornano la visualizzazione della dashboard.

---

# Services

La comunicazione con il backend è gestita tramite un livello di servizi.

Directory:
src/services/


File principali:

- `otherApi.js`
- `widgetPatientApi.js`

Questi moduli gestiscono:

- chiamate API
- recupero dati clinici
- integrazione con il backend Flask

---

# Utilities

Il progetto include diversi moduli di utilità per supportare la logica della dashboard.

Directory:
src/utils/


Esempi:

- gestione delle date
- funzioni matematiche
- manipolazione dei dataset
- gestione delle etichette e delle costanti

File presenti:

- `arrays.js`
- `colors.js`
- `constants.js`
- `date.js`
- `helpers.js`
- `labels.js`
- `math.js`
- `norms.js`
- `patientRaw.js`
- `statsUtils.js`

---

# Technologies

Il frontend utilizza le seguenti tecnologie:

- **React**
- **JavaScript**
- **Component-based architecture**
- **Custom hooks**
- **Data visualization**

---

# Running the Frontend

Per avviare il frontend:

bash
cd frontend
npm install
npm run dev

Una volta avviato il server di sviluppo, la dashboard sarà disponibile nel browser.


---

# Limitations

Questo frontend rappresenta una parte del sistema SIATE e non l’intera piattaforma.

In particolare:

la dashboard include principalmente il Patient Widget

altri widget del sistema non sono presenti in questo repository

il backend utilizzato è una versione semplificata di supporto

L’obiettivo del progetto è dimostrare il funzionamento del widget e la logica di analisi dei parametri clinici.

---

# Author Contribution

Nel contesto del progetto accademico SIATE:

Sviluppato personalmente in questo repository:

- progettazione e sviluppo del **Patient Widget**
- sviluppo dell’interfaccia React per l’analisi dei parametri clinici
- integrazione **frontend–backend**
- sviluppo della **canvas per la dashboard**

Il progetto è stato realizzato come **progetto accademico presso ITS ICT Academy**.

---

# Future Improvements

Possibili evoluzioni del progetto:

- integrazione con un database reale
- utilizzo di dataset clinici reali
- estensione della dashboard con nuovi widget
- integrazione con modelli di **Machine Learning per la previsione dello stato del paziente**