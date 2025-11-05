import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, Inject, PLATFORM_ID, signal, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrls: ['./hero.scss'],
})
export class Hero implements OnDestroy {
  images = [
    '/hero/hero1.png',
    '/hero/hero2.png',
    '/hero/hero3.png',
    '/hero/hero4.png',
  ];

  currentSlide = signal(0);
  intervalTime = 5000;
  private intervalId: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    afterNextRender(() => {
      this.startSlider();
    });
  }

  startSlider() {
    this.intervalId = setInterval(() => {
      this.currentSlide.set((this.currentSlide() + 1) % this.images.length);
    }, this.intervalTime);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}