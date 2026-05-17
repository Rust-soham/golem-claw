# Mini OpenClaw Hackathon PRD

## Effect TS + grammY + Golem Architecture

Built for:

- Golem Force Hackathon
- Telegram-based AI agent system
- Shared-memory multi-agent assistant

Relevant references:

- [Effect Runtime Docs](https://effect.website/docs/runtime/?utm_source=chatgpt.com)
- [ManagedRuntime Example](https://github.com/Effect-TS/effect-smol/blob/main/ai-docs/src/03_integration/10_managed-runtime.ts?utm_source=chatgpt.com)
- [Effect Architecture Concepts](https://zread.ai/2234839/TsFullStack/6-effect-based-architecture?utm_source=chatgpt.com)

---

# 1. Project Vision

Build a scaled-down version of “OpenClaw”.

The product should feel like:

> “an AI workforce users interact with through Telegram.”

Users message the system through Telegram.

The system:

- understands requests
- orchestrates agents
- accesses tools
- stores memory
- executes workflows
- performs real-world actions

The architecture should prioritize:

- reliability
- orchestration
- memory sharing
- extensibility
- clean async coordination

NOT:

- autonomous AGI complexity
- recursive agent swarms
- overengineered abstractions

---

# 2. Core Product Requirements

## Required Features

### 2.1 Telegram Interface

Users interact entirely through Telegram.

Required:

- receive messages
- send responses
- support commands/interactions

Possible future:

- Discord
- Slack
- WhatsApp

Telegram is MVP.

---

## 2.2 Multi-User Support

System must support:

- multiple users
- isolated data
- multiple agents per user

Requirements:

- no data leakage between users
- user-scoped memory
- user-scoped workflows

---

## 2.3 Agent System

Users should be able to:

- talk naturally
- request tasks
- invoke tools
- create workflows

Example:

- “remind me tomorrow at 7”
- “what’s the weather?”
- “find thai restaurants”
- “send this email”

---

## 2.4 Shared Memory

Critical requirement.

Need:

- local agent memory
- shared user memory

Example:

- one agent learns scheduling preferences
- another agent uses them later

Memory should feel:

- persistent
- connected
- reusable

Does NOT need advanced vector cognition systems.

---

# 3. Required Tools

## 3.1 Reminder Tool

Features:

- create reminders
- cancel reminders
- list reminders

Must support delayed execution.

---

## 3.2 Weather Tool

Fetch weather for:

- current location
- specified locations

---

## 3.3 Web Search Tool

Agent performs web searches.

Returns:

- summarized results
- useful recommendations

---

## 3.4 Email Tool

Allow agent to send emails.

Acceptable:

- simple SMTP/provider
- Gmail OAuth later
- simplified abstraction

Goal:

- working functionality
- not enterprise-grade email infra

---

# 4. Tech Stack

## Core Stack

### Runtime / Architecture

- TypeScript
- Effect TS v4

### Telegram

- grammY

### AI

- Gemini Flash

### Database

- PostgreSQL

### Deployment

- Golem Cloud

---

# 5. Architectural Philosophy

## Core Principle

Frameworks are transport layers.

Effect owns:

- orchestration
- workflows
- memory
- concurrency
- retries
- business logic

Frameworks should NOT own core logic.

---

# 6. High-Level Architecture

```txt
Telegram
   ↓
grammY
   ↓
Transport Adapter
   ↓
ManagedRuntime
   ↓
Effect Workflows
   ↓
Services
   ├─ Memory
   ├─ Search
   ├─ Weather
   ├─ Email
   ├─ Reminders
   └─ LLM
   ↓
Postgres / APIs
```

Also:

```txt
Golem SDK
   ↓
Thin Adapter
   ↓
ManagedRuntime
   ↓
Same Shared Workflows
```

Key idea:

- grammY and Golem are both transport boundaries
- both feed into same application runtime

---

# 7. Runtime Strategy

Use:

- `ManagedRuntime`

Reason:

- shared dependency lifecycle
- single coherent application runtime
- reusable services
- background workflows
- structured concurrency

The runtime should be shared across:

- grammY handlers
- Golem tools/endpoints
- reminder daemons
- background workers

---

# 8. Boundary Rules

## DO

Keep:

- grammY
- Golem decorators
- SDK objects

at the edge.

---

## DO NOT

Leak:

- Telegram context
- Golem SDK types
- framework-specific objects

into workflows/domain logic.

---

# 9. Domain Translation Strategy

## Bad

```ts
handleMessage(ctx);
```

Framework leaks everywhere.

---

## Good

```ts
type IncomingMessage = {
  userId: string;
  chatId: string;
  text: string;
};
```

Then:

```ts
handleMessage(message);
```

All workflows operate on domain types.

---

# 10. Golem Integration Strategy

Do NOT attempt:

- full Effect-native wrapper around Golem SDK

Use:

- thin adapter methods

Example:

```ts
@golemAgent()
class Agent {
  @tool()
  async search(query: string) {
    return runtime.runPromise(SearchWorkflow.execute(query));
  }
}
```

Decorators are:

- metadata
- transport registration
- infrastructure glue

NOT business logic.

---

# 11. grammY Integration Strategy

grammY should remain:

- minimal
- transport-only

Example:

```ts
bot.on("message:text", async (ctx) => {
  await runtime.runPromise(
    TelegramWorkflow.handle({
      userId: ctx.from.id,
      chatId: ctx.chat.id,
      text: ctx.message.text,
    }),
  );
});
```

grammY should NOT contain:

- orchestration
- memory logic
- planning
- business workflows

---

# 12. Service Architecture

Use Effect services for all side-effect boundaries.

---

## Core Services

### TelegramService

Responsibilities:

- send messages
- reply
- notifications

---

### MemoryService

Responsibilities:

- shared memory
- user preferences
- retrieval
- persistence

---

### ReminderService

Responsibilities:

- schedule reminders
- cancel reminders
- list reminders

---

### SearchService

Responsibilities:

- web search
- summarization

---

### WeatherService

Responsibilities:

- weather lookup

---

### EmailService

Responsibilities:

- send emails

---

### LLMService

Responsibilities:

- Gemini interactions
- prompt orchestration
- tool selection

---

# 13. Workflow Layer

Workflows orchestrate services.

Examples:

```txt
CreateReminderWorkflow
SearchWorkflow
WeatherWorkflow
EmailWorkflow
AgentConversationWorkflow
```

Workflows should:

- compose services
- coordinate async behavior
- remain framework-independent

---

# 14. Memory Design

Keep initial memory SIMPLE.

Do NOT overengineer.

---

## Tables

### users

Stores:

- user metadata

---

### memories

Stores:

- shared user facts/preferences

---

### reminders

Stores:

- scheduled reminders

---

### agent_sessions

Stores:

- ongoing context/session state

---

# 15. Reminder System Design

Use Effect fibers and schedules.

Avoid:

- raw `setTimeout`
- unmanaged node timers

Use:

- runtime-managed background jobs

Example idea:

- polling daemon
- checks pending reminders
- dispatches messages

---

# 16. Folder Structure

```txt
src/
  infrastructure/
    telegram/
    golem/
    database/

  services/
    telegram/
    memory/
    weather/
    search/
    reminder/
    email/
    llm/

  workflows/
    reminder/
    search/
    conversation/

  domain/
    message/
    memory/
    agents/

  runtime/
    layers/
    runtime.ts
```

---

# 17. Important Constraints

## Do NOT Overengineer

Avoid:

- recursive agent swarms
- autonomous planning loops
- complex distributed cognition systems
- massive abstractions

This is a hackathon.

Working systems win.

---

# 18. Primary Judging Leverage

Focus on:

## Reliability

Things should actually work.

---

## Shared Memory

Agents should feel connected.

---

## UX Simplicity

Natural Telegram interaction.

---

## Orchestration

Clean coordination between:

- tools
- memory
- workflows

---

# 19. MVP Priority Order

## Phase 1

- grammY bot
- ManagedRuntime
- basic message flow
- Gemini integration

---

## Phase 2

- ReminderService
- MemoryService
- Postgres persistence

---

## Phase 3

- Weather tool
- Search tool
- Email tool

---

## Phase 4

- Shared memory behavior
- Multi-agent feel
- Polish/demo quality

---

# 20. Non-Goals

Do NOT prioritize:

- perfect FP purity
- eliminating async/await everywhere
- fully wrapping all SDKs in Effect
- abstracting every framework
- advanced AI agent research ideas

Goal:

- ship useful coherent system fast

---

# 21. Core Engineering Philosophy

The application is NOT:

- “a Telegram bot”

It IS:

- an event-driven agent runtime

Telegram and Golem are merely:

- transport adapters
- entrypoints into the runtime

Effect TS owns:

- orchestration
- concurrency
- workflows
- resilience
- lifecycle management

That is the architectural center of the system.
