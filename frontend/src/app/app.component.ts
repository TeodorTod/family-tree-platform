import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from './shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from './shared/imports/shared-primeng-imports';

@Component({
  selector: 'app-root',
  imports: [...SHARED_ANGULAR_IMPORTS, ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';
}
