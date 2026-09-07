# nativescript-confettiview

Confetti for NativeScript 9 on iOS and Android, with no CocoaPods.

| Platform | Renderer                                                     | Native dependency                                                     |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| iOS      | `CAEmitterLayer`, driven from TypeScript                     | None. There is no Podfile and nothing to `pod install`.               |
| Android  | [Konfetti](https://github.com/DanielMartinus/Konfetti) 2.0.5 | `nl.dionsegijn:konfetti-xml`, added by the plugin's `include.gradle`. |

Both renderers are native particle systems. Nothing runs in JavaScript per frame; the bridge is crossed when you call `start()` or `stop()` and when a party finishes.

Requires NativeScript 9.0 or newer.

```bash
npm install nativescript-confettiview
```

## Contents

- [Quick start](#quick-start)
- [Modes](#modes)
- [Layering and the party cap](#layering-and-the-party-cap)
- [Methods and events](#methods-and-events)
- [Options](#options)
- [Properties for XML and templates](#properties-for-xml-and-templates)
- [Shapes, sizes and colours](#shapes-sizes-and-colours)
- [Platform differences](#platform-differences)
- [The demo app](#the-demo-app)
- [Migrating from 3.x](#migrating-from-3x)
- [Developing](#developing)

## Quick start

`ConfettiView` is a transparent overlay. It never intercepts touches, so place it last inside a `GridLayout` and span the rows you want covered; the buttons underneath keep working.

### XML

```xml
<Page xmlns="http://schemas.nativescript.org/tns.xsd" xmlns:cf="nativescript-confettiview">
  <GridLayout rows="auto, *">
    <StackLayout row="1">
      <Button text="Celebrate" tap="{{ celebrate }}"/>
    </StackLayout>

    <cf:ConfettiView id="confetti" row="0" rowSpan="2"/>
  </GridLayout>
</Page>
```

```ts
import { ConfettiView } from 'nativescript-confettiview';

const confetti = page.getViewById('confetti') as ConfettiView;
confetti.start({ mode: 'burst' });
```

### Vue

Register the element once at startup:

```ts
import { createApp, registerElement } from 'nativescript-vue';

registerElement('ConfettiView', () => require('nativescript-confettiview').ConfettiView);
```

```vue
<template>
  <Page>
    <GridLayout rows="auto, *">
      <StackLayout row="1">
        <Button text="Celebrate" @tap="celebrate" />
      </StackLayout>

      <ConfettiView ref="confetti" row="0" rowSpan="2" />
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue';

const confetti = ref(null);

function celebrate() {
  confetti.value.nativeView.start({ mode: 'explode' });
}
</script>
```

## Modes

A mode is a preset for the options below. Both platforms read the same numbers, so a mode looks the same on iOS and Android.

| Mode      | What it does                                                | Emission                    |
| --------- | ----------------------------------------------------------- | --------------------------- |
| `rain`    | Falls from the full width of the top edge.                  | 65 per second for 3 seconds |
| `burst`   | A directional shot upwards from the bottom centre.          | 120 particles over 400 ms   |
| `explode` | A radial pop outwards from a point a third of the way down. | 150 particles over 250 ms   |
| `stream`  | A diagonal parade from the left edge.                       | 40 per second for 3 seconds |

```ts
confetti.start({ mode: 'rain' });
```

Every preset emits for a bounded time and then stops on its own, so you do not have to remember to clean one up. For a party that runs until you say otherwise, pass `duration: 0`:

```ts
confetti.start({ mode: 'rain', duration: 0 });
// later
confetti.stop();
```

## Layering and the party cap

Calling `start()` while a party is running adds another one on top. That is how you get two cannons firing from opposite corners:

```ts
confetti.start({ mode: 'burst', angle: 300, spread: 55, position: { x: 0, y: 1 }, count: 40, duration: 450 });
confetti.start({ mode: 'burst', angle: 240, spread: 55, position: { x: 1, y: 1 }, count: 40, duration: 450 });
```

A view runs at most `maxParties` parties at once (default 5). Starting another evicts the oldest. This keeps a button that gets tapped repeatedly from stacking emitters and dragging the frame rate down. If you want a tap to replace the current effect rather than add to it, call `reset()` first.

## Methods and events

| Method            | Description                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `start(options?)` | Begin a party. Options merge over the mode preset and the view's properties.                                     |
| `stop()`          | Stop emitting. Confetti already on screen finishes falling. A delayed party that has not started yet is dropped. |
| `reset()`         | Clear everything immediately.                                                                                    |
| `isActive`        | `true` while any party is emitting or still has particles on screen.                                             |

| Event           | Fires when                      |
| --------------- | ------------------------------- |
| `confettiStart` | A party begins emitting.        |
| `confettiEnd`   | The last active party finishes. |

```xml
<cf:ConfettiView confettiStart="{{ onStart }}" confettiEnd="{{ onEnd }}"/>
```

## Options

Every field is optional. Values merge in this order, each layer winning over the one before it: built-in defaults, then the mode preset, then properties set on the view, then the object passed to `start()`.

| Option              | Type                                         | Description                                                                                                                                    |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`              | `'rain' \| 'burst' \| 'explode' \| 'stream'` | Preset to build on.                                                                                                                            |
| `colors`            | `(string \| Color)[]`                        | Particles pick one at random. Default is a yellow, coral, pink and lilac set.                                                                  |
| `shapes`            | `('rectangle' \| 'square' \| 'circle')[]`    | Particles pick one at random. See below.                                                                                                       |
| `sizes`             | `number[]`                                   | Particle widths in DIPs. Default `[7, 10, 13]`.                                                                                                |
| `angle`             | `number`                                     | Direction in degrees: `0` right, `90` down, `180` left, `270` up.                                                                              |
| `spread`            | `number`                                     | Width of the spray in degrees. `1` is a line, `360` a full circle.                                                                             |
| `speed`, `maxSpeed` | `number`                                     | Launch speed. When `maxSpeed` is higher, each particle picks a random speed between the two.                                                   |
| `damping`           | `number`                                     | Drag applied after launch. Android only; see [Platform differences](#platform-differences).                                                    |
| `timeToLive`        | `number`                                     | Particle lifetime in milliseconds. Default 3000.                                                                                               |
| `fadeOut`           | `boolean`                                    | Fade particles out instead of popping them off. Default `true`.                                                                                |
| `spin`              | `boolean`                                    | Tumble particles as they travel. Default `true`.                                                                                               |
| `position`          | `{ x, y, toX?, toY? }`                       | Spawn point relative to the view, from `0` to `1`. Supply `toX` and `toY` to spawn along a line between the two points.                        |
| `duration`          | `number`                                     | How long to emit, in milliseconds. `0` emits until `stop()`.                                                                                   |
| `emissionRate`      | `number`                                     | Particles per second. Ignored when `count` is set.                                                                                             |
| `count`             | `number`                                     | Total particles across `duration`. Takes precedence over `emissionRate`. Always gets a finite window of at least one millisecond per particle. |
| `delay`             | `number`                                     | Milliseconds to wait before the first particle.                                                                                                |

`count` and `emissionRate` are mutually exclusive. Whichever one a layer sets beats the other from any earlier layer, so a preset's `count` survives the base defaults, and an `emissionRate` you pass to `start()` still overrides a preset's `count`.

## Properties for XML and templates

`mode`, `colors`, `shapes`, `sizes`, `autoStart`, `intensity`, `duration`, `emissionRate`, `count`, `angle`, `spread`, `timeToLive`, `fadeOut`, `spin` and `maxParties` are also settable directly on the view. List values accept a comma separated string.

```xml
<cf:ConfettiView mode="rain" colors="#ff0000,#00ff00,#0000ff" shapes="rectangle" autoStart="true" intensity="1.5"/>
```

`autoStart` begins a party as soon as the view is laid out.

`intensity` multiplies whatever `emissionRate` or `count` is in effect; `1` leaves the preset alone. It is not clamped. The presets keep roughly 150 to 200 particles on screen, so `intensity: 10` is a few thousand and you will notice.

## Shapes, sizes and colours

Three shapes are built in. `rectangle` is a paper strip, as wide as the chosen size and 40% as tall. `square` and `circle` are what they sound like.

The default is `['rectangle', 'rectangle', 'square']`: mostly strips, with some squares mixed in. Repeating an entry weights the random pick, and both platforms treat the list the same way. Pass `shapes: ['rectangle']` for strips only, or add `'circle'` for a dotty look.

Each particle also picks a width from `sizes` at random. On iOS the shape images are rasterised at the device scale and the emitter cell's `contentsScale` is set to match, so a 10 DIP particle is 10 points wide on every screen density.

Colours accept anything `Color` accepts: hex strings, named colours, or `Color` instances.

## Platform differences

Two options behave differently because the underlying renderers do.

`damping` is Android only. Konfetti multiplies a particle's velocity by `damping` every frame, which is how the presets' launch impulse dies away and gravity takes over. `CAEmitterCell` has no drag, so on iOS a particle keeps its launch velocity and gravity does the rest. The presets are tuned so this is not visible, but a custom party with a very low `damping` will settle faster on Android.

Three dimensional tumbling is Android only. Konfetti fakes depth by squashing a particle horizontally as it spins. iOS rotates in two dimensions through `CAEmitterCell.spin`.

Speed is not a literal unit conversion either. Konfetti moves a particle by `velocity` DIPs per frame; `CAEmitterLayer` works in points per second. The iOS side multiplies by a tuned factor so the shared presets read the same on both, rather than matching the maths exactly.

## The demo app

`apps/demo` is a plain TypeScript and XML NativeScript app that exercises the whole surface. Run it with:

```bash
npm run demo.ios
```

```bash
npm run demo.android
```

The page has four sections.

Shapes is a row of three toggles that apply to every effect below them. It starts with strips only. Tick square and circle to compare, or untick all three to fall back to the plugin default.

Presets is one button per mode. Each button clears the view and starts that mode, so tapping repeatedly does not stack. Rain and stream stop on their own after three seconds.

Options API has two buttons that bypass the presets. Custom party passes a full options object with its own colours, sizes and speeds to `start()`. Two cannons calls `start()` twice with mirrored angles and positions, which is the layering example above.

Control has an endless rain button that passes `duration: 0`, a stop button that lets the confetti already in the air fall, and a reset that clears the screen at once. A status label under them shows Idle, Running, Finished or Cleared, driven by the `confettiStart` and `confettiEnd` events.

The demo's shared logic lives in `tools/demo/nativescript-confettiview/index.ts` so it can be reused if you add Angular, Vue, Svelte or React demo flavours with `npm run add-demo`.

## Migrating from 3.x

Version 3 wrapped the SAConfettiView pod on iOS and `com.github.jinatonic.confetti` on Android. Neither has been maintained since 2017, the pod pointed at a personal fork pinned to Swift 3, and the plugin itself imported from `tns-core-modules`. Version 4 replaces both native libraries and the API changed with them.

| 3.x                            | 4.x                                                            |
| ------------------------------ | -------------------------------------------------------------- |
| `startConfetti()`              | `start(options?)`                                              |
| `stopConfetti()`               | `stop()`, or `reset()` to clear immediately                    |
| `intensity` (default `0.5`)    | `intensity` (default `1`, a plain multiplier)                  |
| `fullScreen`                   | Removed. Put the view in a `GridLayout` and span the rows.     |
| `ConfettiView.Types`           | `shapes: ['rectangle' \| 'square' \| 'circle']`                |
| `colors` as `UIColor[]` on iOS | `colors` as hex strings or `Color`, the same on both platforms |
| extends `ContentView`          | extends `View`. It is an overlay and takes no children.        |

The iOS Podfile is gone, so any `SWIFT_VERSION` overrides added for it can be removed from your app.

## Developing

This repository is an Nx plugin workspace laid out like the official NativeScript plugin seed.

```
packages/nativescript-confettiview   the published plugin
apps/demo                            plain TypeScript and XML demo app
tools/demo/nativescript-confettiview demo logic, shared across demo flavours
tools/assets/App_Resources           App_Resources shared by the demo apps
```

```bash
npm install
```

`npm run build` compiles the plugin into `dist/packages/nativescript-confettiview`, ready to publish. `npm run lint` runs oxlint and `npm run format` runs oxfmt; both also run on pre-commit. `npm start` opens an interactive menu of every workspace task.

The plugin has no iOS native source, so building the demo on a Mac needs only Xcode. If the NativeScript CLI's CocoaPods check fails with a Ruby encoding error, set `LANG=en_US.UTF-8` in your shell; the check runs even though there are no pods to install.

## License

MIT
