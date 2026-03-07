// ======================================================================
// PatientWidget — wrapper per la card paziente
// Gestisce integrazione con DraggableComponent e AppContext.
// L'header e i controlli (− ▢ X) sono gestiti globalmente dal Canvas/AppContext.
// ======================================================================

import React from "react";
import { useAppContext } from "@/context/AppContext";
import PatientCard from "../PatientModule/PatientCard";

const PatientWidget = ({
  id,
  // accetto entrambi, uso quello valorizzato
  initialPatientId,
  patientId,

  collapsed = false,
  frozen = false,

  // 🔹 PRENDo le callback dal Canvas…
  onRequestExpand,
  onRequestCollapse,

  // 🔹 destrutturo anche questi opzionali che il Canvas può passare
  _initialSelectedDate,
  _initialRuleId,
  _autoExpand,

  // 🔹 callback per creare la gemella (arriva dal Canvas)
  onRequestCreateSiblingCard,

  ...rest // eventuali altri campi non usati ora
}) => {
  // ✅ nome corretto del metodo: removeComponent
  const { removeComponent } = useAppContext();

  // scelgo l’id effettivo passato dal Canvas
  const effPatientId = initialPatientId ?? patientId ?? "P001";

  return (
    <div
      className={`transition-all duration-200 ${
        collapsed ? "opacity-80 scale-[0.97]" : "opacity-100 scale-100"
      }`}
    >
      <PatientCard
        id={id}
        collapsed={collapsed}
        frozen={frozen}
        initialPatientId={effPatientId}
        onFrozenChange={(val) =>
          console.debug("[PatientWidget] frozen change:", val)
        }

        // 🔹 inoltro 1: dimensioni/espansione gestite dal Canvas
        onRequestExpand={onRequestExpand}
        onRequestCollapse={onRequestCollapse}

        // 🔹 inoltro 2: richiesta di creare la card gemella
        onRequestCreateSiblingCard={(payload) =>
          onRequestCreateSiblingCard?.(payload)
        }

        // 🔹 inoltro 3: chiusura dal bottone interno (se presente)
        onClose={() => removeComponent?.(id)}

        // 🔹 inoltro 4: parametri di auto-apertura dettagli al mount
        _initialSelectedDate={_initialSelectedDate}
        _initialRuleId={_initialRuleId}
        _autoExpand={_autoExpand}
      />
    </div>
  );
};

export default PatientWidget;
