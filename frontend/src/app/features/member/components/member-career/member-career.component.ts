import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-career',
  imports: [],
  templateUrl: './member-career.component.html',
  styleUrl: './member-career.component.scss'
})
export class MemberCareerComponent {
  @Input() role!: string;
}
