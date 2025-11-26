import { Injectable, signal } from '@angular/core';
import {
  Observable,
  defer,
  from,
  throwError,
  catchError,
  switchMap,
} from 'rxjs';
import { environment } from '../../../environments/environment';

type RecaptchaClient = {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: RecaptchaClient;
  }
}

export type RecaptchaErrorReason =
  | 'site-key-missing'
  | 'not-in-browser'
  | 'script-load-failed'
  | 'execution-failed';

export class RecaptchaException extends Error {
  constructor(
    public readonly reason: RecaptchaErrorReason,
    message: string,
  ) {
    super(message);
    this.name = 'RecaptchaException';
  }
}

@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private readonly siteKey = (environment.recaptchaSiteKey || '').trim();
  private readonly scriptLoaded = signal(false);
  private loadPromise?: Promise<void>;

  execute(action: string): Observable<string> {
    if (!this.siteKey) {
      return throwError(
        () =>
          new RecaptchaException(
            'site-key-missing',
            'reCAPTCHA site key is not configured.',
          ),
      );
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return throwError(
        () =>
          new RecaptchaException(
            'not-in-browser',
            'reCAPTCHA is only available in the browser context.',
          ),
      );
    }

    return defer(() => this.ensureClient())
      .pipe(
        switchMap(() =>
          from(window.grecaptcha!.execute(this.siteKey, { action })),
        ),
        catchError((err) =>
          throwError(
            () =>
              err instanceof RecaptchaException
                ? err
                : new RecaptchaException(
                    'execution-failed',
                    err?.message || 'Unable to complete the reCAPTCHA challenge.',
                  ),
          ),
        ),
      );
  }

  private ensureClient(): Promise<void> {
    if (this.scriptLoaded()) {
      return Promise.resolve();
    }

    if (window.grecaptcha?.execute) {
      return new Promise((resolve) =>
        window.grecaptcha!.ready(() => {
          this.scriptLoaded.set(true);
          resolve();
        }),
      );
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-recaptcha="true"]',
      );

      const handleLoad = () => this.onClientReady(resolve);
      const handleError = () =>
        reject(
          new RecaptchaException(
            'script-load-failed',
            'Unable to load the Google reCAPTCHA client.',
          ),
        );

      if (existing) {
        existing.addEventListener('load', handleLoad, { once: true });
        existing.addEventListener('error', handleError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://example.invalid
      script.async = true;
      script.defer = true;
      script.setAttribute('data-recaptcha', 'true');
      script.onload = handleLoad;
      script.onerror = handleError;
      document.head.appendChild(script);
    }).catch((err) => {
      this.loadPromise = undefined;
      throw err;
    });

    return this.loadPromise;
  }

  private onClientReady(resolve: () => void) {
    const complete = () => {
      this.scriptLoaded.set(true);
      resolve();
    };

    if (window.grecaptcha?.ready) {
      window.grecaptcha.ready(complete);
    } else {
      complete();
    }
  }

  cleanup() {
    this.scriptLoaded.set(false);
    this.loadPromise = undefined;

    const badge = document.querySelectorAll('.grecaptcha-badge');
    badge.forEach((node) => node.remove());

    const script = document.querySelector('script[data-recaptcha="true"]');
    if (script?.parentNode) {
      script.parentNode.removeChild(script);
    }
    delete window.grecaptcha;
  }
}
