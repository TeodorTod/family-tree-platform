import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from './shared/imports/shared-angular-imports';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';
import { CookieConsentComponent } from './core/components/cookie-consent/cookie-consent.component';
import { SeoService } from './core/services/seo.service';
@Component({
  selector: 'app-root',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    NavbarComponent,
    FooterComponent,
    Toast,
    ConfirmDialog,
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
