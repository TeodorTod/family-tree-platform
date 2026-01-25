import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { CONSTANTS } from '../../../shared/constants/constants';

@Component({
  selector: 'app-footer',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    MenubarModule,
    ButtonModule,
    TooltipModule,
    RippleModule,
  ],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  CONSTANTS = CONSTANTS;
  currentYear = new Date().getFullYear();
}
