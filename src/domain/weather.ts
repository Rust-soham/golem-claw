import { Schema } from "effect";

export class WeatherQuery extends Schema.Class<WeatherQuery>("WeatherQuery")({
  location: Schema.String,
  units: Schema.Literals(["standard", "metric", "imperial"]),
}) {}

export class WeatherReport extends Schema.Class<WeatherReport>("WeatherReport")({
  locationName: Schema.String,
  country: Schema.optional(Schema.String),
  description: Schema.String,
  temperature: Schema.Number,
  feelsLike: Schema.Number,
  humidity: Schema.Number,
  windSpeed: Schema.Number,
  units: Schema.Literals(["standard", "metric", "imperial"]),
}) {}
