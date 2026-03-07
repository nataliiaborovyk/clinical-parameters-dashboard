import React, { useState } from "react";


/**
* NoteWidget — sticky note semplice
* (Il drag/resize è gestito dal Canvas/DraggableComponent: qui mostri solo il contenuto)
*/
const NoteWidget = ({ title = "Nota del Medico", text = "", onChange }) => {
  const [local, setLocal] = useState({ title, text });

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 w-full h-full flex flex-col">
      <input
        className="mb-2 px-2 py-1 rounded border border-amber-200 bg-white text-sm font-semibold"
        value={local.title}
        onChange={(e) => update({ title: e.target.value })}
      />
      <textarea
        className="flex-1 resize-none rounded border border-amber-200 bg-white p-2 text-sm"
        placeholder="Scrivi qui la nota…"
        value={local.text}
        onChange={(e) => update({ text: e.target.value })}
      />
    </div>
  );
};

export default NoteWidget;
