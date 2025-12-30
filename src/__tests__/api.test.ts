import { describe, it, expect } from "vitest";
import { fetchCurrentByCity } from "../api/weather";

describe("fetchCurrentByCity (smoke)", () => {
  it.skip("should fetch current weather for London (requires network & key)", async () => {
    const data = await fetchCurrentByCity("London");
    expect(data.name).toBeDefined();
  });
});
