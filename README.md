# topo-runtime

This package provides an API for writing systems in function hook-ish style.
The approach allows for seamless hot-reloading and thus better DX.

Check out the `make-jsx` package which opens the possibility to make a UI in this style using JSX.

## Loop

The `Loop` instance is required to use the hooks.
It also collects debug information which could be used in debugger implementations.

## Basic Setup

```ts
const loop = new Loop();

function someSystem() {
    // do something with hooks
}

const [step, evict] = loop.scheduleSystem(someSystem);
const connection = RunService.Heartbeat.Connect(step);

defineCleanupCallback(() => {
    connection.Disconnect();

    // If you want a cold reload (meaning all of the state will be reset)
    // you have to evict the system before scheduling the hot reloaded one;
    evict();
});
```

## Hooks

Use `useHookState` function for implementing custom hooks.

There is `topo-hooks` package that provides a set of common hooks.
