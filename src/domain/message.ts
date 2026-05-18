import { Schema } from "effect";

export class IncomingMessage extends Schema.Class<IncomingMessage>(
  "IncomingMessage",
)({
  userId: Schema.String,
  chatId: Schema.String,
  text: Schema.String,
}) {}

export class OutgoingMessage extends Schema.Class<OutgoingMessage>(
  "OutgoingMessage",
)({
  chatId: Schema.String,
  text: Schema.String,
}) {}

export class GolemCloudConfig extends Schema.Class<GolemCloudConfig>(
  "GolemCloudConfig",
)({
  baseUrl: Schema.String,
  token: Schema.String,
  appName: Schema.String,
  envName: Schema.String,
  agentTypeName: Schema.String,
}) {}
