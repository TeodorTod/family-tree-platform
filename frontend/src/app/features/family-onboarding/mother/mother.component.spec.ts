import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MotherComponent } from './mother.component';

describe('MotherComponent', () => {
  let component: MotherComponent;
  let fixture: ComponentFixture<MotherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MotherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
