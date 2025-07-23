import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-personal-info',
  imports: [],
  templateUrl: './member-personal-info.component.html',
  styleUrl: './member-personal-info.component.scss',
})
export class MemberPersonalInfoComponent {
  @Input() role!: string;
}
