import { describe, expect, it } from "bun:test";
import { melbourneForecastFromHourly, nextMelbourneOnePm } from "./weather";

describe("nextMelbourneOnePm", () => {
  it("picks today when Melbourne local time is before 13:00", () => {
    const now = new Date("2026-08-15T02:00:00.000Z");
    expect(nextMelbourneOnePm(now).toISOString()).toBe("2026-08-15T03:00:00.000Z");
  });

  it("rolls to tomorrow when Melbourne local time is 13:00 or later", () => {
    const now = new Date("2026-08-15T03:00:00.000Z");
    expect(nextMelbourneOnePm(now).toISOString()).toBe("2026-08-16T03:00:00.000Z");
  });
});

describe("melbourneForecastFromHourly", () => {
  const hourly = {
    time: ["2026-08-16T13:00"],
    precipitation_probability: [42],
    precipitation: [0.4],
    temperature_2m: [14.2],
    wind_speed_10m: [18],
  };

  it("says it will rain when probability is at least 30%", () => {
    const publicForecast = melbourneForecastFromHourly(
      "public",
      hourly,
      "2026-08-16T03:00:00.000Z",
    );
    expect(publicForecast.willRainAt1Pm).toBe(true);
    expect(publicForecast.rainProbabilityPercent).toBe(42);
    expect("windSpeedKmh" in publicForecast).toBe(false);
  });

  it("keeps rooftop-only fields off the public product", () => {
    const rooftop = melbourneForecastFromHourly("rooftop", hourly, "2026-08-16T03:00:00.000Z");
    expect(rooftop.willRainAt1Pm).toBe(true);
    expect(rooftop.temperatureC).toBe(14.2);
    expect(rooftop.windSpeedKmh).toBe(18);
    expect(rooftop.recommendation).toContain("cover");
  });

  it("says it will not rain when probability is below 30% and precip is 0", () => {
    const publicForecast = melbourneForecastFromHourly(
      "public",
      {
        time: ["2026-08-16T13:00"],
        precipitation_probability: [12],
        precipitation: [0],
        temperature_2m: [18],
        wind_speed_10m: [8],
      },
      "2026-08-16T03:00:00.000Z",
    );
    expect(publicForecast.willRainAt1Pm).toBe(false);
  });
});
