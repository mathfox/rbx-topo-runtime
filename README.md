# topo-runtime

## Basic Setup

```ts
const world = new World()
const loop = new Loop(world, ...some other arguments that will be passed to systems)

const connection = loop.begin(RunService.Heartbeat)

const system = (arguments from loop constructor call) => {
    // some work
}

loop.scheduleSystem(system)

// hot reload stuff
loop.evictSystem(system)
// or more convenient
loop.replaceSystem(system, () => {})
```

## Builtin hooks

- useEvent
- useThrottle

There is `useHookState` function for implementing custom hooks.

## Addons

There is `topo-hooks` package that adds other useful hooks.
