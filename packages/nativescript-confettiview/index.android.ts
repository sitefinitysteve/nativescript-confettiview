import { Color, View } from '@nativescript/core';
import { ConfettiOptions, ConfettiShape, ConfettiViewBase, ResolvedConfettiOptions } from './common';

export * from './common';

declare const nl: any;

/**
 * Konfetti treats an emitting time of 0 as "emit until told otherwise", so an
 * infinite party is expressed as a zero duration rather than a huge one.
 */
const INFINITE_EMIT = 0;

let konfetti: {
  Party: any;
  PartyFactory: any;
  Position: any;
  Rotation: any;
  Emitter: any;
  Shape: any;
  Size: any;
  KonfettiView: any;
  Listener: any;
};

function konfettiRefs() {
  if (!konfetti) {
    const core = nl.dionsegijn.konfetti.core;
    konfetti = {
      Party: core.Party,
      PartyFactory: core.PartyFactory,
      Position: core.Position,
      Rotation: core.Rotation,
      Emitter: core.emitter.Emitter,
      Shape: core.models.Shape,
      Size: core.models.Size,
      KonfettiView: nl.dionsegijn.konfetti.xml.KonfettiView,
      Listener: nl.dionsegijn.konfetti.xml.listeners.OnParticleSystemUpdateListener,
    };
  }
  return konfetti;
}

function toJavaList(items: any[]): java.util.ArrayList<any> {
  const list = new java.util.ArrayList<any>();
  items.forEach((item) => list.add(item));
  return list;
}

function toShape(shape: ConfettiShape): any {
  const { Shape } = konfettiRefs();
  switch (shape) {
    case 'circle':
      return Shape.Circle.INSTANCE;
    case 'rectangle':
      return new Shape.Rectangle(0.4);
    case 'square':
    default:
      return Shape.Square.INSTANCE;
  }
}

function toPosition(options: ResolvedConfettiOptions): any {
  const { Position } = konfettiRefs();
  const from = new Position.Relative(options.position.x, options.position.y);
  if (options.position.toX != null || options.position.toY != null) {
    const to = new Position.Relative(options.position.toX ?? options.position.x, options.position.toY ?? options.position.y);
    return from.between(to);
  }
  return from;
}

function toEmitterConfig(options: ResolvedConfettiOptions): any {
  const { Emitter } = konfettiRefs();
  const TimeUnit = java.util.concurrent.TimeUnit;

  if (options.count != null) {
    // `EmitterConfig.max` computes `(emittingTime / amount) / 1000f` with an
    // integer division, so an emitting window shorter than the particle count
    // yields 0 and then a divide-by-zero inside the emitter. Give every
    // particle at least a millisecond of runway.
    const count = Math.max(1, Math.round(options.count));
    const duration = Math.max(options.duration || 0, count);
    return new Emitter(duration, TimeUnit.MILLISECONDS).max(count);
  }

  const rate = Math.max(1, Math.round(options.emissionRate ?? 60));
  const duration = options.duration > 0 ? options.duration : INFINITE_EMIT;
  return new Emitter(duration, TimeUnit.MILLISECONDS).perSecond(rate);
}

function buildParty(options: ResolvedConfettiOptions): any {
  const { Party, Rotation, Size } = konfettiRefs();

  const sizes = toJavaList(options.sizes.map((dp) => new Size(Math.round(dp), 5, 0.2)));
  const colors = toJavaList(options.colors.map((c: Color) => java.lang.Integer.valueOf(c.android)));
  const shapes = toJavaList(options.shapes.map(toShape));

  // Konfetti reads `maxSpeed === -1` as "no randomness"; anything else makes it
  // pick a speed between `speed` and `maxSpeed`.
  const speed = options.speed;
  const maxSpeed = options.maxSpeed > speed ? options.maxSpeed : -1;

  const rotation = options.spin ? new Rotation(true, 1, 0.5, 8, 1.5) : new Rotation(false, 1, 0.5, 8, 1.5);

  return new Party(Math.round(options.angle), Math.round(options.spread), speed, maxSpeed, options.damping, sizes, colors, shapes, Math.round(options.timeToLive), options.fadeOut, toPosition(options), Math.round(options.delay), rotation, toEmitterConfig(options));
}

export class ConfettiView extends ConfettiViewBase {
  nativeViewProtected: any;

  private _pendingOptions: ConfettiOptions | null = null;
  private _activeParties: any[] = [];
  private _layoutHandler: (args: any) => void;

  createNativeView() {
    const { KonfettiView } = konfettiRefs();
    return new KonfettiView(this._context);
  }

  initNativeView() {
    super.initNativeView();

    const owner = new WeakRef<ConfettiView>(this);
    const { Listener } = konfettiRefs();

    this.nativeViewProtected.setOnParticleSystemUpdateListener(
      new Listener({
        onParticleSystemStarted(_view: any, _party: any, _activeSystems: number) {
          owner.deref()?.notifyConfettiStart();
        },
        onParticleSystemEnded(_view: any, party: any, activeSystems: number) {
          const view = owner.deref();
          if (!view) {
            return;
          }
          view.forgetParty(party);
          if (activeSystems === 0) {
            view.notifyConfettiEnd();
          }
        },
      }),
    );

    // Relative positions are multiplied by the draw area, so starting before the
    // view has been measured would spawn everything at 0,0. Hold the request
    // until Android hands us a real size.
    this._layoutHandler = () => {
      if (this._pendingOptions) {
        const options = this._pendingOptions;
        this._pendingOptions = null;
        this.start(options);
      }
    };
    this.on(View.layoutChangedEvent, this._layoutHandler);

    if (this.autoStart) {
      this.start();
    }
  }

  disposeNativeView() {
    if (this._layoutHandler) {
      this.off(View.layoutChangedEvent, this._layoutHandler);
      this._layoutHandler = null;
    }
    this._pendingOptions = null;
    this.reset();
    this.nativeViewProtected?.setOnParticleSystemUpdateListener(null);
    super.disposeNativeView();
  }

  start(options?: ConfettiOptions): void {
    if (!this.nativeViewProtected) {
      this._pendingOptions = options ?? {};
      return;
    }

    if (!this.isLayoutValid || this.getMeasuredWidth() === 0 || this.getMeasuredHeight() === 0) {
      this._pendingOptions = options ?? {};
      return;
    }

    // Evict the oldest parties so a hammered trigger cannot stack emitters.
    while (this._activeParties.length >= Math.max(1, this.maxParties)) {
      const oldest = this._activeParties.shift();
      this.nativeViewProtected.stop(oldest);
    }

    const party = buildParty(this.resolveOptions(options));
    this._activeParties.push(party);
    this.nativeViewProtected.start(party);
  }

  stop(): void {
    this._pendingOptions = null;
    this.nativeViewProtected?.stopGracefully();
  }

  reset(): void {
    this._pendingOptions = null;
    this._activeParties = [];
    this.nativeViewProtected?.reset();
  }

  get isActive(): boolean {
    return this.nativeViewProtected ? this.nativeViewProtected.isActive() : false;
  }

  /** @internal — drops a finished party so the array does not grow forever. */
  forgetParty(party: any): void {
    const index = this._activeParties.findIndex((p) => p.equals(party));
    if (index > -1) {
      this._activeParties.splice(index, 1);
    }
  }
}
