// ======================================================================
// PropertyStatsWidget — widget “Statistiche proprietà”
// ======================================================================
//
// Mostra statistiche di una singola property (min, max, avg, stddev, cv, ecc.)
// Il grafico è visualizzato al centro, le statistiche numeriche sotto.
//
// Formato dati: PROPERTY_STATS_OBJ
// Gestione mock tramite JSONPlaceholder fino all’attivazione del backend.
// Supporta persistenza automatica (localStorage) tramite AppContext.
// ======================================================================


import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { fetchPropertyStats, fetchAllPropertyNames } from "@/utils/statsUtil";
import { useAppContext } from "../../context/AppContext";

const PropertyStatsWidget = ({ widgetId, initialSelectedProp = "", onStateChange }) => {
  const { updateComponentData } = useAppContext();

  const [propertyList, setPropertyList] = useState([]);
  const [selectedProp, setSelectedProp] = useState(initialSelectedProp || "");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

useEffect(() => {(async () => {
    const props = await fetchAllPropertyNames();
    setPropertyList(props);})();
  }, 
[]);

  // 🔹 Se ho un valore iniziale salvato, lo imposto subito
  useEffect(() => {
    if (initialSelectedProp && !selectedProp) {
      setSelectedProp(initialSelectedProp);
    }
  }, [initialSelectedProp]);

  // ======================================================
  // FETCH — Carica i dati della property selezionata
  // ======================================================
  useEffect(() => {
    if (!selectedProp) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      setStats(null);

      try {
        const js = await fetchPropertyStats(selectedProp);
        console.log("[PropertyStatsWidget] DATA:", js);
        setStats(js);
      } catch (err) {
        console.error("Errore fetchPropertyStats:", err);
        setError("Errore nel caricamento delle statistiche.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedProp]);

  // ======================================================
  // 🔹 Persistenza — salva automaticamente nel context
  // ======================================================
  useEffect(() => {
    if (!selectedProp) return;
    const dataToSave = { selectedProp, stats, title: selectedProp };
    onStateChange?.(dataToSave);
    if (widgetId) updateComponentData?.(widgetId, dataToSave);
  }, [selectedProp, stats]);

  // ======================================================
  // GRAFICO — conversione distribution → array [{ label, value }]
  // ======================================================
  const dataForChart = useMemo(() => {
    if (!stats?.stats?.distribution) return [];
    const dist = stats.stats.distribution;
    return Object.entries(dist).map(([label, val]) => ({
      label,
      value: Number((val * 100).toFixed(2)),
    }));
  }, [stats]);

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div className="w-full h-full p-4 text-gray-800 bg-blue-50 rounded-lg shadow-inner">
      <div className="flex flex-col items-center space-y-4">
        {/* Titolo */}
        <h2 className="text-base font-semibold text-gray-800 text-center">
          Property statistics on the entire population
        </h2>

        {/* Selettore proprietà */}
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-300 rounded px-3 py-1 bg-white shadow-sm"
            onChange={(e) => setSelectedProp(e.target.value)}
            value={selectedProp}
          >
            <option value="">choose a property</option>
            {propertyList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-blue-600 font-medium mt-6">
            Loading statistics for “{selectedProp}”…
          </div>
        )}

        {/* Error */}
        {error && <div className="text-red-600 mt-4">⚠️ {error}</div>}

        {/* Grafico e statistiche */}
        {stats && !loading && (
          <>
            {/* 🔹 Grafico */}
            <div className="w-full flex justify-center mt-2">
              <div className="bg-white border rounded-lg shadow p-3 w-11/12 md:w-3/4">
                {dataForChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={dataForChart}
                      margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={50}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        label={{
                          value: "Percentage (%)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {dataForChart.map((_, i) => (
                          <Cell
                            key={i}
                            fill={`hsl(${(i * 45) % 360}, 70%, 55%)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-500 py-10 italic">
                    No distribution data available
                  </div>
                )}
              </div>
            </div>

            {/* 🔹 BOX statistiche principali */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 w-11/12">
              {/* Box sinistro */}
              <div className="border rounded-md bg-white p-3 text-sm shadow-sm">
                <div>count: {stats?.stats?.count ?? "–"}</div>
                <div>min: {stats?.stats?.min ?? "–"}</div>
                <div>
                  average:{" "}
                  {Number.isFinite(Number(stats?.stats?.avg))
                    ? Number(stats.stats.avg).toFixed(2)
                    : "–"}
                </div>
                <div>max: {stats?.stats?.max ?? "–"}</div>
              </div>

              {/* Box destro */}
              <div className="border rounded-md bg-white p-3 text-sm shadow-sm">
                {typeof stats?.stats?.interval === "string" ? (
                  <div>from/to: {stats.stats.interval}</div>
                ) : (
                  <>
                    <div>from: {stats?.stats?.interval?.from ?? "–"}</div>
                    <div>to: {stats?.stats?.interval?.to ?? "–"}</div>
                  </>
                )}
                <div>
                  standard deviation:{" "}
                  {Number.isFinite(Number(stats?.stats?.stddev))
                    ? Number(stats.stats.stddev).toFixed(2)
                    : "–"}
                </div>
                <div>
                  coefficient of variation:{" "}
                  {Number.isFinite(Number(stats?.stats?.cv))
                    ? Number(stats.stats.cv).toFixed(2)
                    : "–"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyStatsWidget;
