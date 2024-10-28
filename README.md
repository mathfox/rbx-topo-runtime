# topo-runtime

## Basic Setup

```ts
const world = new World()
const loop = new Loop()

function someSystem() {
    // do something
}

const [step, evict] = loop.withStep(someSystem_1, someSystem_2)

RunService.Heartbeat.Connect(() => {
    step();
})

// hot reload stuff
defineCleanupCallback(() => {
    evict();
})

// another way of scheduling systems
loop.scheduleSystem(someSystem)
loop.evictSystem(someSystem)
// or more convenient
loop.replaceSystem(someSystem, () => {})
```

## Builtin hooks

- useEvent
- useThrottle

There is `useHookState` function for implementing custom hooks.

## Addons

There is `topo-hooks` package that adds other useful hooks.
