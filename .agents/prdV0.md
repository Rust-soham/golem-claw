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

# 22. Raw Transcript

Alright, so.And as you can see, goal in five is very, very powerful.you can use all of these features together.It's build very quickly.I think.quite powerful custom AI agents.So what's next? Well, what's next?the Golem Force hackathon which is kicking offright now. So the pride.for this Acupunre winner.is $2,500 in.cash. We pick the winner.What's the problem? Well, you got to build an agent.other an agent, a gentle application on goal.and not just any agent to gapplication.What we're aiming for this hackathon is you should buildsome sort of super scale down version.of open cloth. The basic idea.idea behind open claw is that you should beable to have basically an army of artificialintelligent information.workers at your disposal who can do stuff in the real world.you by interacting with the services and that you community.on Slack or Disco.or telegram or what's happening.or maybe even text them. And it'sbeen phenomenally successful, very successful,it's worth providing.in what your goal as part of this hackathon.is to build a super scale down version of that.which allows a human to interact with the human.interact with agents and spin up new agents.purely through a high level.Hacks to go.based interface and we're picking telegram.for this. So, Telegram has a...Let's see only when you have to support.If you want to go crazy.you could support more by telegram has like veryfluid.for you to use it for easy to get up on aim.need to do fancy verification.to pay money. So it's a great channel for internet.with this toy agent.application and the idea is Iyou type in some message to telegram.to some agent that's been running in Poland.and you're able to give it instructions to do basic things.you're using an LLM to build this.And the other one I recommend is Gemini Flash.is there is a free tier to can use probably for development.and testing. And then the agents.they're going to be basically core users so you're going tohave a multi-user multi-tenancy sort of.design where a multiple different usercan interact with your system and they will all see each other.other information and every singleagent that's running on behalf of a user is going to haveto have a total of local memory, of course, to do.some specific task. But it's arequirement for all the agents thatthat are running on behalf of a user.should have access to some sort of shared memory.and the reason or whether the applicantThere is you might have one agent whose who'sbooking a dentist appointment for you, but another agent.to is trying to book you.to the dentist appointment to overlapped with.some other events and other types of things like that. They requireshared memory. So you're supposed to build some sort ofshared memory system. You don't have to actually build anything.going as everything you need to do, share a memory and local memory as well.Well, but your agent should use them effectively.on fashion doesn't have to be super fancy,but there should be some,sense of this agent learns this thing about you.This otheragent over here knows that and can access that information.your goal of this.law should support at least the following.four tools from minders. Another.I type in 2 telegram to myMy goal in claw and I say I would.I want you to remind me of this upcoming dinner.data that I have. And then you know an hourprior or whatever it is.you're going to remind her you're going to tell her I'm not suggesting you know you have a dinner daySo reminders, basic reminder feature.that also would allow you to cancel remindersor list all the upcoming.reminders that you have. Whether you can typeinto that goal and claw agency. What's the weather?around here or in that specific location.It's gonna get you.check that for you. Do web search so you canHey, uh, golemfly. Wanna go? Happy.they're in fine the best tie this between 20 to 20.$30 and whatever, you would get back some sort of an idea.The answer for that is based powered by a web search.tool and then some sort of email facility.And this one may be the hardest one to get working.So it doesn't have to be too fancy, you could just use the default email.here or you could try to go down the path.path of actually allowing the end user to offer.Medicaid using Gmail or something like that.about at the end of the day it should be possible for the goal.and call agent to send an email on behalf of the user.not necessarily using their own email.all of you are welcome to do that if you want.And then if you want, if you have done all of that,to the span of an hour and you have some of the one hours left.that you may as well add some more tools just to help in theincrease the odds that you're going to actually win the hackathon.I stack, you can use best.particularly whatever you want, as long as it runs on Gollum.So you can pick your own programming language up to the limit.of the ones that we support. You can pick Scala.rust. You can pick mood bit and of course you canTypeScript of all those solutions I would say.say that probably rust is going to be the fastest.maybe move it fastest andAnd then the high script one is going to be the most fee.rich just in the sense that you can grab any libraries.off the shelf and use them. They're probably going to work justfine on top of Gola. There is a restriction.However, in building this, you don't just spend.a bunch of money, right? And also in testing, we don't want tohave to spend money. So if you decide to youweb services like Twilio or whatever make sureMake sure you stay on the free tier. I use thedeveloper trial accounts or something like that. Don't actuallyto incorporate paid accounts into your service.That's--going to cost you money who will also cost us money.when we go to test that, so please don't do that.Do submit your solution.to the Golden Fort Hacathon.Bond will all up in his app and send it to court.contact that's ivers.com. Don't submit.it's a repository because it's very easy to update that.and we don't know exactly when you sent it.Email on the other hand.as a very firmly established day.of reception when the server sees that email package.can't be changed after the fact. So that will help us.ensure that everyone submits.Before the deadline, it doesn't have a chance to update things.later to make it fair for everyone. Another weekdepartment is that you have to deploy your agent.application, your goal and claw application.to go and cloud. So go and cloud.as our own hosted version of the open source of the world.addition and it's currently purely in developer.preview. We don't have a way for you to pay us.money. So don't worry about that. It's all free.We're just trying to make sure that everything is working properly with this.one five release and who better to?Act as our beta testers then.hack on or to zip in so give it a try. Let us know if yourun into any problems, you should end up deploying your app to.the goal of the fight. Our deadline is again on the way.Monday, May 18th at 12.called noon EDT. So what's going to happen?happen is all those submissions will be reviewed.if they were delivered in our inbox afterafter 12 noon EDT, then.they won't count. And we'll, we'll, we'll, we'll.and else a winner by the end of next week. So it should be arelatively fast decision process.if you have any questions, then of course ask.on discord. That's the most important part ofof the Golden Ford Tackathon is joining the discord.There you can ask questions, get clarification.You can also talk to other goal and users.maybe bend through some of the challenges that you're going to face.over the course of the next 72 hours.And you'll hopefullyget answers to your questions.Alright, so now what I'm going to do, I think that's all the material I'm going to do.I have, I'm just gonna run through discord and make sure there's nowe had one question just problem I guess.installing goal of on a Mac.I suggest you just ask your coding agent to install.all it from source code. That will work.we'll get around whatever sort of operating system.system specific security limit.expectations prevent unsigned binaries.from running on your system and also you can make sure.you use either the one five one release orIf necessary, you could even use a later one, although it's not right.And it's going to take all the other.lot of time to compare it so I will still become indolated.the binary is meant. But it's a bad one. That's really cool.>> Okay. >> Okay. >> All right.anything else?It depends on the mission.uh not really I dare you say.Quick start page on the Learn.Goal and.Cloud.website. Let me know.Yeah, that is supposed to be up to the end.data and tell them the data's.way to download and get started.So this is a really great resource.This is all up to date.And you can seeHow you develop for goalem in different ways.languages. How you do deployments.stuff in vocation debugging, operated how to use the community.online interface. Obviously our agent is going to figure out a lot.of this for itself if you're using one to build.and I certainly hope you are, but also you mightto understand key concepts like API.or agent communication.There's also a bunch of how-to guides we took on.skill files which are actually made for agents.and we turn them into help to guides for humans.But also you can point your agent at this documentation.resource and it's going to have just a ton of stuff here.And then also if you do actually build goal and from source.I recommend pointing your agent to the goal.source code that way can always answer questions.that you may have and not know the or the literature.coding agent might have and that whose answer is might not.be contained inside the documentation.Overwears.try to make that as up-to-date and complete as a reason.and if you know, stay anywhere.
