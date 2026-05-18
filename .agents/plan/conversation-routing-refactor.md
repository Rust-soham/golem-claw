# Conversation Routing Refactor

## Summary

Keep grammY as a transport adapter and keep `ConversationWorkflow` as the application entrypoint, but replace the inline `message.text === "/start"` branching with a small Effect-friendly domain router. Plain non-command messages will route to the user's default agent. Non-default agent selection will happen through commands.

## Key Changes

- Introduce a domain-level message intent model:
  - `SystemCommandIntent` for `/start`, `/help`, `/agents`, `/use`, `/newagent`.
  - `AgentMessageIntent` for normal text routed to the active/default agent.
  - `UnsupportedMessageIntent` for empty/unknown command cases.
- Add a `MessageRouter` function/service that accepts `IncomingMessage` and returns an intent without grammY types.
- Keep `ConversationWorkflow` as the orchestration layer:
  - route message
  - call system command workflow or agent conversation workflow
  - return one or more `OutgoingMessage`s
- Add minimal agent-facing abstractions now:
  - active/default agent id is assumed to be `"default"` until persistence exists.
  - agent response can remain the current placeholder text, but behind an `AgentConversationWorkflow`.
- Keep Telegram adapter dumb:
  - translate grammY context into `IncomingMessage`
  - run `ConversationWorkflow`
  - send returned messages

## Test Plan

- Typecheck and build pass.
- `/start` returns the welcome response.
- Plain text routes to the default agent response.
- Unknown slash command returns a clear unsupported command message.
- Non-text Telegram messages are ignored at the adapter boundary.
- Routing functions are unit-testable without grammY or Golem imports.

## Assumptions

- Default-agent routing is the MVP behavior for plain text.
- Commands are the v1 way to create/select/manage agents.
- No database-backed agent registry yet; use an in-memory/default placeholder interface until Postgres is introduced.
- Golem integration will call the same workflow/runtime later and should not require changing routing semantics.
