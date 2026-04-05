import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CONSTANTS } from '../../../../shared/constants/constants';

@Component({
  selector: 'app-node-hover-actions',
  imports: [...SHARED_ANGULAR_IMPORTS, ButtonModule, TooltipModule],
  templateUrl: './node-hover-actions.component.html',
  styleUrls: ['./node-hover-actions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeHoverActionsComponent {
  constants = CONSTANTS;

  topPx = input<number | undefined>();
  leftPx = input<number | undefined>();

  addRequested = output<void>();
  editRequested = output<void>();

  handleContainerInteraction(event: Event): void {
    event.stopPropagation();
    if (
      event instanceof KeyboardEvent &&
      (event.key === ' ' || event.key === 'Spacebar')
    ) {
      event.preventDefault();
    }
  }
}
