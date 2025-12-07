import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlatformStorageService {
  private platformId = inject(PLATFORM_ID);

  getItem(key: string, fallback: string | null = null) {
    if (!this.isBrowserEnvironment()) {
      return fallback;
    }
    return window.localStorage.getItem(key);
  }

  setItem(key: string, value: string) {
    if (!this.isBrowserEnvironment()) {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  removeItem(key: string) {
    if (!this.isBrowserEnvironment()) {
      return;
    }
    window.localStorage.removeItem(key);
  }

  getSessionItem(key: string, fallback: string | null = null) {
    if (!this.isBrowserEnvironment()) {
      return fallback;
    }
    return window.sessionStorage.getItem(key) ?? fallback;
  }

  setSessionItem(key: string, value: string) {
    if (!this.isBrowserEnvironment()) {
      return;
    }
    window.sessionStorage.setItem(key, value);
  }

  removeSessionItem(key: string) {
    if (!this.isBrowserEnvironment()) {
      return;
    }
    window.sessionStorage.removeItem(key);
  }

  matchMedia(query: string, fallback = false) {
    if (!this.isBrowserEnvironment()) {
      return fallback;
    }
    return window.matchMedia(query).matches;
  }

  getItemFromStorage(key: string, fallback: string | null = null) {
    if (!this.isBrowserEnvironment()) {
      return fallback;
    }
    return window.localStorage.getItem(key) ?? fallback;
  }

  isBrowserEnvironment() {
    return isPlatformBrowser(this.platformId);
  }
}
