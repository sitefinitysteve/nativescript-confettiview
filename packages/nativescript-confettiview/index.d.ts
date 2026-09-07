import { ConfettiOptions, ConfettiViewBase } from './common';

export * from './common';

/**
 * A transparent, non-interactive overlay that renders confetti.
 *
 * Place it as the last child of a `GridLayout` so it covers the content beneath
 * it; it never intercepts touches.
 */
export declare class ConfettiView extends ConfettiViewBase {
  /** Begin a party. Options are merged over the mode preset and the view's properties. */
  start(options?: ConfettiOptions): void;

  /** Stop emitting, but let the confetti already on screen finish falling. */
  stop(): void;

  /** Clear everything from the screen immediately. */
  reset(): void;

  /** True while particles are still being emitted or rendered. */
  get isActive(): boolean;
}
