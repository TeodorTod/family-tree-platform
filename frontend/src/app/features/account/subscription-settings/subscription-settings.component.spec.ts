import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionSettingsComponent } from './subscription-settings.component';

describe('SubscriptionSettingsComponent', () => {
  let component: SubscriptionSettingsComponent;
  let fixture: ComponentFixture<SubscriptionSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
