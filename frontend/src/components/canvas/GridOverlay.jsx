// Solo griglia di sfondo, opzionale ma utile.

import React from "react";

const GridOverlay = () => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage:
        "linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      borderRadius: "0.75rem",
    }}
  />
);

export default GridOverlay;
