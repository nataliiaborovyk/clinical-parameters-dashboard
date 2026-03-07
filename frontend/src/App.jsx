import React from "react";
import PlaygroundCanvas from "./pages/PlaygroundCanvas";
import { AppProvider } from "./context/AppContext";

const App = () => {
  return (
    <div className="min-h-screen font-sans antialiased">
      <PlaygroundCanvas />
    </div>
  );
};

export default App;