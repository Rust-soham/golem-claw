"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const golem_ts_sdk_1 = require("@golemcloud/golem-ts-sdk");
@(0, golem_ts_sdk_1.agent)({
    mount: "/counters/{name}",
})
class CounterAgent extends golem_ts_sdk_1.BaseAgent {
    name;
    value = 0;
    constructor(name) {
        super();
        this.name = name;
    }
    @(0, golem_ts_sdk_1.prompt)("Increase the count by one")
    @(0, golem_ts_sdk_1.description)("Increases the count by one and returns the new value")
    @(0, golem_ts_sdk_1.endpoint)({ post: "/increment" })
    async increment() {
        this.value += 1;
        return this.value;
    }
}
//# sourceMappingURL=counter-agent.js.map