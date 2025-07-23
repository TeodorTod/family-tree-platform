import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-member-media-gallery',
  imports: [],
  templateUrl: './member-media-gallery.component.html',
  styleUrl: './member-media-gallery.component.scss'
})
export class MemberMediaGalleryComponent {
  @Input() role!: string;
}
