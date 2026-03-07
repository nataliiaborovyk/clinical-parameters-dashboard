// src/components/canvas/DraggableComponent.jsx
//
// ======================================================================
// DraggableComponent — wrapper generico per ogni widget del Canvas
// ======================================================================
//
// - Gestisce drag e resize (sempre attivi).
// - Mostra header unificato (barra blu chiaro smussata).
// - Supporta riduzione “ad icona” (fisarmonica): pulsante "−" nell’header.
// - Nessun bottone “–” nei widget: solo nell’header globale (− ▢ X).
// - Non contiene logica del widget, solo layout + interazioni.
// ======================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";

const DraggableComponent = ({
  id,
  x,
  y,
  w,
  h,
  minW = 200,
  minH = 40,
  onMove,
  onResize,
  children,
  headerTitle = "Widget",
  rightExtra = null,
  minimized = false,
  collapsed = false,
  isResizable = true,
  // azioni header
  onMinimize,  // “−”
  onCollapse,  // “▢”
  onClose,     // “X”
  collapseLabel,
}) => {
  const rootRef = useRef(null);
  const posRef = useRef({ x, y });
  const sizeRef = useRef({ w, h });

  const [position, setPosition] = useState({ x, y });
  const [size, setSize] = useState({ w, h });

  useEffect(() => { setPosition({ x, y }); posRef.current = { x, y }; }, [x, y]);
  useEffect(() => { setSize({ w, h }); sizeRef.current = { w, h }; }, [w, h]);

  // ===== Drag =====
  const [dragging, setDragging] = useState(false);
  const dragStart = useCallback((e) => {
    if (e.target?.closest && e.target.closest("[data-no-drag]")) return;
    e.stopPropagation();

    const startX = e.clientX ?? e.touches?.[0]?.clientX;
    const startY = e.clientY ?? e.touches?.[0]?.clientY;
    if (startX == null || startY == null) return;

    let prevX = startX;
    let prevY = startY;
    setDragging(true);

    const onMoveHandler = (ev) => {
      const currX = ev.clientX ?? ev.touches?.[0]?.clientX;
      const currY = ev.clientY ?? ev.touches?.[0]?.clientY;
      if (currX == null || currY == null) return;

      const dxi = Math.round(currX - prevX);
      const dyi = Math.round(currY - prevY);

      if (dxi !== 0 || dyi !== 0) {
        onMove?.(dxi, dyi);
        prevX = currX;
        prevY = currY;
      }
      if (ev.cancelable) ev.preventDefault();
    };

    const onEnd = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMoveHandler);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMoveHandler);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMoveHandler);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMoveHandler, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [onMove]);

  // ===== Resize =====
  const [resizing, setResizing] = useState(false);
  const resizeStart = useCallback((e) => {
    if (!isResizable) return;
    e.stopPropagation();
    setResizing(true);

    const startX = e.clientX ?? (e.touches?.[0]?.clientX);
    const startY = e.clientY ?? (e.touches?.[0]?.clientY);
    const { w: sw, h: sh } = sizeRef.current;

    const onResizeHandler = (ev) => {
      const currX = ev.clientX ?? (ev.touches?.[0]?.clientX);
      const currY = ev.clientY ?? (ev.touches?.[0]?.clientY);
      const dw = Math.round(currX - startX);
      const dh = Math.round(currY - startY);
      const newW = Math.max(minW, sw + dw);
      const newH = Math.max(minH, sh + dh);
      onResize?.(newW, newH);
    };
    const onEnd = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onResizeHandler);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onResizeHandler);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onResizeHandler);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onResizeHandler, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [isResizable, minW, minH, onResize]);

  const headerStyle =
    "h-10 px-3 flex items-center justify-between bg-blue-100 border-b border-blue-200 select-none";

  return (
    <div
      data-comp={id}
      ref={rootRef}
      className="absolute rounded-xl bg-white shadow-md overflow-hidden"
      style={{ left: position.x, top: position.y, width: size.w, height: size.h }}
    >
      {/* Header unificato: titolo + pulsanti − ▢ X */}
      <div onMouseDown={dragStart} className={headerStyle}>
        {/* Titolo (solo testo, niente toggle sul click) */}
        <div className="text-sm font-semibold text-gray-800 truncate">
          {headerTitle}
        </div>

        {/* Azioni a destra */}
        <div className="flex items-center gap-2">
          {rightExtra}

          {/* − Minimizza */}
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.(id);
            }}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
            title={minimized ? "Ripristina" : "Riduci ad icona"}
          >
            −
          </button>

          {/* ▢ Collassa */}
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              onCollapse?.(id);
            }}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
            title={collapsed ? "Espandi" : "Riduci a riquadro"}
          >
            {collapseLabel ?? "▢"}
          </button>

          {/* X Chiudi */}
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-red-600"
            title="Chiudi"
          >
            X
          </button>
        </div>
      </div>

      {/* Corpo (solo se non minimizzato) */}
        {!minimized && (
        <div className="w-full h-[calc(100%-40px)] overflow-auto overscroll-contain">{children}</div>
      )}

      {/* Handle di resize (angolo in basso a destra) */}
      {isResizable && !minimized && !collapsed && (
        <div
          onMouseDown={resizeStart}
          className="absolute bottom-1 right-1 w-3 h-3 bg-blue-300 rounded cursor-se-resize"
          title="Ridimensiona"
        />
      )}
    </div>
  );
};

export default DraggableComponent;
