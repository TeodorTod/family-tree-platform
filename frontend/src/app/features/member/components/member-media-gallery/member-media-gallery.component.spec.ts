import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberMediaGalleryComponent } from './member-media-gallery.component';

describe('MemberMediaGalleryComponent', () => {
  let component: MemberMediaGalleryComponent;
  let fixture: ComponentFixture<MemberMediaGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberMediaGalleryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberMediaGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
