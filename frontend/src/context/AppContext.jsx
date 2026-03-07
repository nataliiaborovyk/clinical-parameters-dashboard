// ================================================================
// AppContext — contesto globale dell’applicazione
// ================================================================
//
// Gestisce:
//   - Stato globale dei widget (posizione, dimensioni, tipo, props)
//   - Persistenza automatica su LocalStorage
//   - Gestione unificata dell’header (− ▢ X)
//   - Stati: frozen, minimized, collapsed
//   - Logica di posizionamento intelligente (no overlap)
//
// ================================================================

import React, { createContext, useContext, useEffect, useState } from "react";

const AppCtx = createContext(null);
export const useAppContext = () => useContext(AppCtx);

// --------------------------------------------------------
// Chiave di storage globale
// --------------------------------------------------------
export const CANVAS_STATE_STORAGE_KEY = "canvas_state_v1";

// --------------------------------------------------------
// Generatore ID univoco
// --------------------------------------------------------
const newId = () =>
  `w_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

// --------------------------------------------------------
// Utility: controllo overlap e ricerca spot libero
// --------------------------------------------------------
const GAP = 12;
const overlap = (a, b, pad = GAP) => {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
};

const findFreeSpot = (existing, w, h, options = null) => {
  const doc = document.documentElement;
  const W = doc.clientWidth || window.innerWidth || 1200;
  const H = doc.clientHeight || window.innerHeight || 800;
  const sx = window.pageXOffset || window.scrollX || 0;
  const sy = window.pageYOffset || window.scrollY || 0;

  const margin = 12;
  const startX = sx + margin;
  const startY = sy + margin;
  const maxX = sx + W - w - margin;
  const maxY = sy + H - h - margin;

  const stepX = Math.max(40, Math.floor(w / 3));
  const stepY = Math.max(40, Math.floor(h / 3));

  const hint =
    options && typeof options === "object" ? options.hint || options : null;
  const base = hint || { x: startX, y: startY };

  // 1) sotto
  for (let y = base.y; y <= maxY; y += stepY) {
    const cand = { x: base.x, y, w, h };
    if (!existing.some((e) => overlap(cand, e)) && cand.x >= startX && cand.x <= maxX) {
      return { x: cand.x, y: cand.y };
    }
  }
  // 2) a destra
  for (let x = base.x; x <= maxX; x += stepX) {
    const cand = { x, y: base.y, w, h };
    if (!existing.some((e) => overlap(cand, e)) && cand.y >= startY && cand.y <= maxY) {
      return { x: cand.x, y: cand.y };
    }
  }
  // 3) scansione a griglia
  for (let y = startY; y <= maxY; y += stepY) {
    for (let x = startX; x <= maxX; x += stepX) {
      const cand = { x, y, w, h };
      if (!existing.some((e) => overlap(cand, e))) return { x, y };
    }
  }
  // 4) fallback: cascata
  const k = existing.length;
  return {
    x: Math.min(startX + k * 24, maxX),
    y: Math.min(startY + k * 24, maxY),
  };
};

// --------------------------------------------------------
// AppProvider
// --------------------------------------------------------
export const AppProvider = ({ children }) => {
  const [components, setComponents] = useState([]);

  // =====================================================
  // 🔹 PERSISTENZA (LocalStorage)
  // =====================================================
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CANVAS_STATE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setComponents(parsed);
        console.log("[AppContext] Stato canvas ricaricato da localStorage");
      }
    } catch (err) {
      console.warn("[AppContext] errore nel parse localStorage:", err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CANVAS_STATE_STORAGE_KEY, JSON.stringify(components));
    } catch (err) {
      console.warn("[AppContext] errore nel salvataggio localStorage:", err);
    }
  }, [components]);

  // =====================================================
  // 🔹 ADD — aggiunge un nuovo widget
  // =====================================================
  const addComponent = (type, overrides = {}) => {
    const id = newId();

    const w =
      overrides.w ??
      (type === "patient"
        ? 700
        : type === "cdr"
        ? 560
        : type === "prop"
        ? 560
        : 360);
    const h =
      overrides.h ??
      (type === "patient"
        ? 220
        : type === "cdr"
        ? 320
        : type === "prop"
        ? 320
        : 220);

    let x = overrides.x ?? null;
    let y = overrides.y ?? null;

    if (x == null || y == null) {
      const existingRects = components.map((c) => ({
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
      }));
      const fallbackHint = components.length
        ? {
            x: components[components.length - 1].x + 40,
            y: components[components.length - 1].y + 40,
          }
        : null;
      const spot = findFreeSpot(existingRects, w, h, overrides.hint || fallbackHint);
      x = spot.x;
      y = spot.y;
    }

    let baseProps = {};
    if (type === "patient") {
      baseProps = {
        triggerColorKey: "patient",
        initialPatientId: "P001",
        defaultDays: 30,
        frozen: false,
      };
    } else if (type === "note") {
      baseProps = { title: "Nota del Medico", text: "" };
    } else if (type === "prop") {
      baseProps = { propertyName: "Property A" };
    }

    const newItem = {
      id,
      type,
      x,
      y,
      w,
      h,
      z: (components.reduce((m, c) => Math.max(m, c.z || 0), 0) || 0) + 1,
      props: { ...baseProps, ...(overrides.props || {}) },
      data: {},
      minimized: false,
      collapsed: false,
    };

    setComponents((arr) => [...arr, newItem]);
    return id;
  };

  // =====================================================
  // 🔹 UPDATE (patch generico)
  // =====================================================
  const updateComponent = (id, patch) => {
    setComponents((arr) =>
      arr.map((c) =>
        c.id === id
          ? { ...c, ...patch, props: { ...c.props, ...(patch.props || {}) } }
          : c
      )
    );
  };

  // =====================================================
  // 🔹 MOVE (drag da DraggableComponent)
  // =====================================================
  const moveComponent = (id, dx, dy) => {
    setComponents((arr) =>
      arr.map((c) =>
        c.id === id
          ? { ...c, x: Math.round(c.x + dx), y: Math.round(c.y + dy) }
          : c
      )
    );
  };

  // =====================================================
  // 🔹 RESIZE (resize da DraggableComponent)
  // =====================================================
  const resizeComponent = (id, w, h) => {
    setComponents((curr) =>
      curr.map((c) => {
        if (c.id !== id) return c;
        const isPatient = c.type === "patient";
        const minW = isPatient ? 700 : 260;
        const minH = isPatient ? 220 : 40;
        return {
          ...c,
          w: Math.max(minW, Math.round(w)),
          h: Math.max(minH, Math.round(h)),
        };
      })
    );
  };

  // =====================================================
  // 🔹 REMOVE
  // =====================================================
  const removeComponent = (id) => {
    setComponents((arr) => arr.filter((c) => c.id !== id));
  };

  // =====================================================
  // 🔹 FROZEN (solo patient)
  // =====================================================
  const setFrozenFor = (id, frozen) => {
    setComponents((arr) =>
      arr.map((c) =>
        c.id === id && c.type === "patient"
          ? { ...c, props: { ...c.props, frozen } }
          : c
      )
    );
  };

  // =====================================================
  // 🔹 TOGGLE MINIMIZE (riduci/espandi ad icona)
  // =====================================================
  const toggleMinimize = (id) => {
    setComponents((arr) =>
      arr.map((c) => (c.id === id ? { ...c, minimized: !c.minimized } : c))
    );
  };

  // =====================================================
  // 🔹 COLLASSA / ESPANDI (logica avanzata come collega)
  // =====================================================
  const toggleCollapsedFor = (id) => {
    setComponents((arr) => {
      const updated = [...arr];
      const i = updated.findIndex((c) => c.id === id);
      if (i < 0) return arr;

      const c = updated[i];
      const ctype = c.type;
      const wasCollapsed = !!c.collapsed;
      const nowCollapsed = !wasCollapsed;

      const getViewport = () => {
        const doc = document.documentElement;
        const W = doc.clientWidth || window.innerWidth || 1200;
        const H = doc.clientHeight || window.innerHeight || 800;
        const sx = window.pageXOffset || window.scrollX || 0;
        const sy = window.pageYOffset || window.scrollY || 0;
        return { W, H, sx, sy };
      };

      const { W, H, sx, sy } = getViewport();

      const next = { ...c, collapsed: nowCollapsed };

      if (nowCollapsed) {
        // SALVA posizione e dimensione attuali
        next.prevRect = { x: c.x, y: c.y, w: c.w, h: c.h };

        const margin = 12;

        if (ctype === "patient" || ctype === "prop") {
          const collapsedPatients = updated.filter(
            (x) => (x.type === "patient" || x.type === "prop") && x.collapsed
          );

          const collapsedW = 400;
          const rightColX = sx + W - collapsedW - (margin + 24);

          const baseY =
            collapsedPatients.length > 0
              ? Math.max(...collapsedPatients.map((p) => p.y + p.h)) + 10
              : sy + margin;

          next.x = rightColX;
          next.y = baseY;
          next.w = collapsedW;
          next.h = 200;
        } else if (ctype === "note") {
          // dimensioni della nota collassata
          const collapsedW = 200; // più largo
          const collapsedH = 80; // più alto

          // misure/fabbrichetta del FAB "+"
          const FAB_SIZE = 56; // diametro (circa)
          const FAB_MARGIN = 16; // distanza dai bordi
          const GAP = 12; // spazio tra nota e FAB / tra note

          // bordo interno canvas
          const margin = 12;

          // coordinate "base": in basso a destra MA a sinistra del FAB, non sotto
          const rightEdgeFree = sx + W - FAB_MARGIN - FAB_SIZE; // bordo sx del FAB
          const baseX = rightEdgeFree - collapsedW - GAP; // nota a sinistra del FAB
          const baseY = sy + H - collapsedH - FAB_MARGIN; // in basso, sopra il bordo

          // trova le altre note già collassate
          const collapsedNotes = updated
            .filter(
              (o) => o.type === "note" && o.id !== c.id && !!(o.collapsed)
            )
            .sort((a, b) => a.x - b.x); // ordina da sinistra a destra

          let nx = baseX;
          let ny = baseY;

          if (collapsedNotes.length > 0) {
            // metti la nuova nota subito a sinistra della più a sinistra
            const minX = Math.min(...collapsedNotes.map((n) => n.x));
            nx = minX - collapsedW - GAP;
          }

          // clamp per non uscire
          nx = Math.min(Math.max(nx, sx + margin), sx + W - collapsedW - margin);
          ny = Math.min(Math.max(ny, sy + margin), sy + H - collapsedH - margin);

          next.x = nx;
          next.y = ny;
          next.w = collapsedW;
          next.h = collapsedH;

          // se ancora collide con qualcuno → trova uno slot libero vicino alla base
          const meRect = { x: next.x, y: next.y, w: next.w, h: next.h };
          const others = updated
            .filter((o) => o.id !== c.id)
            .map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h }));
          if (others.some((o) => overlap(meRect, o))) {
            const spot = findFreeSpot(others, next.w, next.h, { x: baseX, y: baseY });
            next.x = spot.x;
            next.y = spot.y;
          }

          // porta in primo piano
          const maxZ = updated.reduce((m, o) => Math.max(m, o.z || 0), 0);
          next.z = (maxZ || 0) + 1;
        }
      } else {
        // ESPANSIONE: ripristina posizione/dimensione precedenti
        const prev = c.prevRect;
        if (prev) {
          next.x = prev.x;
          next.y = prev.y;
          next.w = prev.w;
          next.h = prev.h;
          delete next.prevRect;

          // porta in primo piano
          const maxZ = updated.reduce((m, o) => Math.max(m, o.z || 0), 0);
          next.z = (maxZ || 0) + 1;
        } else {
          // se non abbiamo prevRect, usa dimensioni di default per tipo
          if (ctype === "patient") {
            next.w = 500;
            next.h = 220;
          } else if (ctype === "prop") {
            next.w = 560;
            next.h = 320;
          } else if (ctype === "note") {
            next.w = 260;
            next.h = 180;
          }
          // trova slot libero vicino alla posizione attuale
          const others = updated
            .filter((o) => o.id !== c.id)
            .map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h }));
          const spot = findFreeSpot(others, next.w, next.h, {
            x: next.x ?? 80,
            y: next.y ?? 80,
          });
          next.x = spot.x;
          next.y = spot.y;

          // porta in primo piano
          const maxZ = updated.reduce((m, o) => Math.max(m, o.z || 0), 0);
          next.z = (maxZ || 0) + 1;
        }
      }

      updated[i] = next;
      return updated;
    });


  };

  // =====================================================
  // 🔹 UPDATE DATA (per widget specifici)
  // =====================================================
  const updateComponentData = (id, newData) => {
    setComponents((arr) =>
      arr.map((c) =>
        c.id === id
          ? {
              ...c,
              data: { ...c.data, ...newData },
              title:
                newData.selectedProp ||
                newData.nickname ||
                c.title,
            }
          : c
      )
    );
  };

  // =====================================================
  // EXPORT — valori esposti al resto dell’app
  // =====================================================
  return (
    <AppCtx.Provider
      value={{
        components,
        addComponent,
        updateComponent,
        moveComponent,
        resizeComponent,
        removeComponent,
        setFrozenFor,
        toggleMinimize,      // “−”
        toggleCollapsedFor,  // “▢”
        updateComponentData,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
};
