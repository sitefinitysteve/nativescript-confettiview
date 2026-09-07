import { CSSType, Color, Property, View, booleanConverter } from '@nativescript/core';

/**
 * The direction/behaviour preset a confetti burst uses.
 *
 * - `rain`    confetti falls from the full width of the top edge
 * - `burst`   a directional shot upwards from the bottom centre
 * - `explode` a radial pop outwards from a single point
 * - `stream`  a continuous diagonal parade from the left edge
 */
export type ConfettiMode = 'rain' | 'burst' | 'explode' | 'stream';

export type ConfettiShape = 'square' | 'circle' | 'rectangle';

/**
 * Spawn point, expressed relative to the view: `0,0` is the top-left corner and
 * `1,1` the bottom-right. Supply `toX`/`toY` to spawn along a line between the
 * two points instead of from a single spot.
 */
export interface ConfettiPosition {
  x: number;
  y: number;
  toX?: number;
  toY?: number;
}

export interface ConfettiOptions {
  /** Preset to base this party on. Defaults to the view's `mode`. */
  mode?: ConfettiMode;
  /** Particles are tinted with a random pick from this list. */
  colors?: (string | Color)[];
  shapes?: ConfettiShape[];
  /** Particle sizes in DIPs. One is picked at random per particle. */
  sizes?: number[];
  /** Emission direction in degrees: 0 = right, 90 = down, 180 = left, 270 = up. */
  angle?: number;
  /** How wide the spray is, in degrees. 1 is a straight line, 360 is a full circle. */
  spread?: number;
  /** Starting speed. When `maxSpeed` is higher, each particle picks a random speed between them. */
  speed?: number;
  maxSpeed?: number;
  /** How quickly particles shed their initial speed. 1 is no drag. Android only. */
  damping?: number;
  /** How long a particle lives, in milliseconds. */
  timeToLive?: number;
  /** Fade particles out at the end of their life rather than popping them off. */
  fadeOut?: boolean;
  /** Tumble particles as they travel. Named `spin` because `View.rotate` is taken. */
  spin?: boolean;
  position?: ConfettiPosition;
  /** How long to keep emitting, in milliseconds. `0` emits until you call `stop()`. */
  duration?: number;
  /** Particles emitted per second. Ignored when `count` is set. */
  emissionRate?: number;
  /** Total particles to emit across `duration`. Takes precedence over `emissionRate`. */
  count?: number;
  /** Wait this many milliseconds before the first particle appears. */
  delay?: number;
}

/** Every field resolved to a concrete value, ready for the native layer. */
export interface ResolvedConfettiOptions extends ConfettiOptions {
  mode: ConfettiMode;
  colors: Color[];
  shapes: ConfettiShape[];
  sizes: number[];
  angle: number;
  spread: number;
  speed: number;
  maxSpeed: number;
  damping: number;
  timeToLive: number;
  fadeOut: boolean;
  spin: boolean;
  position: ConfettiPosition;
  duration: number;
  delay: number;
}

export const DEFAULT_CONFETTI_COLORS = ['#fce18a', '#ff726d', '#f4306d', '#b48def'];

const BASE_OPTIONS: ResolvedConfettiOptions = {
  mode: 'rain',
  colors: DEFAULT_CONFETTI_COLORS.map((c) => new Color(c)),
  // Real confetti is mostly paper strips, so lead with rectangles and mix in
  // squares for variety. Pass `shapes` to override.
  shapes: ['rectangle', 'rectangle', 'square'],
  sizes: [7, 10, 13],
  angle: 90,
  spread: 360,
  speed: 0,
  maxSpeed: 15,
  damping: 0.9,
  timeToLive: 3000,
  fadeOut: true,
  spin: true,
  position: { x: 0.5, y: 0.5 },
  duration: 0,
  emissionRate: 60,
  delay: 0,
};

/**
 * Per-mode overrides applied on top of {@link BASE_OPTIONS}. Both platforms read
 * these same numbers so a given mode looks the same on iOS and Android.
 */
