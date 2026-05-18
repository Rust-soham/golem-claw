import { appRuntime } from "../runtime/runtime.js";
import { respondToAgentMessage } from "../workflows/agent-conversation.js";

const message = "What is the weather in San Francisco?";

try {
  const response = await appRuntime.runPromise(respondToAgentMessage(message));

  console.log(response);
} catch (error) {
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "MissingGeminiConfig"
  ) {
    console.log("Set GEMINI_API_KEY in .env before running this check.");
  } else {
    throw error;
  }
} finally {
  appRuntime.dispose();
}
