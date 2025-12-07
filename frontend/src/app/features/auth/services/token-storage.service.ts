import { Injectable, inject } from '@angular/core';
import { PlatformStorageService } from '../../../core/services/platform-storage.service';

const TOKEN_KEY = 'ft-auth-token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private storage = inject(PlatformStorageService);
  private inMemory: string | null = this.storage.getItem(TOKEN_KEY);

  getToken(): string | null {
    return this.inMemory ?? null;
  }

  setToken(token: string | null) {
    this.inMemory = token;
    if (token) {
      this.storage.setItem(TOKEN_KEY, token);
      return;
    }
    this.storage.removeItem(TOKEN_KEY);
  }

  clear() {
    this.setToken(null);
  }
}
