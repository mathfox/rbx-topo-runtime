# topo-runtime

This package provides an API for writing systems in function hook-ish style.
The approach allows for seamless hot-reloading and thus better DX.

Check out the `make-jsx` package which opens the possibility to write UI in this style using JSX.

## Loop

The `Loop` instance is required to use the hooks.
It also collects debug information which could be used in debugger implementations.

## Basic Setup

```ts
const loop = new Loop();

function someSystem_1() {
    // do something with hooks
}

function someSystem_2() {
    // do something with hooks
}

const [step, evict] = loop.withStep(someSystem_1, someSystem_2);

const connection = RunService.Heartbeat.Connect(step);

// hot reload stuff
defineCleanupCallback(() => {
    connection.Disconnect();
    evict();
});
```

## Builtin hooks

- useEvent
- useThrottle

There is `useHookState` function for implementing custom hooks.

## Addons

There is `topo-hooks` package that provides a set of common hooks.
