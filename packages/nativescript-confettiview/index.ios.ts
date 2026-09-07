import { Color, Utils } from '@nativescript/core';
import { ConfettiOptions, ConfettiShape, ConfettiViewBase, ResolvedConfettiOptions } from './common';

export * from './common';

/**
 * Konfetti advances a particle by `velocity` device-independent pixels every
 * frame, so its speeds are "dp per frame at 60fps". CAEmitterLayer works in
 * points per second, and it has no drag to bleed off the initial impulse the
 * way Konfetti's `damping` does. This factor is tuned so the shared presets
 * read the same on both platforms rather than being a literal unit conversion.
 */
const SPEED_TO_POINTS_PER_SECOND = 16;

/** Downward pull applied to every particle, in points per second squared. */
const GRAVITY = 220;

/** Point size the shape images are rasterised at before `scale` is applied. */
const BASE_SHAPE_SIZE = 12;

const shapeImageCache = new Map<string, any>();

function shapeImage(shape: ConfettiShape): any {
  const cached = shapeImageCache.get(shape);
  if (cached) {
    return cached;
  }

  const width = BASE_SHAPE_SIZE;
  const height = shape === 'rectangle' ? BASE_SHAPE_SIZE * 0.4 : BASE_SHAPE_SIZE;

  UIGraphicsBeginImageContextWithOptions(CGSizeMake(width, height), false, 0);
  const context = UIGraphicsGetCurrentContext();
  // Drawn white so CAEmitterCell.color tints it to whatever the caller asked for.
  CGContextSetFillColorWithColor(context, UIColor.whiteColor.CGColor);
  const rect = CGRectMake(0, 0, width, height);
  if (shape === 'circle') {
    CGContextFillEllipseInRect(context, rect);
  } else {
    CGContextFillRect(context, rect);
  }
  const image = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();

  shapeImageCache.set(shape, image.CGImage);
  return image.CGImage;
}

interface ConfettiParty {
  layer: CAEmitterLayer;
  options: ResolvedConfettiOptions;
  timers: number[];
}

export class ConfettiView extends ConfettiViewBase {
  nativeViewProtected: UIView;

  private _parties: ConfettiParty[] = [];

  createNativeView() {
    const view = UIView.alloc().initWithFrame(CGRectZero);
    // The overlay must never swallow taps meant for the UI underneath it.
    view.userInteractionEnabled = false;
    view.backgroundColor = UIColor.clearColor;
    return view;
  }

  initNativeView() {
    super.initNativeView();
    if (this.autoStart) {
      this.start();
    }
  }

  disposeNativeView() {
    this.reset();
    super.disposeNativeView();
  }

  onLayout(left: number, top: number, right: number, bottom: number): void {
    super.onLayout(left, top, right, bottom);
    // Keep emitters pinned to the view as it resizes (rotation, split view).
    CATransaction.begin();
    CATransaction.setDisableActions(true);
    for (const party of this._parties) {
      this.positionEmitter(party.layer, party.options);
    }
    CATransaction.commit();
  }

  start(options?: ConfettiOptions): void {
    if (!this.nativeViewProtected) {
      return;
    }

    const resolved = this.resolveOptions(options);
    const begin = () => {
      if (!this.nativeViewProtected) {
        return;
      }
      this.startParty(resolved);
    };

    if (resolved.delay > 0) {
      const timer = Utils.setTimeout(begin, resolved.delay);
      // Held on a placeholder party so `reset()` can cancel a delayed start.
      this._parties.push({ layer: null, options: resolved, timers: [timer] });
    } else {
      begin();
    }
  }

  stop(): void {
    for (const party of this._parties) {
      if (party.layer) {
        this.endEmission(party);
      }
    }
  }

  reset(): void {
    for (const party of this._parties) {
      party.timers.forEach((t) => Utils.clearTimeout(t));
      party.layer?.removeFromSuperlayer();
    }
    this._parties = [];
  }

  get isActive(): boolean {
    return this._parties.length > 0;
  }

  private startParty(options: ResolvedConfettiOptions): void {
    const layer = CAEmitterLayer.layer();
    layer.contentsScale = UIScreen.mainScreen.scale;
    layer.renderMode = kCAEmitterLayerUnordered;
    layer.emitterCells = this.buildCells(options);
    this.positionEmitter(layer, options);

    this.nativeViewProtected.layer.addSublayer(layer);

    // Evict the oldest parties so a hammered trigger cannot stack emitters.
    while (this._parties.length >= Math.max(1, this.maxParties)) {
      const oldest = this._parties.shift();
      oldest.timers.forEach((t) => Utils.clearTimeout(t));
      oldest.layer?.removeFromSuperlayer();
    }

    const party: ConfettiParty = { layer, options, timers: [] };
    this._parties.push(party);
    this.notifyConfettiStart();

    // A duration of 0 means "emit until stop()"; anything else stops emitting on
    // schedule and then lets the last particles live out their lifetime.
    if (options.duration > 0) {
      party.timers.push(Utils.setTimeout(() => this.endEmission(party), options.duration));
    }
  }

