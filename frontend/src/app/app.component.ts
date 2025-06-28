import { Component } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from './shared/imports/shared-angular-imports';
@Component({
  selector: 'app-root',
  imports: [...SHARED_ANGULAR_IMPORTS, ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
