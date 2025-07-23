import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-achievements',
  imports: [],
  templateUrl: './member-achievements.component.html',
  styleUrl: './member-achievements.component.scss'
})
export class MemberAchievementsComponent {
  @Input() role!: string;
}
