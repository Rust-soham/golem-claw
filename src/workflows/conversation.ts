import { Effect, Schema } from "effect";

import type {
  GolemCloudConfig,
  IncomingMessage,
  OutgoingMessage,
} from "../domain/message.js";
import {
  GolemCloudDecodeError,
  GolemCloudHttpError,
  GolemCloudTransportError,
  invokeCounterIncrement,
} from "../services/golem-cloud.js";

export class MissingGolemConfig extends Schema.TaggedErrorClass<MissingGolemConfig>()(
  "MissingGolemConfig",
  {
    variable: Schema.String,
  },
) {}

export type ConversationError =
  | MissingGolemConfig
  | GolemCloudHttpError
  | GolemCloudTransportError
  | GolemCloudDecodeError;

const cloudConfig: GolemCloudConfig = {
  baseUrl: process.env.GOLEM_CLOUD_BASE_URL ?? "https://release.api.golem.cloud",
  token: process.env.GOLEM_CLOUD_TOKEN ?? "",
  appName: process.env.GOLEM_APP_NAME ?? "golem-claw",
  envName: process.env.GOLEM_ENV_NAME ?? "cloud",
  agentTypeName: process.env.GOLEM_AGENT_TYPE_NAME ?? "CounterAgent",
};

const requireGolemConfig = (): Effect.Effect<void, MissingGolemConfig> =>
  cloudConfig.token
    ? Effect.void
    : Effect.fail(new MissingGolemConfig({ variable: "GOLEM_CLOUD_TOKEN" }));

const renderConversationError = (error: ConversationError): string => {
  switch (error._tag) {
    case "MissingGolemConfig":
      return `Set ${error.variable} in .env to run the Golem smoke test.`;
    case "GolemCloudHttpError":
      return `Golem Cloud REST invoke failed: ${error.status} ${error.statusText}${error.body ? ` - ${error.body}` : ""}`;
    case "GolemCloudTransportError":
      return `Golem Cloud request failed: ${error.message}`;
    case "GolemCloudDecodeError":
      return error.message;
  }
};

export const handleIncomingMessage = (
  message: IncomingMessage,
): Effect.Effect<OutgoingMessage, never> =>
  message.text === "/start"
    ? Effect.succeed({
        chatId: message.chatId,
        text: "Send any text to smoke-test the cloud path.",
      })
    : Effect.gen(function* () {
        yield* requireGolemConfig();
        const count = yield* invokeCounterIncrement(cloudConfig);

        return {
          chatId: message.chatId,
          text: `Golem Cloud ok. CounterAgent.increment returned ${count}.`,
        };
      }).pipe(
        Effect.catch((error: ConversationError) =>
          Effect.succeed({
            chatId: message.chatId,
            text: renderConversationError(error),
          }),
        ),
      );
