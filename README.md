# jecs-topo-runtime

This package does not really depend on the jecs functionality.
This package will probably eventually be branched out into an abstract topo runtime package.

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

useEvent
useThrottle

There is `useHookState` function for implementing custom hooks.

## Side note

Not a single test has been written for the package so it may contain
There has not been written any test
