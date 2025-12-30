import React, { useEffect, useMemo, useState } from "react";
import { getDailyPredictions, getHourlyPredictions, trainDaily, trainHourly, backfillHistorical } from "../api/ai";
import { CurrentWeather } from "../api/weather";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend } from "recharts";

type Horizon = "daily" | "hourly";

interface Props {
  current: CurrentWeather; // for lat/lon
}

interface Pt { ts: string; yhat: number; yhat_lower?: number; yhat_upper?: number }

const PredictionCharts: React.FC<Props> = ({ current }) => {
  const [horizon, setHorizon] = useState<Horizon>("daily");
  const [data, setData] = useState<Pt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lat = current.coord.lat;
  const lon = current.coord.lon;

  const fetchPreds = async (h: Horizon) => {
    setLoading(true); setError(null);
    try {
      const res = h === "daily"
        ? await getDailyPredictions(lat, lon, 7)
        : await getHourlyPredictions(lat, lon, 48);
      if (!res || res.length === 0) {
        // Try to train and retry once
        try {
          if (h === "daily") await trainDaily(lat, lon, 7); else await trainHourly(lat, lon, 48);
          const res2 = h === "daily"
            ? await getDailyPredictions(lat, lon, 7)
            : await getHourlyPredictions(lat, lon, 48);
          setData(res2 || []);
        } catch (e: any) {
          // Attempt backfill then train
          await backfillHistorical(lat, lon, 6);
          if (h === "daily") await trainDaily(lat, lon, 7); else await trainHourly(lat, lon, 48);
          const res3 = h === "daily"
            ? await getDailyPredictions(lat, lon, 7)
            : await getHourlyPredictions(lat, lon, 48);
          setData(res3 || []);
        }
      } else {
        setData(res);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPreds(horizon); }, [horizon, lat, lon]);

  const chartData = useMemo(() => data.map(d => ({
    ts: d.ts,
    yhat: d.yhat,
    lower: d.yhat_lower ?? d.yhat,
    upper: d.yhat_upper ?? d.yhat,
  })), [data]);

  return (
    <div className="weather-charts" style={{marginTop:'1rem'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 className="chart-title" style={{margin:0}}>AI Predictions</h3>
        <div style={{display:'flex', gap:'0.5rem'}}>
          <button className={`icon-btn ${horizon==='daily' ? 'active':''}`} onClick={()=>setHorizon('daily')} title="Next 7 days">📅</button>
          <button className={`icon-btn ${horizon==='hourly' ? 'active':''}`} onClick={()=>setHorizon('hourly')} title="Next 48 hours">⏱️</button>
        </div>
      </div>
      {loading && <div style={{opacity:0.8}}>Loading predictions…</div>}
      {error && <div style={{color:'#ef4444'}}>{error}</div>}
      {!loading && data.length>0 && (
        <div style={{height:300}}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="predBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ts" tick={{fontSize:12}} hide={false} />
              <YAxis tick={{fontSize:12}} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="upper" stroke="#60a5fa" fillOpacity={1} fill="url(#predBand)" name="Upper" />
              <Area type="monotone" dataKey="lower" stroke="#60a5fa" fillOpacity={0} name="Lower" />
              <Line type="monotone" dataKey="yhat" stroke="#3b82f6" strokeWidth={2} name="Predicted" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default PredictionCharts;

