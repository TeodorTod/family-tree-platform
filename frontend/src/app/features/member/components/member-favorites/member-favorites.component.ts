import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-favorites',
  imports: [],
  templateUrl: './member-favorites.component.html',
  styleUrl: './member-favorites.component.scss'
})
export class MemberFavoritesComponent {
  @Input() role!: string;
}
