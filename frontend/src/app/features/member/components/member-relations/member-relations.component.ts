import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-relations',
  imports: [],
  templateUrl: './member-relations.component.html',
  styleUrl: './member-relations.component.scss',
})
export class MemberRelationsComponent {
  @Input() memberRole!: string;
}
