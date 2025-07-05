import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrandparentsComponent } from './grandparents.component';

describe('GrandparentsComponent', () => {
  let component: GrandparentsComponent;
  let fixture: ComponentFixture<GrandparentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrandparentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrandparentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
