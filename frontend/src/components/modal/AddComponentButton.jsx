import React, { useState } from "react";
import { useAppContext } from "../../context/AppContext";

/**
 * AddComponentButton — pulsante flottante “+” con speed-dial colorato.
 * Tipi supportati: "patient", "prop", "cdr", "note".
 */
const AddComponentButton = () => {
  const { addComponent } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleAdd = (type) => {
    addComponent(type);
    setOpen(false);
  };

  return (
    <>
      {/* Menu aperto: pulsanti colorati in colonna */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col space-y-3 animate-fadeIn">
          <button
            onClick={() => handleAdd("patient")}
            className="px-4 py-2 rounded-full shadow bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2"
            title="Aggiungi Paziente"
          >
            <span>🧑‍⚕️</span> Aggiungi Paziente
          </button>

          <button
            onClick={() => handleAdd("prop")}
            className="px-4 py-2 rounded-full shadow bg-emerald-500 hover:bg-emerald-600 text-white text-sm flex items-center gap-2"
            title="Aggiungi Statistiche Property"
          >
            <span>📊</span> Aggiungi Statistiche
          </button>

          <button
            onClick={() => handleAdd("cdr")}
            className="px-4 py-2 rounded-full shadow bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-2"
            title="Aggiungi CDR"
          >
            <span>🧠</span> Aggiungi CDR
          </button>

          <button
            onClick={() => handleAdd("note")}
            className="px-4 py-2 rounded-full shadow bg-amber-400 hover:bg-amber-500 text-white text-sm flex items-center gap-2"
            title="Aggiungi Nota del Medico"
          >
            <span>📝</span> Aggiungi Nota
          </button>
        </div>
      )}

      {/* Pulsante flottante “+” */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-3xl leading-none shadow-lg focus:outline-none"
        aria-label="Aggiungi componente"
        title="Aggiungi componente"
      >
        {open ? "×" : "+"}
      </button>
    </>
  );
};

export default AddComponentButton;
