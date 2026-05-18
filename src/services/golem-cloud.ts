import { Effect, Schema } from "effect";

import type { GolemCloudConfig } from "../domain/message.js";

export class GolemCloudHttpError extends Schema.TaggedErrorClass<GolemCloudHttpError>()(
  "GolemCloudHttpError",
  {
    status: Schema.Number,
    statusText: Schema.String,
    body: Schema.String,
  },
) {}

export class GolemCloudTransportError extends Schema.TaggedErrorClass<GolemCloudTransportError>()(
  "GolemCloudTransportError",
  {
    message: Schema.String,
  },
) {}

export class GolemCloudDecodeError extends Schema.TaggedErrorClass<GolemCloudDecodeError>()(
  "GolemCloudDecodeError",
  {
    message: Schema.String,
  },
) {}

export type GolemCloudError =
  | GolemCloudHttpError
  | GolemCloudTransportError
  | GolemCloudDecodeError;

class GolemElementValue extends Schema.Class<GolemElementValue>(
  "GolemElementValue",
)({
  type: Schema.Literal("ComponentModel"),
  value: Schema.Unknown,
}) {}

class GolemTupleValue extends Schema.Class<GolemTupleValue>("GolemTupleValue")({
  type: Schema.Literal("Tuple"),
  elements: Schema.Array(GolemElementValue),
}) {}

class GolemInvokeResult extends Schema.Class<GolemInvokeResult>(
  "GolemInvokeResult",
)({
  result: Schema.optional(Schema.NullOr(GolemTupleValue)),
}) {}

const decodeGolemInvokeResult = Schema.decodeUnknownEffect(GolemInvokeResult);

const tuple = (
  elements: ReadonlyArray<GolemElementValue>,
): GolemTupleValue => ({
  type: "Tuple",
  elements,
});

const componentModel = (value: unknown): GolemElementValue => ({
  type: "ComponentModel",
  value,
});

const decodeCounterResult = (
  payload: GolemInvokeResult,
): Effect.Effect<number, GolemCloudDecodeError> => {
  const value = payload.result?.elements[0]?.value;

  if (typeof value !== "number") {
    return Effect.fail(
      new GolemCloudDecodeError({
        message: "Unexpected Golem Cloud response shape",
      }),
    );
  }

  return Effect.succeed(value);
};

export const invokeCounterIncrement = (
  config: GolemCloudConfig,
): Effect.Effect<number, GolemCloudError> =>
  Effect.tryPromise({
    try: async () => {
      const baseUrl = config.baseUrl.replace(/\/$/, "");
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch(`${baseUrl}/v1/agents/invoke-agent`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          appName: config.appName,
          envName: config.envName,
          agentTypeName: config.agentTypeName,
          parameters: tuple([componentModel("telegram-smoke-rest")]),
          phantomId: null,
          methodName: "increment",
          methodParameters: tuple([]),
          mode: "await",
          scheduleAt: null,
          idempotencyKey,
          deploymentRevision: null,
          ownerAccountEmail: null,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new GolemCloudHttpError({
          status: response.status,
          statusText: response.statusText,
          body,
        });
      }

      return await response.json();
    },
    catch: (error) =>
      error instanceof GolemCloudHttpError
        ? error
        : new GolemCloudTransportError({
            message:
              error instanceof Error
                ? error.message
                : "Golem Cloud request failed",
          }),
  }).pipe(
    Effect.flatMap((payload) =>
      decodeGolemInvokeResult(payload).pipe(
        Effect.mapError(
          (error) =>
            new GolemCloudDecodeError({
              message: String(error),
            }),
        ),
      ),
    ),
    Effect.flatMap(decodeCounterResult),
  );
