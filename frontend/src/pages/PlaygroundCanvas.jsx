// src/pages/PlaygroundCanvas.jsx
import React from "react";
import { AppProvider } from "../context/AppContext";
import Canvas from "../components/canvas/Canvas";
import AddComponentButton from "../components/modal/AddComponentButton";

// ======================================================================
// PlaygroundCanvas — pagina principale col Canvas e il menu “+”
// ======================================================================
const PlaygroundCanvas = () => {
  return (
    <AppProvider>
      <div className="p-4 space-y-3">
        <div className="text-xl font-semibold text-gray-800">Canvas</div>
        <Canvas />
        <AddComponentButton />
      </div>
    </AppProvider>
  );
};

export default PlaygroundCanvas;
