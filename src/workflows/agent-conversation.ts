import { Effect, Schema } from "effect";

import type { IncomingMessage, OutgoingMessage } from "../domain/message.js";
import { WeatherQuery } from "../domain/weather.js";
import {
  GeminiDecodeError,
  GeminiHttpError,
  GeminiService,
  GeminiTransportError,
  MissingGeminiConfig,
  type GeminiContent,
  type GeminiFunctionCall,
  type GeminiFunctionDeclaration,
} from "../services/gemini.js";
import {
  MissingOpenWeatherConfig,
  OpenWeatherDecodeError,
  OpenWeatherHttpError,
  OpenWeatherTransportError,
  WeatherService,
} from "../services/weather.js";
import { getCurrentWeather } from "./weather.js";

const weatherTool: GeminiFunctionDeclaration = {
  name: "get_current_weather",
  description:
    "Gets the current weather for a city or location. Use this when the user asks about weather, temperature, conditions, humidity, wind, or what it feels like outside.",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City or location name, such as San Francisco or Kolkata.",
      },
      units: {
        type: "string",
        enum: ["standard", "metric", "imperial"],
        description:
          "Temperature units. Use imperial for US users unless they ask otherwise.",
      },
    },
    required: ["location"],
  },
};

class WeatherToolArgs extends Schema.Class<WeatherToolArgs>("WeatherToolArgs")({
  location: Schema.String,
  units: Schema.optional(Schema.Literals(["standard", "metric", "imperial"])),
}) {}

export type AgentConversationError =
  | MissingGeminiConfig
  | GeminiHttpError
  | GeminiTransportError
  | GeminiDecodeError
  | MissingOpenWeatherConfig
  | OpenWeatherHttpError
  | OpenWeatherTransportError
  | OpenWeatherDecodeError;

const decodeWeatherToolArgs = Schema.decodeUnknownEffect(WeatherToolArgs);

const systemInstruction =
  "You are Golem Claw, a concise Telegram assistant. Use tools when they help answer the user. When a tool result is available, answer naturally and include the useful details.";

const renderAgentError = (error: AgentConversationError): string => {
  switch (error._tag) {
    case "MissingGeminiConfig":
    case "MissingOpenWeatherConfig":
      return `Set ${error.variable} in .env before using this tool.`;
    case "GeminiHttpError":
      return `Gemini request failed: ${error.status} ${error.statusText}${error.body ? ` - ${error.body}` : ""}`;
    case "OpenWeatherHttpError":
      return `OpenWeather request failed: ${error.status} ${error.statusText}${error.body ? ` - ${error.body}` : ""}`;
    case "GeminiTransportError":
      return `Gemini request failed: ${error.message}`;
    case "OpenWeatherTransportError":
      return `OpenWeather request failed: ${error.message}`;
    case "GeminiDecodeError":
    case "OpenWeatherDecodeError":
      return error.message;
  }
};

const runToolCall = (
  call: GeminiFunctionCall,
): Effect.Effect<Record<string, unknown>, AgentConversationError, WeatherService> => {
  switch (call.name) {
    case "get_current_weather":
      return Effect.gen(function* () {
        const args = yield* decodeWeatherToolArgs(call.args).pipe(
          Effect.mapError(
            (error) =>
              new GeminiDecodeError({
                message: `Invalid get_current_weather arguments: ${String(error)}`,
              }),
          ),
        );
        const report = yield* getCurrentWeather(
          args.location,
          args.units ?? "imperial",
        );

        return { report };
      });
    default:
      return Effect.fail(
        new GeminiDecodeError({
          message: `Unknown Gemini tool call: ${call.name}`,
        }),
      );
  }
};

const userContent = (text: string): GeminiContent => ({
  role: "user",
  parts: [{ text: `${systemInstruction}\n\nUser: ${text}` }],
});

export const respondToAgentMessage = (
  text: string,
): Effect.Effect<
  string,
  AgentConversationError,
  GeminiService | WeatherService
> =>
  Effect.gen(function* () {
    const gemini = yield* GeminiService;
    const contents: GeminiContent[] = [userContent(text)];

    const first = yield* gemini.generate({
      contents,
      functionDeclarations: [weatherTool],
    });

    if (first.functionCalls.length === 0) {
      return first.text || "I do not have a response yet.";
    }

    contents.push(first.content);

    for (const call of first.functionCalls) {
      const response = yield* runToolCall(call);
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              ...(call.id === undefined ? {} : { id: call.id }),
              name: call.name,
              response,
            },
          },
        ],
      });
    }

    const final = yield* gemini.generate({
      contents,
      functionDeclarations: [weatherTool],
    });

    return final.text || "The tool ran, but I could not summarize the result.";
  });

export const handleAgentIncomingMessage = (
  message: IncomingMessage,
): Effect.Effect<OutgoingMessage, never, GeminiService | WeatherService> =>
  message.text === "/start"
    ? Effect.succeed({
        chatId: message.chatId,
        text: "Ask me about the weather in a city.",
      })
    : respondToAgentMessage(message.text).pipe(
        Effect.map((text) => ({
          chatId: message.chatId,
          text,
        })),
        Effect.catch((error: AgentConversationError) =>
          Effect.succeed({
            chatId: message.chatId,
            text: renderAgentError(error),
          }),
        ),
      );
