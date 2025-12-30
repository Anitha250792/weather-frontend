import React from "react";

interface Props {
  units: "metric" | "imperial";
  onChange: (u: "metric" | "imperial") => void;
}

export const UnitToggle: React.FC<Props> = ({ units, onChange }) => {
  return (
    <div className="unit-toggle" role="group" aria-label="Temperature Units">
      <button
        type="button"
        className={units === "metric" ? "active" : ""}
        onClick={() => onChange("metric")}
        aria-pressed={units === "metric"}
      >
        °C
      </button>
      <button
        type="button"
        className={units === "imperial" ? "active" : ""}
        onClick={() => onChange("imperial")}
        aria-pressed={units === "imperial"}
      >
        °F
      </button>
    </div>
  );
};
