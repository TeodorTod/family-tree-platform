import { Component } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from './shared/imports/shared-angular-imports';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { Footer } from 'primeng/api';
import { FooterComponent } from './core/components/footer/footer.component';
import { SHARED_PRIMENG_IMPORTS } from './shared/imports/shared-primeng-imports';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';
@Component({
  selector: 'app-root',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    NavbarComponent,
    FooterComponent,
    ...SHARED_PRIMENG_IMPORTS,
    LoadingOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
