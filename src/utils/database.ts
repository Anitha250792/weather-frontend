/**
 * IndexedDB wrapper for weather data persistence
 * Provides offline support and data caching
 */

export interface WeatherCacheEntry {
  id: string;
  data: any;
  timestamp: number;
  type: "current" | "forecast" | "location";
  units: "metric" | "imperial";
}

export interface LocationHistory {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  lastSearched: number;
  searchCount: number;
}

class WeatherDatabase {
  private db: IDBDatabase | null = null;
  private readonly dbName = "WeatherAppDB";
  private readonly version = 1;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Weather cache store
        if (!db.objectStoreNames.contains("weatherCache")) {
          const cacheStore = db.createObjectStore("weatherCache", {
            keyPath: "id",
          });
          cacheStore.createIndex("timestamp", "timestamp");
          cacheStore.createIndex("type", "type");
        }

        // Location history store
        if (!db.objectStoreNames.contains("locationHistory")) {
          const historyStore = db.createObjectStore("locationHistory", {
            keyPath: "id",
          });
          historyStore.createIndex("lastSearched", "lastSearched");
          historyStore.createIndex("searchCount", "searchCount");
        }

        // User preferences store
        if (!db.objectStoreNames.contains("preferences")) {
          db.createObjectStore("preferences", { keyPath: "key" });
        }
      };
    });
  }

  async saveWeatherData(
    key: string,
    data: any,
    type: "current" | "forecast",
    units: "metric" | "imperial"
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction(["weatherCache"], "readwrite");
    const store = transaction.objectStore("weatherCache");

    const entry: WeatherCacheEntry = {
      id: `${type}_${units}_${key}`,
      data,
      timestamp: Date.now(),
      type,
      units,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getWeatherData(
    key: string,
    type: "current" | "forecast",
    units: "metric" | "imperial",
    maxAge: number = 10 * 60 * 1000 // 10 minutes default
  ): Promise<any | null> {
    await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction(["weatherCache"], "readonly");
    const store = transaction.objectStore("weatherCache");

    return new Promise((resolve, reject) => {
      const request = store.get(`${type}_${units}_${key}`);
      request.onsuccess = () => {
        const result = request.result as WeatherCacheEntry;
        if (result && Date.now() - result.timestamp <= maxAge) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveLocationHistory(
    location: Omit<LocationHistory, "id" | "lastSearched" | "searchCount">
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction(["locationHistory"], "readwrite");
    const store = transaction.objectStore("locationHistory");

    const id = `${location.lat}_${location.lon}`;

    // Check if location already exists
    const existing = await new Promise<LocationHistory | null>(
      (resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      }
    );

    const entry: LocationHistory = {
      id,
      ...location,
      lastSearched: Date.now(),
      searchCount: existing ? existing.searchCount + 1 : 1,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLocationHistory(limit: number = 10): Promise<LocationHistory[]> {
    await this.init();
    if (!this.db) return [];

    const transaction = this.db.transaction(["locationHistory"], "readonly");
    const store = transaction.objectStore("locationHistory");
    const index = store.index("lastSearched");

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, "prev");
      const results: LocationHistory[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async savePreference(key: string, value: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction(["preferences"], "readwrite");
    const store = transaction.objectStore("preferences");

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPreference(key: string): Promise<any> {
    await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction(["preferences"], "readonly");
    const store = transaction.objectStore("preferences");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction(["weatherCache"], "readwrite");
    const store = transaction.objectStore("weatherCache");
    const index = store.index("timestamp");

    const cutoff = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const weatherDB = new WeatherDatabase();
