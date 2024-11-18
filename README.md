# topo-runtime

This package provides an API for writing systems in function hook-ish style.
The approach allows for seamless hot-reloading and thus better DX.

Check out the `make-jsx` package to use JSX in conjunction with hooks like `useInstance`.

## Setup

Add the following entry inside `compilerOptions.plugins` of the tsconfig:
```json
{
    "transform": "@rbxts/topo-runtime/transform/out/index.js"
}
```

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

## Advanced

When implementing the hot-reload behavior for systems, the following behaviors should be considered.

The unique key for determining the system state is consists of 2 parts:
- source of the script (the same as GetFullName());
- system name;
It means that moving the system declaration around or adding a new ones won't affect it's state when hot-reloaded.
An attempt to schedule the anonymous function will result in an error being thrown.

> The system state is a map where the key is a `base key` and the value is table consisting a `hooks storage` alongside `cleanup callback`.
> The hooks storage is a map where the key is a `discriminator` (if not provided, it defaults to 0) and the value is a `discriminated hook storage`.

The base keys are generated at compile time.
These keys are unique per file and consist of the following parts:
- the line and the character;
- the text of the hook expression;
It means that any line/character/text adjustments of the hook calls will result in their state being lost.
