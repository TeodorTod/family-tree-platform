import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from './shared/imports/shared-angular-imports';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { SHARED_PRIMENG_IMPORTS } from './shared/imports/shared-primeng-imports';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';
import { CookieConsentComponent } from './core/components/cookie-consent/cookie-consent.component';
import { SeoService } from './core/services/seo.service';
@Component({
  selector: 'app-root',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    NavbarComponent,
    FooterComponent,
    ...SHARED_PRIMENG_IMPORTS,
    LoadingOverlayComponent,
    CookieConsentComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.init();
  }
}
