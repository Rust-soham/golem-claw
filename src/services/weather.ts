import { Context, Effect, Layer, Schema } from "effect";

import type { WeatherQuery, WeatherReport } from "../domain/weather.js";

export class MissingOpenWeatherConfig extends Schema.TaggedErrorClass<MissingOpenWeatherConfig>()(
  "MissingOpenWeatherConfig",
  {
    variable: Schema.String,
  },
) {}

export class OpenWeatherHttpError extends Schema.TaggedErrorClass<OpenWeatherHttpError>()(
  "OpenWeatherHttpError",
  {
    status: Schema.Number,
    statusText: Schema.String,
    body: Schema.String,
  },
) {}

export class OpenWeatherTransportError extends Schema.TaggedErrorClass<OpenWeatherTransportError>()(
  "OpenWeatherTransportError",
  {
    message: Schema.String,
  },
) {}

export class OpenWeatherDecodeError extends Schema.TaggedErrorClass<OpenWeatherDecodeError>()(
  "OpenWeatherDecodeError",
  {
    message: Schema.String,
  },
) {}

export type WeatherServiceError =
  | MissingOpenWeatherConfig
  | OpenWeatherHttpError
  | OpenWeatherTransportError
  | OpenWeatherDecodeError;

export interface WeatherServiceShape {
  readonly currentByLocation: (
    query: WeatherQuery,
  ) => Effect.Effect<WeatherReport, WeatherServiceError>;
}

export class WeatherService extends Context.Service<
  WeatherService,
  WeatherServiceShape
>()("WeatherService") {}

class OpenWeatherCondition extends Schema.Class<OpenWeatherCondition>(
  "OpenWeatherCondition",
)({
  description: Schema.String,
}) {}

class OpenWeatherMain extends Schema.Class<OpenWeatherMain>("OpenWeatherMain")({
  temp: Schema.Number,
  feels_like: Schema.Number,
  humidity: Schema.Number,
}) {}

class OpenWeatherWind extends Schema.Class<OpenWeatherWind>("OpenWeatherWind")({
  speed: Schema.Number,
}) {}

class OpenWeatherSys extends Schema.Class<OpenWeatherSys>("OpenWeatherSys")({
  country: Schema.optional(Schema.String),
}) {}

class OpenWeatherCurrentResponse extends Schema.Class<OpenWeatherCurrentResponse>(
  "OpenWeatherCurrentResponse",
)({
  name: Schema.String,
  weather: Schema.Array(OpenWeatherCondition),
  main: OpenWeatherMain,
  wind: OpenWeatherWind,
  sys: OpenWeatherSys,
}) {}

const decodeCurrentResponse = Schema.decodeUnknownEffect(OpenWeatherCurrentResponse);

const openWeatherApiKey = process.env.OPENWEATHER_API_KEY ?? "";
const openWeatherBaseUrl =
  process.env.OPENWEATHER_BASE_URL ?? "https://api.openweathermap.org";

const requireApiKey = (): Effect.Effect<void, MissingOpenWeatherConfig> =>
  openWeatherApiKey
    ? Effect.void
    : Effect.fail(
        new MissingOpenWeatherConfig({ variable: "OPENWEATHER_API_KEY" }),
      );

const toWeatherReport = (
  query: WeatherQuery,
  response: OpenWeatherCurrentResponse,
): WeatherReport => ({
  locationName: response.name,
  country: response.sys.country,
  description: response.weather[0]?.description ?? "unknown conditions",
  temperature: response.main.temp,
  feelsLike: response.main.feels_like,
  humidity: response.main.humidity,
  windSpeed: response.wind.speed,
  units: query.units,
});

const fetchCurrentWeather = (
  query: WeatherQuery,
): Effect.Effect<unknown, OpenWeatherHttpError | OpenWeatherTransportError> =>
  Effect.tryPromise({
    try: async () => {
      const baseUrl = openWeatherBaseUrl.replace(/\/$/, "");
      const url = new URL(`${baseUrl}/data/2.5/weather`);
      url.searchParams.set("q", query.location);
      url.searchParams.set("appid", openWeatherApiKey);
      url.searchParams.set("units", query.units);

      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new OpenWeatherHttpError({
          status: response.status,
          statusText: response.statusText,
          body,
        });
      }

      return await response.json();
    },
    catch: (error) =>
      error instanceof OpenWeatherHttpError
        ? error
        : new OpenWeatherTransportError({
            message:
              error instanceof Error
                ? error.message
                : "OpenWeather request failed",
          }),
  });

export const WeatherServiceLive = Layer.succeed(WeatherService)({
  currentByLocation: (query) =>
    Effect.gen(function* () {
      yield* requireApiKey();
      const payload = yield* fetchCurrentWeather(query);
      const response = yield* decodeCurrentResponse(payload).pipe(
        Effect.mapError(
          (error) =>
            new OpenWeatherDecodeError({
              message: String(error),
            }),
        ),
      );

      return toWeatherReport(query, response);
    }),
});

