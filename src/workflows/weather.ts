import { Effect } from "effect";

import { WeatherQuery } from "../domain/weather.js";
import { WeatherService } from "../services/weather.js";

export const getCurrentWeather = (
  location: string,
  units: WeatherQuery["units"] = "imperial",
) =>
  Effect.gen(function* () {
    const weather = yield* WeatherService;

    return yield* weather.currentByLocation(
      new WeatherQuery({
        location,
        units,
      }),
    );
  });

