import React, { useState, useEffect, useCallback } from "react";

interface LocationData {
  name: string;
  country?: string;
  timestamp: number;
  searchCount: number;
}

interface LocationManagerProps {
  onLocationSelect: (location: string) => void;
  currentLocation: string;
}

export const LocationManager: React.FC<LocationManagerProps> = ({
  onLocationSelect,
  currentLocation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"recent" | "favorites">("recent");
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);
  const [favoriteLocations, setFavoriteLocations] = useState<LocationData[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load data when component mounts or when it opens
  useEffect(() => {
    if (isOpen) {
      loadLocationData();
    }
  }, [isOpen]);

  // Auto-save current location to recent searches when it changes
  useEffect(() => {
    if (currentLocation) {
      saveRecentSearch(currentLocation);
    }
  }, [currentLocation]);

  const loadLocationData = useCallback(async () => {
    setIsLoading(true);
    try {
      const recent = getRecentSearches();
      const favorites = getFavoriteLocations();
      setRecentLocations(recent);
      setFavoriteLocations(favorites);
    } catch (error) {
      console.error("Failed to load location data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRecentSearches = (): LocationData[] => {
    try {
      const stored = localStorage.getItem("weatherApp_recentSearches");
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getFavoriteLocations = (): LocationData[] => {
    try {
      const stored = localStorage.getItem("weatherApp_favoriteLocations");
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveRecentSearch = useCallback(
    (location: string, country?: string) => {
      const recent = getRecentSearches();
      const existingIndex = recent.findIndex(
        (item) => item.name.toLowerCase() === location.toLowerCase()
      );

      if (existingIndex !== -1) {
        // Update existing entry
        recent[existingIndex] = {
          ...recent[existingIndex],
          timestamp: Date.now(),
          searchCount: recent[existingIndex].searchCount + 1,
        };
      } else {
        // Add new entry
        recent.unshift({
          name: location,
          country,
          timestamp: Date.now(),
          searchCount: 1,
        });
      }

      // Keep only last 20 searches
      const trimmed = recent.slice(0, 20);
      localStorage.setItem(
        "weatherApp_recentSearches",
        JSON.stringify(trimmed)
      );

      if (isOpen) {
        setRecentLocations(trimmed);
      }
    },
    [isOpen]
  );

  const saveFavoriteLocations = (locations: LocationData[]) => {
    localStorage.setItem(
      "weatherApp_favoriteLocations",
      JSON.stringify(locations)
    );
    setFavoriteLocations(locations);
  };

  const addToFavorites = (locationName: string) => {
    const existing = favoriteLocations.find(
      (fav) => fav.name.toLowerCase() === locationName.toLowerCase()
    );

    if (!existing) {
      const newFavorite: LocationData = {
        name: locationName,
        timestamp: Date.now(),
        searchCount: 1,
      };
      const updated = [...favoriteLocations, newFavorite];
      saveFavoriteLocations(updated);
    }
  };

  const removeFromFavorites = (locationName: string) => {
    const updated = favoriteLocations.filter(
      (loc) => loc.name.toLowerCase() !== locationName.toLowerCase()
    );
    saveFavoriteLocations(updated);
  };

  const isLocationFavorited = (locationName: string): boolean => {
    return favoriteLocations.some(
      (fav) => fav.name.toLowerCase() === locationName.toLowerCase()
    );
  };

  const handleLocationClick = (location: string) => {
    onLocationSelect(location);
    setIsOpen(false);
    saveRecentSearch(location);
  };

  const clearRecentHistory = () => {
    if (confirm("Are you sure you want to clear your search history?")) {
      localStorage.removeItem("weatherApp_recentSearches");
      setRecentLocations([]);
    }
  };

  const clearFavorites = () => {
    if (confirm("Are you sure you want to clear all favorites?")) {
      localStorage.removeItem("weatherApp_favoriteLocations");
      setFavoriteLocations([]);
    }
  };

  const formatLastSearched = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  if (!isOpen) {
    return (
      <button
        className="location-manager-trigger"
        onClick={() => setIsOpen(true)}
        title="View recent searches and favorites"
      >
        📍 Locations
      </button>
    );
  }

  return (
    <div className="location-manager-overlay" onClick={() => setIsOpen(false)}>
      <div className="location-manager" onClick={(e) => e.stopPropagation()}>
        <div className="location-manager-header">
          <h3>📍 Your Locations</h3>
          <button
            className="close-btn"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="location-tabs">
          <button
            className={`tab-btn ${activeTab === "recent" ? "active" : ""}`}
            onClick={() => setActiveTab("recent")}
          >
            🕐 Recent ({recentLocations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "favorites" ? "active" : ""}`}
            onClick={() => setActiveTab("favorites")}
          >
            ⭐ Favorites ({favoriteLocations.length})
          </button>
        </div>

        <div className="location-content">
          {isLoading ? (
            <div className="loading-placeholder">
              <div className="loading-spinner"></div>
              <p>Loading locations...</p>
            </div>
          ) : activeTab === "recent" ? (
            <div className="recent-locations">
              {recentLocations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>No recent searches</p>
                  <small>Search for a location to see it here</small>
                </div>
              ) : (
                <>
                  <div className="location-list">
                    {recentLocations.map((location, index) => (
                      <div
                        key={`${location.name}-${index}`}
                        className="location-item"
                      >
                        <button
                          className="location-btn"
                          onClick={() => handleLocationClick(location.name)}
                        >
                          <div className="location-info">
                            <div className="location-main">
                              <span className="location-name">
                                {location.name}
                              </span>
                              {location.country && (
                                <span className="location-country">
                                  {location.country}
                                </span>
                              )}
                            </div>
                            <div className="location-meta">
                              <span className="search-count">
                                {location.searchCount} search
                                {location.searchCount !== 1 ? "es" : ""}
                              </span>
                              <span className="last-searched">
                                {formatLastSearched(location.timestamp)}
                              </span>
                            </div>
                          </div>
                        </button>
                        <button
                          className={`favorite-btn ${
                            isLocationFavorited(location.name)
                              ? "favorited"
                              : ""
                          }`}
                          onClick={() =>
                            isLocationFavorited(location.name)
                              ? removeFromFavorites(location.name)
                              : addToFavorites(location.name)
                          }
                          title={
                            isLocationFavorited(location.name)
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                        >
                          {isLocationFavorited(location.name) ? "⭐" : "☆"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="tab-actions">
                    <button className="clear-btn" onClick={clearRecentHistory}>
                      🗑️ Clear History
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="favorite-locations">
              {favoriteLocations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">⭐</div>
                  <p>No favorite locations</p>
                  <small>
                    Star locations from your recent searches to add them here
                  </small>
                </div>
              ) : (
                <>
                  <div className="location-list">
                    {favoriteLocations.map((location, index) => (
                      <div
                        key={`fav-${location.name}-${index}`}
                        className="location-item favorite"
                      >
                        <button
                          className="location-btn"
                          onClick={() => handleLocationClick(location.name)}
                        >
                          <div className="location-info">
                            <div className="location-main">
                              <span className="location-name">
                                {location.name}
                              </span>
                              <span className="favorite-badge">
                                ⭐ Favorite
                              </span>
                            </div>
                            <div className="location-meta">
                              <span className="added-date">
                                Added {formatLastSearched(location.timestamp)}
                              </span>
                            </div>
                          </div>
                        </button>
                        <button
                          className="remove-btn"
                          onClick={() => removeFromFavorites(location.name)}
                          title="Remove from favorites"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="tab-actions">
                    <button className="clear-btn" onClick={clearFavorites}>
                      🗑️ Clear Favorites
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="location-manager-footer">
          {currentLocation && (
            <div className="current-location-info">
              <span className="current-label">Current:</span>
              <span className="current-name">{currentLocation}</span>
              <button
                className={`add-current-btn ${
                  isLocationFavorited(currentLocation) ? "favorited" : ""
                }`}
                onClick={() =>
                  isLocationFavorited(currentLocation)
                    ? removeFromFavorites(currentLocation)
                    : addToFavorites(currentLocation)
                }
                title={
                  isLocationFavorited(currentLocation)
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                {isLocationFavorited(currentLocation) ? "⭐" : "☆"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
