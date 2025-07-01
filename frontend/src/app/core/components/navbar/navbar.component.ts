import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../features/auth/services/auth.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  isLoggedIn = this.auth.getTokenSignal();

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
