import React, { useEffect, useState } from "react";
import { CurrentWeather } from "../api/weather";
import { getRecommendations, sendFeedback } from "../api/ai";

interface Props {
  current: CurrentWeather;
  units: "metric" | "imperial";
  userId?: number;
}

interface RecItem {
  key: string;
  label: string;
  score: number;
  reason: string;
}

export const ActivityRecommendations: React.FC<Props> = ({ current, units, userId }) => {
  const [recs, setRecs] = useState<RecItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 1 | -1 | 0>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getRecommendations({
          user_id: userId,
          units,
          temperature: current.main.temp,
          humidity: current.main.humidity,
          wind_speed: current.wind.speed,
          condition: current.weather[0]?.main || "Clear",
          top_k: 5,
        });
        setRecs(res);
      } catch (e: any) {
        setError(e?.message || "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [current, units, userId]);

  if (loading) return <div className="analytics-container"><p>Loading recommendations…</p></div>;
  if (error) return <div className="analytics-container"><p style={{color:'#ef4444'}}>{error}</p></div>;
  if (!recs || recs.length === 0) return null;

  const submitFeedback = async (key: string, rating: number) => {
    if (!userId) return;
    try {
      await sendFeedback({ user_id: userId, activity_key: key, rating });
      setFeedback((prev) => ({ ...prev, [key]: rating >= 3 ? 1 : -1 }));
      // re-fetch to reflect re-ranking
      const res = await getRecommendations({
        user_id: userId,
        units,
        temperature: current.main.temp,
        humidity: current.main.humidity,
        wind_speed: current.wind.speed,
        condition: current.weather[0]?.main || "Clear",
        top_k: 5,
      });
      setRecs(res);
    } catch {}
  };

  return (
    <div className="analytics-container" style={{marginTop: '1rem'}}>
      <h3 style={{marginTop:0}}>Suggested Activities</h3>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.75rem'}}>
        {recs.map((r) => (
          <div key={r.key} className="insight-card" style={{textAlign:'left'}}>
            <div className="insight-header" style={{justifyContent:'space-between'}}>
              <h4>{r.label}</h4>
              <span style={{opacity:0.9, color: r.score >= 1 ? '#10b981' : r.score >= 0.4 ? '#f59e0b' : '#ef4444'}}>
                Score {r.score.toFixed(2)}
              </span>
            </div>
            <div className="insight-details" style={{marginBottom:'0.5rem'}}>
              {r.reason.split(';').map((t, i) => (
                <div key={i}>{t.trim()}</div>
              ))}
            </div>
            {userId ? (
              <div style={{display:'flex', gap:'0.5rem', justifyContent:'center'}}>
                <button
                  onClick={() => submitFeedback(r.key, 5)}
                  className={`icon-btn ${feedback[r.key] === 1 ? 'active' : ''}`}
                  title="I like this"
                  disabled={feedback[r.key] === 1}
                >
                  👍
                </button>
                <button
                  onClick={() => submitFeedback(r.key, 1)}
                  className={`icon-btn ${feedback[r.key] === -1 ? 'active' : ''}`}
                  title="Not for me"
                  disabled={feedback[r.key] === -1}
                >
                  👎
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityRecommendations;
