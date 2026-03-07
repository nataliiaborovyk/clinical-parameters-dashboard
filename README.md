# Sistema Widget Clinici – Dashboard Pazienti

## Overview

Questo progetto implementa un sistema di **widget interattivi per la visualizzazione dei dati clinici dei pazienti**.

L’obiettivo del progetto era sviluppare componenti frontend riutilizzabili (widget) in grado di:

- visualizzare parametri clinici
- mostrare la storia temporale del paziente
- evidenziare anomalie tramite colori
- permettere l’analisi interattiva dei dati.

Per rendere possibile il test completo dei widget, è stato sviluppato anche un **piccolo backend di supporto** che simula le API del sistema originale.

Il backend non rappresenta il sistema definitivo ma serve esclusivamente come **mock backend per dimostrare il funzionamento dei widget**.

---

# Architettura del sistema

Il progetto è diviso in due parti principali:

## Frontend (React)

Interfaccia grafica composta da widget modulari che possono essere spostati e ridimensionati nel canvas.

Principali componenti:

- **Canvas**  
  area principale che contiene i widget e gestisce drag & resize

- **PatientCard**  
  widget principale con informazioni del paziente

- **Timeline**  
  barra temporale che mostra la storia clinica tramite colori

- **ParametersTable**  
  tabella dei parametri clinici con valori, soglie e score

- **ParamChart**  
  grafico dell’andamento dei parametri nel tempo

- **NicknameEditor**  
  componente per modificare il nickname del paziente

I widget sono progettati per essere **riutilizzabili e indipendenti**.

---

# Backend di supporto

Poiché il compito originale prevedeva solo i widget frontend e non forniva un backend reale, è stato creato un **backend minimo in Python (Flask)** per:

- simulare le API del sistema clinico
- fornire dati ai widget
- calcolare score e indicatori clinici

Il backend utilizza:

- **Flask** per le API REST
- **JSON** come database simulato
- un algoritmo Python per il calcolo dei punteggi clinici.

---

# Algoritmo di valutazione clinica

Il backend include un algoritmo che:

1. Filtra le misurazioni cliniche negli ultimi N giorni
2. Calcola statistiche dei parametri (media, min, max)
3. Confronta i valori con le soglie cliniche
4. Calcola uno **score di compliance clinica**
5. Restituisce un colore di rischio:

- verde → situazione normale
- giallo/arancione → attenzione
- rosso → situazione critica

I pesi dei parametri sono definiti in un file JSON dedicato.

---

# Dataset di esempio

Per simulare il comportamento del sistema sono utilizzati file JSON con:

- misurazioni cliniche dei pazienti
- valori normali dei parametri
- pesi di importanza dei parametri.

Questo permette ai widget di funzionare senza accesso a sistemi clinici reali.

---

# Funzionalità principali

Il sistema consente di:

- visualizzare lo stato clinico di un paziente
- analizzare l’andamento dei parametri nel tempo
- individuare rapidamente anomalie tramite colori
- esplorare i dati tramite widget interattivi
- creare più widget nello stesso canvas.

---

# Tecnologie utilizzate

Frontend
- React
- Vite
- Recharts
- JavaScript / JSX

Backend
- Python
- Flask
- JSON

---

# Obiettivo del progetto

Questo progetto dimostra:

- sviluppo di **componenti frontend complessi e modulari**
- integrazione frontend/backend tramite API REST
- gestione e visualizzazione di **dati clinici nel tempo**
- progettazione di **dashboard interattive con widget dinamici**.

Il backend è stato sviluppato solo per **dimostrare e testare il comportamento dei widget in assenza di un sistema server reale**.