export const CONFETTI_PRESETS: Record<ConfettiMode, ConfettiOptions> = {
  rain: {
    angle: 90,
    spread: 360,
    speed: 0,
    maxSpeed: 15,
    position: { x: 0, y: 0, toX: 1, toY: 0 },
    emissionRate: 65,
    // Bounded on purpose. An endless default would keep a render loop alive
    // until the caller remembered to call stop(); pass `duration: 0` to opt in.
    duration: 3000,
  },
  burst: {
    angle: 270,
    spread: 45,
    speed: 20,
    maxSpeed: 45,
    position: { x: 0.5, y: 1 },
    count: 120,
    duration: 400,
  },
  explode: {
    angle: 0,
    spread: 360,
    speed: 0,
    maxSpeed: 30,
    position: { x: 0.5, y: 0.35 },
    count: 150,
    duration: 250,
    timeToLive: 2500,
  },
  stream: {
    angle: 315,
    spread: 30,
    speed: 10,
    maxSpeed: 30,
    position: { x: 0, y: 0.5 },
    emissionRate: 40,
    duration: 3000,
  },
};

function toColorList(value: unknown): Color[] | undefined {
  if (value == null) {
    return undefined;
  }
  const list = Array.isArray(value) ? value : String(value).split(',');
  const colors = list.map((c) => (c instanceof Color ? c : new Color(String(c).trim()))).filter((c) => !!c);
  return colors.length ? colors : undefined;
}

function toStringList(value: unknown): string[] | undefined {
  if (value == null) {
    return undefined;
  }
  const list = Array.isArray(value) ? value : String(value).split(',');
  const items = list.map((s) => String(s).trim()).filter((s) => !!s);
  return items.length ? items : undefined;
}

function toNumberList(value: unknown): number[] | undefined {
  if (value == null) {
    return undefined;
  }
  const list = Array.isArray(value) ? value : String(value).split(',');
  const nums = list.map((n) => parseFloat(String(n))).filter((n) => !isNaN(n));
  return nums.length ? nums : undefined;
}

@CSSType('ConfettiView')
export abstract class ConfettiViewBase extends View {
  static confettiStartEvent = 'confettiStart';
  static confettiEndEvent = 'confettiEnd';

  mode: ConfettiMode;
  colors: (string | Color)[] | string;
  shapes: ConfettiShape[] | string;
  sizes: number[] | string;
  autoStart: boolean;
  /** Multiplies `emissionRate`/`count`. `1` uses the preset's own amount. */
  intensity: number;
  duration: number;
  emissionRate: number;
  count: number;
  angle: number;
  spread: number;
  timeToLive: number;
  fadeOut: boolean;
  spin: boolean;
  /**
   * How many parties may run at once. Starting another evicts the oldest, so a
   * button that gets hammered cannot pile up emitters and drag the frame rate
   * down. Layered effects like twin cannons fit comfortably under the default.
   */
  maxParties: number;

  /** Begin a party. Options are merged over the mode preset and the view's properties. */
  abstract start(options?: ConfettiOptions): void;

  /** Stop emitting, but let the confetti already on screen finish falling. */
  abstract stop(): void;

  /** Clear everything from the screen immediately. */
  abstract reset(): void;

  /** True while particles are still being emitted or rendered. */
  abstract get isActive(): boolean;

  /**
   * Merge, in increasing order of precedence: the base defaults, the mode
   * preset, the values set as properties on the view, and the options passed to
   * `start()`.
   */
  protected resolveOptions(options?: ConfettiOptions): ResolvedConfettiOptions {
    const mode = options?.mode ?? this.mode ?? BASE_OPTIONS.mode;
    const preset = CONFETTI_PRESETS[mode] ?? {};

    const fromProps: ConfettiOptions = {
      colors: toColorList(this.colors),
      shapes: toStringList(this.shapes) as ConfettiShape[],
      sizes: toNumberList(this.sizes),
      duration: this.duration,
      emissionRate: this.emissionRate,
      count: this.count,
      angle: this.angle,
      spread: this.spread,
      timeToLive: this.timeToLive,
      fadeOut: this.fadeOut,
      spin: this.spin,
    };

    const merged: ResolvedConfettiOptions = { ...BASE_OPTIONS, ...preset, mode } as ResolvedConfettiOptions;
    for (const source of [fromProps, options ?? {}]) {
      for (const key of Object.keys(source)) {
        const value = source[key];
        if (value !== undefined && value !== null) {
          merged[key] = value;
        }
      }
    }

    // `count` and `emissionRate` are mutually exclusive; whichever the caller set
    // last wins, so clear the other to avoid the native layers disagreeing.
    if (options?.count != null || (fromProps.count != null && options?.emissionRate == null)) {
      delete merged.emissionRate;
    } else if (merged.emissionRate != null) {
      delete merged.count;
    }

    merged.colors = toColorList(merged.colors) ?? BASE_OPTIONS.colors;
    merged.shapes = (toStringList(merged.shapes) as ConfettiShape[]) ?? BASE_OPTIONS.shapes;
    merged.sizes = toNumberList(merged.sizes) ?? BASE_OPTIONS.sizes;

    const intensity = this.intensity != null && this.intensity > 0 ? this.intensity : 1;
    if (intensity !== 1) {
      if (merged.count != null) {
        merged.count = Math.max(1, Math.round(merged.count * intensity));
      }
      if (merged.emissionRate != null) {
        merged.emissionRate = Math.max(1, merged.emissionRate * intensity);
      }
    }

    return merged;
  }

