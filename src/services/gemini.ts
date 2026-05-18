import { Context, Effect, Layer, Schema } from "effect";

export type GeminiRole = "user" | "model";

export interface GeminiFunctionCall {
  readonly id?: string;
  readonly name: string;
  readonly args: Record<string, unknown>;
}

export interface GeminiFunctionResponse {
  readonly id?: string;
  readonly name: string;
  readonly response: Record<string, unknown>;
}

export interface GeminiPart {
  readonly text?: string;
  readonly functionCall?: GeminiFunctionCall;
  readonly functionResponse?: GeminiFunctionResponse;
}

export interface GeminiContent {
  readonly role: GeminiRole;
  readonly parts: ReadonlyArray<GeminiPart>;
}

export interface GeminiFunctionDeclaration {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: ReadonlyArray<string>;
  };
}

export interface GeminiGenerateRequest {
  readonly contents: ReadonlyArray<GeminiContent>;
  readonly functionDeclarations: ReadonlyArray<GeminiFunctionDeclaration>;
}

export interface GeminiGenerateResult {
  readonly content: GeminiContent;
  readonly text: string;
  readonly functionCalls: ReadonlyArray<GeminiFunctionCall>;
}

export class MissingGeminiConfig extends Schema.TaggedErrorClass<MissingGeminiConfig>()(
  "MissingGeminiConfig",
  {
    variable: Schema.String,
  },
) {}

export class GeminiHttpError extends Schema.TaggedErrorClass<GeminiHttpError>()(
  "GeminiHttpError",
  {
    status: Schema.Number,
    statusText: Schema.String,
    body: Schema.String,
  },
) {}

export class GeminiTransportError extends Schema.TaggedErrorClass<GeminiTransportError>()(
  "GeminiTransportError",
  {
    message: Schema.String,
  },
) {}

export class GeminiDecodeError extends Schema.TaggedErrorClass<GeminiDecodeError>()(
  "GeminiDecodeError",
  {
    message: Schema.String,
  },
) {}

export type GeminiServiceError =
  | MissingGeminiConfig
  | GeminiHttpError
  | GeminiTransportError
  | GeminiDecodeError;

export interface GeminiServiceShape {
  readonly generate: (
    request: GeminiGenerateRequest,
  ) => Effect.Effect<GeminiGenerateResult, GeminiServiceError>;
}

export class GeminiService extends Context.Service<
  GeminiService,
  GeminiServiceShape
>()("GeminiService") {}

class GeminiFunctionCallSchema extends Schema.Class<GeminiFunctionCallSchema>(
  "GeminiFunctionCall",
)({
  id: Schema.optional(Schema.String),
  name: Schema.String,
  args: Schema.Record(Schema.String, Schema.Unknown),
}) {}

class GeminiPartSchema extends Schema.Class<GeminiPartSchema>("GeminiPart")({
  text: Schema.optional(Schema.String),
  functionCall: Schema.optional(GeminiFunctionCallSchema),
}) {}

class GeminiContentSchema extends Schema.Class<GeminiContentSchema>(
  "GeminiContent",
)({
  role: Schema.Literals(["user", "model"]),
  parts: Schema.Array(GeminiPartSchema),
}) {}

class GeminiCandidateSchema extends Schema.Class<GeminiCandidateSchema>(
  "GeminiCandidate",
)({
  content: GeminiContentSchema,
}) {}

class GeminiGenerateResponseSchema extends Schema.Class<GeminiGenerateResponseSchema>(
  "GeminiGenerateResponse",
)({
  candidates: Schema.Array(GeminiCandidateSchema),
}) {}

const decodeGenerateResponse = Schema.decodeUnknownEffect(
  GeminiGenerateResponseSchema,
);

const geminiApiKey = process.env.GEMINI_API_KEY ?? "";
const geminiBaseUrl =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const requireApiKey = (): Effect.Effect<void, MissingGeminiConfig> =>
  geminiApiKey
    ? Effect.void
    : Effect.fail(new MissingGeminiConfig({ variable: "GEMINI_API_KEY" }));

const toGenerateResult = (
  response: GeminiGenerateResponseSchema,
): Effect.Effect<GeminiGenerateResult, GeminiDecodeError> => {
  const content = response.candidates[0]?.content;

  if (!content) {
    return Effect.fail(
      new GeminiDecodeError({ message: "Gemini response had no candidates" }),
    );
  }

  const parts = content.parts.map((part) => ({
    ...(part.text === undefined ? {} : { text: part.text }),
    ...(part.functionCall === undefined
      ? {}
      : {
          functionCall: {
            ...(part.functionCall.id === undefined
              ? {}
              : { id: part.functionCall.id }),
            name: part.functionCall.name,
            args: part.functionCall.args,
          },
        }),
  }));

  return Effect.succeed({
    content: {
      role: content.role,
      parts,
    },
    text: parts
      .map((part) => part.text)
      .filter((text): text is string => Boolean(text))
      .join("\n"),
    functionCalls: parts
      .map((part) => part.functionCall)
      .filter((call): call is GeminiFunctionCall => Boolean(call)),
  });
};

const postGenerateContent = (
  request: GeminiGenerateRequest,
): Effect.Effect<unknown, GeminiHttpError | GeminiTransportError> =>
  Effect.tryPromise({
    try: async () => {
      const baseUrl = geminiBaseUrl.replace(/\/$/, "");
      const response = await fetch(
        `${baseUrl}/v1beta/models/${geminiModel}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": geminiApiKey,
          },
          body: JSON.stringify({
            contents: request.contents,
            tools: [
              {
                functionDeclarations: request.functionDeclarations,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new GeminiHttpError({
          status: response.status,
          statusText: response.statusText,
          body,
        });
      }

      return await response.json();
    },
    catch: (error) =>
      error instanceof GeminiHttpError
        ? error
        : new GeminiTransportError({
            message:
              error instanceof Error ? error.message : "Gemini request failed",
          }),
  });

export const GeminiServiceLive = Layer.succeed(GeminiService)({
  generate: (request) =>
    Effect.gen(function* () {
      yield* requireApiKey();
      const payload = yield* postGenerateContent(request);
      const response = yield* decodeGenerateResponse(payload).pipe(
        Effect.mapError(
          (error) =>
            new GeminiDecodeError({
              message: String(error),
            }),
        ),
      );

      return yield* toGenerateResult(response);
    }),
});
