import { Component } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../shared/constants/constants';

@Component({
  selector: 'app-home',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  CONSSTANTS = CONSTANTS
}
