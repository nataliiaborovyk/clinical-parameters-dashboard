// components/canvas/Canvas.jsx
//
// ======================================================================
// CANVAS — area principale universale per i widget
// ======================================================================
//
// - Gestisce qualsiasi tipo di widget (patient, prop, note, cdr, ecc.)
// - Drag e resize SEMPRE attivi (il lock frozen non li disattiva).
// - Supporta riduzione “ad icona” persistente (usa AppContext.toggleMinimize).
// - Sfondo blu chiaro uniforme (niente quadratini).
// - Header unificato gestito dal Canvas, non dai singoli widget.
// ======================================================================

import React from "react";
import { useAppContext } from "../../context/AppContext";
import DraggableComponent from "./DraggableComponent";
import GridOverlay from "./GridOverlay";

// Widgets
import PatientWidget from "../widgets/PatientWidget";
import NoteWidget from "../widgets/NoteWidget";
import PropertyStatsWidget from "../widgets/PropertyStatsWidget";
// (futuro) import CDRWidget from "../widgets/CDRWidget";

const Canvas = () => {
  const {
    components,
    moveComponent,
    resizeComponent,
    removeComponent,
    setFrozenFor, // epN19
    addComponent,
    toggleMinimize,      // “−” dal context
    toggleCollapsedFor,  // “▢” dal context
    updateComponentData, // 👈 nuovo dal context
  } = useAppContext();

  // Crea una card paziente gemella vicino a quella cliccata

const createSiblingPatient = (sourceComponent, { patientId, date, ruleId, autoExpand }) => {
  const c = sourceComponent;
  addComponent("patient", {
    x: (c.x ?? 80) + 40,
    y: (c.y ?? 80) + 40,
    // 👉 la facciamo nascere già grande, così i dettagli stanno in vista
    w: 700,
    h: 600,
    props: {
      triggerColorKey: "patient",
      initialPatientId: patientId || c.props?.initialPatientId || "P001",
      defaultDays: c.props?.defaultDays ?? 30,
      frozen: false,
      _initialSelectedDate: date,              // 👈 passa la data selezionata
      _initialRuleId: ruleId || c.props?._initialRuleId || "cdr_alg1",
      _autoExpand: true,               // 👈 flag per richiedere espansione
    },
  });
};


  // =====================================================
  // RENDER DI UN SINGOLO WIDGET
  // =====================================================
  const renderWidget = (c) => {
    const isMinimized = c.minimized ?? false;

    // Header universale (titolo calcolato)
    const header = {
      title:
        c.title ??
        (c.type === "patient"
          ? c.props?.nickname || c.props?.initialPatientId || "Patient"
          : c.type === "prop"
          ? c.data?.selectedProp || c.props?.propertyName || "Property Stats"
          : c.type === "note"
          ? c.data?.title || c.props?.title || "Nota del Medico"
          : c.type.toUpperCase()),
      // azioni gestite dal context
      onMinimize: () => toggleMinimize(c.id),         // “−”
      onCollapse: () => toggleCollapsedFor(c.id),     // “▢”
      onClose: () => removeComponent(c.id),           // “X”
      rightExtra:
        c.type === "patient" ? (
          <button
            data-no-drag
            className={`w-7 h-7 rounded-full border flex items-center justify-center ${
              c.props?.frozen ? "bg-gray-200" : "bg-white"
            }`}
            title={c.props?.frozen ? "frozen" : "live"}
            onClick={(e) => {
              e.stopPropagation();
              setFrozenFor(c.id, !c.props?.frozen);
            }}
            aria-label="toggle frozen"
          >
            <span role="img" aria-label="lock">
              {c.props?.frozen ? "🔒" : "🔓"}
            </span>
          </button>
        ) : null,
    };

    // Corpo del widget
    let content = null;
    if (!isMinimized) {
      switch (c.type) {
        case "patient":
          content = (
            <PatientWidget
              id={c.id}
              collapsed={!!c.collapsed}
              frozen={c.props?.frozen ?? false}
              onFrozenChange={(v) => setFrozenFor(c.id, v)}
              onClose={() => removeComponent(c.id)}
              triggerColorKey={c.props?.triggerColorKey || "patient"}
              initialPatientId={c.props?.initialPatientId || "P001"}
              defaultDays={c.props?.defaultDays ?? 30}
              onRequestExpand={() => resizeComponent(c.id, 700, 600)}
              onRequestCollapse={() => resizeComponent(c.id, 700, 220)}
              onRequestCreateSiblingCard={(payload) =>
                createSiblingPatient(c, payload)
              }
            />
          );
          break;

        case "prop":
          content = (
            <PropertyStatsWidget
              widgetId={c.id}
              initialSelectedProp={c.data?.selectedProp}
              onStateChange={(partial) => {
                // salva lo stato interno nel context (persistente)
                updateComponentData(c.id, partial);
              }}
            />
          );
          break;

        case "note":
          content = (
            <div className="p-3 h-full">
              <NoteWidget
                title={c.data?.title ?? c.props?.title}
                text={c.data?.text ?? c.props?.text}
                onChange={(next) => {
                  // next = { title, text }
                  updateComponentData(c.id, next); // salva e aggiorna il titolo
                }}
              />
            </div>
          );
          break;

        case "cdr":
          content = (
            <div className="p-4 text-sm text-gray-600">
              CDR Widget — Work in progress…
            </div>
          );
          break;

        default:
          content = (
            <div className="p-4 text-sm text-gray-600">
              Unknown type: {String(c.type)}
            </div>
          );
      }
    }

    return { header, content, isMinimized };
  };

  // =====================================================
  // RENDER GENERALE DEL CANVAS
  // =====================================================
  return (
    <div
      className="relative min-h-screen min-w-screen overflow-x-auto rounded-xl border"
      style={{
        background: "linear-gradient(135deg, #E9F5FF 0%, #F6FBFF 100%)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Messaggio se vuoto */}
      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <h1 className="text-3xl font-semibold text-blue-700">
            🧩 Benvenuto nella tua Canvas interattiva
          </h1>
        </div>
      )}

      <GridOverlay />

      {/* Render di tutti i componenti */}
      {components.map((c) => {
        const { header, content, isMinimized } = renderWidget(c);
        const isPatient = c.type === "patient";
          // Etichetta del pulsante collassa/espandi (freccia carina)
          const collapseLabel =
            c.type === "note"
              ? (c.collapsed ? "⤴" : "⤵")
              : (c.collapsed ? "⟵" : "⟶");

        return (
          <DraggableComponent
            key={c.id}
            id={c.id}
            x={c.x}
            y={c.y}
            w={c.w}
            h={isMinimized ? 40 : c.h} // 👈 ridotto a 40px se minimizzato
            onMove={(dx, dy) => moveComponent(c.id, dx, dy)}
            onResize={(w, h) => resizeComponent(c.id, w, h)}
            minW={isPatient ? 350 : 180}
            minH={isPatient ? 220 : 40}
            // header unificato
            headerTitle={header.title}
            onMinimize={() => header.onMinimize()}
            onCollapse={() => header.onCollapse()}
            onClose={() => header.onClose()}
            rightExtra={header.rightExtra}
            minimized={isMinimized}
            collapsed={!!c.collapsed}
            isResizable={!isMinimized && !c.collapsed}
             collapseLabel={collapseLabel}
          >
            {content}
          </DraggableComponent>
        );
      })}
    </div>
  );
};

export default Canvas;
