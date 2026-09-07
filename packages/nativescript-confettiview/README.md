# nativescript-confettiview

Confetti for NativeScript, on iOS and Android.

```bash
npm install nativescript-confettiview
```

| Platform | Renderer | Native dependency |
| --- | --- | --- |
| iOS | `CAEmitterLayer` | none — no CocoaPods, nothing to `pod install` |
| Android | [Konfetti](https://github.com/DanielMartinus/Konfetti) `2.0.5` | `nl.dionsegijn:konfetti-xml`, pulled in by Gradle |

Requires NativeScript 9.0 or newer.

## Usage

`ConfettiView` is a transparent overlay that never intercepts touches, so put it
last inside a `GridLayout` and let it span the rows you want covered.

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

Register the element once, at startup:

```ts
import { createApp, registerElement } from 'nativescript-vue';

registerElement('ConfettiView', () => require('nativescript-confettiview').ConfettiView);
```

```html
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

Each mode is a preset of the options below. Both platforms read the same
numbers, so a mode looks the same on iOS and Android.

| Mode | What it does |
| --- | --- |
| `rain` | Falls from the full width of the top edge. |
| `burst` | A directional shot upwards from the bottom centre. |
| `explode` | A radial pop outwards from a point. |
| `stream` | A diagonal parade from the left edge. |

```ts
confetti.start({ mode: 'rain' });
```

Every preset emits for a bounded time and then stops on its own, so you never
have to remember to clean one up. For a party that runs until you say otherwise,
pass `duration: 0`:

```ts
confetti.start({ mode: 'rain', duration: 0 });
// ...later
confetti.stop();
```

Calling `start()` more than once layers parties, which is how you get effects
like two cannons firing from opposite corners.

## Methods

| Method | Description |
| --- | --- |
| `start(options?)` | Begin a party. Call it repeatedly to layer several at once. |
| `stop()` | Stop emitting; confetti already on screen finishes falling. |
| `reset()` | Clear everything immediately. |
| `isActive` | `true` while particles are still emitting or rendering. |

## Events

| Event | Fires when |
| --- | --- |
| `confettiStart` | A party begins emitting. |
| `confettiEnd` | The last active party finishes. |

## Options

Every field is optional. Values are merged in this order, each layer winning
over the one before it: built-in defaults → the mode preset → properties set on
the view → the object passed to `start()`.

| Option | Type | Description |
| --- | --- | --- |
| `mode` | `'rain' \| 'burst' \| 'explode' \| 'stream'` | Preset to build on. |
| `colors` | `(string \| Color)[]` | Particles pick one at random. |
| `shapes` | `('square' \| 'circle' \| 'rectangle')[]` | Particles pick one at random. |
| `sizes` | `number[]` | Particle sizes in DIPs. |
| `angle` | `number` | Direction in degrees: `0` right, `90` down, `180` left, `270` up. |
| `spread` | `number` | Width of the spray in degrees. `1` is a line, `360` a full circle. |
| `speed` / `maxSpeed` | `number` | Launch speed. When `maxSpeed` is higher, each particle picks a random speed between the two. |
| `damping` | `number` | Drag applied after launch. **Android only** — see below. |
| `timeToLive` | `number` | Particle lifetime in milliseconds. |
| `fadeOut` | `boolean` | Fade particles out instead of popping them off. |
| `spin` | `boolean` | Tumble particles as they travel. |
| `position` | `{ x, y, toX?, toY? }` | Spawn point relative to the view, `0`–`1`. Supply `toX`/`toY` to spawn along a line. |
| `duration` | `number` | How long to emit, in milliseconds. `0` emits until `stop()`. |
| `emissionRate` | `number` | Particles per second. Ignored when `count` is set. |
| `count` | `number` | Total particles across `duration`. Takes precedence over `emissionRate`. |
| `delay` | `number` | Milliseconds to wait before the first particle. |

### Properties

`mode`, `colors`, `shapes`, `sizes`, `autoStart`, `intensity`, `duration`,
`emissionRate`, `count`, `angle`, `spread`, `timeToLive`, `fadeOut` and
`spin` are also settable directly on the view, which is what makes them
usable from XML and Vue templates:

```xml
<cf:ConfettiView mode="rain" colors="#ff0000,#00ff00,#0000ff" autoStart="true" intensity="1.5"/>
```

`intensity` multiplies whatever `emissionRate` or `count` is in effect. `1`
leaves the preset alone.

## Platform differences

Two options behave differently because the underlying renderers do:

- **`damping` is Android-only.** `CAEmitterCell` has no drag, so on iOS a
  particle keeps its launch velocity and gravity does the rest. The presets are
  tuned so this is not visible, but a custom party with a very low `damping`
  will settle faster on Android than on iOS.
- **3D tumbling is Android-only.** Konfetti fakes depth by squashing a particle
  horizontally as it spins. iOS rotates in 2D via `CAEmitterCell.spin`.

## Migrating from 3.x

3.x wrapped the abandoned `SAConfettiView` pod on iOS and the abandoned
`com.github.jinatonic.confetti` library on Android. Both are gone, and the API
changed with them.

| 3.x | 4.x |
| --- | --- |
| `startConfetti()` | `start(options?)` |
| `stopConfetti()` | `stop()`, or `reset()` to clear immediately |
| `intensity` (default `0.5`) | `intensity` (default `1`, a plain multiplier) |
| `fullScreen` | Removed — put the view in a `GridLayout` and span the rows |
| `ConfettiView.Types` | `shapes: ['square' \| 'circle' \| 'rectangle']` |
| extends `ContentView` | extends `View` — it is an overlay and takes no children |

The iOS Podfile is gone, so an existing project can drop `pod` troubleshooting
and any `SWIFT_VERSION` overrides that were added for it.

## License

MIT
