import { Bot, type Context } from "grammy";

import type { IncomingMessage } from "./domain/message.js";
import { appRuntime } from "./runtime/runtime.js";
import { handleIncomingMessage } from "./workflows/conversation.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing from the environment");
}

const bot = new Bot(token);

const toIncomingMessage = (ctx: Context): IncomingMessage | undefined => {
  const text = ctx.message?.text;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!text || userId === undefined || chatId === undefined) {
    return undefined;
  }

  return {
    userId: String(userId),
    chatId: String(chatId),
    text,
  };
};

const handleTelegramMessage = async (ctx: Context) => {
  const message = toIncomingMessage(ctx);

  if (!message) {
    return;
  }

  const response = await appRuntime.runPromise(handleIncomingMessage(message));

  await ctx.api.sendMessage(response.chatId, response.text);
};

bot.command("start", handleTelegramMessage);
bot.on("message:text", handleTelegramMessage);

const isAbortedDelay = (error: unknown) =>
  error instanceof Error && error.message === "Aborted delay";

const reportFatalError = (error: unknown) => {
  console.error(error);
  process.exit(1);
};

bot.catch((error) => {
  reportFatalError(error.error);
});

const stopBot = async () => {
  try {
    await bot.stop();
    await appRuntime.dispose();
  } catch (error) {
    if (isAbortedDelay(error)) {
      await appRuntime.dispose();
      return;
    }

    throw error;
  }
};

process.on("uncaughtException", (error) => {
  if (isAbortedDelay(error)) {
    void appRuntime.dispose().then(() => process.exit(0));
    return;
  }

  reportFatalError(error);
});

process.once("SIGINT", () => {
  void stopBot().catch(reportFatalError);
});
process.once("SIGTERM", () => {
  void stopBot().catch(reportFatalError);
});

await bot.start();
