// ======================================================================
// NicknameEditor — campo di input per assegnare/modificare il "nickname"
// del paziente. Interagisce con l'API saveNickname(patientId, nickname, opts).
// ======================================================================

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { saveNickname } from "@/services/widgetPatientApi"; // ✅ usa la tua API

/**
 * COSA FA:
 *  - Mostra un input per modificare il nickname del paziente.
 *  - Salva quando clicchi “salva” o premi Enter (facoltativo autosave onBlur).
 *
 * PROPS:
 *  - patientId        : string   → ID paziente (obbligatorio)
 *  - nickname         : string   → valore iniziale
 *  - onSave(newNick)  : funzione callback dopo salvataggio
 *  - apiOpts          : opzioni per la fetch (es. { baseUrl })
 *  - autosaveOnBlur   : boolean  → se true salva automaticamente quando esci
 *  - hideButton       : boolean  → se true non mostra il bottone “salva”
 * ======================================================================
 */
const NicknameEditor = ({
  patientId,
  nickname = "",
  onSave,
  apiOpts = {},
  autosaveOnBlur = false,
  hideButton = false,
}) => {
  // -----------------------------
  // STATE LOCALE
  // -----------------------------
  const [value, setValue] = useState(nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  // Aggiorna input se cambia nickname esterno
  useEffect(() => {
    setValue(nickname || "");
    setDirty(false);
    setError("");
  }, [nickname]);

  // normalizza
  const normalized = useMemo(() => (value || "").trim(), [value]);
  const normalizedProp = useMemo(() => (nickname || "").trim(), [nickname]);

  // ------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------
  const handleChange = (e) => {
    setValue(e.target.value);
    setDirty(true);
    if (error) setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSave();
    } else if (e.key === "Escape") {
      setValue(nickname || "");
      setDirty(false);
      setError("");
    }
  };

  const handleBlur = () => {
    if (autosaveOnBlur) doSave();
  };

  // ------------------------------------------------------------
  // SALVATAGGIO (compatibile con la tua API)
  // ------------------------------------------------------------
 const doSave = useCallback(async () => {
  const pid = String(patientId || "");
  if (!pid) {
    setError("ID paziente mancante");
    return;
  }
  if (!normalized) {
    setError("Inserisci un nickname");
    return;
  }
  if (!dirty && normalized === normalizedProp) return;

  setSaving(true);
  setError("");

  // helper per estrarre un messaggio utile dall’errore
  const extractErrMsg = async (err) => {
    try {
      if (err?.response) {
        const text = await err.response.text();
        return `HTTP ${err.response.status} – ${text || err.response.statusText}`;
      }
      if (err?.status && err?.text) {
        const text = await err.text();
        return `HTTP ${err.status} – ${text}`;
      }
      return err?.message || JSON.stringify(err);
    } catch {
      return err?.message || "Errore sconosciuto";
    }
  };

  try {
    // 1) prova firma: (apiOpts, { patientId, nickname })
    await saveNickname(apiOpts, { patientId: pid, nickname: normalized });
  } catch (e1) {
    console.warn("[NicknameEditor] prima firma fallita, provo la seconda:", e1);
    try {
      // 2) fallback firma: (patientId, nickname, apiOpts)
      await saveNickname(pid, normalized, apiOpts);
    } catch (e2) {
      const msg1 = await extractErrMsg(e1);
      const msg2 = await extractErrMsg(e2);
      console.error("[NicknameEditor] errore salvataggio:", msg1, " / ", msg2);
      setError(`Errore durante il salvataggio: ${msg2 || msg1}`);
      setSaving(false);
      return;
    }
  }

  setDirty(false);
  onSave?.(normalized);
  setSaving(false);
}, [apiOpts, dirty, normalized, normalizedProp, onSave, patientId]);


  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div className="flex items-start gap-2">
      {/* Campo input */}
      <div className="flex-1">
        <label className="sr-only" htmlFor="nickname-input">
          Nickname
        </label>
        <input
          id="nickname-input"
          className="w-full border rounded px-2 py-1 bg-gray-50 text-center"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="es. Aldo"
          aria-invalid={!!error}
        />

        {/* Messaggio errore */}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}

        {/* Messaggio “modifiche non salvate” */}
        {dirty && !error && !autosaveOnBlur && (
          <div className="text-[11px] text-gray-500 mt-1">
            Modifiche non salvate (Invio per salvare, Esc per annullare)
          </div>
        )}
      </div>

      {/* Bottone “salva” */}
      {!hideButton && (
        <button
          onClick={doSave}
          disabled={saving}
          className={`text-xs px-2 my-1 py-1 border rounded transition ${
            saving ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
          title={saving ? "Salvataggio in corso..." : "Salva nickname"}
        >
          {saving ? "..." : "salva"}
        </button>
      )}
    </div>
  );
};

export default NicknameEditor;
