import { EventData, Observable, Page } from '@nativescript/core';
import { ConfettiView } from 'nativescript-confettiview';
import { DemoSharedNativescriptConfettiview } from '@demo/shared';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new DemoModel(page);
}

export function navigatedFrom(args: EventData) {
  // Leaving the page with an infinite party running would keep the render loop
  // alive behind the back navigation.
  const page = <Page>args.object;
  (page.getViewById('confetti') as ConfettiView)?.reset();
}

class DemoModel extends Observable {
  private demo = new DemoSharedNativescriptConfettiview();

  constructor(private page: Page) {
    super();
    this.set('status', 'Idle');
  }

  private get confetti(): ConfettiView {
    return this.page.getViewById('confetti') as ConfettiView;
  }

  onRain = () => this.demo.play(this.confetti, 'rain');
  onBurst = () => this.demo.play(this.confetti, 'burst');
  onExplode = () => this.demo.play(this.confetti, 'explode');
  onStream = () => this.demo.play(this.confetti, 'stream');
  onCustom = () => this.demo.playCustom(this.confetti);
  onCannons = () => this.demo.playCannons(this.confetti);
  onEndless = () => this.demo.playEndless(this.confetti);
  onStop = () => this.demo.stop(this.confetti);
  onReset = () => {
    this.demo.reset(this.confetti);
    this.set('status', 'Cleared');
  };

  onConfettiStart = () => this.set('status', 'Running');
  onConfettiEnd = () => this.set('status', 'Finished');
}
