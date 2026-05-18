import { Layer, ManagedRuntime } from "effect";

export const appRuntime = ManagedRuntime.make(Layer.empty);
