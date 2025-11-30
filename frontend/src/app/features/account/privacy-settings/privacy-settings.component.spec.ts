import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrivacySettingsComponent } from './privacy-settings.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharingApiService } from '../../../core/services/sharing-api.service';
import {
  CookieConsentPreferences,
  CookieConsentService,
  CookieConsentState,
} from '../../../core/services/cookie-consent.service';
import { computed, signal } from '@angular/core';
import { of } from 'rxjs';

class CookieConsentServiceStub {
  private state = signal<CookieConsentState | null>({
    analytics: true,
    marketing: false,
    acceptedAt: new Date().toISOString(),
  });
  readonly consent = computed(() => this.state());
  readonly hasConsent = computed(() => !!this.state());

  accept(preferences: CookieConsentPreferences) {
    this.state.set({
      ...preferences,
      acceptedAt: new Date().toISOString(),
    });
  }
}

describe('PrivacySettingsComponent', () => {
  let component: PrivacySettingsComponent;
  let fixture: ComponentFixture<PrivacySettingsComponent>;
  let sharingApi: jasmine.SpyObj<SharingApiService>;
  let cookieService: CookieConsentServiceStub;

  beforeEach(async () => {
    sharingApi = jasmine.createSpyObj<SharingApiService>('SharingApiService', [
      'getMySettings',
      'updateMySettings',
    ]);
    sharingApi.getMySettings.and.returnValue(
      of({
        allowDeceasedDiscoveryDefault: true,
        allowDeceasedDetailsDefault: true,
      }),
    );
    sharingApi.updateMySettings.and.returnValue(
      of({
        allowDeceasedDiscoveryDefault: true,
        allowDeceasedDetailsDefault: true,
      }),
    );

    cookieService = new CookieConsentServiceStub();

    await TestBed.configureTestingModule({
      imports: [PrivacySettingsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SharingApiService, useValue: sharingApi },
        { provide: CookieConsentService, useValue: cookieService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save privacy defaults when values change', () => {
    component.updatePrivacyDefaults('allowDeceasedDiscoveryDefault', false);
    component.updatePrivacyDefaults('allowDeceasedDetailsDefault', false);

    component.savePrivacyDefaults();

    expect(sharingApi.updateMySettings).toHaveBeenCalledWith({
      allowDeceasedDiscoveryDefault: false,
      allowDeceasedDetailsDefault: false,
    });
  });

  it('should persist cookie preferences', () => {
    const consent = TestBed.inject(CookieConsentService);
    const acceptSpy = spyOn(consent, 'accept').and.callThrough();

    component.updateCookiePreferences('analytics', false);
    component.updateCookiePreferences('marketing', true);

    component.saveCookiePreferences();

    expect(acceptSpy).toHaveBeenCalledWith({
      analytics: false,
      marketing: true,
    });
  });
});
