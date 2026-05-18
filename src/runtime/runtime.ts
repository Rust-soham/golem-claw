import { Layer, ManagedRuntime } from "effect";

import { GeminiServiceLive } from "../services/gemini.js";
import { WeatherServiceLive } from "../services/weather.js";

export const appRuntime = ManagedRuntime.make(
  Layer.mergeAll(GeminiServiceLive, WeatherServiceLive),
);
