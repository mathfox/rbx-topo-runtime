# topo-runtime

This package provides an API for writing systems in function hook-ish style.
The approach allows for seamless hot-reloading and thus better DX.

Check out the `make-jsx` package to use JSX in conjunction with hooks like `useInstance`.

## Basic Usage

```ts

import { customHook } from "customHook";
import { loop } from "core";
// or
const loop = new Loop();

function mySystem() {
    // do something with hooks
}

const [step, evict] = loop.scheduleSystem(mySystem);
const connection = RunService.Heartbeat.Connect(step);
// or
const name = "my_system"
RunService.BindToRenderStep(name, Enum.RenderPriority.Camera.Value - 10, step)

defineCleanupCallback(() => {
    connection.Disconnect();
    // or
    RunService.UnbindFromRenderStep(name);

    // If you want a cold reload (meaning all of the state will be reset)
    // you have to evict the system before scheduling the hot reloaded one;
    if (coldReload) {
        evict();
    }
});
```

## Loop

The `Loop` instance is required to run topologically aware functions.
It also collects debug information that could be used by debugger implementations.

## Hooks

Use `useHookState` function for implementing custom hooks.
There is `topo-hooks` package that provides a set of common hooks.

## Custom hooks example

```ts

function cleanupCallback() {}

export function customHook(discriminator?: unknown) {
    const storage = useHookState(discriminator, cleanupCallback);

    return // some stuff
}
```
