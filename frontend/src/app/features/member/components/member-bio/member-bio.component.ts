import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-bio',
  imports: [],
  templateUrl: './member-bio.component.html',
  styleUrl: './member-bio.component.scss'
})
export class MemberBioComponent {
  @Input() role!: string;
}
