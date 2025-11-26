import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubscriptionPlansComponent } from './subscription-plans.component';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

describe('SubscriptionPlansComponent', () => {
  let component: SubscriptionPlansComponent;
  let fixture: ComponentFixture<SubscriptionPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), SubscriptionPlansComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: jasmine
              .createSpy('navigate')
              .and.returnValue(Promise.resolve(true)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
