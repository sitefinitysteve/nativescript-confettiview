import { ConfettiMode, ConfettiOptions, ConfettiView } from 'nativescript-confettiview';
import { DemoSharedBase } from '../utils';

/**
 * Framework-agnostic demo logic. The demo apps own the view; this class only
 * decides what to ask it for.
 */
export class DemoSharedNativescriptConfettiview extends DemoSharedBase {
  /** A hand-tuned party that ignores the presets, to exercise the options API. */
  static readonly customParty: ConfettiOptions = {
    mode: 'explode',
    colors: ['#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#ffffff'],
    shapes: ['circle', 'rectangle'],
    sizes: [8, 12, 16],
    spread: 360,
    speed: 5,
    maxSpeed: 40,
    count: 220,
    duration: 320,
    timeToLive: 3200,
    position: { x: 0.5, y: 0.45 },
  };

  /**
   * Clear whatever is on screen before starting something new.
   *
   * `start()` deliberately layers — that is how [[playCannons]] fires two
   * parties at once — but in a demo where every button can be hammered, the
   * emitters would pile up and tank the frame rate. Each button therefore
   * replaces the current effect rather than adding to it.
   */
  private replace(view: ConfettiView, play: () => void): void {
    view.reset();
    play();
  }

  play(view: ConfettiView, mode: ConfettiMode): void {
    this.replace(view, () => view.start({ mode }));
  }

  playCustom(view: ConfettiView): void {
    this.replace(view, () => view.start(DemoSharedNativescriptConfettiview.customParty));
  }

  /**
   * Two parties at once, fired from opposite bottom corners. Counts are kept
   * low per cannon — the two overlap, so the on-screen density is the sum.
   */
  playCannons(view: ConfettiView): void {
    this.replace(view, () => {
      view.start({
        mode: 'burst',
        angle: 300,
        spread: 55,
        position: { x: 0, y: 1 },
        count: 40,
        duration: 450,
      });
      view.start({
        mode: 'burst',
        angle: 240,
        spread: 55,
        position: { x: 1, y: 1 },
        count: 40,
        duration: 450,
      });
    });
  }

  /** `duration: 0` opts out of the preset's bounded emission and runs until stopped. */
  playEndless(view: ConfettiView): void {
    this.replace(view, () => view.start({ mode: 'rain', duration: 0 }));
  }

  stop(view: ConfettiView): void {
    view.stop();
  }

  reset(view: ConfettiView): void {
    view.reset();
  }
}
