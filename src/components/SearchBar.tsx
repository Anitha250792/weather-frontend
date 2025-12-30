import React, { useEffect, useRef, useState, useCallback } from "react";
import { geocodeCity, GeocodeResult } from "../api/weather";

interface SearchBarProps {
  onSearch: (city: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search city…",
}) => {
  const [value, setValue] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [geoSuggestions, setGeoSuggestions] = useState<GeocodeResult[]>([]);
  const [fetching, setFetching] = useState(false);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("recentCities");
    if (raw) {
      try {
        const arr: string[] = JSON.parse(raw);
        setRecent(arr.slice(0, 5));
      } catch {
        /* ignore */
      }
    }
  }, []);

  function submit(city: string) {
    if (!city.trim()) return;
    onSearch(city.trim());
    setValue("");
    setOpen(false);
    // store history
    const raw = localStorage.getItem("recentCities");
    let arr: string[] = [];
    if (raw) {
      try {
        arr = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    arr = [
      city.trim(),
      ...arr.filter((c) => c.toLowerCase() !== city.trim().toLowerCase()),
    ];
    localStorage.setItem("recentCities", JSON.stringify(arr.slice(0, 10)));
  }

  // Debounced geocode lookup
  const debouncedLookup = useCallback(() => {
    const q = value.trim();
    if (q.length < 2) {
      setGeoSuggestions([]);
      return;
    }
    let active = true;
    setFetching(true);
    geocodeCity(q, 5)
      .then((res) => {
        if (active) setGeoSuggestions(res);
      })
      .catch(() => {
        if (active) setGeoSuggestions([]);
      })
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handle = setTimeout(() => {
      debouncedLookup();
    }, 400);
    return () => clearTimeout(handle);
  }, [debouncedLookup]);

  function formatGeo(g: GeocodeResult) {
    const parts = [g.name];
    if (g.state) parts.push(g.state);
    parts.push(g.country);
    return parts.join(", ");
  }

  return (
    <div className="search-bar">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <input
          aria-label="Search city"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        <button type="submit">Search</button>
      </form>
      {open && (recent.length > 0 || geoSuggestions.length > 0) && (
        <ul ref={listRef} className="suggestions">
          {value.length === 0 &&
            recent.map((s) => (
              <li key={s}>
                <button onClick={() => submit(s)}>{s}</button>
              </li>
            ))}
          {value.length > 0 &&
            geoSuggestions.map((g) => {
              const label = formatGeo(g);
              return (
                <li key={`${g.lat},${g.lon}`}>
                  <button onClick={() => submit(label)}>{label}</button>
                </li>
              );
            })}
          {fetching && (
            <li style={{ opacity: 0.6, padding: ".25rem .5rem" }}>Loading…</li>
          )}
          {!fetching && value.length > 1 && geoSuggestions.length === 0 && (
            <li style={{ opacity: 0.6, padding: ".25rem .5rem" }}>
              No matches
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