  protected notifyConfettiStart(): void {
    this.notify({ eventName: ConfettiViewBase.confettiStartEvent, object: this });
  }

  protected notifyConfettiEnd(): void {
    this.notify({ eventName: ConfettiViewBase.confettiEndEvent, object: this });
  }
}

export const modeProperty = new Property<ConfettiViewBase, ConfettiMode>({
  name: 'mode',
  defaultValue: 'rain',
});
modeProperty.register(ConfettiViewBase);

export const colorsProperty = new Property<ConfettiViewBase, (string | Color)[] | string>({ name: 'colors' });
colorsProperty.register(ConfettiViewBase);

export const shapesProperty = new Property<ConfettiViewBase, ConfettiShape[] | string>({ name: 'shapes' });
shapesProperty.register(ConfettiViewBase);

export const sizesProperty = new Property<ConfettiViewBase, number[] | string>({ name: 'sizes' });
sizesProperty.register(ConfettiViewBase);

export const autoStartProperty = new Property<ConfettiViewBase, boolean>({
  name: 'autoStart',
  defaultValue: false,
  valueConverter: booleanConverter,
});
autoStartProperty.register(ConfettiViewBase);

export const intensityProperty = new Property<ConfettiViewBase, number>({
  name: 'intensity',
  defaultValue: 1,
  valueConverter: parseFloat,
});
intensityProperty.register(ConfettiViewBase);

export const durationProperty = new Property<ConfettiViewBase, number>({ name: 'duration', valueConverter: parseFloat });
durationProperty.register(ConfettiViewBase);

export const emissionRateProperty = new Property<ConfettiViewBase, number>({ name: 'emissionRate', valueConverter: parseFloat });
emissionRateProperty.register(ConfettiViewBase);

export const countProperty = new Property<ConfettiViewBase, number>({ name: 'count', valueConverter: parseFloat });
countProperty.register(ConfettiViewBase);

export const angleProperty = new Property<ConfettiViewBase, number>({ name: 'angle', valueConverter: parseFloat });
angleProperty.register(ConfettiViewBase);

export const spreadProperty = new Property<ConfettiViewBase, number>({ name: 'spread', valueConverter: parseFloat });
spreadProperty.register(ConfettiViewBase);

export const timeToLiveProperty = new Property<ConfettiViewBase, number>({ name: 'timeToLive', valueConverter: parseFloat });
timeToLiveProperty.register(ConfettiViewBase);

export const fadeOutProperty = new Property<ConfettiViewBase, boolean>({ name: 'fadeOut', valueConverter: booleanConverter });
fadeOutProperty.register(ConfettiViewBase);

export const spinProperty = new Property<ConfettiViewBase, boolean>({ name: 'spin', valueConverter: booleanConverter });
spinProperty.register(ConfettiViewBase);

export const DEFAULT_MAX_PARTIES = 5;

export const maxPartiesProperty = new Property<ConfettiViewBase, number>({
  name: 'maxParties',
  defaultValue: DEFAULT_MAX_PARTIES,
  valueConverter: (v) => Math.max(1, parseInt(v, 10) || DEFAULT_MAX_PARTIES),
});
maxPartiesProperty.register(ConfettiViewBase);
