import type { Effect } from "effect";

import type { IncomingMessage, OutgoingMessage } from "../domain/message.js";
import type { GeminiService } from "../services/gemini.js";
import type { WeatherService } from "../services/weather.js";
import { handleAgentIncomingMessage } from "./agent-conversation.js";

export const handleIncomingMessage = (
  message: IncomingMessage,
): Effect.Effect<OutgoingMessage, never, GeminiService | WeatherService> =>
  handleAgentIncomingMessage(message);
