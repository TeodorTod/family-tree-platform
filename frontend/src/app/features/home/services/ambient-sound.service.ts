import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AmbientSoundService {
  private audio: HTMLAudioElement | null = null;
  private padShiftTimer: ReturnType<typeof setInterval> | null = null;
  private unlockHandlersAttached = false;

  readonly playing = signal(false);

  private readonly unlockHandler = () => {
    this.play(true);
  };

  play(fromUserInteraction = false) {
    if (typeof window === 'undefined') {
      return;
    }
    this.initAudio();
    if (!this.audio) {
      return;
    }

    const attempt = this.audio.play();
    if (!attempt) {
      this.attachUnlockHandlers();
      return;
    }

    attempt
      .then(() => {
        this.playing.set(true);
        this.detachUnlockHandlers();
        this.startPadShiftTimer();
      })
      .catch(() => {
        this.playing.set(false);
        if (!fromUserInteraction) {
          this.attachUnlockHandlers();
        }
      });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.playing.set(false);
    this.stopPadShiftTimer();
  }

  toggle() {
    if (this.playing()) {
      this.stop();
    } else {
      this.play();
    }
  }

  cleanup() {
    this.stop();
    this.detachUnlockHandlers();
    if (this.audio) {
      this.audio.src = '';
      this.audio = null;
    }
  }

  private initAudio() {
    if (this.audio) {
      return;
    }
    // Audio is intentionally not bundled in the public source release until
    // its licensing can be documented.
  }

  private attachUnlockHandlers() {
    if (this.unlockHandlersAttached || typeof window === 'undefined') {
      return;
    }
    window.addEventListener('pointerdown', this.unlockHandler);
    window.addEventListener('keydown', this.unlockHandler);
    this.unlockHandlersAttached = true;
  }

  private detachUnlockHandlers() {
    if (!this.unlockHandlersAttached || typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('pointerdown', this.unlockHandler);
    window.removeEventListener('keydown', this.unlockHandler);
    this.unlockHandlersAttached = false;
  }

  private startPadShiftTimer() {
    this.stopPadShiftTimer();
    this.padShiftTimer = window.setInterval(() => {
      if (!this.audio) {
        return;
      }
      const delta = (Math.random() - 0.5) * 0.04;
      const next = Math.max(0.25, Math.min(0.45, this.audio.volume + delta));
      this.audio.volume = next;
    }, 8000);
  }

  private stopPadShiftTimer() {
    if (this.padShiftTimer) {
      clearInterval(this.padShiftTimer);
      this.padShiftTimer = null;
    }
  }
}

