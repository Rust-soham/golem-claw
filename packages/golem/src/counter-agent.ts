import {
  BaseAgent,
  agent,
  description,
  endpoint,
  prompt,
} from "@golemcloud/golem-ts-sdk";

@agent({
  mount: "/counters/{name}",
})
class CounterAgent extends BaseAgent {
  private value = 0;

  constructor(private readonly name: string) {
    super();
  }

  @prompt("Increase the count by one")
  @description("Increases the count by one and returns the new value")
  @endpoint({ post: "/increment" })
  async increment(): Promise<number> {
    this.value += 1;
    return this.value;
  }
}