  /** Stop emitting new particles and tear the layer down once the last one dies. */
  private endEmission(party: ConfettiParty): void {
    if (!party.layer || party.layer.birthRate === 0) {
      return;
    }
    party.layer.birthRate = 0;
    party.timers.push(
      Utils.setTimeout(() => {
        party.layer?.removeFromSuperlayer();
        const index = this._parties.indexOf(party);
        if (index > -1) {
          this._parties.splice(index, 1);
        }
        if (this._parties.length === 0) {
          this.notifyConfettiEnd();
        }
      }, party.options.timeToLive),
    );
  }

  private positionEmitter(layer: CAEmitterLayer, options: ResolvedConfettiOptions): void {
    const width = this.getMeasuredWidth() / Utils.layout.getDisplayDensity() || 0;
    const height = this.getMeasuredHeight() / Utils.layout.getDisplayDensity() || 0;

    layer.frame = CGRectMake(0, 0, width, height);

    const { x, y, toX, toY } = options.position;
    const spansX = toX != null && toX !== x;
    const spansY = toY != null && toY !== y;

    if (spansX || spansY) {
      const endX = toX ?? x;
      const endY = toY ?? y;
      layer.emitterShape = kCAEmitterLayerLine;
      layer.emitterPosition = CGPointMake(((x + endX) / 2) * width, ((y + endY) / 2) * height);
      layer.emitterSize = CGSizeMake(Math.abs(endX - x) * width || 1, Math.abs(endY - y) * height || 1);
    } else {
      layer.emitterShape = kCAEmitterLayerPoint;
      layer.emitterPosition = CGPointMake(x * width, y * height);
      layer.emitterSize = CGSizeMake(1, 1);
    }
  }

  private buildCells(options: ResolvedConfettiOptions): NSArray<CAEmitterCell> {
    const lifetime = options.timeToLive / 1000;

    const averageSpeed = ((options.speed + Math.max(options.speed, options.maxSpeed)) / 2) * SPEED_TO_POINTS_PER_SECOND;
    const speedRange = (Math.abs(options.maxSpeed - options.speed) / 2) * SPEED_TO_POINTS_PER_SECOND;

    const sizes = options.sizes;
    const meanSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    const sizeSpread = (Math.max(...sizes) - Math.min(...sizes)) / 2;

    // One cell per colour/shape pairing; size and speed vary within each cell.
    const cellCount = options.colors.length * options.shapes.length;
    const totalBirthRate = options.count != null ? (options.count / Math.max(options.duration, 1)) * 1000 : (options.emissionRate ?? 60);
    const perCellBirthRate = totalBirthRate / cellCount;

    const cells: CAEmitterCell[] = [];
    for (const color of options.colors as Color[]) {
      for (const shape of options.shapes) {
        const cell = CAEmitterCell.emitterCell();
        cell.contents = shapeImage(shape);
        // The shape images are rasterised at the device scale, but a cell's
        // contentsScale defaults to 1 — without this the particles render at
        // their pixel dimensions and come out 2-3x larger than `sizes` asks
        // for, which would also put iOS out of step with Android.
        cell.contentsScale = UIScreen.mainScreen.scale;
        cell.color = color.ios.CGColor;
        cell.birthRate = perCellBirthRate;
        cell.lifetime = lifetime;
        cell.lifetimeRange = lifetime * 0.25;

        cell.velocity = averageSpeed;
        cell.velocityRange = speedRange;
        cell.emissionLongitude = (options.angle * Math.PI) / 180;
        cell.emissionRange = (options.spread * Math.PI) / 180 / 2;
        cell.yAcceleration = GRAVITY;

        cell.scale = meanSize / BASE_SHAPE_SIZE;
        cell.scaleRange = sizeSpread / BASE_SHAPE_SIZE;

        if (options.spin) {
          cell.spin = 3.5;
          cell.spinRange = 3.5;
        }

        if (options.fadeOut) {
          cell.alphaSpeed = -1 / lifetime;
        }

        cells.push(cell);
      }
    }

    return NSArray.arrayWithArray<CAEmitterCell>(cells as any);
  }
}
