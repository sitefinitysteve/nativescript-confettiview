# nativescript-confettiview workspace

An Nx workspace holding the [`nativescript-confettiview`](packages/nativescript-confettiview/README.md)
plugin and a demo app to exercise it.

```
packages/nativescript-confettiview   the published plugin
apps/demo                            plain TypeScript/XML NativeScript app
tools/demo/nativescript-confettiview demo logic, shared across demo flavours
tools/assets/App_Resources           App_Resources shared by the demo apps
```

## Getting started

```bash
npm install
```

Run the demo:

```bash
npm run demo.ios
```

```bash
npm run demo.android
```

Or use the interactive menu, which lists every workspace task:

```bash
npm start
```

## Building the plugin

```bash
npm run build
```

Output lands in `dist/packages/nativescript-confettiview`, ready to publish.

## Adding another demo flavour

The workspace ships only the vanilla TypeScript demo. Angular, Vue, Svelte and
React demos can be generated when you want them:

```bash
npm run add-demo
```

Demo logic lives in `tools/demo/nativescript-confettiview` so it can be shared
across whichever flavours you add.

## Notes

- The plugin has **no iOS native dependency** — no `Podfile`, nothing to
  `pod install`. Confetti is rendered with `CAEmitterLayer` from TypeScript.
- Android pulls `nl.dionsegijn:konfetti-xml` in through
  `packages/nativescript-confettiview/platforms/android/include.gradle`.
