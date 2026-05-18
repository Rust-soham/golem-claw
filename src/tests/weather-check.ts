import { appRuntime } from "../runtime/runtime.js";
import { getCurrentWeather } from "../workflows/weather.js";

const city = "San Francisco";
const units = "imperial";

try {
  const report = await appRuntime.runPromise(getCurrentWeather(city, units));

  console.log(JSON.stringify(report, null, 2));
} finally {
  appRuntime.dispose();
}

