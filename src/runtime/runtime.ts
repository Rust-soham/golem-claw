import { Layer, ManagedRuntime } from "effect";

import { WeatherServiceLive } from "../services/weather.js";

export const appRuntime = ManagedRuntime.make(WeatherServiceLive);
